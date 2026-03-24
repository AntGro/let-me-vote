/* ═══════════════════════════════════════════════════════════════
   Let Me Vote — Rendering Engine + Interactive Logic
   ═══════════════════════════════════════════════════════════════ */

let DATA = null; // election data
let ELECTIONS = []; // available elections
let currentElectionId = null;
let activeFilter = null;
let ELIMINATED_IDS = [];

function lsKey(base) { return (currentElectionId || 'default') + '-' + base; }

/* ── Bootstrap ── */
async function init() {
  // Load election index
  try {
    const idx = await fetch('elections/index.json');
    const index = await idx.json();
    ELECTIONS = index.elections || [];
  } catch(e) {
    // Fallback: single election.json
    ELECTIONS = [{ id: 'default', label: 'Élection', file: 'election.json', flag: '🗳️', default: true }];
  }

  // Populate selector
  const select = document.getElementById('electionSelect');
  ELECTIONS.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.label;
    select.appendChild(opt);
  });

  // Hide selector if only one election
  if (ELECTIONS.length <= 1) select.style.display = 'none';

  // Load saved or default election
  const saved = localStorage.getItem('lmv-election');
  const defaultEl = ELECTIONS.find(e => e.default) || ELECTIONS[0];
  const toLoad = (saved && ELECTIONS.find(e => e.id === saved)) || defaultEl;

  select.value = toLoad.id;
  await loadElection(toLoad.id);
}

async function loadElection(electionId) {
  const el = ELECTIONS.find(e => e.id === electionId);
  if (!el) return;

  currentElectionId = el.id;
  localStorage.setItem('lmv-election', el.id);

  const resp = await fetch(el.file);
  DATA = await resp.json();
  ELIMINATED_IDS = DATA.eliminated_ids || [];

  // Update header
  document.getElementById('headerFlag').textContent = el.flag || '🗳️';
  document.getElementById('headerTitle').textContent = DATA.meta.title;
  document.getElementById('headerSubtitle').textContent = DATA.meta.subtitle;
  document.getElementById('headerDate').textContent = DATA.meta.dates;
  document.title = DATA.meta.title;

  renderAll();
  initTour();
  initRanks();
  initDragDrop();
  initAnon();
  initMainView();
}

async function switchElection(electionId) {
  clearFilter();
  await loadElection(electionId);
}

function renderAll() {
  renderCandidates();
  renderResultsBanners();
  renderEliminations();
  renderTopicNav();
  renderTopics();
  renderLeaderboardWeights();
  renderSynthese();
  renderLeaderboard();
  renderFooter();
}

/* ═══════════════════════════════════════
   RENDERING FUNCTIONS
   ═══════════════════════════════════════ */

function renderCandidates() {
  const grid = document.getElementById('candidatesGrid');
  grid.innerHTML = DATA.candidates.map(c => `
    <div class="candidate-card" data-candidate="${c.id}" onclick="toggleCandidate('${c.id}')">
      <div class="cand-avatar" style="background:${c.color}">${c.initials}</div>
      <div class="cand-info">
        <div class="cand-name">${c.name}</div>
        <div class="cand-party">${c.party}</div>
      </div>
      <div class="cand-poll">
        <span class="poll-num">${c.r1_pct.toFixed(2)}%</span>
        <span class="poll-label">Résultat 1er tour</span>
      </div>
    </div>
  `).join('');
}

function renderResultsBanners() {
  const container = document.getElementById('resultsBanners');
  const r1 = DATA.results.r1;
  const r2 = DATA.results.r2;
  const candMap = {};
  DATA.candidates.forEach(c => candMap[c.id] = c);

  // R1 banner
  let r1Rows = r1.display_order.map(id => {
    const c = candMap[id];
    const extraId = (id === 'bournazel') ? ' id="resultBournazel"' :
                    (id === 'knafo') ? ' id="resultKnafo"' :
                    (id === 'mariani') ? ' id="resultMariani"' : '';
    const elimClass = (id === 'mariani') ? ' eliminated' : '';
    return `<div class="result-row${elimClass}"${extraId}><span class="result-dot" style="background:${c.color}"></span><span class="result-name">${c.name}</span><div class="result-bar-wrap"><div class="result-bar" style="width:${c.r1_pct}%;background:${c.color}"></div></div><span class="result-pct">${c.r1_pct.toFixed(2).replace('.', ',')}%</span><span class="result-voix">${c.r1_voix.toLocaleString('fr-FR')} voix</span></div>`;
  }).join('\n');

  let r1Html = `<div class="results-banner" id="resultsBannerR1"><div class="results-banner-inner">
<h3>${r1.title}</h3>
${r1Rows}
<div style="font-size:.7rem;color:var(--muted);margin-top:8px">Source : <a href="${r1.source.url}" target="_blank" rel="noopener">${r1.source.name}</a> · ${r1.votants.toLocaleString('fr-FR')} votants · Participation ${r1.participation_pct.toFixed(2).replace('.', ',')}%</div>
</div></div>`;

  // R2 banner
  let r2Rows = r2.display_order.map(id => {
    const c = candMap[id];
    const isWinner = id === r2.winner;
    const winnerClass = isWinner ? ' winner' : '';
    const nameDisplay = isWinner ? `${c.name} 🏆` : c.name;
    return `<div class="result-row${winnerClass}"><span class="result-dot" style="background:${c.color}"></span><span class="result-name">${nameDisplay}</span><div class="result-bar-wrap"><div class="result-bar" style="width:${c.r2_pct}%;background:${c.color}"></div></div><span class="result-pct">${c.r2_pct.toFixed(2).replace('.', ',')}%</span><span class="result-voix">${c.r2_voix.toLocaleString('fr-FR')} voix</span></div>`;
  }).join('\n');

  const cdp = r2.conseil_de_paris;
  let r2Html = `<div class="results-banner" id="resultsBannerR2"><div class="results-banner-inner">
<h3>${r2.title}</h3>
${r2Rows}
<div style="font-size:.75rem;color:var(--muted);margin-top:10px">
<strong>Conseil de Paris</strong> : Grégoire ${cdp.gregoire} sièges · Dati ${cdp.dati} sièges · Chikirou ${cdp.chikirou} sièges (sur ${cdp.total})<br>
Participation : ${r2.participation_pct.toFixed(2).replace('.', ',')}% — ${r2.suffrages_exprimes.toLocaleString('fr-FR')} suffrages exprimés<br>
Source : <a href="${r2.source.url}" target="_blank" rel="noopener">${r2.source.name}</a>
</div>
</div></div>`;

  container.innerHTML = r1Html + r2Html;
}

function renderEliminations() {
  const container = document.getElementById('elimNote');
  const elim = DATA.eliminations;
  const candMap = {};
  DATA.candidates.forEach(c => candMap[c.id] = c);

  let entries = elim.entries.map(e => {
    const c = candMap[e.id];
    return `${e.emoji} <strong>${c.name}</strong> (${c.party.split(' / ')[0]}) : ${e.reason}<span class="elim-tag ${e.tag_class}">${e.tag}</span>`;
  }).join('<br>\n');

  container.innerHTML = `<div class="elim-note-inner">
${elim.intro}<br>
${entries}<br>
${elim.conclusion}
</div>`;
}

function renderTopicNav() {
  const nav = document.getElementById('topicTabs');
  nav.innerHTML = DATA.topics.map(t =>
    `<button class="topic-tab" data-target="topic-${t.id}" onclick="scrollToTopic('${t.id}')">${t.icon} ${t.name}</button>`
  ).join('\n');
}

function renderTopics() {
  const container = document.getElementById('topicsContainer');
  container.innerHTML = DATA.topics.map(t => renderTopicSection(t)).join('');

  // Observe for scroll highlighting
  document.querySelectorAll('.topic-section').forEach(s => observer.observe(s));
}

function renderTopicSection(topic) {
  const cands = DATA.candidates;

  // Stats banner
  let statsHtml = topic.stats.map(s =>
    `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div><a href="${s.source.url}" target="_blank" rel="noopener" class="stat-src">${s.source.name}</a></div>`
  ).join('');

  // Column headers
  let colHeaders = cands.map(c => {
    const tag = topic.candidate_tags[c.id] || {};
    return `<th data-cand="${c.id}"><div class="col-header"><span class="col-dot" style="background:${c.color}" data-cand="${c.id}"></span><span class="col-name" data-cand="${c.id}">${c.name}</span><span class="col-party" data-cand="${c.id}">${c.party}</span><span class="col-tag ${tag.class || ''}">${tag.text || ''}</span></div></th>`;
  }).join('');

  // Data rows
  let dataRows = topic.dimensions.map(dim => {
    let cells = cands.map(c => {
      const pos = dim.positions[c.id];
      return `<td data-cand="${c.id}">${pos ? pos.text : ''}</td>`;
    }).join('');
    return `<tr><td class="row-label">${dim.label}</td>${cells}</tr>`;
  }).join('');

  // Éclairage factuel row
  let eclairageRow = '';
  if (topic.analysis && Object.keys(topic.analysis).length > 0) {
    let cells = cands.map(c => {
      const a = topic.analysis[c.id];
      return `<td class="eclairage-cell" data-cand="${c.id}">${a ? a.text : ''}</td>`;
    }).join('');
    eclairageRow = `<tr><td class="row-label"><span class="rlicon">📊</span> Éclairage factuel</td>${cells}</tr>`;
  }

  // Sources row
  let sourcesRow = '';
  if (topic.sources_per_candidate && Object.keys(topic.sources_per_candidate).length > 0) {
    let cells = cands.map(c => {
      const srcs = topic.sources_per_candidate[c.id] || [];
      let badges = srcs.map(s =>
        `<a href="${s.url}" target="_blank" rel="noopener" class="ref-badge" title="${s.name}">${s.name}</a>`
      ).join(' ');
      return `<td data-cand="${c.id}">${badges}</td>`;
    }).join('');
    sourcesRow = `<tr class="refs-row"><td class="row-label"><span class="rlicon">📎</span> Sources</td>${cells}</tr>`;
  }

  // Ranking panel
  let chips = cands.map(c =>
    `<div class="rank-chip" draggable="true" data-cand="${c.id}" data-topic="${topic.id}"><span class="chip-dot" style="background:${c.color}" data-cand="${c.id}"></span><span class="chip-label" data-cand="${c.id}">${c.name}</span></div>`
  ).join('');

  let slots = '';
  for (let i = 1; i <= 6; i++) {
    const cls = i === 1 ? 'gold' : i === 2 ? 'silver' : i === 3 ? 'bronze' : '';
    slots += `<div class="rank-slot"><span class="rank-number ${cls}">${i}</span><div class="rank-dropzone" id="slot-${topic.id}-${i}" data-topic="${topic.id}" data-rank="${i}"></div></div>`;
  }

  return `<section class="topic-section" id="topic-${topic.id}" data-topic="${topic.id}">
<div class="topic-header"><span class="topic-icon">${topic.icon}</span><h2>${topic.name}</h2></div>
<div class="stats-banner">${statsHtml}</div>
<div class="compare-matrix"><table class="compare-table">
<thead><tr><th class="row-label"></th>${colHeaders}</tr></thead>
<tbody>${dataRows}${eclairageRow}${sourcesRow}</tbody>
</table></div>
<div class="ranking-panel" id="ranking-${topic.id}" data-topic="${topic.id}">
<h3>🏆 Votre classement — <span class="ranking-topic-name">${topic.name}</span></h3>
<p class="rank-help">Glissez les candidats dans les positions de votre choix. Plusieurs candidats peuvent partager la même position (ex-æquo).</p>
<div class="ranking-zone" id="pool-${topic.id}" data-topic="${topic.id}">${chips}</div>
<div class="ranking-positions">${slots}</div>
</div>
</section>`;
}

function renderSynthese() {
  const container = document.getElementById('syntheseContainer');
  const syn = DATA.synthese;

  function renderSyntheseSection(data, tourClass, title, subtitle) {
    let topics = '';
    const topicOrder = DATA.topics.map(t => t.id);
    topicOrder.forEach(tid => {
      const t = DATA.topics.find(x => x.id === tid);
      const s = data[tid];
      if (!s || !t) return;

      let convItems = (s.convergences || []).map(c => `<li>${c.text}</li>`).join('');
      let divItems = (s.divergences || []).map(d => `<li>${d.text}</li>`).join('');

      topics += `<div class="synthese-topic"><h3>${t.icon} ${t.name}</h3><div class="synthese-cols"><div class="synthese-col convergences"><h4>🤝 Convergences</h4><ul>${convItems}</ul></div><div class="synthese-col divergences"><h4>⚡ Divergences</h4><ul>${divItems}</ul></div></div></div>`;
    });

    return `<div class="synthese-section ${tourClass}"><h2>${title}</h2><p class="synthese-subtitle">${subtitle}</p>${topics}</div>`;
  }

  container.innerHTML =
    renderSyntheseSection(syn.r1, 'tour1-only', '🔎 Vue synthétique', 'Convergences et divergences entre candidats par thématique — sans jugement de valeur.') +
    renderSyntheseSection(syn.r2, 'tour2-only', '🔎 Vue synthétique — Triangulaire', 'Convergences et divergences entre les 3 candidats du 2nd tour — sans jugement de valeur.');
}

function renderLeaderboardWeights() {
  const container = document.getElementById('lbWeightsContainer');
  container.innerHTML = DATA.topics.map(t => `
    <div class="wt-row">
      <label>${t.icon} ${t.name}</label>
      <input type="range" min="0" max="10" value="5" class="wt-slider" data-topic="${t.id}" oninput="onWeight(this)">
      <span class="wt-val" id="wv-${t.id}">5</span>
    </div>
  `).join('');
}

function renderLeaderboard() {
  const container = document.getElementById('lbResults');
  container.innerHTML = DATA.candidates.map(c => `
    <div class="lb-row" data-candidate="${c.id}">
      <span class="lb-pos">—</span>
      <div class="lb-bar-wrap">
        <span class="lb-cname" data-cand="${c.id}">${c.name}</span>
        <div class="lb-bar" style="width:0%;background:${c.color}" data-cand="${c.id}"></div>
      </div>
      <span class="lb-score">—</span>
    </div>
  `).join('');
}

function renderFooter() {
  const footer = document.getElementById('siteFooter');
  const ft = DATA.footer;
  if (ft) {
    const sourceLinks = (ft.sources || []).map(s => `<a href="${s.url}" target="_blank">${s.name}</a>`).join(' · ');
    footer.innerHTML = ft.text + (sourceLinks ? '<br>' + sourceLinks : '');
  } else {
    footer.innerHTML = `Comparateur non-partisan · Analyse factuelle et sourcée · Aucun classement ni score imposé`;
  }
}

/* ═══════════════════════════════════════
   INTERACTIVE LOGIC (preserved from original)
   ═══════════════════════════════════════ */

/* ── Tour toggle ── */
let currentTour = 2;
function setTour(t) {
  currentTour = t;
  applyTour();
  localStorage.setItem(lsKey('tour'), currentTour);
}
function applyTour() {
  document.getElementById('tourTab1').classList.toggle('active', currentTour === 1);
  document.getElementById('tourTab2').classList.toggle('active', currentTour === 2);
  var r1 = document.getElementById('resultsBannerR1');
  var r2 = document.getElementById('resultsBannerR2');
  if (r1) r1.style.display = currentTour === 1 ? '' : 'none';
  if (r2) r2.style.display = currentTour === 2 ? '' : 'none';
  if (currentTour === 2) {
    document.body.classList.add('tour-2');
    var rk = document.getElementById('resultKnafo');
    if (rk) { rk.classList.add('eliminated'); rk.querySelector('.result-name').style.textDecoration = 'line-through'; }
    var rb = document.getElementById('resultBournazel');
    if (rb) { rb.classList.add('eliminated'); rb.querySelector('.result-name').style.textDecoration = 'line-through'; }
  } else {
    document.body.classList.remove('tour-2');
    var rk = document.getElementById('resultKnafo');
    if (rk) { rk.classList.remove('eliminated'); rk.querySelector('.result-name').style.textDecoration = 'none'; }
    var rb = document.getElementById('resultBournazel');
    if (rb) { rb.classList.remove('eliminated'); rb.querySelector('.result-name').style.textDecoration = 'none'; }
  }
  updateLeaderboard();
  // Update candidate card poll numbers
  DATA.candidates.forEach(function(c) {
    var card = document.querySelector('.candidate-card[data-candidate="' + c.id + '"]');
    if (!card) return;
    var numEl = card.querySelector('.poll-num');
    var labelEl = card.querySelector('.poll-label');
    if (currentTour === 2 && c.r2_pct) {
      numEl.textContent = c.r2_pct.toFixed(2).replace('.', ',') + ' %';
      labelEl.textContent = 'Résultat 2nd tour';
    } else {
      numEl.textContent = c.r1_pct.toFixed(2).replace('.', ',') + ' %';
      labelEl.textContent = 'Résultat 1er tour';
    }
  });
}
function initTour() {
  const saved = localStorage.getItem(lsKey('tour'));
  if (saved) currentTour = parseInt(saved);
  applyTour();
}

/* ── Candidate filter ── */
function toggleCandidate(id) {
  if (activeFilter === id) { clearFilter(); return; }
  activeFilter = id;
  document.querySelectorAll('.candidate-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.candidate === id);
    c.classList.toggle('dimmed', c.dataset.candidate !== id);
  });
  document.querySelectorAll('.compare-table th[data-cand], .compare-table td[data-cand]').forEach(el => {
    el.classList.toggle('highlight-col', el.dataset.cand === id);
    el.classList.toggle('dimmed-col', el.dataset.cand !== id);
  });
  const fi = document.getElementById('filterInfo');
  fi.classList.add('active');
  const isAnon = document.body.classList.contains('anon-mode');
  const amap = getAnonMap();
  const names = {gregoire:'E. Grégoire',dati:'R. Dati',bournazel:'P-Y. Bournazel',knafo:'S. Knafo',chikirou:'S. Chikirou',mariani:'T. Mariani'};
  fi.textContent = '✕ ' + (isAnon ? amap[id] : names[id]);
}
function clearFilter() {
  activeFilter = null;
  document.querySelectorAll('.candidate-card').forEach(c => { c.classList.remove('selected', 'dimmed'); });
  document.querySelectorAll('.compare-table th[data-cand], .compare-table td[data-cand]').forEach(el => {
    el.classList.remove('highlight-col', 'dimmed-col');
  });
  document.getElementById('filterInfo').classList.remove('active');
}

/* ── Topic scroll ── */
function scrollToTopic(id) {
  const el = document.getElementById('topic-' + id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const observer = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      const tid = en.target.dataset.topic;
      document.querySelectorAll('.topic-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.target === 'topic-' + tid);
      });
    }
  });
}, { rootMargin: '-120px 0px -60% 0px' });

/* ── Theme ── */
function toggleTheme() {
  const h = document.documentElement, c = h.getAttribute('data-theme'), n = c === 'dark' ? 'light' : 'dark';
  h.setAttribute('data-theme', n);
  document.getElementById('themeBtn').textContent = n === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme-paris2026', n);
}
(function() {
  const s = localStorage.getItem('theme-paris2026');
  if (s) { document.documentElement.setAttribute('data-theme', s); document.getElementById('themeBtn').textContent = s === 'dark' ? '☀️' : '🌙'; }
  else if (window.matchMedia('(prefers-color-scheme:dark)').matches) { document.documentElement.setAttribute('data-theme', 'dark'); document.getElementById('themeBtn').textContent = '☀️'; }
})();

/* ── Rankings persistence ── */
function loadRanks() { try { return JSON.parse(localStorage.getItem(lsKey('ranks'))) || {}; } catch(e) { return {}; } }
function saveRanks(r) { localStorage.setItem(lsKey('ranks'), JSON.stringify(r)); }
function loadWeights() { try { return JSON.parse(localStorage.getItem(lsKey('weights'))) || {}; } catch(e) { return {}; } }
function saveWeights(w) { localStorage.setItem(lsKey('weights'), JSON.stringify(w)); }

/* ── Drag and drop ── */
let draggedChip = null;
function initDragDrop() {
  document.querySelectorAll('.rank-chip').forEach(chip => {
    chip.addEventListener('dragstart', e => {
      draggedChip = chip;
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', chip.dataset.cand);
    });
    chip.addEventListener('dragend', () => {
      if (draggedChip) draggedChip.classList.remove('dragging');
      draggedChip = null;
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    chip.addEventListener('touchstart', onTouchStart, { passive: false });
    chip.addEventListener('touchmove', onTouchMove, { passive: false });
    chip.addEventListener('touchend', onTouchEnd, { passive: false });
  });
  document.querySelectorAll('.ranking-zone, .rank-dropzone').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (!draggedChip) return;
      if (draggedChip.dataset.topic !== zone.dataset.topic) return;
      zone.appendChild(draggedChip);
      updateDropzoneStyles();
      saveCurrentRanks(draggedChip.dataset.topic);
      updateLeaderboard();
    });
  });
}

/* ── Touch DnD ── */
let touchClone = null, touchStartX, touchStartY, touchChip = null;
function onTouchStart(e) {
  touchChip = e.currentTarget;
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
  touchClone = touchChip.cloneNode(true);
  touchClone.style.position = 'fixed'; touchClone.style.zIndex = '9999';
  touchClone.style.opacity = '.8'; touchClone.style.pointerEvents = 'none';
  touchClone.style.left = t.clientX - 40 + 'px'; touchClone.style.top = t.clientY - 20 + 'px';
  document.body.appendChild(touchClone);
  touchChip.classList.add('dragging');
}
function onTouchMove(e) {
  e.preventDefault();
  if (!touchClone) return;
  const t = e.touches[0];
  touchClone.style.left = t.clientX - 40 + 'px'; touchClone.style.top = t.clientY - 20 + 'px';
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  const el = document.elementFromPoint(t.clientX, t.clientY);
  if (el) {
    const zone = el.closest('.ranking-zone, .rank-dropzone');
    if (zone && zone.dataset.topic === touchChip.dataset.topic) zone.classList.add('drag-over');
  }
}
function onTouchEnd(e) {
  if (!touchClone || !touchChip) { cleanup(); return; }
  const t = e.changedTouches[0];
  const el = document.elementFromPoint(t.clientX, t.clientY);
  if (el) {
    const zone = el.closest('.ranking-zone, .rank-dropzone');
    if (zone && zone.dataset.topic === touchChip.dataset.topic) {
      zone.appendChild(touchChip);
      saveCurrentRanks(touchChip.dataset.topic);
      updateLeaderboard();
    }
  }
  cleanup();
  function cleanup() {
    if (touchClone && touchClone.parentNode) touchClone.parentNode.removeChild(touchClone);
    touchClone = null;
    if (touchChip) touchChip.classList.remove('dragging');
    touchChip = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    updateDropzoneStyles();
  }
}

function updateDropzoneStyles() {
  document.querySelectorAll('.rank-dropzone').forEach(z => {
    z.classList.toggle('has-chips', z.children.length > 0);
  });
}

function saveCurrentRanks(topicId) {
  const ranks = loadRanks();
  if (!ranks[topicId]) ranks[topicId] = {};
  DATA.candidates.forEach(c => delete ranks[topicId][c.id]);
  for (let i = 1; i <= 6; i++) {
    const slot = document.getElementById('slot-' + topicId + '-' + i);
    if (!slot) continue;
    slot.querySelectorAll('.rank-chip').forEach(chip => {
      ranks[topicId][chip.dataset.cand] = i;
    });
  }
  saveRanks(ranks);
}

/* ── Leaderboard ── */
function onWeight(el) {
  const t = el.dataset.topic, v = parseInt(el.value);
  const w = loadWeights(); w[t] = v; saveWeights(w);
  document.getElementById('wv-' + t).textContent = v;
  updateLeaderboard();
}

function updateLeaderboard() {
  const ranks = loadRanks(), weights = loadWeights();
  const TOPICS = DATA.topics.map(t => t.id);
  const activeCands = currentTour === 2 ? DATA.candidates.filter(c => !ELIMINATED_IDS.includes(c.id)) : DATA.candidates;
  const scores = {};
  activeCands.forEach(c => {
    let num = 0, den = 0;
    TOPICS.forEach(tid => {
      const w = weights[tid] !== undefined ? weights[tid] : 5;
      if (w === 0) return;
      const r = ranks[tid] && ranks[tid][c.id];
      if (r === undefined || r === null) return;
      const maxRank = activeCands.length;
      const score = maxRank + 1 - r;
      num += score * w; den += w;
    });
    scores[c.id] = den > 0 ? num / den : null;
  });
  const activeCandCount = currentTour === 2 ? DATA.candidates.filter(c => !ELIMINATED_IDS.includes(c.id)).length : DATA.candidates.length;
  const maxScore = activeCandCount;
  const sorted = DATA.candidates.map(c => ({ ...c, score: scores[c.id] })).sort((a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1; if (b.score === null) return -1;
    return b.score - a.score;
  });
  const container = document.getElementById('lbResults');
  const isAnon = document.body.classList.contains('anon-mode');
  const amap = getAnonMap();
  sorted.forEach((s, i) => {
    const row = container.querySelector('[data-candidate="' + s.id + '"]');
    if (!row) return;
    row.querySelector('.lb-pos').textContent = s.score !== null ? (i + 1) : '—';
    const nm = isAnon ? amap[s.id] : s.name;
    row.querySelector('.lb-cname').textContent = nm;
    const bar = row.querySelector('.lb-bar');
    if (s.score !== null) {
      bar.style.width = (s.score / maxScore * 100) + '%';
      if (!isAnon) bar.style.background = s.color; else bar.style.background = '#9CA3AF';
      row.querySelector('.lb-score').textContent = s.score.toFixed(1) + '/' + maxScore;
    } else { bar.style.width = '0%'; row.querySelector('.lb-score').textContent = '—'; }
    container.appendChild(row);
  });
}

/* ── Anonymous mode ── */
function shuffleArray(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function getAnonMap() {
  try { const m = JSON.parse(localStorage.getItem(lsKey('anon-map'))); if (m && Object.keys(m).length === DATA.candidates.length) return m; } catch(e) {}
  return generateAnonMap();
}
function generateAnonMap() {
  const activeCands = currentTour === 2 ? DATA.candidates.filter(c => !ELIMINATED_IDS.includes(c.id)) : DATA.candidates;
  const letters = shuffleArray(['A', 'B', 'C', 'D', 'E', 'F'].slice(0, activeCands.length));
  const m = {};
  activeCands.forEach((c, i) => { m[c.id] = 'Candidat ' + letters[i]; });
  DATA.candidates.filter(c => ELIMINATED_IDS.includes(c.id)).forEach(c => { m[c.id] = m[c.id] || 'Candidat X'; });
  localStorage.setItem(lsKey('anon-map'), JSON.stringify(m));
  return m;
}

function toggleAnon() {
  const isAnon = document.body.classList.contains('anon-mode');
  if (isAnon) { revealCandidates(); return; }
  const map = generateAnonMap();
  document.body.classList.add('anon-mode');
  applyAnonLabels(map);
  sortColumnsAlphabetically(map);
  document.querySelector('.anon-btn').classList.add('active');
  document.querySelector('.anon-btn').textContent = '🎭 Anonyme ✓';
  localStorage.setItem(lsKey('anon'), '1');
  updateLeaderboard();
}

function applyAnonLabels(map) {
  document.querySelectorAll('.candidate-card').forEach(card => {
    const cid = card.dataset.candidate; const lbl = map[cid];
    if (!lbl) return;
    card.querySelector('.cand-avatar').textContent = lbl.slice(-1);
    card.querySelector('.cand-name').textContent = lbl;
    card.querySelector('.cand-party').textContent = '';
  });
  document.querySelectorAll('.col-name').forEach(el => {
    const cid = el.dataset.cand; if (map[cid]) el.textContent = map[cid];
  });
  document.querySelectorAll('.col-party').forEach(el => {
    const cid = el.dataset.cand; if (cid) el.textContent = '';
  });
  document.querySelectorAll('.chip-label').forEach(el => {
    const cid = el.dataset.cand; if (map[cid]) el.textContent = map[cid];
  });
  document.querySelectorAll('.lb-cname').forEach(el => {
    const cid = el.dataset.cand; if (map[cid]) el.textContent = map[cid];
  });
  document.querySelectorAll('.cand-poll').forEach(el => el.style.display = 'none');
  if (activeFilter) {
    const fi = document.getElementById('filterInfo');
    fi.textContent = '✕ ' + map[activeFilter];
  }
}

function sortColumnsAlphabetically(map) {
  const sorted = [...DATA.candidates].sort((a, b) => {
    const la = map[a.id] || '', lb = map[b.id] || '';
    return la.localeCompare(lb);
  });
  const sortedIds = sorted.map(c => c.id);

  document.querySelectorAll('.compare-table').forEach(table => {
    table.querySelectorAll('tr').forEach(row => {
      const cells = Array.from(row.children);
      if (cells.length < 2) return;
      const dataCells = cells.slice(1);
      const cellMap = {};
      dataCells.forEach(cell => {
        const cid = cell.dataset.cand || cell.querySelector('[data-cand]')?.dataset.cand;
        if (cid) cellMap[cid] = cell;
      });
      sortedIds.forEach(cid => {
        if (cellMap[cid]) row.appendChild(cellMap[cid]);
      });
    });
  });

  document.querySelectorAll('.ranking-zone, .rank-dropzone').forEach(zone => {
    const chips = Array.from(zone.querySelectorAll('.rank-chip'));
    chips.sort((a, b) => {
      const la = map[a.dataset.cand] || '', lb = map[b.dataset.cand] || '';
      return la.localeCompare(lb);
    });
    chips.forEach(c => zone.appendChild(c));
  });
}

function restoreTableColumns() {
  const candOrder = DATA.candidates.map(c => c.id);
  document.querySelectorAll('.compare-table').forEach(table => {
    table.querySelectorAll('tr').forEach(row => {
      const cells = Array.from(row.children);
      if (cells.length < 2) return;
      const dataCells = cells.slice(1);
      const cellMap = {};
      dataCells.forEach(cell => {
        const cid = cell.dataset.cand || cell.querySelector('[data-cand]')?.dataset.cand;
        if (cid) cellMap[cid] = cell;
      });
      candOrder.forEach(cid => {
        if (cellMap[cid]) row.appendChild(cellMap[cid]);
      });
    });
  });
}

function revealCandidates() {
  document.body.classList.add('revealing');
  document.body.classList.remove('anon-mode');
  DATA.candidates.forEach(c => {
    document.querySelectorAll('[data-candidate="' + c.id + '"] .cand-name').forEach(el => el.textContent = c.name);
    document.querySelectorAll('[data-candidate="' + c.id + '"] .cand-party').forEach(el => el.textContent = c.party);
    document.querySelectorAll('[data-candidate="' + c.id + '"] .cand-avatar').forEach(el => el.textContent = c.initials);
    document.querySelectorAll('.col-name[data-cand="' + c.id + '"]').forEach(el => el.textContent = c.name);
    document.querySelectorAll('.col-party[data-cand="' + c.id + '"]').forEach(el => el.textContent = c.party);
    document.querySelectorAll('.chip-label[data-cand="' + c.id + '"]').forEach(el => el.textContent = c.name);
    document.querySelectorAll('.lb-cname[data-cand="' + c.id + '"]').forEach(el => el.textContent = c.name);
  });
  document.querySelectorAll('.cand-poll').forEach(el => el.style.display = '');
  restoreTableColumns();
  document.querySelector('.anon-btn').classList.remove('active');
  document.querySelector('.anon-btn').textContent = '🎭 Mode Anonyme';
  localStorage.setItem(lsKey('anon'), '0');
  updateLeaderboard();
  if (activeFilter) {
    const names = {gregoire:'E. Grégoire',dati:'R. Dati',bournazel:'P-Y. Bournazel',knafo:'S. Knafo',chikirou:'S. Chikirou',mariani:'T. Mariani'};
    document.getElementById('filterInfo').textContent = '✕ ' + names[activeFilter];
  }
  setTimeout(() => document.body.classList.remove('revealing'), 700);
}

function resetAll() {
  localStorage.removeItem(lsKey('ranks')); localStorage.removeItem(lsKey('weights'));
  const TOPICS = DATA.topics.map(t => t.id);
  TOPICS.forEach(tid => {
    const pool = document.getElementById('pool-' + tid);
    if (!pool) return;
    for (let i = 1; i <= 6; i++) {
      const slot = document.getElementById('slot-' + tid + '-' + i);
      if (!slot) continue;
      while (slot.firstChild) pool.appendChild(slot.firstChild);
    }
  });
  document.querySelectorAll('.wt-slider').forEach(s => { s.value = 5; });
  document.querySelectorAll('.wt-val').forEach(v => v.textContent = '5');
  updateDropzoneStyles();
  updateLeaderboard();
}

/* ── Init ranks from localStorage ── */
function initRanks() {
  const ranks = loadRanks();
  Object.keys(ranks).forEach(tid => {
    Object.keys(ranks[tid]).forEach(cid => {
      const rank = ranks[tid][cid];
      const chip = document.querySelector('.rank-chip[data-topic="' + tid + '"][data-cand="' + cid + '"]');
      const slot = document.getElementById('slot-' + tid + '-' + rank);
      if (chip && slot) slot.appendChild(chip);
    });
  });
  const w = loadWeights();
  Object.keys(w).forEach(t => {
    const sl = document.querySelector('.wt-slider[data-topic="' + t + '"]');
    if (sl) { sl.value = w[t]; const lbl = document.getElementById('wv-' + t); if (lbl) lbl.textContent = w[t]; }
  });
  updateDropzoneStyles();
  updateLeaderboard();
}

function initAnon() {
  const wasRevealed = localStorage.getItem(lsKey('anon')) === '0';
  if (!wasRevealed) {
    const map = generateAnonMap();
    document.body.classList.add('anon-mode');
    applyAnonLabels(map);
    sortColumnsAlphabetically(map);
    document.querySelector('.anon-btn').classList.add('active');
    document.querySelector('.anon-btn').textContent = '🎭 Anonyme ✓';
    localStorage.setItem(lsKey('anon'), '1');
  }
}

/* ── Main View Tabs ── */
function switchMainView(view) {
  document.body.classList.remove('view-resultats', 'view-comparaison');
  document.body.classList.add('view-' + view);
  document.querySelectorAll('.main-view-tab').forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-view') === view);
  });
  localStorage.setItem('lmv-main-view', view);
  window.scrollTo({ top: document.getElementById('mainViewTabs').offsetTop - 70, behavior: 'smooth' });
}
function initMainView() {
  var saved = localStorage.getItem('lmv-main-view') || 'resultats';
  document.body.classList.add('view-' + saved);
  document.querySelectorAll('.main-view-tab').forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-view') === saved);
  });
}

/* ── Start ── */
init();
