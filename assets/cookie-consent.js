/* Caelus Studio · Cookie 使用提示
 * 依赖页面中存在：
 *   <div class="cookie-bar" id="cookieBar" hidden> ... <button id="cookieAccept">知道了</button></div>
 * 同意状态保存在 localStorage['cookie-consent']，同意后不再显示。 */
(function () {
  var KEY = 'cookie-consent';
  try { if (localStorage.getItem(KEY) === '1') return; } catch (e) {}
  var bar = document.getElementById('cookieBar');
  if (!bar) return;
  bar.hidden = false;
  var btn = document.getElementById('cookieAccept');
  if (btn) {
    btn.addEventListener('click', function () {
      bar.remove();
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
    });
  }
})();
