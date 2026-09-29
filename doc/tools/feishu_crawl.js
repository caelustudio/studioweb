/* Caelus Studio 文档库 · 飞书知识库抓取脚本
 *
 * 用途：把 caelustudio.feishu.cn 上公开的知识库空间抓取成 Markdown，
 *       供 sync_feishu.py 导入 doc/docs.js。
 *
 * 运行：
 *   NODE_PATH=<workspace>/node_modules node doc/tools/feishu_crawl.js
 *
 * 依赖：playwright-core（npm i playwright-core），以及本机 Chrome / Edge。
 *   可用环境变量覆盖：
 *     FEISHU_BROWSER  浏览器可执行文件路径
 *     FEISHU_PROFILE  浏览器 profile 目录（用于保留登录态）
 *     FEISHU_OUT      导出目录，默认 /tmp/feishu-export
 *
 * 说明：知识库为「互联网公开」时无需登录即可抓取；若页面需要登录，
 *       脚本会以有头模式打开，手动登录后重跑即可（profile 会保留 Cookie）。
 * 产出：<OUT>/<space>/<序号>-<标题>.md，首行含 <!-- feishu: ... --> 元信息。
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const EDGE = process.env.FEISHU_BROWSER
  || '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const PROFILE = process.env.FEISHU_PROFILE || '/tmp/feishu-profile';
const OUT = process.env.FEISHU_OUT || '/tmp/feishu-export';

const SPACES = [
  { id: '7672229743277690146', slug: 'treeos' },
  { id: '7668679549147728860', slug: 'caelusos' },
  { id: '7668877677914278860', slug: 'brand' }
];

function safeName(s) { return s.replace(/[\\/:*?"<>|\n\r\t]/g, '_').trim(); }

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: EDGE, headless: false, viewport: null,
    args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check']
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  const manifest = [];

  for (const sp of SPACES) {
    const spaceUrl = 'https://caelustudio.feishu.cn/wiki/space/' + sp.id;
    await page.goto(spaceUrl, { waitUntil: 'domcontentloaded' }).catch(e => console.log('goto err', e.message));
    await page.waitForTimeout(8000);

    // 收集目录节点（滚动目录容器以加载全部）
    const nodes = await page.evaluate(async () => {
      const seen = new Map();
      const collect = () => {
        document.querySelectorAll('[data-node-uid]').forEach(el => {
          const uid = el.getAttribute('data-node-uid') || '';
          const m = uid.match(/wikiToken=([A-Za-z0-9]+)/);
          const t = (el.innerText || '').trim().split('\n')[0].trim();
          if (m && m[1] && t) seen.set(m[1], t);
        });
      };
      collect();
      const box = document.querySelector('.wiki-tree-inner-container') || document.querySelector('[id="TOC-ROOT"]');
      if (box) { for (let i = 0; i < 6; i++) { box.scrollTop = i * 400; await new Promise(r => setTimeout(r, 400)); collect(); } }
      return Array.from(seen.entries()).map(([token, title]) => ({ token, title }));
    });

    console.log('=== SPACE', sp.slug, '| 目录', nodes.length, '篇');
    nodes.forEach(n => console.log('   -', n.title, n.token));

    const dir = path.join(OUT, sp.slug);
    fs.mkdirSync(dir, { recursive: true });

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const url = 'https://caelustudio.feishu.cn/wiki/' + n.token;
      let text = '';
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(6500);
        text = await page.evaluate(() => {
          const el = document.querySelector('.bear-web-x-container');
          if (el && (el.innerText || '').trim().length > 50) return el.innerText;
          return document.body.innerText || '';
        });
      } catch (e) { console.log('  page err', n.title, e.message.split('\n')[0]); }
      const docTitle = (await page.title().catch(() => '') || '').replace(/\s*-\s*飛書雲端文件.*$/, '').trim();
      const file = path.join(dir, String(i + 1).padStart(2, '0') + '-' + safeName(n.title) + '.md');
      fs.writeFileSync(file, '<!-- feishu: ' + sp.slug + ' | token: ' + n.token + ' | title: ' + (docTitle || n.title) + ' -->\n\n# ' + n.title + '\n\n' + text + '\n');
      manifest.push({ space: sp.slug, token: n.token, dirTitle: n.title, pageTitle: docTitle, file, chars: text.length });
      console.log('   saved', path.basename(file), text.length, 'chars');
    }
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('ALL DONE', manifest.length);
  await ctx.close();
  process.exit(0);
})();
