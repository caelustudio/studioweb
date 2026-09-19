/* Caelus Studio 多语言切换：简体中文 / 繁體中文 / English
   - 导航栏注入「简/繁/EN」按钮，点击循环切换
   - 选择存 localStorage('caelus_lang')，默认简中
   - 字典 key 为页面简中原文（按文本节点精确匹配） */
(function () {
  var DICT = {
    'Caelus Studio - 始于设计，忠于设计 | 创意设计工作室': ['Caelus Studio - 始于设计，忠于设计 | 创意设计工作室', 'Caelus Studio - 始於設計，忠於設計 | 創意設計工作室', 'Caelus Studio - Begin With Design, Believe In Design | Creative Design Studio'],
    '首页': ['首页', '首頁', 'Home'],
    '下载': ['下载', '下載', 'Download'],
    '联系': ['联系', '聯繫', 'Contact'],
    '始于设计，忠于设计。': ['始于设计，忠于设计。', '始於設計，忠於設計。', 'Begin with design, believe in design.'],
    '下滑探索': ['下滑探索', '下滑探索', 'Scroll to explore'],
    '一切皆由': ['一切皆由', '一切皆由', 'Everything is built with '],
    '打造。': ['打造。', '打造。', '.'],
    '我们相信，PowerPoint 能打造一切。从 PPT 系统到 PPT 动画，想到的都能做出来。设计，不只是活的，也可以是静的。静态界面设计、动态动画设计，缺一不可。': ['我们相信，PowerPoint 能打造一切。从 PPT 系统到 PPT 动画，想到的都能做出来。设计，不只是活的，也可以是静的。静态界面设计、动态动画设计，缺一不可。', '我們相信，PowerPoint 能打造一切。從 PPT 系統到 PPT 動畫，想到的都能做出來。設計，不只是動的，也可以是靜的。靜態介面設計、動態動畫設計，缺一不可。', 'We believe PowerPoint can build anything. From PPT systems to PPT animation — if you can imagine it, it can be made. Design is not only motion; stillness matters too. Static UI design and dynamic animation go hand in hand.'],
    '专业、丰富的设计。': ['专业、丰富的设计。', '專業、豐富的設計。', 'Professional, versatile design.'],
    '我们有 2 年的设计经验，也创作出了许多作品，其中包括 XyangOS、StarOS、CaelusOS、星乐海集团账号服务。我们也懂得了：任何作品都值得反复深挖。': ['我们有 2 年的设计经验，也创作出了许多作品，其中包括 XyangOS、StarOS、CaelusOS、星乐海集团账号服务。我们也懂得了：任何作品都值得反复深挖。', '我們有 2 年的設計經驗，也創作了許多作品，其中包括 XyangOS、StarOS、CaelusOS、星樂海集團帳號服務。我們也懂得了：任何作品都值得反覆深挖。', 'With 2 years of design experience, we have created many works, including XyangOS, StarOS, CaelusOS and the Xinglehai Group account services. And we have learned that every work deserves to be refined over and over.'],
    '个作品': ['个作品', '個作品', ' works'],
    '年设计经验': ['年设计经验', '年設計經驗', ' years of design experience'],
    '创意': ['创意', '創意', 'Creativity'],
    '价值观': ['价值观', '價值觀', 'Values'],
    '环保': ['环保', '環保', 'Environment'],
    '教育': ['教育', '教育', 'Education'],
    '隐私': ['隐私', '隱私', 'Privacy'],
    'PPT 系统': ['PPT 系统', 'PPT 系統', 'PPT Systems'],
    '文件库': ['文件库', '文件庫', 'Files'],
    'CaelusOS 文件库': ['CaelusOS 文件库', 'CaelusOS 文件庫', 'CaelusOS Files'],
    'Caelus Studio 文件库': ['Caelus Studio 文件库', 'Caelus Studio 文件庫', 'Caelus Studio Files'],
    'TreeOS 文件库': ['TreeOS 文件库', 'TreeOS 文件庫', 'TreeOS Files'],
    '友情链接': ['友情链接', '友情連結', 'Links'],
    '联系方式': ['联系方式', '聯繫方式', 'Contact'],
    '电子邮件': ['电子邮件', '電子郵件', 'Email'],
    '哔哩哔哩': ['哔哩哔哩', '嗶哩嗶哩', 'Bilibili'],
    '网页由人工智能辅助生成': ['网页由人工智能辅助生成', '網頁由人工智慧輔助生成', 'This website was created with AI assistance'],
    '关闭': ['关闭', '關閉', 'Close'],
    '空格': ['空格', '空格', 'Space'],
    '跳跃 ·': ['跳跃 ·', '跳躍 ·', 'Jump ·'],
    '重启 ·': ['重启 ·', '重啟 ·', 'Restart ·'],
  };

  var LABEL = { 'zh-CN': '简', 'zh-TW': '繁', 'en': 'EN' };
  var HTMLLANG = { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-Hant', 'en': 'en' };

  function cur() { try { return localStorage.getItem('caelus_lang') || 'zh-CN'; } catch (e) { return 'zh-CN'; } }
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  var IDX = { 'zh-CN': 0, 'zh-TW': 1, 'en': 2 };
  function tr(s) { var e = DICT[norm(s)]; if (!e) return null; var v = e[IDX[cur()]]; return v === undefined ? null : v; }

  var obs = null;
  function apply() {
    if (obs) obs.disconnect();
    try {
      if (!document.body) return;
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (node) { var p = node.parentNode; return (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }), n, nodes = [];
      while ((n = w.nextNode())) nodes.push(n);
      for (var i = 0; i < nodes.length; i++) {
        var key = norm(nodes[i].nodeValue);
        if (!key) continue;
        var t = tr(key);
        if (t !== null && t !== nodes[i].nodeValue) nodes[i].nodeValue = t;
      }
      var els = document.querySelectorAll('input[placeholder], textarea[placeholder]');
      for (var j = 0; j < els.length; j++) {
        var tp = tr(els[j].getAttribute('placeholder'));
        if (tp !== null) els[j].setAttribute('placeholder', tp);
      }
      var tt = tr(document.title);
      if (tt !== null) document.title = tt;
      document.documentElement.setAttribute('lang', HTMLLANG[cur()]);
      var btn = document.getElementById('langToggle');
      if (btn) btn.textContent = LABEL[cur()];
    } finally {
      if (obs) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  function inject() {
    if (document.getElementById('langToggle')) return;
    var mount = document.querySelector('.nav-right') || document.querySelector('.site-nav') || document.body;
    var btn = document.createElement('button');
    btn.id = 'langToggle';
    btn.className = 'theme-toggle lang-toggle';
    btn.type = 'button';
    btn.title = '简 / 繁 / EN';
    btn.textContent = LABEL[cur()];
    var tt = document.getElementById('themeToggle');
    if (tt && tt.parentNode === mount) mount.insertBefore(btn, tt); else mount.appendChild(btn);
    btn.addEventListener('click', function () {
      var order = ['zh-CN', 'zh-TW', 'en'];
      setLang(order[(order.indexOf(cur()) + 1) % 3]);
      apply();
    });
  }

  function setLang(l) { try { localStorage.setItem('caelus_lang', l); } catch (e) {} }

  var style = document.createElement('style');
  style.textContent = '.lang-toggle{font-size:12px;font-weight:600;line-height:1;display:flex;align-items:center;justify-content:center;letter-spacing:.02em;}';
  document.head.appendChild(style);

  inject();
  apply();
  obs = new MutationObserver(function () { clearTimeout(apply._t); apply._t = setTimeout(apply, 120); });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
