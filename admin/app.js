// 作品管理台 · 交互逻辑
// 数据后端：Cloudflare Worker（地址见 cloud-api.js 的 API_BASE）

// 管理台自身的域名自检：只允许这几个，防止别的站点套壳调用
var ALLOWED_HOSTS = ["admin.caelus.top", "www.caelus.top"];
function isAllowedHost(h) {
  h = String(h || "").toLowerCase();
  if (ALLOWED_HOSTS.indexOf(h) >= 0) return true;
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (/\.pages\.dev$/.test(h)) return true;   // Pages 预览域名
  return false;
}

// cloud 对象由 cloud-api.js 提供（fetch 复刻 SDK 的调用形状）
if (typeof cloud === "undefined") {
  var sdkTip = document.createElement("div");
  sdkTip.style.cssText =
    "margin:24px;padding:18px 20px;border-radius:12px;background:#FDECEA;color:#8A1F11;" +
    "font:14px/1.7 system-ui,-apple-system,sans-serif";
  sdkTip.textContent = "cloud-api.js 没能加载，页面功能不可用。请刷新重试";
  document.body.insertBefore(sdkTip, document.body.firstChild);
  throw new Error("cloud-api.js 未加载");
}
// 与客户端 TreeOSSource.LocalAppVersion 保持一致，改客户端版本时这里也要改
var CLIENT_VERSION = "26.11.7";

var FIELDS = [
  "treeos_enabled", "treeos_version", "treeos_url", "treeos_note", "treeos_icon", "treeos_eol", "treeos_desc",
  "caelusos_enabled", "caelusos_version", "caelusos_url", "caelusos_note", "caelusos_icon", "caelusos_eol", "caelusos_desc",
  "app_version", "app_url", "app_notes", "app_force",
  "app_rollback", "app_rollback_to", "app_rollback_url", "app_rollback_notes",
  "poll_interval_seconds"
];
var TOGGLES = ["treeos_enabled", "caelusos_enabled", "treeos_eol", "caelusos_eol", "app_force"];
var pendingOtp = null;
var currentUser = null;

function $(id) { return document.getElementById(id); }

function setMsg(el, text, kind) {
  el.className = "msg" + (kind ? " " + kind : "");
  el.innerHTML = text || "";
}

// ---------- 读写配置 ----------

function readForm() {
  var out = {};
  FIELDS.forEach(function (f) {
    var el = $(f);
    out[f] = TOGGLES.indexOf(f) >= 0 ? el.checked : el.value.trim();
  });
  return out;
}

function writeForm(cfg) {
  FIELDS.forEach(function (f) {
    var el = $(f);
    if (TOGGLES.indexOf(f) >= 0) el.checked = cfg[f] === true;
    else el.value = cfg[f] == null ? "" : String(cfg[f]);
  });
  $("updatedAt").textContent = cfg.updated_at
    ? new Date(cfg.updated_at).toLocaleString("zh-CN") + (cfg.updated_by ? " · " + cfg.updated_by : "")
    : "—";
}

function setEditable(on) {
  FIELDS.forEach(function (f) { $(f).disabled = !on; });
  $("btnSave").disabled = !on;
  $("dirtyTip").classList.toggle("hidden", on);
}

async function loadConfig() {
  setMsg($("saveMsg"), '<span class="spinner"></span> 读取中…');
  var res = await cloud.database.from("app_config").select("*").eq("id", 1).maybeSingle();
  if (res.error) {
    setMsg($("saveMsg"), "读取失败：" + res.error.message, "err");
    return;
  }
  if (!res.data) {
    setMsg($("saveMsg"), "配置尚未初始化。", "err");
    return;
  }
  writeForm(res.data);
  setMsg($("saveMsg"), "", "");
}

async function saveConfig() {
  var session = await cloud.auth.getSession();
  if (session.error || !session.data) {
    setMsg($("saveMsg"), "请先登录再保存。", "err");
    return;
  }
  setMsg($("saveMsg"), '<span class="spinner"></span> 保存中…');
  var payload = readForm();
  // 刷新间隔必须是整数秒：前端先钳制，避免写进 integer 列报错
  var sec = parseInt(payload.poll_interval_seconds, 10);
  if (isNaN(sec)) sec = 5;
  if (sec < 2) sec = 2;
  if (sec > 300) sec = 300;
  payload.poll_interval_seconds = sec;

  payload.updated_at = new Date().toISOString();
  payload.updated_by = currentUser || "";

  var res = await cloud.database.from("app_config").update(payload).eq("id", 1).select();
  if (res.error) {
    setMsg($("saveMsg"), "保存失败：" + res.error.message, "err");
    return;
  }
  // RLS 拦截时返回空数组而不是报错
  if (!res.data || res.data.length === 0) {
    setMsg($("saveMsg"), "没有保存成功：当前账号没有修改权限。", "err");
    return;
  }
  writeForm(res.data[0]);
  setMsg($("saveMsg"), "已保存，客户端将读取到最新配置。", "ok");
}

// ---------- 登录 ----------

async function refreshSession() {
  var s = await cloud.auth.getSession();
  var ok = !s.error && !!s.data;
  currentUser = ok ? (s.data.user && (s.data.user.id || s.data.user.email) || "已登录") : null;
  $("authCard").classList.toggle("hidden", ok);
  setEditable(ok);
  $("chip").innerHTML = ok
    ? '<span style="color:var(--ok)">●</span> ' + (currentUser || "") + ' <button class="link" id="btnOut">退出</button>'
    : "";
  var out = $("btnOut");
  if (out) out.onclick = async function () {
    await cloud.auth.signOut();
    location.reload();
  };
  return ok;
}

async function doLogin() {
  var email = $("liEmail").value.trim();
  var password = $("liPwd").value;
  if (!email || !password) { setMsg($("liMsg"), "请填写邮箱和密码。", "err"); return; }
  setMsg($("liMsg"), '<span class="spinner"></span> 登录中…');
  var r = await cloud.auth.signInWithPassword({ email: email, password: password });
  if (r.error) { setMsg($("liMsg"), "邮箱或密码不正确。", "err"); return; }
  setMsg($("liMsg"), "", "");
  await refreshSession();
}

async function sendCode() {
  var email = $("rgEmail").value.trim();
  if (!email) { setMsg($("rgMsg"), "请先填写邮箱。", "err"); return; }
  setMsg($("rgMsg"), '<span class="spinner"></span> 发送中…');
  var sent = await cloud.auth.sendOtp({ email: email });
  if (sent.error) { setMsg($("rgMsg"), "发送失败：" + sent.error.message, "err"); return; }
  pendingOtp = { email: email, verificationId: sent.data.verificationId, isExistingUser: sent.data.isExistingUser };
  setMsg($("rgMsg"), "验证码已发送，请查收邮件。", "ok");
}

async function doRegister() {
  // 注册已关闭：仅已有管理员可通过「密码登录」进入，不再开放自助注册。
  setMsg($("rgMsg"), "注册已关闭，仅已有管理员可登录。", "err");
  return;
}

// ---------- 非授权域名提示 ----------

// 云端按域名精确校验 Origin：非授权域名（比如 GitHub Pages 上的副本）
// 连读配置都会被拒（403 access_denied）。先自检，避免打开副本时只剩莫名报错。
function showMirrorNotice() {
  var bar = document.createElement("div");
  bar.className = "banner";
  bar.style.borderColor = "#5A3A1C";
  bar.innerHTML =
    '<span class="dot" style="background:#FFB020"></span>' +
    '<div>这是管理页的<b>只读副本</b>（当前域名 <code>' + location.hostname + '</code>' +
    ' 未被云端授权）。云端按域名精确校验，这里无法读取或保存配置。' +
    '请使用正式地址 <a href="https://caelus-admin-49685.app.workbuddy.host/" ' +
    'style="color:var(--accent)">caelus-admin-49685.app.workbuddy.host</a>。</div>';
  var wrap = document.querySelector(".wrap");
  wrap.insertBefore(bar, wrap.children[1]);
}

// ---------- 商店商品 ----------

var shopItems = [];
var SHOP_FIELDS = ["itName", "itTag", "itDesc", "itPrice", "itImage", "itBuy", "itDownload", "itSort"];
var SHOP_TOGGLES = ["itDownloadEnabled", "itVisible"];

function moneyText(v) {
  var n = parseFloat(v);
  if (isNaN(n) || n <= 0) return "免费";
  return "￥" + String(Math.round(n * 100) / 100);
}

// 商品能否编辑只取决于有没有登录（和上面的配置区保持一致）
function syncShopEditable() {
  var on = !!currentUser;
  // 「新增」按钮保持可点：未登录时点击给明确提示，而不是静默禁用
  SHOP_FIELDS.forEach(function (f) { $(f).disabled = !on; });
  SHOP_TOGGLES.forEach(function (f) { $(f).disabled = !on; });
  $("btnSaveItem").disabled = !on;
  $("btnDeleteItem").disabled = !on;
  if (!on) closeEditor();
}

async function loadShop() {
  setMsg($("shopMsg"), '<span class="spinner"></span> 读取中…');
  // 排序自己排：不同版本的 SDK order() 签名不一样，别赌它
  var res = await cloud.database.from("shop_items").select("*");
  if (res.error) { setMsg($("shopMsg"), "读取失败：" + res.error.message, "err"); return; }
  shopItems = res.data || [];
  renderShop();
  setMsg($("shopMsg"), "", "");
}

function renderShop() {
  var list = $("shopList");
  list.innerHTML = "";
  $("shopCount").textContent = shopItems.length ? shopItems.length + " 件" : "";

  if (!shopItems.length) {
    list.innerHTML = '<div class="hint">还没有任何商品，点右上角「新增商品」添加一个。</div>';
    return;
  }

  shopItems.slice().sort(function (a, b) {
    return (a.sort_order - b.sort_order) || (a.id - b.id);
  }).forEach(function (it) {
    var row = document.createElement("div");
    row.className = "shop-row" + (it.visible ? "" : " off");

    var info = document.createElement("div");
    info.className = "grow";
    info.innerHTML = '<div class="name"></div><div class="meta"></div>';
    // 用 textContent 塞文本，避免商品名里的尖括号被当成标签
    info.querySelector(".name").textContent = it.name + (it.tag ? "  ·  " + it.tag : "");
    info.querySelector(".meta").textContent =
      moneyText(it.price) + "  ·  排序 " + it.sort_order +
      (it.download_enabled ? "  ·  开放下载" : "");

    var pills = document.createElement("div");
    pills.className = "ops";
    pills.innerHTML = '<span class="pill ' + (it.visible ? "on" : "off") + '">' +
      (it.visible ? "已上架" : "已下架") + '</span>';

    var ops = document.createElement("div");
    ops.className = "ops";
    if (currentUser) {
      var edit = document.createElement("button");
      edit.className = "tiny";
      edit.textContent = "编辑";
      edit.onclick = function () { openEditor(it); };

      var del = document.createElement("button");
      del.className = "tiny danger";
      del.textContent = "删除";
      del.onclick = function () { removeItem(it.id, it.name); };

      ops.appendChild(edit);
      ops.appendChild(del);
    }

    row.appendChild(info);
    row.appendChild(pills);
    row.appendChild(ops);
    list.appendChild(row);
  });
}

function openEditor(item) {
  if (!currentUser) { setMsg($("shopMsg"), "请先登录再新增或编辑商品。", "err"); return; }
  $("itId").value = item ? String(item.id) : "";
  $("itName").value = item ? item.name || "" : "";
  $("itTag").value = item ? item.tag || "" : "";
  $("itDesc").value = item ? item.description || "" : "";
  $("itPrice").value = item ? String(item.price) : "0";
  $("itImage").value = item ? item.image_url || "" : "";
  $("itBuy").value = item ? item.buy_url || "" : "";
  $("itDownload").value = item ? item.download_url || "" : "";
  $("itDownloadEnabled").checked = item ? !!item.download_enabled : false;
  $("itVisible").checked = item ? !!item.visible : true;
  $("itSort").value = item ? String(item.sort_order) : "0";
  $("btnDeleteItem").classList.toggle("hidden", !item);
  $("shopEditor").classList.remove("hidden");
  $("itName").focus();
}

function closeEditor() {
  $("shopEditor").classList.add("hidden");
  $("itId").value = "";
  $("btnDeleteItem").classList.add("hidden");
}

async function saveItem() {
  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("shopMsg"), "请先登录再操作商品。", "err"); return; }

  var name = $("itName").value.trim();
  if (!name) { setMsg($("shopMsg"), "商品名称不能为空。", "err"); return; }

  var price = parseFloat($("itPrice").value.trim());
  var sortOrder = parseInt($("itSort").value.trim(), 10);
  setMsg($("shopMsg"), '<span class="spinner"></span> 保存中…');

  var payload = {
    name: name,
    tag: $("itTag").value.trim(),
    description: $("itDesc").value.trim(),
    price: isNaN(price) ? 0 : price,
    image_url: $("itImage").value.trim(),
    buy_url: $("itBuy").value.trim(),
    download_url: $("itDownload").value.trim(),
    download_enabled: $("itDownloadEnabled").checked,
    visible: $("itVisible").checked,
    sort_order: isNaN(sortOrder) ? 0 : sortOrder,
    updated_at: new Date().toISOString()
  };

  var id = $("itId").value;
  var res = id
    ? await cloud.database.from("shop_items").update(payload).eq("id", id).select()
    : await cloud.database.from("shop_items").insert(payload).select();

  if (res.error) { setMsg($("shopMsg"), "保存失败：" + res.error.message, "err"); return; }
  // RLS 拦截时返回空数组而不是报错
  if (!res.data || !res.data.length) {
    setMsg($("shopMsg"), "没有保存成功：当前账号没有修改权限。", "err");
    return;
  }

  closeEditor();
  await loadShop();
  setMsg($("shopMsg"), "已保存，桌面端商店页会立刻读到最新商品。", "ok");
}

async function removeItem(id, name) {
  if (!confirm("确定删除「" + name + "」？删除后桌面端商店页会立刻不显示。")) return;

  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("shopMsg"), "请先登录再删除商品。", "err"); return; }

  setMsg($("shopMsg"), '<span class="spinner"></span> 删除中…');
  var res = await cloud.database.from("shop_items").delete().eq("id", id);
  if (res.error) { setMsg($("shopMsg"), "删除失败：" + res.error.message, "err"); return; }

  closeEditor();
  await loadShop();
  setMsg($("shopMsg"), "已删除「" + name + "」。", "ok");
}

// ---------- 新增作品 ----------

var worksItems = [];
var WORK_FIELDS = ["wkSection", "wkCategory", "wkName", "wkVersion", "wkDescription", "wkIcon", "wkFallback", "wkUrl", "wkNote"];
var WORK_TOGGLES = ["wkEnabled", "wkEol"];

// 分区复用 category 字段承载（云端 works 表无 section 列）
function isStudioSection(category) {
  return String(category || "").trim().toLowerCase() === "studio";
}
function sectionLabelOf(category) {
  return isStudioSection(category) ? "Caelus Studio 作品" : "更多作品";
}

// 作品能否编辑只取决于有没有登录（和配置区、商品区一致）
function syncWorksEditable() {
  var on = !!currentUser;
  // 「新增」按钮保持可点：未登录时点击给明确提示，而不是静默禁用
  WORK_FIELDS.forEach(function (f) { $(f).disabled = !on; });
  WORK_TOGGLES.forEach(function (f) { $(f).disabled = !on; });
  $("btnSaveWork").disabled = !on;
  $("btnDeleteWork").disabled = !on;
  if (!on) closeWorkEditor();
}

async function loadWorks() {
  setMsg($("worksMsg"), '<span class="spinner"></span> 读取中…');
  var res = await cloud.database.from("works").select("*");
  if (res.error) { setMsg($("worksMsg"), "读取失败：" + res.error.message, "err"); return; }
  worksItems = res.data || [];
  renderWorks();
  setMsg($("worksMsg"), "", "");
}

function renderWorks() {
  var list = $("worksList");
  list.innerHTML = "";
  $("worksCount").textContent = worksItems.length ? worksItems.length + " 件" : "";
  if (!worksItems.length) {
    list.innerHTML = '<div class="hint">还没有任何作品，点右上角「新增作品」添加一个。</div>';
    return;
  }
  worksItems.slice().sort(function (a, b) {
    // 分区复用 category 字段：studio 在前，再按 sort_order / id
    var sa = isStudioSection(a.category) ? 0 : 1;
    var sb = isStudioSection(b.category) ? 0 : 1;
    return (sa - sb) || (a.sort_order - b.sort_order) || (a.id - b.id);
  }).forEach(function (it) {
    var row = document.createElement("div");
    row.className = "shop-row" + (it.enabled ? "" : " off");
    var info = document.createElement("div");
    info.className = "grow";
    info.innerHTML = '<div class="name"></div><div class="meta"></div>';
    info.querySelector(".name").textContent = it.name;
    var catLabelShown = String(it.label || "").trim();
    if (!catLabelShown && !isStudioSection(it.category) && it.category && String(it.category).toLowerCase() !== "more") catLabelShown = String(it.category);
    info.querySelector(".meta").textContent =
      "[" + sectionLabelOf(it.category) + "]" + (catLabelShown ? "  标签 " + catLabelShown : "") +
      (it.version ? "  版本 " + it.version + "  ·  " : "") +
      (it.eol ? "已停止技术支持  ·  " : "") +
      (it.enabled ? "可下载" : "已关闭下载");
    var pills = document.createElement("div");
    pills.className = "ops";
    pills.innerHTML = '<span class="pill ' + (it.enabled ? "on" : "off") + '">' +
      (it.enabled ? "可下载" : "已关闭") + '</span>';
    var ops = document.createElement("div");
    ops.className = "ops";
    if (currentUser) {
      var edit = document.createElement("button");
      edit.className = "tiny";
      edit.textContent = "编辑";
      edit.onclick = function () { openWorkEditor(it); };
      var del = document.createElement("button");
      del.className = "tiny danger";
      del.textContent = "删除";
      del.onclick = function () { removeWork(it.id, it.name); };
      ops.appendChild(edit);
      ops.appendChild(del);
    }
    row.appendChild(info);
    row.appendChild(pills);
    row.appendChild(ops);
    list.appendChild(row);
  });
}

function openWorkEditor(item) {
  if (!currentUser) { setMsg($("worksMsg"), "请先登录再新增或编辑作品。", "err"); return; }
  $("wkId").value = item ? String(item.id) : "";
  $("wkSection").value = isStudioSection(item && item.category) ? "studio" : "more";
  // 自定义标签优先读 label；兼容旧的「category 当标签」数据
  var _label = item ? String(item.label || "").trim() : "";
  var _cat = item ? String(item.category || "").trim() : "";
  if (!_label && _cat && _cat.toLowerCase() !== "studio" && _cat.toLowerCase() !== "more") _label = _cat;
  $("wkCategory").value = _label;
  $("wkName").value = item ? item.name || "" : "";
  $("wkVersion").value = item ? item.version || "" : "";
  $("wkDescription").value = item ? item.description || "" : "";
  $("wkIcon").value = item ? item.icon || "" : "";
  $("wkFallback").value = item ? item.fallback || "" : "";
  $("wkUrl").value = item ? item.url || "" : "";
  $("wkNote").value = item ? item.note || "" : "";
  $("wkEnabled").checked = item ? !!item.enabled : true;
  $("wkEol").checked = item ? !!item.eol : false;
  $("wkSort").value = item ? String(item.sort_order) : "0";
  $("btnDeleteWork").classList.toggle("hidden", !item);
  $("workEditor").classList.remove("hidden");
  $("wkName").focus();
}

function closeWorkEditor() {
  $("workEditor").classList.add("hidden");
  $("wkId").value = "";
  $("btnDeleteWork").classList.add("hidden");
}

async function saveWork() {
  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("worksMsg"), "请先登录再操作作品。", "err"); return; }
  var name = $("wkName").value.trim();
  if (!name) { setMsg($("worksMsg"), "作品名称不能为空。", "err"); return; }
  var sortOrder = parseInt($("wkSort").value.trim(), 10);
  var section = $("wkSection").value;
  var catLabel = $("wkCategory").value.trim();
  setMsg($("worksMsg"), '<span class="spinner"></span> 保存中…');
  var payload = {
    name: name,
    // category = 分区（studio/more）；label = 卡片名称右侧显示的小标签
    category: section,
    label: catLabel,
    version: $("wkVersion").value.trim(),
    description: $("wkDescription").value.trim(),
    icon: $("wkIcon").value.trim(),
    fallback: $("wkFallback").value.trim(),
    url: $("wkUrl").value.trim(),
    note: $("wkNote").value.trim(),
    enabled: $("wkEnabled").checked,
    eol: $("wkEol").checked,
    sort_order: isNaN(sortOrder) ? 0 : sortOrder
  };
  var id = $("wkId").value;
  var res = id
    ? await cloud.database.from("works").update(payload).eq("id", id).select()
    : await cloud.database.from("works").insert(payload).select();
  if (res.error) { setMsg($("worksMsg"), "保存失败：" + res.error.message, "err"); return; }
  if (!res.data || !res.data.length) {
    setMsg($("worksMsg"), "没有保存成功：当前账号没有修改权限。", "err");
    return;
  }
  closeWorkEditor();
  await loadWorks();
  setMsg($("worksMsg"), "已保存，桌面端下载页会立刻读到这个新作品。", "ok");
}

async function removeWork(id, name) {
  if (!confirm("确定删除「" + name + "」？删除后桌面端下载页会立刻不再显示。")) return;
  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("worksMsg"), "请先登录再删除作品。", "err"); return; }
  setMsg($("worksMsg"), '<span class="spinner"></span> 删除中…');
  var res = await cloud.database.from("works").delete().eq("id", id);
  if (res.error) { setMsg($("worksMsg"), "删除失败：" + res.error.message, "err"); return; }
  closeWorkEditor();
  await loadWorks();
  setMsg($("worksMsg"), "已删除「" + name + "」。", "ok");
}

// ---------- 用户反馈 ----------

var feedbackItems = [];

// 排序自己排：不同版本 SDK order() 签名不一致，避免踩坑
async function loadFeedback() {
  setMsg($("feedbackMsg"), '<span class="spinner"></span> 读取中…');
  var res = await cloud.database.from("feedback").select("*");
  if (res.error) { setMsg($("feedbackMsg"), "读取失败：" + res.error.message, "err"); return; }
  feedbackItems = (res.data || []).slice().sort(function (a, b) {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  renderFeedback();
  setMsg($("feedbackMsg"), "", "");
}

function renderFeedback() {
  var list = $("feedbackList");
  list.innerHTML = "";
  $("feedbackCount").textContent = feedbackItems.length ? feedbackItems.length + " 条" : "";
  if (!feedbackItems.length) {
    list.innerHTML = '<div class="hint">还没有反馈。桌面端「关于」页提交后会显示在这里。</div>';
    return;
  }
  feedbackItems.forEach(function (f) {
    var row = document.createElement("div");
    row.className = "shop-row";

    var info = document.createElement("div");
    info.className = "grow";
    info.innerHTML = '<div class="name"></div><div class="meta"></div><div class="body"></div>';

    var who = (f.sender_name && String(f.sender_name).trim())
      ? String(f.sender_name).trim()
      : (f.star_id && String(f.star_id).trim() ? String(f.star_id).trim() : "匿名");
    var when = f.created_at ? new Date(f.created_at).toLocaleString("zh-CN") : "";

    info.querySelector(".name").textContent = who + (f.app_version ? "  ·  v" + f.app_version : "");
    info.querySelector(".meta").textContent = when;
    // textContent 塞文本，避免反馈内容里的尖括号被当成标签
    info.querySelector(".body").textContent = f.content || "";

    row.appendChild(info);
    list.appendChild(row);
  });
}

// ---------- 公告 ----------

var annItems = [];

async function loadAnn() {
  setMsg($("annMsg"), '<span class="spinner"></span> 读取中…');
  var res = await cloud.database.from("announcements").select("*");
  if (res.error) { setMsg($("annMsg"), "读取失败：" + res.error.message, "err"); return; }
  annItems = (res.data || []).slice().sort(function (a, b) {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  renderAnn();
  setMsg($("annMsg"), "", "");
}

function renderAnn() {
  var list = $("annList");
  list.innerHTML = "";
  $("annCount").textContent = annItems.length ? annItems.length + " 条" : "";
  if (!annItems.length) {
    list.innerHTML = '<div class="hint">还没有公告。发布后会推送给全部应用。</div>';
    return;
  }
  annItems.forEach(function (a) {
    var row = document.createElement("div");
    row.className = "shop-row" + (a.active ? "" : " off");

    var info = document.createElement("div");
    info.className = "grow";
    info.innerHTML = '<div class="name"></div><div class="meta"></div><div class="ann-body"></div>';
    info.querySelector(".name").textContent = a.title || "(无标题)";
    info.querySelector(".meta").textContent =
      (a.created_at ? new Date(a.created_at).toLocaleString("zh-CN") : "") +
      (a.created_by ? " · " + a.created_by : "");
    info.querySelector(".ann-body").textContent = a.content || "";

    var ops = document.createElement("div");
    ops.className = "ops";

    var pill = document.createElement("span");
    pill.className = "pill " + (a.active ? "on" : "off");
    pill.textContent = a.active ? "启用中" : "已停用";

    var toggle = document.createElement("button");
    toggle.className = "tiny";
    toggle.textContent = a.active ? "停用" : "启用";
    toggle.onclick = function () { toggleAnn(a); };

    var del = document.createElement("button");
    del.className = "tiny";
    del.textContent = "删除";
    del.onclick = function () { removeAnn(a); };

    ops.appendChild(pill);
    ops.appendChild(toggle);
    ops.appendChild(del);
    row.appendChild(info);
    row.appendChild(ops);
    list.appendChild(row);
  });
}

async function publishAnn() {
  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("annMsg"), "请先登录再发布公告。", "err"); return; }
  var title = $("annTitle").value.trim();
  var content = $("annContent").value.trim();
  if (!title) { setMsg($("annMsg"), "公告标题不能为空。", "err"); return; }
  if (!content) { setMsg($("annMsg"), "公告内容不能为空。", "err"); return; }

  setMsg($("annMsg"), '<span class="spinner"></span> 发布中…');
  var payload = {
    title: title,
    content: content,
    active: true,
    created_by: currentUser || ""
  };
  // 先插入成功再停用旧公告：插入失败时旧公告仍在，不会造成「公告消失」
  var res = await cloud.database.from("announcements").insert(payload).select();
  if (res.error) { setMsg($("annMsg"), "发布失败：" + res.error.message, "err"); return; }
  if (!res.data || !res.data.length) {
    setMsg($("annMsg"), "没有发布成功：当前账号没有修改权限。", "err");
    return;
  }
  var newId = res.data[0].id;
  // 逐条停用旧公告（不用批量 eq，避免 SDK 差异；保持「同时只有一条当前公告」）
  for (var i = 0; i < annItems.length; i++) {
    var old = annItems[i];
    if (old.active && old.id !== newId) {
      await cloud.database.from("announcements").update({ active: false }).eq("id", old.id);
    }
  }
  $("annTitle").value = "";
  $("annContent").value = "";
  await loadAnn();
  setMsg($("annMsg"), "已发布，全部应用下次启动时会各显示一次。", "ok");
}

async function toggleAnn(a) {
  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("annMsg"), "请先登录再修改公告。", "err"); return; }
  setMsg($("annMsg"), '<span class="spinner"></span> 处理中…');
  var res = await cloud.database.from("announcements").update({ active: !a.active }).eq("id", a.id).select();
  if (res.error) { setMsg($("annMsg"), "操作失败：" + res.error.message, "err"); return; }
  if (!res.data || !res.data.length) {
    setMsg($("annMsg"), "没有生效：当前账号没有修改权限。", "err");
    return;
  }
  // 启用某条成功后，把其它启用中的停用，保持「同时只有一条当前公告」
  if (!a.active) {
    for (var i = 0; i < annItems.length; i++) {
      var other = annItems[i];
      if (other.active && other.id !== a.id) {
        await cloud.database.from("announcements").update({ active: false }).eq("id", other.id);
      }
    }
  }
  await loadAnn();
  setMsg($("annMsg"), a.active ? "已停用。" : "已启用，全部应用会收到这条公告。", "ok");
}

async function removeAnn(a) {
  if (!confirm("确定删除公告「" + (a.title || "") + "」？")) return;
  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("annMsg"), "请先登录再删除公告。", "err"); return; }
  setMsg($("annMsg"), '<span class="spinner"></span> 删除中…');
  var res = await cloud.database.from("announcements").delete().eq("id", a.id);
  if (res.error) { setMsg($("annMsg"), "删除失败：" + res.error.message, "err"); return; }
  await loadAnn();
  setMsg($("annMsg"), "已删除。", "ok");
}

// ---------- 内部员工 ----------

var staffItems = [];

async function loadStaff() {
  setMsg($("staffMsg"), '<span class="spinner"></span> 读取中…');
  var res = await cloud.database.from("staff_members").select("*");
  if (res.error) { setMsg($("staffMsg"), "读取失败：" + res.error.message, "err"); return; }
  staffItems = (res.data || []).slice().sort(function (a, b) {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  renderStaff();
  setMsg($("staffMsg"), "", "");
}

function renderStaff() {
  var list = $("staffList");
  list.innerHTML = "";
  $("staffCount").textContent = staffItems.length ? staffItems.length + " 人" : "";
  if (!staffItems.length) {
    list.innerHTML = '<div class="hint">名单为空。添加 Star ID 后，该账号登录客户端才会看到「内部配置」。</div>';
    return;
  }
  staffItems.forEach(function (s) {
    var row = document.createElement("div");
    row.className = "shop-row";

    var info = document.createElement("div");
    info.className = "grow";
    info.innerHTML = '<div class="name"></div><div class="meta"></div>';
    info.querySelector(".name").textContent = s.star_id || "";
    info.querySelector(".meta").textContent =
      (s.note ? s.note : "未填备注") +
      (s.created_at ? " · " + new Date(s.created_at).toLocaleString("zh-CN") : "");

    var ops = document.createElement("div");
    ops.className = "ops";
    var del = document.createElement("button");
    del.className = "tiny";
    del.textContent = "移出名单";
    del.onclick = function () { removeStaff(s); };
    ops.appendChild(del);

    row.appendChild(info);
    row.appendChild(ops);
    list.appendChild(row);
  });
}

async function addStaff() {
  var sid = ($("staffStarId").value || "").trim().toUpperCase();
  if (!sid) { setMsg($("staffMsg"), "请填 Star ID", "err"); return; }
  if (sid.indexOf("CS-") !== 0) { setMsg($("staffMsg"), "Star ID 应以 CS- 开头", "err"); return; }
  if (staffItems.some(function (s) { return (s.star_id || "").toUpperCase() === sid; })) {
    setMsg($("staffMsg"), "这个 Star ID 已经在名单里了", "err"); return;
  }

  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("staffMsg"), "请先登录再改名单", "err"); return; }

  setMsg($("staffMsg"), '<span class="spinner"></span> 添加中…');
  var res = await cloud.database.from("staff_members").insert({
    star_id: sid,
    note: ($("staffNote").value || "").trim() || null
  }).select();
  if (res.error) { setMsg($("staffMsg"), "添加失败：" + res.error.message, "err"); return; }
  if (!res.data || !res.data.length) {
    setMsg($("staffMsg"), "没添加成功：当前账号没有修改权限", "err");
    return;
  }
  $("staffStarId").value = "";
  $("staffNote").value = "";
  await loadStaff();
  setMsg($("staffMsg"), "已加入名单 " + sid, "ok");
}

async function removeStaff(s) {
  if (!confirm("把 " + (s.star_id || "") + " 移出内部名单？移出后该账号看不到「内部配置」")) return;
  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("staffMsg"), "请先登录再改名单", "err"); return; }
  setMsg($("staffMsg"), '<span class="spinner"></span> 移除中…');
  var res = await cloud.database.from("staff_members").delete().eq("id", s.id);
  if (res.error) { setMsg($("staffMsg"), "移除失败：" + res.error.message, "err"); return; }
  await loadStaff();
  setMsg($("staffMsg"), "已移出名单", "ok");
}

// ---------- 附属包 ----------

var addonItems = [];

function workLabel(key) {
  var k = (key || "").toLowerCase();
  if (k === "treeos") return "TreeOS";
  if (k === "caelusos") return "CaelusOS";
  if (k.indexOf("work:") === 0) {
    var id = parseInt(k.slice(5), 10);
    var hit = null;
    (worksItems || []).forEach(function (w) { if (w.id === id) hit = w; });
    return hit ? (hit.name || ("作品 " + id)) : ("作品 " + id);
  }
  return k || "(未指定)";
}

function fillAddonWorkOptions() {
  var sel = $("addon_work");
  if (!sel) return;
  var cur = sel.value;
  sel.innerHTML = '<option value="treeos">TreeOS</option><option value="caelusos">CaelusOS</option>';
  (worksItems || []).forEach(function (w) {
    var o = document.createElement("option");
    o.value = "work:" + w.id;
    o.textContent = w.name || ("作品 " + w.id);
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

async function loadAddons() {
  setMsg($("addonMsg"), '<span class="spinner"></span> 读取中…');
  var res = await cloud.database.from("work_addons").select("*");
  if (res.error) { setMsg($("addonMsg"), "读取失败：" + res.error.message, "err"); return; }
  addonItems = (res.data || []).slice().sort(function (a, b) {
    return (a.sort_order || 0) - (b.sort_order || 0) || (a.id - b.id);
  });
  fillAddonWorkOptions();
  renderAddons();
  setMsg($("addonMsg"), "", "");
}

function renderAddons() {
  var list = $("addonList");
  list.innerHTML = "";
  $("addonCount").textContent = addonItems.length ? addonItems.length + " 个" : "";
  if (!addonItems.length) {
    list.innerHTML = '<div class="hint">还没有附属包。添加后客户端对应作品卡片底部就会列出来。</div>';
    return;
  }
  addonItems.forEach(function (a) {
    var row = document.createElement("div");
    row.className = "shop-row";

    var info = document.createElement("div");
    info.className = "grow";
    info.innerHTML = '<div class="name"></div><div class="meta"></div>';
    info.querySelector(".name").textContent = a.name || "(未命名)";
    var meta = workLabel(a.work_key);
    if (a.version) meta += " · " + a.version;
    if (a.size_note) meta += " · " + a.size_note;
    if (a.force_download) meta += " · 强制下载";
    if (a.note) meta += " · " + a.note;
    meta += " · " + (a.url || "");
    info.querySelector(".meta").textContent = meta;

    var ops = document.createElement("div");
    ops.className = "ops";
    var del = document.createElement("button");
    del.className = "tiny";
    del.textContent = "删除";
    del.onclick = function () { removeAddon(a); };
    ops.appendChild(del);

    row.appendChild(info);
    row.appendChild(ops);
    list.appendChild(row);
  });
}

async function addAddon() {
  var key = $("addon_work") ? $("addon_work").value : "";
  var name = ($("addon_name").value || "").trim();
  var url = ($("addon_url").value || "").trim();
  if (!key) { setMsg($("addonMsg"), "请选择所属作品", "err"); return; }
  if (!name) { setMsg($("addonMsg"), "请填名称", "err"); return; }
  if (!url) { setMsg($("addonMsg"), "请填下载地址", "err"); return; }

  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("addonMsg"), "请先登录", "err"); return; }

  setMsg($("addonMsg"), '<span class="spinner"></span> 添加中…');
  var res = await cloud.database.from("work_addons").insert({
    work_key: key,
    name: name,
    url: url,
    size_note: ($("addon_size").value || "").trim() || null,
    note: ($("addon_note").value || "").trim() || null,
    version: ($("addon_version").value || "").trim() || null,
    force_download: $("addon_force").checked === true,
    sort_order: addonItems.length
  }).select();
  if (res.error) { setMsg($("addonMsg"), "添加失败：" + res.error.message, "err"); return; }
  if (!res.data || !res.data.length) { setMsg($("addonMsg"), "没添加成功：当前账号没有修改权限", "err"); return; }

  $("addon_name").value = "";
  $("addon_url").value = "";
  $("addon_size").value = "";
  $("addon_note").value = "";
  $("addon_version").value = "";
  $("addon_force").checked = false;
  await loadAddons();
  setMsg($("addonMsg"), "已添加 " + name, "ok");
}

async function removeAddon(a) {
  if (!confirm("删除附属包「" + (a.name || "") + "」？")) return;
  var session = await cloud.auth.getSession();
  if (session.error || !session.data) { setMsg($("addonMsg"), "请先登录", "err"); return; }
  setMsg($("addonMsg"), '<span class="spinner"></span> 删除中…');
  var res = await cloud.database.from("work_addons").delete().eq("id", a.id);
  if (res.error) { setMsg($("addonMsg"), "删除失败：" + res.error.message, "err"); return; }
  await loadAddons();
  setMsg($("addonMsg"), "已删除", "ok");
}

// ---------- 分类切换 ----------

var PANE_KEY = "caelus-admin-pane";

function switchPane(name) {
  document.querySelectorAll(".pane").forEach(function (p) {
    p.hidden = p.dataset.pane !== name;
  });
  document.querySelectorAll(".side-item").forEach(function (a) {
    a.classList.toggle("on", a.dataset.pane === name);
  });
  try { localStorage.setItem(PANE_KEY, name); } catch (e) {}
  // 切分类回到顶部，别停在上一类的滚动位置
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindPaneNav() {
  var nav = document.querySelector(".side");
  if (!nav) return;
  nav.addEventListener("click", function (e) {
    var a = e.target.closest(".side-item[data-pane]");
    if (!a) return;
    switchPane(a.dataset.pane);
  });

  var saved = "";
  try { saved = localStorage.getItem(PANE_KEY) || ""; } catch (e) {}
  if (saved && document.querySelector('.pane[data-pane="' + saved + '"]')) {
    switchPane(saved);
  }
}

// ---------- 绑定 ----------



$("ep").textContent = API_BASE + "/rest/app_config?select=*";
$("curVer").textContent = CLIENT_VERSION;
$("btnSave").onclick = saveConfig;
$("btnReload").onclick = loadConfig;
$("btnLogin").onclick = doLogin;
$("btnSend").onclick = sendCode;
$("btnReg").onclick = doRegister;
$("liPwd").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
$("rgCode").addEventListener("keydown", function (e) { if (e.key === "Enter") doRegister(); });

// 商店商品
$("btnNewItem").onclick = function () { openEditor(null); };
$("btnCancelEdit").onclick = closeEditor;
$("btnSaveItem").onclick = saveItem;
$("btnDeleteItem").onclick = function () {
  removeItem($("itId").value, $("itName").value.trim() || "这件商品");
};

// 新增作品
$("btnNewWork").onclick = function () { openWorkEditor(null); };
$("btnCancelWork").onclick = closeWorkEditor;
$("btnSaveWork").onclick = saveWork;
$("btnDeleteWork").onclick = function () {
  removeWork($("wkId").value, $("wkName").value.trim() || "这件作品");
};
$("btnReloadFeedback").onclick = loadFeedback;
// 公告
$("btnPublishAnn").onclick = publishAnn;
$("btnReloadAnn").onclick = loadAnn;
$("btnClearAnn").onclick = function () {
  $("annTitle").value = "";
  $("annContent").value = "";
  setMsg($("annMsg"), "", "");
};
// 内部员工
$("btnAddStaff").onclick = addStaff;
$("btnReloadStaff").onclick = loadStaff;
$("btnClearStaff").onclick = function () {
  $("staffStarId").value = "";
  $("staffNote").value = "";
};
// 附属包
$("btnAddAddon").onclick = addAddon;
$("btnReloadAddon").onclick = loadAddons;
$("btnClearAddon").onclick = function () {
  $("addon_name").value = "";
  $("addon_url").value = "";
  $("addon_size").value = "";
  $("addon_note").value = "";
  $("addon_version").value = "";
  $("addon_force").checked = false;
};
// 「重新读取」顺带把商品也拉一遍（addEventListener 不会覆盖它原有的 onclick）
$("btnReload").addEventListener("click", loadShop);
$("btnReload").addEventListener("click", loadWorks);
$("btnReload").addEventListener("click", loadAnn);

$("tabLogin").onclick = function () {
  $("tabLogin").classList.add("active"); $("tabReg").classList.remove("active");
  $("paneLogin").classList.remove("hidden"); $("paneReg").classList.add("hidden");
};
$("tabReg").onclick = function () {
  $("tabReg").classList.add("active"); $("tabLogin").classList.remove("active");
  $("paneReg").classList.remove("hidden"); $("paneLogin").classList.add("hidden");
};

FIELDS.forEach(function (f) {
  $(f).addEventListener("change", function () {
    $("dirtyTip").classList.add("hidden");
  });
});

bindPaneNav();

(async function init() {
  setEditable(false);
  if (!isAllowedHost(location.hostname)) {
    showMirrorNotice();
    setMsg($("saveMsg"), "当前域名未被授权，已停止读取云端配置。", "err");
    return;
  }
  await loadConfig();
  await refreshSession();
  // 商品是独立的一张表，单独拉一次；加载完再按登录状态决定能不能编辑
  await loadShop();
  syncShopEditable();
  // 新增作品：同样是独立表，单独拉一次
  await loadWorks();
  syncWorksEditable();
  // 用户反馈：只读汇总，单独拉一次（RLS 允许匿名读取）
  await loadFeedback();
  // 公告：独立表，单独拉一次
  await loadAnn();
  await loadStaff();
  await loadAddons();
})();
