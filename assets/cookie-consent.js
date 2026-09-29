/* Caelus Studio · Cookie 使用提示（可分类选择）
 *
 * 三类：
 *   necessary   必要 —— 登录会话（starid_token / 商店登录凭证），不可关闭
 *   preferences 偏好 —— 深色/浅色主题、语言选择（localStorage: theme / caelus_lang）
 *   analytics   统计 —— 匿名访问量统计（localStorage: caelus_vid + /api/collect 上报）
 *
 * 必须在 <head> 中同步引入，才能在页面统计脚本运行前完成拦截。
 * 选择结果写入 localStorage['cookie-consent-v2']。
 * 对外接口：window.CookieConsent.has(name) / .get() / .open() / .save(obj)
 */
(function () {
  var KEY = 'cookie-consent-v2';
  // 未作出选择前按此策略执行（统计默认关闭：未同意即不上报）
  var DEFAULTS = { necessary: true, preferences: true, analytics: false };
  var state = null;

  function norm(o) {
    return {
      necessary: true,
      preferences: !!o.preferences,
      analytics: !!o.analytics,
      ts: o.ts || 0
    };
  }

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      if (v) { var o = JSON.parse(v); if (o && typeof o === 'object') return norm(o); }
    } catch (e) {}
    return null;
  }

  function current() { return state || DEFAULTS; }

  function apply(s) {
    try {
      if (!s.analytics) localStorage.removeItem('caelus_vid');
      if (!s.preferences) { localStorage.removeItem('theme'); localStorage.removeItem('caelus_lang'); }
    } catch (e) {}
  }

  function save(s) {
    s = norm(s);
    s.ts = Date.now();
    state = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    apply(s);
  }

  /* ---------- 拦截：只在用户未同意对应类别时生效 ---------- */
  try {
    var rawSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      var s = current();
      if (!s.preferences && (k === 'theme' || k === 'caelus_lang')) return;
      if (!s.analytics && k === 'caelus_vid') return;
      return rawSet.apply(this, arguments);
    };
  } catch (e) {}

  try {
    if (navigator.sendBeacon) {
      var rawBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (url, data) {
        var s = current();
        if (!s.analytics && typeof url === 'string' && url.indexOf('/api/collect') >= 0) return false;
        return rawBeacon(url, data);
      };
    }
  } catch (e) {}

  state = read();
  if (state) apply(state); else apply(DEFAULTS);

  /* ---------- 弹层 ---------- */
  function syncForm() {
    var s = current();
    var p = document.getElementById('cookieCatPref');
    var a = document.getElementById('cookieCatStat');
    if (p) p.checked = s.preferences;
    if (a) a.checked = s.analytics;
  }

  function close() {
    var bar = document.getElementById('cookieBar');
    if (bar) bar.hidden = true;
  }

  function init() {
    var bar = document.getElementById('cookieBar');
    if (!bar) return;
    if (!state) { bar.hidden = false; syncForm(); }

    var btnSave = document.getElementById('cookieSave');
    var btnReject = document.getElementById('cookieReject');
    var btnAccept = document.getElementById('cookieAccept');

    if (btnSave) btnSave.addEventListener('click', function () {
      var p = document.getElementById('cookieCatPref');
      var a = document.getElementById('cookieCatStat');
      save({ preferences: !!(p && p.checked), analytics: !!(a && a.checked) });
      close();
    });
    if (btnReject) btnReject.addEventListener('click', function () {
      save({ preferences: false, analytics: false });
      close();
    });
    if (btnAccept) btnAccept.addEventListener('click', function () {
      save({ preferences: true, analytics: true });
      close();
    });
  }

  window.CookieConsent = {
    get: function () { return state ? norm(state) : null; },
    has: function (k) { if (k === 'necessary') return true; return state ? !!state[k] : !!DEFAULTS[k]; },
    open: function () { var b = document.getElementById('cookieBar'); if (b) { syncForm(); b.hidden = false; } },
    save: function (o) { save(o); close(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
