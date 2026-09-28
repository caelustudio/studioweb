#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Caelus Studio 文档库 · 飞书同步脚本

用途：把从飞书知识库导出的 Markdown 文件同步进 doc/docs.js（只读文档站的正文数据源）。

用法：
    python3 sync_feishu.py <导出目录> [--mark-synced]

导出目录中的文件命名规则（二选一）：
  1) 文件名即文档编号：<space>-<page>.md，例如
       starid-agreement.md        -> 文档 starid/agreement
       policies-purchase-agreement.md -> 文档 policies/purchase-agreement
       privacy-privacy-policy.md  -> 文档 privacy/privacy-policy
       terms-service-terms.md     -> 文档 terms/service-terms
  2) 在 md 第一行写注释指定（优先级更高）：
       <!-- doc: starid/agreement -->
       <!-- doc: starid/agreement title: Star ID 用户协议 -->

参数：
  --mark-synced   同步后把该文档标记为「已与飞书核对」（去掉页面上的过渡版本提示）

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

HEADER = """/* Caelus Studio 文档库 · 文档数据
   只读文档站：内容在此维护，页面由 doc.js 渲染。
   本文件由 sync_feishu.py 从飞书知识库导出内容生成，请勿手工编辑正文。
   body 直接写 HTML 片段（h3 / p / ul / li / strong / note）。
   synced: true 表示内容已与飞书知识库核对；false 表示仍待核对。 */
"""


def md_to_html(md_text):
    """极简 Markdown -> HTML 片段数组（够用于条款类文档）"""
    lines = md_text.replace('\r\n', '\n').split('\n')
    out = []
    buf = []
    in_list = False

    def flush_para():
        if buf:
            text = ' '.join(buf).strip()
            if text:
                out.append('<p>' + inline(text) + '</p>')
            buf.clear()

    def flush_list():
        nonlocal in_list
        if in_list:
            out.append('</ul>')
            in_list = False

    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            flush_para()
            flush_list()
            continue
        # 元信息注释行跳过
        if re.match(r'\s*<!--\s*doc:', line):
            continue
        m = re.match(r'^(#{1,6})\s+(.*)$', line)
        if m:
            flush_para(); flush_list()
            out.append('<h3>' + inline(m.group(2).strip()) + '</h3>')
            continue
        if re.match(r'^\s*([-*+]|\d+\.)\s+', line):
            flush_para()
            if not in_list:
                out.append('<ul>')
                in_list = True
            item = re.sub(r'^\s*([-*+]|\d+\.)\s+', '', line)
            out.append('<li>' + inline(item) + '</li>')
            continue
        flush_list()
        buf.append(line.strip())
    flush_para()
    flush_list()
    return out


def inline(s):
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'`(.+?)`', r'<code>\1</code>', s)
    s = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', s)
    return s


def doc_id_of(path, text):
    m = re.search(r'<!--\s*doc:\s*([a-zA-Z0-9_\-/]+)\s*(?:title:\s*([^>]*?))?\s*-->', text)
    if m:
        return m.group(1), (m.group(2) or '').strip() or None
    name = os.path.splitext(os.path.basename(path))[0]
    # 取第一段作为 space，其余为 page
    if '-' in name:
        space, page = name.split('-', 1)
        return space + '/' + page, None
    return None, None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    mark_synced = '--mark-synced' in sys.argv
    if not args:
        print(__doc__)
        sys.exit(1)
    src = os.path.abspath(args[0])
    if not os.path.isdir(src):
        print('目录不存在：' + src)
        sys.exit(1)

    patch = {}
    for fn in sorted(os.listdir(src)):
        if not fn.lower().endswith('.md'):
            continue
        full = os.path.join(src, fn)
        text = open(full, encoding='utf-8', errors='ignore').read()
        doc_id, title = doc_id_of(full, text)
        if not doc_id:
            print('跳过（无法识别文档编号）：' + fn)
            continue
        body = md_to_html(text)
        if not body:
            print('跳过（内容为空）：' + fn)
            continue
        entry = {'body': body}
        if mark_synced:
            entry['synced'] = True
        if title:
            entry['title'] = title
        patch[doc_id] = entry
        print('已解析 %s -> %s（%d 段）' % (fn, doc_id, len(body)))

    if not patch:
        print('没有可同步的内容')
        sys.exit(1)

    tmp = os.path.join(tempfile.gettempdir(), 'docs_patch.json')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(patch, f, ensure_ascii=False)

    node_script = """
const fs = require('fs');
global.window = {};
eval(fs.readFileSync(process.argv[2], 'utf8'));
const DOCS = window.DOCS;
const patch = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
let hit = 0;
DOCS.spaces.forEach(function (sp) {
  sp.pages.forEach(function (p) {
    if (patch[p.id]) { Object.assign(p, patch[p.id]); hit++; }
  });
});
if (!hit) { console.error('docs.js 中没有匹配到任何文档编号'); process.exit(1); }
fs.writeFileSync(process.argv[2], process.argv[4] + 'window.DOCS = ' + JSON.stringify(DOCS, null, 2) + ';\\n');
console.log('docs.js 已更新，同步文档数：' + hit);
"""
    with open(os.path.join(tempfile.gettempdir(), 'sync_docs.js'), 'w', encoding='utf-8') as f:
        f.write(node_script)

    node = subprocess.run(
        ['node', os.path.join(tempfile.gettempdir(), 'sync_docs.js'), DOCS_JS, tmp, HEADER],
        capture_output=True, text=True
    )
    print(node.stdout.strip() or node.stderr.strip())


if __name__ == '__main__':
    main()
