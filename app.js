// 宋老师与三把刀 · 主逻辑
'use strict';

// ── 状态 ──────────────────────────────────────
let currentView = 'home';
let currentLesson = null;
let currentModule = null;
let completedLessons = new Set(JSON.parse(localStorage.getItem('completed') || '[]'));
let xp = parseInt(localStorage.getItem('xp') || '0');
let quoteIdx = 0;
let quizAnswered = false;
let fq = { idx: 0, score: 0, questions: [] };

// ── 初始化 ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderModuleNav();
  renderLearningMap();
  renderQuotes();
  renderModuleGrid();
  renderQuizCenter();
  updateProgress();
  updateXP(0);
  updateStats();
  document.getElementById('total-count').textContent = totalLessons();
  document.getElementById('completed-count').textContent = completedLessons.size;

  document.getElementById('ai-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // 自动轮播金句
  setInterval(() => { quoteIdx = (quoteIdx + 1) % QUOTES.length; showQuote(quoteIdx); }, 5000);
});

function totalLessons() { return MODULES.reduce((a, m) => a + m.lessons.length, 0); }

// ── 视图切换 ──────────────────────────────────
window.showView = function(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'modules') {
    document.getElementById('lesson-content').style.display = 'none';
    document.getElementById('module-grid').style.display = 'grid';
    document.getElementById('module-view-title').textContent = '选择学习模块';
    document.getElementById('breadcrumb').textContent = '首页 / 学习模块';
  }
};

window.startLearning = function() { showView('modules'); };

// ── 侧边栏 ────────────────────────────────────
function renderModuleNav() {
  const nav = document.getElementById('module-nav');
  nav.innerHTML = MODULES.map(m => `
    <div class="module-nav-item">
      <div class="module-nav-header" onclick="toggleModuleNav('${m.id}', this)">
        <span class="mod-icon">${m.icon}</span>
        <span class="mod-name">${m.title}</span>
        <span class="mod-count">${m.lessons.length}</span>
      </div>
      <div class="module-lessons" id="nav-${m.id}">
        ${m.lessons.map((l, i) => `
          <button class="lesson-nav-btn ${completedLessons.has(l.id) ? 'completed' : ''}" 
            id="nav-btn-${l.id}" onclick="openLesson('${m.id}','${l.id}')">
            <span class="lesson-check">${completedLessons.has(l.id) ? '✅' : '○'}</span>
            ${l.title}
          </button>`).join('')}
      </div>
    </div>`).join('');
}

window.toggleModuleNav = function(id, el) {
  const panel = document.getElementById('nav-' + id);
  panel.classList.toggle('open');
  el.classList.toggle('active-module');
};

document.getElementById('sidebar-toggle').addEventListener('click', () => {
  const sb = document.getElementById('left-sidebar');
  sb.classList.toggle('collapsed');
  document.getElementById('sidebar-toggle').textContent = sb.classList.contains('collapsed') ? '▶' : '◀';
});

// ── 首页：学习地图 ────────────────────────────
function renderLearningMap() {
  const el = document.getElementById('learning-map');
  el.innerHTML = MODULES.map(m => {
    const done = m.lessons.filter(l => completedLessons.has(l.id)).length;
    const pct = m.lessons.length ? Math.round(done / m.lessons.length * 100) : 0;
    return `<div class="map-module" onclick="openModule('${m.id}')">
      <div class="map-mod-icon">${m.icon}</div>
      <div class="map-mod-title">${m.title}</div>
      <div class="map-mod-count">${m.lessons.length} 课 · ${done}/${m.lessons.length} 完成</div>
      <div class="map-progress-bar"><div class="map-progress-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

// ── 金句轮播 ──────────────────────────────────
function renderQuotes() {
  const inner = document.getElementById('quote-inner');
  const dots = document.getElementById('quote-dots');
  inner.innerHTML = QUOTES.map(q => `
    <div class="quote-slide">
      <div class="quote-text">${q.text}</div>
      <div class="quote-source">— ${q.src}</div>
    </div>`).join('');
  dots.innerHTML = QUOTES.map((_, i) => `<span class="qdot ${i===0?'active':''}" onclick="showQuote(${i})"></span>`).join('');
}

function showQuote(i) {
  quoteIdx = i;
  document.getElementById('quote-inner').style.transform = `translateX(-${i * 100}%)`;
  document.querySelectorAll('.qdot').forEach((d, idx) => d.classList.toggle('active', idx === i));
}
window.prevQuote = () => showQuote((quoteIdx - 1 + QUOTES.length) % QUOTES.length);
window.nextQuote = () => showQuote((quoteIdx + 1) % QUOTES.length);

// ── 模块网格 ──────────────────────────────────
function renderModuleGrid() {
  document.getElementById('module-grid').innerHTML = MODULES.map(m => {
    const done = m.lessons.filter(l => completedLessons.has(l.id)).length;
    const pct = m.lessons.length ? Math.round(done / m.lessons.length * 100) : 0;
    return `<div class="module-card" onclick="openModule('${m.id}')" style="background:${m.color}">
      <div class="mc-icon">${m.icon}</div>
      <div class="mc-tag" style="background:${m.color};color:${m.tagColor};border:1px solid ${m.tagColor}40">${m.tag}</div>
      <div class="mc-title">${m.title}</div>
      <div class="mc-desc">${m.desc}</div>
      <div class="mc-lessons">
        <span>📖 ${m.lessons.length} 节课</span>
        <span>✅ ${done}/${m.lessons.length} 完成</span>
      </div>
      <div class="mc-progress"><div class="mc-progress-fill" style="width:${pct}%;background:${m.tagColor}"></div></div>
    </div>`;
  }).join('');
}

window.openModule = function(moduleId) {
  currentModule = MODULES.find(m => m.id === moduleId);
  if (!currentModule) return;
  showView('modules');
  document.getElementById('module-view-title').textContent = currentModule.title;
  document.getElementById('breadcrumb').textContent = `首页 / 学习模块 / ${currentModule.title}`;
  document.getElementById('module-grid').style.display = 'none';

  const lc = document.getElementById('lesson-content');
  lc.style.display = 'block';
  lc.innerHTML = `
    <button class="lesson-back-btn" onclick="backToModules()">← 返回模块列表</button>
    <div class="module-card" style="background:${currentModule.color};margin-bottom:24px">
      <div class="mc-icon">${currentModule.icon}</div>
      <div class="mc-title">${currentModule.title}</div>
      <div class="mc-desc">${currentModule.desc}</div>
    </div>
    <div class="module-grid" style="padding:0">
      ${currentModule.lessons.map((l, i) => `
        <div class="module-card" onclick="openLesson('${currentModule.id}','${l.id}')" style="cursor:pointer">
          <div class="lesson-num">第 ${i+1} 课</div>
          <div class="mc-title" style="font-size:16px">${l.title}</div>
          <div class="mc-desc" style="font-size:12px">${l.objective}</div>
          <div class="mc-lessons">
            <span>⏱ ${l.time}</span>
            <span>📶 ${l.difficulty}</span>
            ${completedLessons.has(l.id) ? '<span style="color:#10b981">✅ 已完成</span>' : ''}
          </div>
        </div>`).join('')}
    </div>`;
};

window.backToModules = function() {
  document.getElementById('lesson-content').style.display = 'none';
  document.getElementById('module-grid').style.display = 'grid';
  document.getElementById('module-view-title').textContent = '选择学习模块';
  document.getElementById('breadcrumb').textContent = '首页 / 学习模块';
};

// ── Lesson 页 ─────────────────────────────────
window.openLesson = function(moduleId, lessonId) {
  const mod = MODULES.find(m => m.id === moduleId);
  const lesson = mod?.lessons.find(l => l.id === lessonId);
  if (!lesson) return;
  currentModule = mod;
  currentLesson = lesson;
  showView('modules');

  document.getElementById('module-grid').style.display = 'none';
  document.getElementById('breadcrumb').textContent = `首页 / ${mod.title} / ${lesson.title}`;
  document.getElementById('module-view-title').textContent = lesson.title;

  const isDone = completedLessons.has(lesson.id);
  const lIdx = mod.lessons.indexOf(lesson);
  const prev = mod.lessons[lIdx - 1];
  const next = mod.lessons[lIdx + 1];

  const lc = document.getElementById('lesson-content');
  lc.style.display = 'block';
  lc.innerHTML = `
    <button class="lesson-back-btn" onclick="openModule('${mod.id}')">← 返回 ${mod.title}</button>
    <div class="lesson-header">
      <div class="lesson-module-badge" style="background:${mod.color};color:${mod.tagColor};border:1px solid ${mod.tagColor}40">${mod.icon} ${mod.title}</div>
      <div class="lesson-num">第 ${lIdx+1} 课 · ${lesson.difficulty} · ⏱ ${lesson.time}</div>
      <h1 class="lesson-title">${lesson.title}</h1>
    </div>

    ${makeBlock('🎯','学习目标','lb-obj-'+lessonId,`<div class="lb-objective">${lesson.objective}</div>`,true)}
    ${makeBlock('💡','核心洞见','lb-ins-'+lessonId,`<div class="key-insights">${lesson.insights.map(i=>`<div class="insight-chip">${i}</div>`).join('')}</div>`,true)}
    ${makeBlock('📖','概念解释','lb-con-'+lessonId,`<div class="concept-box">${lesson.concept.split('\n\n').map(p=>`<p>${p}</p>`).join('')}</div>`)}
    ${makeBlock('🏆','案例分析','lb-case-'+lessonId,`<div class="case-box"><div class="case-label">CASE STUDY</div><p>${lesson.caseStudy}</p></div>`)}
    ${makeBlock('✍️','核心金句','lb-quo-'+lessonId,lesson.quotes.map(q=>`<div class="key-quote">${q}<div class="quote-attr">— ${mod.title}</div></div>`).join(''))}
    ${makeBlock('🧠','互动测验','lb-quiz-'+lessonId,renderEmbedQuiz(lesson))}
    ${makeBlock('💭','思考反思','lb-ref-'+lessonId,`<div class="reflection-box"><div class="reflection-q">🤔 ${lesson.reflection}</div><textarea class="reflection-input" placeholder="写下你的思考..."></textarea></div>`)}

    <div class="lesson-nav-btns">
      ${prev ? `<button onclick="openLesson('${mod.id}','${prev.id}')">← ${prev.title}</button>` : '<span></span>'}
      <button class="mark-complete-btn ${isDone?'done':''}" id="complete-btn" onclick="markComplete('${lesson.id}')">
        ${isDone ? '✅ 已完成' : '✓ 标记完成 +50 XP'}
      </button>
      ${next ? `<button class="next-btn" onclick="openLesson('${mod.id}','${next.id}')">下一课 →</button>` : `<button onclick="openModule('${mod.id}')">🎉 完成模块</button>`}
    </div>`;

  // 展开前两个区块
  document.querySelectorAll('.lb-body').forEach((b, i) => { if (i < 2) b.classList.add('open'); });
  document.querySelectorAll('.lb-toggle').forEach((t, i) => { if (i < 2) t.classList.add('open'); });

  // 开启对应导航组
  const navGroup = document.getElementById('nav-' + moduleId);
  if (navGroup) { navGroup.classList.add('open'); }
  document.querySelectorAll('.lesson-nav-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('nav-btn-' + lessonId);
  if (activeBtn) activeBtn.classList.add('active');
};

function makeBlock(icon, title, id, content, open=false) {
  return `<div class="lesson-block">
    <div class="lb-header" onclick="toggleBlock('${id}')">
      <span class="lb-icon">${icon}</span>
      <span class="lb-title">${title}</span>
      <span class="lb-toggle ${open?'open':''}">▾</span>
    </div>
    <div class="lb-body ${open?'open':''}" id="${id}">${content}</div>
  </div>`;
}

window.toggleBlock = function(id) {
  const body = document.getElementById(id);
  const toggle = body.previousElementSibling.querySelector('.lb-toggle');
  body.classList.toggle('open');
  toggle.classList.toggle('open');
};

function renderEmbedQuiz(lesson) {
  const q = lesson.quiz;
  const qid = lesson.id + '-q';
  return `<div class="quiz-embed">
    <div class="quiz-question">${q.q}</div>
    <div class="quiz-options">
      ${q.opts.map((opt, i) => `
        <div class="quiz-option" id="${qid}-opt-${i}" onclick="checkEmbedQuiz('${qid}',${i},${q.ans},'${encodeURIComponent(q.exp)}')">
          <div class="quiz-opt-key">${String.fromCharCode(65+i)}</div>
          ${opt}
        </div>`).join('')}
    </div>
    <div class="quiz-feedback" id="${qid}-fb"></div>
  </div>`;
}

window.checkEmbedQuiz = function(qid, chosen, ans, expEnc) {
  const fb = document.getElementById(qid + '-fb');
  if (fb.classList.contains('show')) return;
  const opts = document.querySelectorAll(`[id^="${qid}-opt-"]`);
  opts.forEach((o, i) => {
    o.classList.add(i === ans ? 'correct' : (i === chosen ? 'wrong' : ''));
  });
  fb.classList.add('show', chosen === ans ? 'correct' : 'wrong');
  fb.innerHTML = chosen === ans
    ? `✅ 正确！${decodeURIComponent(expEnc)}`
    : `❌ 再想想！${decodeURIComponent(expEnc)}`;
  if (chosen === ans) updateXP(20);
};

window.markComplete = function(lessonId) {
  if (completedLessons.has(lessonId)) return;
  completedLessons.add(lessonId);
  localStorage.setItem('completed', JSON.stringify([...completedLessons]));
  updateXP(50);
  updateProgress();
  updateStats();
  document.getElementById('complete-btn').textContent = '✅ 已完成';
  document.getElementById('complete-btn').classList.add('done');
  const nb = document.getElementById('nav-btn-' + lessonId);
  if (nb) { nb.classList.add('completed'); nb.querySelector('.lesson-check').textContent = '✅'; }
  renderLearningMap();
  renderModuleGrid();
  showToast('🎉 课程完成！获得 50 XP', 'success');
};

// ── 进度和 XP ─────────────────────────────────
function updateProgress() {
  const pct = totalLessons() ? Math.round(completedLessons.size / totalLessons() * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `学习进度 ${pct}%`;
}

function updateXP(add) {
  xp += add;
  localStorage.setItem('xp', xp);
  document.getElementById('xp-count').textContent = xp;
}

function updateStats() {
  document.getElementById('completed-count').textContent = completedLessons.size;
}

// ── 测验中心 ──────────────────────────────────
function buildAllQuizQuestions() {
  const qs = [];
  MODULES.forEach(m => m.lessons.forEach(l => {
    qs.push({ ...l.quiz, module: m.title, lesson: l.title });
  }));
  return qs;
}

function renderQuizCenter() {
  const all = buildAllQuizQuestions();
  fq.questions = all;
  fq.idx = 0; fq.score = 0;
  document.getElementById('quiz-area').innerHTML = `
    <div class="quiz-selector">
      ${MODULES.map(m => `<button class="qs-btn" onclick="startModuleQuiz('${m.id}')">${m.icon} ${m.title}<br><small style="color:#64748b">${m.lessons.length} 题</small></button>`).join('')}
      <button class="qs-btn" onclick="startFullQuiz()">🎯 全部测验<br><small style="color:#64748b">${all.length} 题</small></button>
    </div>
    <div id="fq-content"></div>`;
}

window.startFullQuiz = function() {
  fq.questions = buildAllQuizQuestions();
  fq.idx = 0; fq.score = 0;
  renderFQQuestion();
};

window.startModuleQuiz = function(moduleId) {
  const mod = MODULES.find(m => m.id === moduleId);
  fq.questions = mod.lessons.map(l => ({ ...l.quiz, module: mod.title, lesson: l.title }));
  fq.idx = 0; fq.score = 0;
  renderFQQuestion();
};

function renderFQQuestion() {
  const q = fq.questions[fq.idx];
  if (!q) { renderQuizResult(); return; }
  quizAnswered = false;
  document.getElementById('fq-content').innerHTML = `
    <div class="full-quiz-area">
      <div class="fq-question-num">题目 ${fq.idx+1} / ${fq.questions.length} · ${q.module}</div>
      <div class="fq-question">${q.q}</div>
      <div class="fq-options">
        ${q.opts.map((opt, i) => `
          <div class="fq-opt" id="fq-opt-${i}" onclick="answerFQ(${i},${q.ans},'${encodeURIComponent(q.exp)}')">
            <div class="fq-opt-letter">${String.fromCharCode(65+i)}</div>${opt}
          </div>`).join('')}
      </div>
      <div class="fq-feedback" id="fq-fb"></div>
      <div class="fq-actions">
        <button class="fq-submit" onclick="answerFQ(-1,${q.ans},'${encodeURIComponent(q.exp)}')">提交答案</button>
        <button class="fq-next" onclick="nextFQ()" style="display:none" id="fq-next-btn">下一题 →</button>
      </div>
    </div>`;
}

window.answerFQ = function(chosen, ans, expEnc) {
  if (quizAnswered) return;
  quizAnswered = true;
  if (chosen === -1) { chosen = -2; }
  document.querySelectorAll('.fq-opt').forEach((o, i) => {
    o.classList.add(i === ans ? 'correct' : (i === chosen ? 'wrong' : ''));
    o.style.pointerEvents = 'none';
  });
  const fb = document.getElementById('fq-fb');
  const correct = chosen === ans;
  if (correct) { fq.score++; updateXP(10); }
  fb.classList.add('show', correct ? 'correct' : 'wrong');
  fb.style.background = correct ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
  fb.style.border = correct ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
  fb.style.color = correct ? '#10b981' : '#ef4444';
  fb.style.padding = '14px 18px'; fb.style.borderRadius = '10px'; fb.style.marginBottom = '16px';
  fb.innerHTML = (correct ? '✅ 正确！' : '❌ ') + decodeURIComponent(expEnc);
  document.getElementById('fq-next-btn').style.display = 'inline-block';
};

window.nextFQ = function() { fq.idx++; renderFQQuestion(); };

function renderQuizResult() {
  const total = fq.questions.length;
  const pct = Math.round(fq.score / total * 100);
  const stars = pct >= 90 ? '⭐⭐⭐' : pct >= 70 ? '⭐⭐' : '⭐';
  document.getElementById('fq-content').innerHTML = `
    <div class="quiz-result">
      <div class="qr-score" style="color:${pct>=70?'#10b981':'#f59e0b'}">${pct}%</div>
      <div class="qr-label">${fq.score} / ${total} 题答对</div>
      <div class="qr-stars">${stars}</div>
      <p style="color:#94a3b8;margin-bottom:24px">${pct>=90?'太棒了！你已完全掌握这些知识！':pct>=70?'不错！继续复习可以做得更好！':'建议重新学习相关课程内容。'}</p>
      <button class="qr-btn" onclick="renderQuizCenter()">🔄 再来一次</button>
    </div>`;
}

// ── AI 助教 ────────────────────────────────────
window.toggleAiPanel = function() {
  document.getElementById('ai-panel').classList.toggle('hidden');
};
document.getElementById('ai-panel-toggle').addEventListener('click', toggleAiPanel);

window.askAI = function(q) {
  document.getElementById('ai-input').value = q;
  sendAIMessage();
};

window.sendAIMessage = function() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  addAIMsg(msg, 'user');
  const thinking = addAIMsg('正在思考中...', 'bot', true);
  setTimeout(() => {
    thinking.remove();
    const resp = getAIResponse(msg);
    addAIMsg(resp, 'bot');
  }, 800 + Math.random() * 600);
};

function addAIMsg(text, type, thinking=false) {
  const msgs = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = `ai-msg ai-msg-${type}${thinking?' ai-thinking':''}`;
  div.innerHTML = `<div class="msg-bubble">${text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function getAIResponse(q) {
  const lower = q.toLowerCase();
  for (const [key, val] of Object.entries(AI_KNOWLEDGE)) {
    if (lower.includes(key.toLowerCase()) || lower.includes(key.slice(0,3))) return val;
  }
  // 关键词匹配
  if (lower.includes('战略') || lower.includes('定位')) return AI_KNOWLEDGE['IP程式三角'];
  if (lower.includes('直播')) return `关于直播打法，宋老师的核心建议是：\n\n🎯 **找对标**：找与你风格相似、跑得不错的人，而不是顶级博主（抄不来）。\n\n📋 **拆解颗粒度**：细到「他几点上单、怎么顶水军、什么时候上福袋」——后端运营动作才是关键。\n\n🔄 **先完全复刻，再创新**：宋老师亲测从个位数在线到3000人在线，核心就是极细颗粒度复刻对标+坚持。\n\n宋老师金句：「无论私域还是公域，只要你抄得够细，没有做不起来的直播。」`;
  if (lower.includes('投放') || lower.includes('付费')) return `关于投放，宋老师的核心观点：\n\n💡 **投放是今天最便宜的**：2025年初线索成本30元，现在120元，今天投比明天投划算。\n\n📊 **ROI参考**：\n- 建家居/建材：ROI 1:10~1:20\n- 珠宝行业：ROI 1:11~1:15\n- 商业类赛道：台上流量成本极低\n\n🔑 **投放前提**：先用老粉测出转化率，算清单个微信价值，再决定投放规模。\n\n宋老师金句：「随着自然流量越来越难，投放是今天唯一确定性能启动的方式。」`;
  if (lower.includes('知识库')) return `知识库打造的5个核心问题：\n\n1️⃣ **介绍自己**：你的职业、服务对象、擅长解决什么问题、核心标签。\n\n2️⃣ **为什么走上这条路**：人生关键转折点、改变你人生的困难事件。\n\n3️⃣ **最不认同的行业现象**：「痛点反叛宣言」是最好获取流量的核武器。\n\n4️⃣ **核心案例与战绩**：人设本质上是结果的展示。\n\n5️⃣ **用户长期关注能获得什么**：你的使命、愿景和价值观。\n\n把这5个问题答案喂给AI，它就能帮你生成专属的知识库与变现体系。`;
  if (lower.includes('5天') || lower.includes('五天')) return `宋老师的「5天IP跃迁计划」：\n\n📅 **第1天**：人设跃迁 —— 知识库搭建、访谈定位、slogan确定\n\n📅 **第2天**：内容跃迁 —— AI批量文案、低粉高赞实操、现场拍摄\n\n📅 **第3天**：视觉跃迁 —— 置顶视频拍摄（原价9.8万）、形象照、影棚造型\n\n📅 **第4天**：成交跃迁 —— 刀刀老师独家成交文案、公域转私域流程\n\n📅 **第5天**：AI分身跃迁 —— 打造20+个智能体、行业AI结合\n\n核心原则：70%实操 + 20%听课 + 10%作业 = 100%变现闭环`;
  return `我理解你在问「${q}」。\n\n根据宋老师的课程内容，这个问题涉及到 IP 打造的核心方法论。建议你：\n\n1. 回到对应的课程模块深度学习\n2. 用实操去验证理论\n3. 记住核心原则：**战略正确 → 杠杆放大 → 变现闭环**\n\n你可以问我更具体的问题，比如：\n- IP程式三角是什么？\n- 21天流程怎么操作？\n- 高客单怎么成交？\n- 数字人有没有流量？\n- 低粉高赞怎么做？`;
}

// ── Toast ──────────────────────────────────────
window.showToast = function(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 3000);
};
