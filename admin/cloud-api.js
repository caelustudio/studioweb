/**
 * cloud-api.js · 用 fetch 复刻 WorkBuddyCloud SDK 的调用形状
 *
 * 为什么要这一层：管理台 app.js 里已经有 23 处
 *   cloud.database.from("app_config").update(payload).eq("id", 1).select()
 * 这种链式调用。直接改业务代码容易漏改、也难回滚；
 * 这里做一个同名同形状的替代品，业务代码一行都不用动。
 *
 * 后端：Cloudflare Worker（/rest/{table} 复刻了 PostgREST 的 query 语法）
 * 鉴权：POST /auth/login 换 JWT，存 localStorage，请求带 Authorization: Bearer
 */

var API_BASE = "https://api.caelus.top";
var TOKEN_KEY = "caelus-admin-token";
var EMAIL_KEY = "caelus-admin-email";

function _token() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
}
function _setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}
function _email() {
  try { return localStorage.getItem(EMAIL_KEY) || ""; } catch (e) { return ""; }
}
function _setEmail(v) {
  try { v ? localStorage.setItem(EMAIL_KEY, v) : localStorage.removeItem(EMAIL_KEY); } catch (e) {}
}

/* ==================== 数据库查询（PostgREST 子集） ==================== */

function _makeQuery(table, method, payload) {
  var filters = [];
  var orderStr = "";
  var limitN = 0;
  var wantSingle = false;

  function buildUrl() {
    var qs = [];
    if (method === "GET") {
      qs.push("select=*");
      filters.forEach(function (f) {
        qs.push(encodeURIComponent(f[0]) + "=eq." + encodeURIComponent(f[1]));
      });
      if (orderStr) qs.push("order=" + encodeURIComponent(orderStr));
      if (limitN) qs.push("limit=" + limitN);
    } else {
      // 写操作也要带过滤条件（update/delete），否则会改到整表
      filters.forEach(function (f) {
        qs.push(encodeURIComponent(f[0]) + "=eq." + encodeURIComponent(f[1]));
      });
    }
    return API_BASE + "/rest/" + table + (qs.length ? "?" + qs.join("&") : "");
  }

  function exec() {
    var headers = { "Content-Type": "application/json" };
    var tok = _token();
    if (tok) headers["Authorization"] = "Bearer " + tok;

    var body = null;
    if (method === "POST" || method === "PATCH") {
      if (!payload) return Promise.resolve({ data: null, error: { message: "empty body" } });
      body = JSON.stringify(payload);
    }

    return fetch(buildUrl(), { method: method, headers: headers, body: body })
      .then(function (r) {
        return r.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
          if (r.ok) return { data: data, error: null, status: r.status };
          var msg = (data && (data.message || data.error)) || ("HTTP " + r.status);
          return { data: null, error: { message: msg, code: r.status }, status: r.status };
        });
      })
      .then(function (res) {
        if (wantSingle && !res.error) {
          if (Array.isArray(res.data)) res.data = res.data.length ? res.data[0] : null;
        }
        return res;
      })
      .catch(function (e) {
        return { data: null, error: { message: String(e && e.message ? e.message : e) } };
      });
  }

  var api = {
    select: function () { return api; },          // 服务端固定返回 *，列名忽略
    eq: function (col, val) { filters.push([col, val]); return api; },
    order: function (col, opts) {
      var dir = opts && opts.ascending === false ? "desc" : "asc";
      orderStr = col + "." + dir;
      return api;
    },
    limit: function (n) { limitN = n; return api; },
    maybeSingle: function () { wantSingle = true; return exec(); },
    single: function () { wantSingle = true; return exec(); },
    // 让任意链式组合都能被 await
    then: function (onOk, onErr) { return exec().then(onOk, onErr); },
    catch: function (fn) { return exec().catch(fn); }
  };

  return api;
}

/* ==================== 对外对象（形状与 SDK 一致） ==================== */

var cloud = {
  database: {
    from: function (table) {
      return {
        select: function () { return _makeQuery(table, "GET", null); },
        insert: function (row) { return _makeQuery(table, "POST", row); },
        update: function (row) { return _makeQuery(table, "PATCH", row); },
        delete: function () { return _makeQuery(table, "DELETE", null); }
      };
    }
  },

  auth: {
    /** 有 token 就当已登录；页面里的 13 处调用都只看 res.data 是否存在 */
    getSession: function () {
      var t = _token();
      if (!t) return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: { access_token: t, user: { email: _email() } }, error: null });
    },

    signInWithPassword: function (creds) {
      return fetch(API_BASE + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: (creds && creds.email) || "", password: (creds && creds.password) || "" })
      })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) return { data: null, error: { message: (j && j.message) || "登录失败" } };
            _setToken(j.token);
            _setEmail(j.email);
            return { data: { access_token: j.token, user: { email: j.email } }, error: null };
          });
        })
        .catch(function (e) {
          return { data: null, error: { message: String(e && e.message ? e.message : e) } };
        });
    },

    signOut: function () {
      _setToken("");
      _setEmail("");
      return Promise.resolve({ error: null });
    },

    /** 凭邀请码注册；成功后直接拿到 token，等价于登录 */
    signUp: function (p) {
      var email = (p && p.email) || "";
      var password = (p && p.password) || "";
      var code = (p && p.code) || "";
      return fetch(API_BASE + "/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password, code: code })
      })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) return { data: null, error: { message: (j && j.message) || "注册失败" } };
            _setToken(j.token);
            _setEmail(j.email);
            return { data: { access_token: j.token, user: { email: j.email } }, error: null };
          });
        })
        .catch(function (e) {
          return { data: null, error: { message: String(e && e.message ? e.message : e) } };
        });
    },

    /** 自建后端没有邮件服务，验证码登录走不了；UI 会提示改用密码 */
    sendOtp: function () {
      return Promise.resolve({
        data: null,
        error: { message: "当前后端不支持邮箱验证码，请用密码登录" }
      });
    }
  }
};
