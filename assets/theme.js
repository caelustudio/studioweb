/* Caelus Studio 站点统一交互：圆形光标跟随 + 深浅主题切换
   依赖页面中存在 <div class="custom-cursor" id="customCursor"></div>
   与可选按钮 <button class="theme-toggle" id="themeToggle"><svg id="themeIcon" viewBox="0 0 24 24"></svg></button> */
(function () {
  /* ---------- 圆形光标 ---------- */
  (function cursor() {
    var el = document.getElementById('customCursor');
    if (!el) return;
    document.addEventListener('mousemove', function (e) {
      el.style.left = e.clientX + 'px';
      el.style.top = e.clientY + 'px';
    });
    document.addEventListener('mousedown', function () { el.classList.add('clicked'); });
    document.addEventListener('mouseup', function () { el.classList.remove('clicked'); });
    document.addEventListener('mouseleave', function () { el.style.display = 'none'; });
    document.addEventListener('mouseenter', function () { el.style.display = 'block'; });
    var targets = document.querySelectorAll('a, button, input, textarea, .home-card, .rec-tab, .side-link, .copy-btn');
    Array.prototype.forEach.call(targets, function (t) {
      t.addEventListener('mouseenter', function () { el.classList.add('hover'); });
      t.addEventListener('mouseleave', function () { el.classList.remove('hover'); });
    });
  })();

  /* ---------- 深浅主题切换 ---------- */
  (function theme() {
    var btn = document.getElementById('themeToggle');
    var icon = document.getElementById('themeIcon');
    var html = document.documentElement;
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    var current = 'dark';
    try { current = localStorage.getItem('theme') || (prefersDark.matches ? 'dark' : 'light'); } catch (e) {}

    function updateIcon(theme) {
      if (!icon) return;
      if (theme === 'dark') {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
      } else {
        icon.innerHTML = '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/><path d="M12 4a8 8 0 0 0-4 15 8 8 0 0 0 4-15z" opacity="0.6"/>';
      }
    }
    function setTheme(theme) {
      current = theme;
      html.setAttribute('data-theme', theme);
      try { localStorage.setItem('theme', theme); } catch (e) {}
      updateIcon(theme);
    }
    if (btn) {
      btn.addEventListener('click', function () {
        setTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
    if (prefersDark.addEventListener) {
      prefersDark.addEventListener('change', function (e) {
        var stored = null;
        try { stored = localStorage.getItem('theme'); } catch (err) {}
        if (!stored) setTheme(e.matches ? 'dark' : 'light');
      });
    }
    setTheme(current);
  })();
})();
