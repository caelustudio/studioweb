/* Caelus Studio 文档库 · 渲染 */
(function () {
  var DOCS = window.DOCS || { spaces: [] };
  var pages = [];
  DOCS.spaces.forEach(function (sp) {
    sp.pages.forEach(function (p) { pages.push({ space: sp, page: p }); });
  });

  function currentId() {
    var attr = document.documentElement.getAttribute('data-doc');
    if (attr) return attr;
    var path = location.pathname.replace(/index\.html$/, '').replace(/^\/doc\/?/, '').replace(/\/$/, '');
    return path;
  }

  var curId = currentId();
  var cur = null;
  pages.forEach(function (x) { if (x.page.id === curId) cur = x; });

  /* ---- 侧边栏 ---- */
  var side = document.getElementById('sidebar');
  var html = '';
  DOCS.spaces.forEach(function (sp) {
    html += '<div class="side-group"><div class="side-group-name">' + esc(sp.name) + '</div>';
    sp.pages.forEach(function (p) {
      var active = cur && cur.page.id === p.id ? ' active' : '';
      html += '<a class="side-link' + active + '" href="/doc/' + p.id + '/">' + esc(p.title) + '</a>';
    });
    html += '</div>';
  });
  html += '<div class="side-foot">文档为只读版本<br/>© 2026 Caelus Studio</div>';
  side.innerHTML = html;

  /* ---- 顶栏面包屑 ---- */
  var crumb = document.getElementById('crumb');
  if (cur) crumb.textContent = cur.space.name + ' / ' + cur.page.title;
  else crumb.textContent = '全部文档';

  /* ---- 标题 ---- */
  var titleBase = 'Caelus Studio 文档库';
  document.title = cur ? cur.page.title + ' - ' + titleBase : titleBase + ' · Caelus Studio';

  /* ---- 正文 ---- */
  var content = document.getElementById('content');
  if (cur) {
    var i = pages.indexOf(cur);
    var prev = pages[i - 1], next = pages[i + 1];
    var nav = '<div class="doc-nav-bottom">';
    nav += prev ? '<a href="/doc/' + prev.page.id + '/">← ' + esc(prev.page.title) + '</a>' : '<span></span>';
    nav += next ? '<a href="/doc/' + next.page.id + '/">' + esc(next.page.title) + ' →</a>' : '<span></span>';
    nav += '</div>';
    var syncNote = cur.page.synced === false
      ? '<div class="sync-note">本文正在与 Caelus Studio 飞书知识库核对，当前为过渡版本，最终以飞书原文为准。</div>'
      : '';
    content.innerHTML =
      '<h2 class="doc-title">' + esc(cur.page.title) + '</h2>' +
      '<div class="doc-meta">最后更新：' + esc(cur.page.updated) + '　·　' + esc(cur.space.name) + '</div>' +
      syncNote +
      '<div class="doc-body">' + cur.page.body.join('') + '</div>' + nav;
  } else {
    var cards = '';
    DOCS.spaces.forEach(function (sp) {
      sp.pages.forEach(function (p) {
        cards += '<a class="home-card" href="/doc/' + p.id + '/">' +
          '<div class="hc-space">' + esc(sp.name) + '</div>' +
          '<div class="hc-title">' + esc(p.title) + '</div>' +
          '<div class="hc-desc">' + esc(p.desc || '') + '</div></a>';
      });
    });
    content.innerHTML =
      '<h2 class="doc-title">Caelus Studio 文档库</h2>' +
      '<div class="doc-meta">共 ' + pages.length + ' 篇文档　·　只读</div>' +
      '<div class="home-grid">' + cards + '</div>';
  }

  /* ---- 移动端菜单 ---- */
  var btn = document.getElementById('menuBtn');
  if (btn) btn.addEventListener('click', function () {
    side.classList.toggle('open');
  });
  side.addEventListener('click', function (e) {
    if (e.target.classList.contains('side-link')) side.classList.remove('open');
  });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
