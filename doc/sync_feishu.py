#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Caelus Studio 文档库 · 飞书同步脚本

用途：把飞书知识库导出（或 feishu_crawl.js 抓取）的 Markdown 同步进
      doc/docs.js —— 只读文档站的正文数据源。

典型流程：
    1) node tools/feishu_crawl.js          # 抓取知识库 -> /tmp/feishu-export/<space>/<NN>-<标题>.md
    2) python3 sync_feishu.py /tmp/feishu-export/brand --mark-synced
    3) 若要把新文档加进文档库：在 md 第一行写 <!-- doc: <space>/<page> -->
       再执行 python3 sync_feishu.py <目录> --create --space-name studio=Caelus Studio

用法：
    python3 sync_feishu.py <导出目录> [--mark-synced] [--create] [--space-name ID=名称] [--dry]

匹配文档的方式（按优先级）：
  1) md 第一行注释指定：  <!-- doc: treeos/overview -->
  2) 文件名：            <space>-<page>.md   ->  space/page
  3) 标题精确匹配：      md 的 # 标题 == docs.js 中已有文档的 title

参数：
  --mark-synced   同步后把文档标记为「已与飞书核对」（去掉页面上的过渡版本提示）
  --create        允许新建文档（md 需带 <!-- doc: space/page -->），space 不存在时一并创建
  --space-name    space 的显示名，形如 studio=Caelus Studio，可多次传入
  --dry          只打印将要做的改动，不写文件

依赖：node（用于读写 docs.js），无第三方库。
"""
import os
import re
import sys
import json
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS_JS = os.path.join(HERE, 'docs.js')
NODE = os.environ.get('NODE_BIN') or 'node'

NBSP = '\u00a0'
ZW = '\u200b'
HEAD_WORDS = {'前言', '引言', '重要提示', '特别约定', '声明', '概述', '说明',
              '注意事项', '注意', '附录', '总则', '附则', '其他'}
META_PREFIXES = ('生效日期', '发布日期', '适用范围', '版本', '更新日期', '生效版本', '最后更新')


def strip_invis(s):
    return s.replace(ZW, '').replace(NBSP, ' ').strip()


def extract_title_and_body(text):
    """返回 (title, 正文行列表)：去掉元信息注释、飞书目录块（TOC）"""
    lines = [strip_invis(l) for l in text.replace('\r\n', '\n').split('\n')]
    lines = [l for l in lines if not re.match(r'<!--\s*(feishu|doc):', l)]
    h1 = None
    for i, l in enumerate(lines):
        m = re.match(r'^#{1,6}\s+(.*)$', l)
        if m:
            h1 = m.group(1).strip()
            break
    if h1 is None:
        return None, []
    rest = lines[i + 1:]
    # 飞书页面：标题第一处是目录首行，第二处才是正文起点
    hits = [j for j, l in enumerate(rest) if l == h1]
    body = rest[hits[1] + 1:] if len(hits) >= 2 else (rest[hits[0] + 1:] if hits else rest)
    return h1, body


def is_short_heading(cur, nxt):
    """飞书正文里无编号的小标题：短行、非句末标点、下一行是正文或列表"""
    if not cur or len(cur) > 20:
        return False
    if re.search(r'[。！？；：,，、]$', cur):
        return False
    if re.match(r'^[\d\u2022\u25e6\-*+#]', cur):
        return False
    if nxt is None:
        return False
    if re.match(r'^\s*([\u2022\u25e6]|[-*+]|\d+\.)', nxt):
        return True
    return len(nxt) > len(cur) + 10


def clean_lines(body):
    """清洗飞书残留 + 合并拆行的列表编号，返回 (items, meta)"""
    out, meta = [], []
    i = 0
    while i < len(body):
        raw = body[i]
        i += 1
        if not raw:
            continue
        if re.match(r'^(\d+月\d+日|昨天|今天|\d+\s*小时前)修改$', raw):
            continue
        if re.search(r'[\u8a55\u8bc4][\u8ad6\u8bba]\s*[\uff08(]\s*\d+\s*[\uff09)]', raw):
            continue
        if raw.startswith('Contains AI-generated content'):
            if i < len(body) and body[i].startswith('Doubao'):
                i += 1
            continue
        if raw.startswith('Doubao Work.'):
            continue
        if raw.startswith(META_PREFIXES) and re.match(r'^[^：:]{2,8}[：:]', raw):
            meta.append(raw)
            continue

        # ① 纯编号行 "1." + 下一行：短且无冒号 -> 章节，否则列表项
        m = re.match(r'^(\d+)\.$', raw)
        if m:
            nxt = ''
            while i < len(body) and not body[i].strip():
                i += 1
            if i < len(body):
                nxt = body[i]
                i += 1
            if nxt:
                merged = '%s. %s' % (m.group(1), nxt)
                if '：' not in merged and ':' not in merged and len(merged) <= 30:
                    out.append(('h3', merged))
                else:
                    out.append(('li', merged))
            continue

        # ② 纯项目符号行（• 一级 / ◦ 二级）+ 下一行
        m = re.match(r'^([\u2022\u25e6])$', raw)
        if m:
            nxt = ''
            while i < len(body) and not body[i].strip():
                i += 1
            if i < len(body):
                nxt = body[i]
                i += 1
            if nxt:
                out.append(('sub' if m.group(1) == '\u25e6' else 'li', nxt))
            continue

        # ③ markdown 列表
        m = re.match(r'^\s*[-*+]\s+(.*)$', raw)
        if m:
            out.append(('li', m.group(1).strip()))
            continue

        # ④ 中文数字章节 "一、xxx"
        if re.match(r'^[一二三四五六七八九十]+、', raw) and len(raw) <= 40:
            out.append(('h3', raw))
            continue

        # ⑤ 编号章节 "1. xxx" / "2.1 xxx"
        m = re.match(r'^(\d+(?:\.\d+)*)\.?\s+(.+)$', raw)
        if m:
            if '：' not in raw and ':' not in raw and len(raw) <= 40:
                out.append(('h3', raw))
            else:
                out.append(('li', raw))
            continue

        # ⑥ 无编号小标题
        if raw in HEAD_WORDS and len(raw) <= 8:
            out.append(('h3', raw))
            continue
        if is_short_heading(raw, next((x for x in body[i:] if x.strip()), None)):
            out.append(('h3', raw))
            continue

        out.append(('p', raw))
    return out, meta


def inline(s):
    s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'`(.+?)`', r'<code>\1</code>', s)
    s = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    s = re.sub(r'(?<!["\'>=])(https?://[^\s\uff0c\u3002\uff09\u3001\uff1b]+)',
               r'<a href="\1" target="_blank" rel="noopener">\1</a>', s)
    return s


def md_to_html(md_text):
    """Markdown（飞书导出格式） -> HTML 片段数组"""
    title, body = extract_title_and_body(md_text)
    items, meta = clean_lines(body)
    out = []
    if meta:
        out.append('<div class="note">' + '<br>'.join(inline(m) for m in meta) + '</div>')
    buf, lis, subs = [], [], []

    def flush_para():
        if buf:
            out.append('<p>' + inline(' '.join(buf)) + '</p>')
            buf.clear()

    def flush_lists():
        nonlocal lis, subs
        if subs:
            lis.append(('SUBS', subs))
            subs = []
        if lis:
            parts = []
            for x in lis:
                if isinstance(x, tuple):
                    parts.append('<li><ul>' + ''.join('<li>' + inline(i) + '</li>' for i in x[1]) + '</ul></li>')
                else:
                    parts.append('<li>' + inline(x) + '</li>')
            out.append('<ul>' + ''.join(parts) + '</ul>')
            lis = []

    for kind, text in items:
        if kind == 'h3':
            flush_para(); flush_lists()
            out.append('<h3>' + inline(text) + '</h3>')
        elif kind == 'li':
            if subs:
                lis.append(('SUBS', subs)); subs = []
            lis.append(text)
        elif kind == 'sub':
            subs.append(text)
        else:
            flush_lists()
            buf.append(text)
    flush_para(); flush_lists()
    return out, title


def desc_of(items):
    for kind, text in items:
        if kind == 'p' and len(text) >= 12:
            t = re.sub(r'\s+', ' ', text)
            return t[:48] + ('\u2026' if len(t) > 48 else '')
    return ''


def updated_of(text):
    m = re.search(r'(\d+)月(\d+)日修改', text)
    if m:
        import datetime
        return '%d-%02d-%02d' % (datetime.date.today().year, int(m.group(1)), int(m.group(2)))
    return None


def doc_id_of(path, text):
    m = re.search(r'<!--\s*doc:\s*([a-zA-Z0-9_\-/]+)\s*(?:title:\s*([^>]*?))?\s*-->', text)
    if m:
        return m.group(1), (m.group(2) or '').strip() or None
    name = os.path.splitext(os.path.basename(path))[0]
    if '-' in name:
        space, page = name.split('-', 1)
        return space + '/' + page, None
    return None, None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = [a for a in sys.argv[1:] if a.startswith('--')]
    mark_synced = '--mark-synced' in flags
    create = '--create' in flags
    dry = '--dry' in flags
    space_names = {}
    for a in flags:
        m = re.match(r'^--space-name=(.+?)=(.+)$', a)
        if m:
            space_names[m.group(1)] = m.group(2)

    if not args:
        print(__doc__)
        sys.exit(1)
    src = os.path.abspath(args[0])
    if not os.path.isdir(src):
        print('目录不存在：' + src)
        sys.exit(1)

    updates, creates = {}, []
    for fn in sorted(os.listdir(src)):
        if not fn.lower().endswith('.md'):
            continue
        full = os.path.join(src, fn)
        text = open(full, encoding='utf-8', errors='ignore').read()
        body, title = md_to_html(text)
        if not body:
            print('跳过（内容为空）：' + fn)
            continue
        doc_id, forced_title = doc_id_of(full, text)
        entry = {'body': body, 'title': forced_title or title}
        if mark_synced:
            entry['synced'] = True
        upd = updated_of(text)
        if upd:
            entry['updated'] = upd
        if doc_id:
            updates[doc_id] = entry
        else:
            creates.append({'file': fn, 'title': title, 'entry': entry})
        print('已解析 %s -> %s（%d 段）' % (fn, doc_id or '(待按标题匹配)', len(body)))

    tmp = os.path.join(tempfile.gettempdir(), 'docs_patch.json')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump({'updates': updates, 'creates': creates,
                   'spaceNames': space_names, 'create': create}, f, ensure_ascii=False)

    node_script = r"""
const fs = require('fs');
const path = require('path');
global.window = {};
eval(fs.readFileSync(process.argv[2], 'utf8'));
const DOCS = window.DOCS;
const cfg = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const srcDir = process.argv[5];
let hit = 0, made = 0;
const byTitle = {};
DOCS.spaces.forEach(sp => sp.pages.forEach(p => { byTitle[p.title] = p; }));
const pending = Object.assign({}, cfg.updates);

// 1) 按文档编号匹配
DOCS.spaces.forEach(sp => sp.pages.forEach(p => {
  if (pending[p.id]) { Object.assign(p, pending[p.id]); hit++; delete pending[p.id]; }
}));
// 2) 按标题匹配
Object.keys(pending).forEach(id => {
  const e = pending[id], t = byTitle[e.title];
  if (t) {
    Object.assign(t, { body: e.body, title: e.title });
    if (e.synced !== undefined) t.synced = e.synced;
    if (e.updated) t.updated = e.updated;
    hit++; delete pending[id];
  }
});

function upsert(spId, pgId, entry, title) {
  let sp = DOCS.spaces.find(s => s.id === spId);
  if (!sp) { sp = { id: spId, name: cfg.spaceNames[spId] || spId, pages: [] }; DOCS.spaces.push(sp); }
  const pid = spId + '/' + pgId;
  const page = { id: pid, title: title, desc: '', updated: entry.updated || '', synced: !!entry.synced, body: entry.body };
  const exist = sp.pages.find(p => p.id === pid);
  if (exist) Object.assign(exist, page); else sp.pages.push(page);
  made++;
}

if (cfg.create) {
  // 3) 有编号但文档库里还不存在 -> 新建
  Object.keys(pending).forEach(id => {
    const parts = String(id).split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) { console.log('跳过（编号不合法）：' + id); return; }
    upsert(parts[0], parts[1], pending[id], pending[id].title);
    delete pending[id];
  });
  // 4) 无编号但 md 里写了 <!-- doc: space/page -->
  cfg.creates.forEach(c => {
    const m = /<!--\s*doc:\s*([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/.exec(
      fs.readFileSync(path.join(srcDir, c.file), 'utf8'));
    if (!m) { console.log('跳过（未指定 <!-- doc: space/page -->）：' + c.file); return; }
    upsert(m[1], m[2], c.entry, c.title);
  });
} else {
  Object.keys(pending).forEach(id => console.log('文档库中没有：' + id + '（加 --create 可新建）'));
}

if (!hit && !made) { console.error('没有可写入的改动'); process.exit(1); }
console.log('匹配更新：' + hit + '，新建：' + made);
if (process.argv[4] !== 'dry') {
  const header = fs.readFileSync(process.argv[2], 'utf8').split('window.DOCS')[0].replace(/\s+$/, '\n');
  fs.writeFileSync(process.argv[2], header + '\nwindow.DOCS = ' + JSON.stringify(DOCS, null, 2) + ';\n');
  console.log('docs.js 已更新');
} else {
  console.log('--dry：未写入');
}
"""
    node_js = os.path.join(tempfile.gettempdir(), 'sync_docs.js')
    with open(node_js, 'w', encoding='utf-8') as f:
        f.write(node_script)

    r = subprocess.run([NODE, node_js, DOCS_JS, tmp, 'dry' if dry else 'write', src],
                       capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())


if __name__ == '__main__':
    main()
