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

    "导航 - Caelus Studio": ["导航 - Caelus Studio", "導覽 - Caelus Studio", "Navigation - Caelus Studio"],
    "站内": ["站内", "站內", "On-site"],
    "友情": ["友情", "友情", "Friends"],
    "返回主站": ["返回主站", "返回主站", "Back to main site"],
    "返回主页": ["返回主页", "返回主頁", "Back to main site"],
    "一页，去往所有地方。": ["一页，去往所有地方。", "一頁，去往所有地方。", "One page to everywhere."],
    "站内页面、友情链接与联系方式，都整理在这里。": ["站内页面、友情链接与联系方式，都整理在这里。", "站內頁面、友情連結與聯繫方式，都整理在這裡。", "Site pages, links and contacts — all in one place."],
    "站内页面": ["站内页面", "站內頁面", "Site Pages"],
    "工作室的每一页，": ["工作室的每一页，", "工作室的每一頁，", "Every page of the studio,"],
    "都在这里。": ["都在这里。", "都在這裡。", "all right here."],
    "主站首页": ["主站首页", "主站首頁", "Main Site"],
    "导航页": ["导航页", "導覽頁", "Navigation"],
    "Caelus Studio 主站。": ["Caelus Studio 主站。", "Caelus Studio 主站。", "The Caelus Studio main site."],
    "一切为了地球、绿色和人类。": ["一切为了地球、绿色和人类。", "一切為了地球、綠色和人類。", "For the Earth, for green, for everyone."],
    "教育赋予每个人前行的力量。": ["教育赋予每个人前行的力量。", "教育賦予每個人前行的力量。", "Education empowers everyone to move forward."],
    "隐私，是每个人的基本权利。": ["隐私，是每个人的基本权利。", "隱私，是每個人的基本權利。", "Privacy is a fundamental right for everyone."],
    "新闻中心": ["新闻中心", "新聞中心", "News"],
    "工作室的最新动态与产品发布。": ["工作室的最新动态与产品发布。", "工作室的最新動態與產品發布。", "Latest updates and product releases from the studio."],
    "商店": ["商店", "商店", "Shop"],
    "Caelus Studio 官方周边，把热爱带回家。": ["Caelus Studio 官方周边，把热爱带回家。", "Caelus Studio 官方周邊，把熱愛帶回家。", "Official Caelus Studio merch — bring the passion home."],
    "VBA 生成器": ["VBA 生成器", "VBA 產生器", "VBA Generator"],
    "免费在线 VBA 代码生成器，让 PPT 直接向 DeepSeek 提问。": ["免费在线 VBA 代码生成器，让 PPT 直接向 DeepSeek 提问。", "免費線上 VBA 程式碼產生器，讓 PPT 直接向 DeepSeek 提問。", "Free online VBA code generator — let your slides ask DeepSeek directly."],
    "一起做事情的": ["一起做事情的", "一起做事情的", "Friends who build"],
    "伙伴们。": ["伙伴们。", "夥伴們。", "things with us."],
    "联系社区": ["联系社区", "聯繫社群", "Community"],
    "随时找得到我们。": ["随时找得到我们。", "隨時找得到我們。", "You can always reach us."],
    "QQ 群": ["QQ 群", "QQ 群", "QQ Group"],
    "点此加入群聊。": ["点此加入群聊。", "點此加入群聊。", "Click to join the group."],
    "关于": ["关于", "關於", "About"],
    '浏览': ['浏览', '瀏覽', 'Browse'],
    "导航": ["导航", "導航", "Navigate"],
    "我们的信念，": ["我们的信念，", "我們的信念，", "Our beliefs,"],
    "为我们导航。": ["为我们导航。", "為我們導航。", "guide our way."],
    "环保是 Caelus Studio 信念的重要一环，与这些原则一起，指引我们前进的方向。": ["环保是 Caelus Studio 信念的重要一环，与这些原则一起，指引我们前进的方向。", "環保是 Caelus Studio 信念的重要一環，與這些原則一起，指引我們前進的方向。", "Caring for the environment is a core part of what Caelus Studio believes in — together with these principles, it guides the way forward."],
    "设计": ["设计", "設計", "Design"],
    "始于设计，忠于设计。我们用 PowerPoint 打造系统、动画与界面设计，追求极致的作品品质。": ["始于设计，忠于设计。我们用 PowerPoint 打造系统、动画与界面设计，追求极致的作品品质。", "始於設計，忠於設計。我們用 PowerPoint 打造系統、動畫與介面設計，追求極致的作品品質。", "Begin with design, believe in design. We craft systems, animation and interface design with PowerPoint, pursuing the highest quality."],
    "我们毫无保留地分享技巧与经验，全力支持每一位成员学习、创造，开创属于自己的成功。": ["我们毫无保留地分享技巧与经验，全力支持每一位成员学习、创造，开创属于自己的成功。", "我們毫無保留地分享技巧與經驗，全力支持每一位成員學習、創造，開創屬於自己的成功。", "We share skills and experience without reservation, supporting every member to learn, create and achieve their own success."],
    "开源": ["开源", "開源", "Open Source"],
    "CaelusOS 等作品在 GitHub 开放，我们相信开放的分享能让创意走得更远。": ["CaelusOS 等作品在 GitHub 开放，我们相信开放的分享能让创意走得更远。", "CaelusOS 等作品在 GitHub 開放，我們相信開放的分享能讓創意走得更遠。", "Works like CaelusOS are open on GitHub — we believe open sharing takes creativity further."],
    "一切为了地球、绿色和人类。我们以 Caelus Green 2030 碳中和蓝图为目标：先尽最大努力减排，再以自然为本的方式抵消剩余排放，力争 2030 年实现运营碳中和。": ["一切为了地球、绿色和人类。我们以 Caelus Green 2030 碳中和蓝图为目标：先尽最大努力减排，再以自然为本的方式抵消剩余排放，力争 2030 年实现运营碳中和。", "一切為了地球、綠色和人類。我們以 Caelus Green 2030 碳中和藍圖為目標：先盡最大努力減排，再以自然為本的方式抵消剩餘排放，力爭 2030 年實現營運碳中和。", "For the Earth, for green, for everyone. Guided by the Caelus Green 2030 carbon-neutral blueprint: cut emissions as much as we can first, offset the rest with nature-based solutions, and aim for carbon-neutral operations by 2030."],
    "站点": ["站点", "站點", "Sites"],
    "网页由人工智能辅助生成 · 地球影像 © NASA": ["网页由人工智能辅助生成 · 地球影像 © NASA", "網頁由人工智慧輔助生成 · 地球影像 © NASA", "This website was created with AI assistance · Earth imagery © NASA"],
    "教育 - Caelus Studio": ["教育 - Caelus Studio", "教育 - Caelus Studio", "Education - Caelus Studio"],
    "理念": ["理念", "理念", "Philosophy"],
    "行动": ["行动", "行動", "Action"],
    "不止步": ["不止步", "不止步", "Never Stop"],
    "Caelus Studio 分享技巧与经验，支持每一位成员学习、创造，定义属于自己的成功。": ["Caelus Studio 分享技巧与经验，支持每一位成员学习、创造，定义属于自己的成功。", "Caelus Studio 分享技巧與經驗，支持每一位成員學習、創造，定義屬於自己的成功。", "Caelus Studio shares skills and experience, supporting every member to learn, create and define their own success."],
    "我们的理念": ["我们的理念", "我們的理念", "Our Philosophy"],
    "教育的大门开得更大，": ["教育的大门开得更大，", "教育的大門開得更大，", "The wider the doors of education open,"],
    "潜能就走得更远。": ["潜能就走得更远。", "潛能就走得更遠。", "the further potential reaches."],
    "我们相信，要创造一个更有创意的世界，教育至关重要。我们毫无保留地分享技巧与经验， 创造各种交流与学习的机会——当教育的大门能开得更大，每个人就能有更多途径发挥自身潜能。": ["我们相信，要创造一个更有创意的世界，教育至关重要。我们毫无保留地分享技巧与经验， 创造各种交流与学习的机会——当教育的大门能开得更大，每个人就能有更多途径发挥自身潜能。", "我們相信，要創造一個更有創意的世界，教育至關重要。我們毫無保留地分享技巧與經驗，創造各種交流與學習的機會——當教育的大門能開得更大，每個人就能有更多途徑發揮自身潛能。", "We believe education is essential to a more creative world. We share our skills and experience without reservation and create opportunities to connect and learn — the wider the doors of education open, the more ways everyone has to reach their potential."],
    "全方位行动": ["全方位行动", "全方位行動", "Action on All Fronts"],
    "从分享到开源，": ["从分享到开源，", "從分享到開源，", "From sharing to open source,"],
    "行动看得见。": ["行动看得见。", "行動看得見。", "action you can see."],
    "教育不只停留在口号上，我们把它落实在创作与社区的每一个环节。": ["教育不只停留在口号上，我们把它落实在创作与社区的每一个环节。", "教育不只停留在口號上，我們把它落實在創作與社區的每一個環節。", "Education is more than a slogan — we put it into every part of our work and community."],
    "技巧分享": ["技巧分享", "技巧分享", "Skill Sharing"],
    "教程、经验与避坑心得毫无保留地分享，从入门到进阶，每一位成员和访客都能学到真东西。": ["教程、经验与避坑心得毫无保留地分享，从入门到进阶，每一位成员和访客都能学到真东西。", "教程、經驗與避坑心得毫無保留地分享，從入門到進階，每一位成員和訪客都能學到真東西。", "Tutorials, experience and hard-won lessons, shared without reservation — from beginner to advanced, every member and visitor learns something real."],
    "开源作品": ["开源作品", "開源作品", "Open-Source Works"],
    "CaelusOS 等作品在 GitHub 开放源文件，供学习、研究与二次创作，让作品本身成为教材。": ["CaelusOS 等作品在 GitHub 开放源文件，供学习、研究与二次创作，让作品本身成为教材。", "CaelusOS 等作品在 GitHub 開放原始檔，供學習、研究與二次創作，讓作品本身成為教材。", "Works like CaelusOS have their source files open on GitHub for study, research and remixing — the works themselves become teaching material."],
    "社区交流": ["社区交流", "社區交流", "Community"],
    "QQ 群与 B 站评论区随时开放，设计、PPT 等话题有问必答，交流中互相启发、共同进步。": ["QQ 群与 B 站评论区随时开放，设计、PPT 等话题有问必答，交流中互相启发、共同进步。", "QQ 群與 B 站留言區隨時開放，設計、PPT 等話題有問必答，交流中互相啟發、共同進步。", "Our QQ group and Bilibili comments are always open — design and PPT questions always get answers, and we inspire each other to improve together."],
    "经验传承": ["经验传承", "經驗傳承", "Mentorship"],
    "鼓励老成员带新成员，一对一行传帮带，让技巧与经验在工作室里代代相传、生生不息。": ["鼓励老成员带新成员，一对一行传帮带，让技巧与经验在工作室里代代相传、生生不息。", "鼓勵老成員帶新成員，一對一傳幫帶，讓技巧與經驗在工作室裡代代相傳、生生不息。", "Senior members mentor newcomers one-on-one, passing skills and experience down through generations of the studio."],
    "对教育的付出，": ["对教育的付出，", "對教育的付出，", "Our commitment to education"],
    "我们不止步。": ["我们不止步。", "我們不止步。", "never stops."],
    "教育资源长期免费开放，并随着我们的创作持续更新，永不设限。": ["教育资源长期免费开放，并随着我们的创作持续更新，永不设限。", "教育資源長期免費開放，並隨著我們的創作持續更新，永不設限。", "Educational resources stay free for the long term and keep growing with our work — no limits, ever."],
    "永久免费": ["永久免费", "永久免費", "Free Forever"],
    "所有教程与资源永久免费开放，不设门槛、不看身份，学习本身就该没有价格。": ["所有教程与资源永久免费开放，不设门槛、不看身份，学习本身就该没有价格。", "所有教程與資源永久免費開放，不設門檻、不看身份，學習本身就該沒有價格。", "All tutorials and resources are free forever — no barriers, no status checks. Learning should never come with a price tag."],
    "持续更新": ["持续更新", "持續更新", "Always Updating"],
    "随着创作演进，教程与模板会不断迭代升级，今天的内容，明天只会更好。": ["随着创作演进，教程与模板会不断迭代升级，今天的内容，明天只会更好。", "隨著創作演進，教程與範本會不斷迭代升級，今天的內容，明天只會更好。", "As our work evolves, tutorials and templates keep improving — what you see today will only be better tomorrow."],
    "人人可学": ["人人可学", "人人可學", "Learn for Everyone"],
    "无论你是学生还是爱好者，无论起点高低，这里总有一条适合你的学习路径。": ["无论你是学生还是爱好者，无论起点高低，这里总有一条适合你的学习路径。", "無論你是學生還是愛好者，無論起點高低，這裡總有一條適合你的學習路徑。", "Student or hobbyist, wherever you start — there is always a learning path here that fits you."],
    "环境责任 - Caelus Studio": ["环境责任 - Caelus Studio", "環境責任 - Caelus Studio", "Environment - Caelus Studio"],
    "我们的承诺": ["我们的承诺", "我們的承諾", "Our Commitment"],
    "全方位践行": ["全方位践行", "全方位踐行", "All-Round Action"],
    "循环利用": ["循环利用", "循環利用", "Recycling"],
    "Caelus Studio 致力于环保、保护地球和碳中和。": ["Caelus Studio 致力于环保、保护地球和碳中和。", "Caelus Studio 致力於環保、保護地球和碳中和。", "Caelus Studio is committed to the environment, protecting the Earth and carbon neutrality."],
    "创新大步攀升，": ["创新大步攀升，", "創新大步攀升，", "As innovation climbs,"],
    "碳排放一降再降。": ["碳排放一降再降。", "碳排放一降再降。", "emissions keep falling."],
    "我们正式启动": ["我们正式启动", "我們正式啟動", "We have officially launched"],
    "计划——一份基于科学的碳中和蓝图。 以 2026 年为基准，我们致力于将工作室运营所产生的温室气体排放量减少": ["计划——一份基于科学的碳中和蓝图。 以 2026 年为基准，我们致力于将工作室运营所产生的温室气体排放量减少", "計畫——一份基於科學的碳中和藍圖。以 2026 年為基準，我們致力於將工作室營運所產生的溫室氣體排放量減少", " — a science-based carbon-neutral blueprint. With 2026 as the baseline, we are committed to cutting the greenhouse gas emissions from our operations by "],
    "，再优先采用以自然为本、符合严格国际标准的解决方案， 抵消剩余的碳排放，力争在": ["，再优先采用以自然为本、符合严格国际标准的解决方案， 抵消剩余的碳排放，力争在", "，再優先採用以自然為本、符合嚴格國際標準的解決方案，抵消剩餘的碳排放，力爭在", ", then prioritize nature-based solutions that meet strict international standards to offset the remaining emissions, aiming for "],
    "2030 年实现碳中和": ["2030 年实现碳中和", "2030 年實現碳中和", "carbon neutrality by 2030"],
    "% 温室气体减排目标": ["% 温室气体减排目标", "% 溫室氣體減排目標", "% greenhouse gas reduction target"],
    "年 碳中和目标": ["年 碳中和目标", "年 碳中和目標", " carbon-neutral target"],
    "% 可再生能源": ["% 可再生能源", "% 可再生能源", "% renewable energy"],
    "从设计到交付，": ["从设计到交付，", "從設計到交付，", "From design to delivery,"],
    "全方位践行。": ["全方位践行。", "全方位踐行。", "sustainability all the way."],
    "从第一笔草图到最终交付，环保理念贯穿我们创作与运营的每一个环节。": ["从第一笔草图到最终交付，环保理念贯穿我们创作与运营的每一个环节。", "從第一筆草圖到最終交付，環保理念貫穿我們創作與營運的每一個環節。", "From the first sketch to final delivery, environmental thinking runs through every part of how we create and operate."],
    "绿色设计": ["绿色设计", "綠色設計", "Green Design"],
    "作品优先采用深色底稿与高效配色，降低设备显示功耗；排版紧凑克制，减少不必要的渲染负担。": ["作品优先采用深色底稿与高效配色，降低设备显示功耗；排版紧凑克制，减少不必要的渲染负担。", "作品優先採用深色底稿與高效配色，降低裝置顯示功耗；排版緊湊克制，減少不必要的渲染負擔。", "Works favor dark canvases and efficient palettes to cut display power; compact, restrained layouts reduce unnecessary rendering load."],
    "数字优先": ["数字优先", "數位優先", "Digital First"],
    "作品全程以数字文件交付与分享，不打印、不刻盘，从源头减少纸张与耗材的消耗。": ["作品全程以数字文件交付与分享，不打印、不刻盘，从源头减少纸张与耗材的消耗。", "作品全程以數位檔案交付與分享，不列印、不燒錄，從源頭減少紙張與耗材的消耗。", "Works are delivered and shared as digital files throughout — no printing, no discs — reducing paper and consumables at the source."],
    "线上协作": ["线上协作", "線上協作", "Online Collaboration"],
    "成员之间围绕设计与 PPT 话题的交流、评审与迭代全部在线完成，减少通勤与差旅产生的碳足迹。": ["成员之间围绕设计与 PPT 话题的交流、评审与迭代全部在线完成，减少通勤与差旅产生的碳足迹。", "成員之間圍繞設計與 PPT 話題的交流、評審與迭代全部線上完成，減少通勤與差旅產生的碳足跡。", "Discussions, reviews and iterations on design and PPT topics all happen online, cutting the carbon footprint of commuting and travel."],
    "云端存储": ["云端存储", "雲端儲存", "Cloud Storage"],
    "文件库托管于云端，按需取用，避免多份冗余副本分散存储带来的能源浪费。": ["文件库托管于云端，按需取用，避免多份冗余副本分散存储带来的能源浪费。", "檔案庫託管於雲端，按需取用，避免多份冗餘副本分散儲存帶來的能源浪費。", "Our files live in the cloud, fetched on demand — avoiding the energy waste of scattered redundant copies."],
    "物尽其用、循环共享，": ["物尽其用、循环共享，", "物盡其用、循環共享，", "Use everything well, share and recycle —"],
    "让创作更持久。": ["让创作更持久。", "讓創作更持久。", "and make creativity last."],
    "我们打造经久耐用的设计资产，并在作品生命周期的每一端做好「回收」， 帮助保护地球的宝贵资源。": ["我们打造经久耐用的设计资产，并在作品生命周期的每一端做好「回收」， 帮助保护地球的宝贵资源。", "我們打造經久耐用的設計資產，並在作品生命週期的每一端做好「回收」，幫助保護地球的寶貴資源。", "We build durable design assets and \"recycle\" at every end of a work's life cycle, helping protect the Earth's precious resources."],
    "模板复用": ["模板复用", "範本復用", "Template Reuse"],
    "一套模板持续迭代多年，架构化的母版设计让每次更新都建立在既有成果之上，而非推倒重来。": ["一套模板持续迭代多年，架构化的母版设计让每次更新都建立在既有成果之上，而非推倒重来。", "一套範本持續迭代多年，架構化的母版設計讓每次更新都建立在既有成果之上，而非推倒重來。", "One template iterates for years — a well-structured master design means every update builds on existing work instead of starting over."],
    "素材共享": ["素材共享", "素材共享", "Shared Assets"],
    "图标、字体、配色与组件在成员间开放共享，一份素材全工作室复用，避免重复创作。": ["图标、字体、配色与组件在成员间开放共享，一份素材全工作室复用，避免重复创作。", "圖示、字體、配色與元件在成員間開放共享，一份素材全工作室復用，避免重複創作。", "Icons, fonts, palettes and components are openly shared among members — one asset reused studio-wide, no duplicated work."],
    "文件回收整理": ["文件回收整理", "檔案回收整理", "File Cleanup"],
    "定期整理文件库，归档过时版本、清理冗余缓存，让云端存储始终精简高效。": ["定期整理文件库，归档过时版本、清理冗余缓存，让云端存储始终精简高效。", "定期整理檔案庫，歸檔過時版本、清理冗餘快取，讓雲端儲存始終精簡高效。", "The file library is tidied regularly — outdated versions archived, redundant caches cleared — keeping cloud storage lean and efficient."],
    "经久耐用": ["经久耐用", "經久耐用", "Built to Last"],
    "作品经受得住时间考验：严格的细节打磨与一致性检查，让每一份设计都能被长期信赖与沿用。": ["作品经受得住时间考验：严格的细节打磨与一致性检查，让每一份设计都能被长期信赖与沿用。", "作品經受得住時間考驗：嚴格的細節打磨與一致性檢查，讓每一份設計都能被長期信賴與沿用。", "Works stand the test of time: rigorous detail polishing and consistency checks mean every design can be trusted and reused for years."],
    "垃圾分类": ["垃圾分类", "垃圾分類", "Waste Sorting"],
    "工作室与日常生活中的垃圾严格分类：可回收物回收再利用，有害垃圾单独处理，减少填埋与焚烧对环境的伤害。": ["工作室与日常生活中的垃圾严格分类：可回收物回收再利用，有害垃圾单独处理，减少填埋与焚烧对环境的伤害。", "工作室與日常生活中的垃圾嚴格分類：可回收物回收再利用，有害垃圾單獨處理，減少掩埋與焚燒對環境的傷害。", "Waste is strictly sorted at the studio and at home: recyclables are recycled, hazardous waste is handled separately, reducing the harm of landfill and incineration."],
    "隐私 - Caelus Studio": ["隐私 - Caelus Studio", "隱私 - Caelus Studio", "Privacy - Caelus Studio"],
    "日常保护": ["日常保护", "日常保護", "Everyday Protection"],
    "透明与控制": ["透明与控制", "透明與控制", "Transparency & Control"],
    "Caelus Studio 不追踪、不打扰，尊重并保护每一位访客的隐私。": ["Caelus Studio 不追踪、不打扰，尊重并保护每一位访客的隐私。", "Caelus Studio 不追蹤、不打擾，尊重並保護每一位訪客的隱私。", "Caelus Studio does not track or intrude — we respect and protect every visitor's privacy."],
    "隐私理念": ["隐私理念", "隱私理念", "Privacy Philosophy"],
    "真正的创新，": ["真正的创新，", "真正的創新，", "True innovation"],
    "是保护隐私。": ["是保护隐私。", "是保護隱私。", "is protecting privacy."],
    "隐私是每个人的基本权利，也是 Caelus Studio 的一项核心信念。 我们设计网站的理念就是保护隐私：少收集、不追踪、全透明——我们坚信，这才是真正的尊重。": ["隐私是每个人的基本权利，也是 Caelus Studio 的一项核心信念。 我们设计网站的理念就是保护隐私：少收集、不追踪、全透明——我们坚信，这才是真正的尊重。", "隱私是每個人的基本權利，也是 Caelus Studio 的一項核心信念。我們設計網站的理念就是保護隱私：少收集、不追蹤、全透明——我們堅信，這才是真正的尊重。", "Privacy is a fundamental right of everyone and a core belief at Caelus Studio. We design the site around protecting it: collect less, track nobody, stay fully transparent — we firmly believe that is what respect really means."],
    "这些保护措施，": ["这些保护措施，", "這些保護措施，", "These protections,"],
    "每天都用得到。": ["每天都用得到。", "每天都用得到。", "at work every day."],
    "不需要你做任何额外设置，保护从你打开网页的那一刻就开始了。": ["不需要你做任何额外设置，保护从你打开网页的那一刻就开始了。", "不需要你做任何額外設定，保護從你打開網頁的那一刻就開始了。", "No extra setup needed — protection starts the moment you open the page."],
    "不追踪": ["不追踪", "不追蹤", "No Tracking"],
    "网站不嵌入任何统计、广告或跟踪脚本。你看什么、看多久，只有你自己知道。": ["网站不嵌入任何统计、广告或跟踪脚本。你看什么、看多久，只有你自己知道。", "網站不嵌入任何統計、廣告或追蹤腳本。你看什麼、看多久，只有你自己知道。", "The site embeds no analytics, ads or tracking scripts. What you view, and for how long, is known only to you."],
    "无需账户": ["无需账户", "無需帳號", "No Accounts"],
    "纯静态网站，没有登录、没有注册、没有 Cookie 弹窗——没有账户，也就没有账户数据可泄露。": ["纯静态网站，没有登录、没有注册、没有 Cookie 弹窗——没有账户，也就没有账户数据可泄露。", "純靜態網站，沒有登入、沒有註冊、沒有 Cookie 彈窗——沒有帳號，也就沒有帳號資料可洩露。", "A purely static site — no login, no sign-up, no cookie banners. No accounts means no account data to leak."],
    "全程加密": ["全程加密", "全程加密", "Encrypted End to End"],
    "全站强制 HTTPS，你与网站之间的所有数据传输都经过加密保护。": ["全站强制 HTTPS，你与网站之间的所有数据传输都经过加密保护。", "全站強制 HTTPS，你與網站之間的所有資料傳輸都經過加密保護。", "HTTPS is enforced site-wide — all data between you and the site travels encrypted."],
    "本地偏好": ["本地偏好", "本機偏好", "Local Preferences"],
    "主题切换等偏好仅保存在你自己的设备上，用于记住你的选择，绝不上传服务器。": ["主题切换等偏好仅保存在你自己的设备上，用于记住你的选择，绝不上传服务器。", "主題切換等偏好僅保存在你自己的裝置上，用於記住你的選擇，絕不上傳伺服器。", "Preferences like your theme choice are stored only on your own device to remember your settings — never uploaded to any server."],
    "你的数据，": ["你的数据，", "你的資料，", "Your data,"],
    "由你掌控。": ["由你掌控。", "由你掌控。", "in your control."],
    "本网站不收集任何个人信息，也不留存访问记录。若你通过电子邮件或社交渠道联系我们， 相关交流内容仅用于回复你的问题，你随时可以要求我们删除，我们会照做。": ["本网站不收集任何个人信息，也不留存访问记录。若你通过电子邮件或社交渠道联系我们， 相关交流内容仅用于回复你的问题，你随时可以要求我们删除，我们会照做。", "本網站不收集任何個人資訊，也不留存訪問記錄。若你透過電子郵件或社交渠道聯繫我們，相關交流內容僅用於回覆你的問題，你隨時可以要求我們刪除，我們會照做。", "This site collects no personal information and keeps no visit records. If you contact us by email or social channels, that conversation is used only to reply to you — ask us to delete it anytime, and we will."],
    "最小收集": ["最小收集", "最小收集", "Minimal Collection"],
    "不收集姓名、手机号等任何个人信息，不留存访问日志，能不收集的坚决不收集。": ["不收集姓名、手机号等任何个人信息，不留存访问日志，能不收集的坚决不收集。", "不收集姓名、手機號等任何個人資訊，不留存訪問日誌，能不收集的堅決不收集。", "No names, phone numbers or any personal information; no visit logs. If it does not need collecting, we do not collect it."],
    "随时可删": ["随时可删", "隨時可刪", "Delete Anytime"],
    "你主动提供给我们的信息，随时可以要求删除，一句话的事，无需任何理由。": ["你主动提供给我们的信息，随时可以要求删除，一句话的事，无需任何理由。", "你主動提供給我們的資訊，隨時可以要求刪除，一句話的事，無需任何理由。", "Anything you have actively shared with us can be deleted on request — just say the word, no reason needed."],
    "下载作品": ["下载作品", "下載作品", "Download works"],
  };

  var LABEL = { 'zh-CN': '简', 'zh-TW': '繁', 'en': 'EN' };
  var HTMLLANG = { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-Hant', 'en': 'en' };

  function cur() { try { return localStorage.getItem('caelus_lang') || 'zh-CN'; } catch (e) { return 'zh-CN'; } }
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  var IDX = { 'zh-CN': 0, 'zh-TW': 1, 'en': 2 };
  function tr(s) { var e = DICT[norm(s)]; if (!e) return null; var v = e[IDX[cur()]]; return v === undefined ? null : v; }

  var obs = null;
  var ORIG_N = new WeakMap(), ORIG_P = new WeakMap(), ORIG_T = null;
  function apply() {
    if (obs) obs.disconnect();
    try {
      if (!document.body) return;
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (node) { var p = node.parentNode; return (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }), n, nodes = [];
      while ((n = w.nextNode())) nodes.push(n);
      for (var i = 0; i < nodes.length; i++) {
        if (!ORIG_N.has(nodes[i])) ORIG_N.set(nodes[i], norm(nodes[i].nodeValue));
        var key = ORIG_N.get(nodes[i]);
        if (!key) continue;
        var t = tr(key);
        if (t !== null && t !== nodes[i].nodeValue) nodes[i].nodeValue = t;
      }
      var els = document.querySelectorAll('input[placeholder], textarea[placeholder]');
      for (var j = 0; j < els.length; j++) {
        if (!ORIG_P.has(els[j])) ORIG_P.set(els[j], norm(els[j].getAttribute('placeholder')));
        var tp = tr(ORIG_P.get(els[j]));
        if (tp !== null) els[j].setAttribute('placeholder', tp);
      }
      if (ORIG_T === null) ORIG_T = document.title;
      var tt = tr(ORIG_T);
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
