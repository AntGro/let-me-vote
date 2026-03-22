
let activeFilter=null;
const CANDS=[
{id:"gregoire",name:"Emmanuel Grégoire",party:"PS / EELV / PCF",color:"#E4003B",initials:"EG",poll:"37.98%",r1pct:37.98,r1voix:309693},
{id:"dati",name:"Rachida Dati",party:"LR / MoDem / UDI",color:"#0066CC",initials:"RD",poll:"25.46%",r1pct:25.46,r1voix:207613},
{id:"bournazel",name:"Pierre-Yves Bournazel",party:"Horizons / Renaissance",color:"#E8A317",initials:"PB",poll:"11.34%",r1pct:11.34,r1voix:92448,eliminated:true,reason:"Retrait (soutien Dati)"},
{id:"knafo",name:"Sarah Knafo",party:"Reconquête !",color:"#1B1464",initials:"SK",poll:"10.40%",r1pct:10.40,r1voix:84809,eliminated:true,reason:"Retrait"},
{id:"chikirou",name:"Sophia Chikirou",party:"La France Insoumise",color:"#CC2443",initials:"SC",poll:"11.72%",r1pct:11.72,r1voix:95551},
{id:"mariani",name:"Thierry Mariani",party:"Rassemblement National",color:"#0D378A",initials:"TM",poll:"1.61%",r1pct:1.61,r1voix:13096,eliminated:true,reason:"<10%"}
];
const ELIMINATED_IDS=["knafo","mariani","bournazel"];
const TOPICS=["securite","logement","proprete","transport","ecologie","budget","enfance","culture"];
const LS_RANKS='paris-2026-ranks-v5',LS_WEIGHTS='paris-2026-weights-v5',LS_ANON='paris-2026-anon-v5',LS_ANON_MAP='paris-2026-anon-map-v5',LS_TOUR='paris-2026-tour';

/* ── Tour toggle ── */
let currentTour=2; // default to 2e tour
function setTour(t){
  currentTour=t;
  applyTour();
  localStorage.setItem(LS_TOUR,currentTour);
}
function applyTour(){
  document.getElementById('tourTab1').classList.toggle('active',currentTour===1);
  document.getElementById('tourTab2').classList.toggle('active',currentTour===2);
  if(currentTour===2){
    document.body.classList.add('tour-2');
    document.getElementById('resultKnafo').classList.add('eliminated');
    document.getElementById('resultKnafo').querySelector('.result-name').style.textDecoration='line-through';
    document.getElementById('resultBournazel').classList.add('eliminated');
    document.getElementById('resultBournazel').querySelector('.result-name').style.textDecoration='line-through';
  }else{
    document.body.classList.remove('tour-2');
    document.getElementById('resultKnafo').classList.remove('eliminated');
    document.getElementById('resultKnafo').querySelector('.result-name').style.textDecoration='none';
    document.getElementById('resultBournazel').classList.remove('eliminated');
    document.getElementById('resultBournazel').querySelector('.result-name').style.textDecoration='none';
  }
  updateLeaderboard();
}
function initTour(){
  const saved=localStorage.getItem(LS_TOUR);
  if(saved)currentTour=parseInt(saved);
  applyTour();
}

/* ── Candidate filter ── */
function toggleCandidate(id){
if(activeFilter===id){clearFilter();return}
activeFilter=id;
document.querySelectorAll('.candidate-card').forEach(c=>{c.classList.toggle('selected',c.dataset.candidate===id);c.classList.toggle('dimmed',c.dataset.candidate!==id)});
document.querySelectorAll('.compare-table th[data-cand], .compare-table td[data-cand]').forEach(el=>{
  el.classList.toggle('highlight-col',el.dataset.cand===id);
  el.classList.toggle('dimmed-col',el.dataset.cand!==id);
});
const fi=document.getElementById('filterInfo');fi.classList.add('active');
const isAnon=document.body.classList.contains('anon-mode');
const amap=getAnonMap();
const names={gregoire:'E. Grégoire',dati:'R. Dati',bournazel:'P-Y. Bournazel',knafo:'S. Knafo',chikirou:'S. Chikirou',mariani:'T. Mariani'};
fi.textContent='✕ '+(isAnon?amap[id]:names[id]);
}
function clearFilter(){
activeFilter=null;
document.querySelectorAll('.candidate-card').forEach(c=>{c.classList.remove('selected','dimmed')});
document.querySelectorAll('.compare-table th[data-cand], .compare-table td[data-cand]').forEach(el=>{
  el.classList.remove('highlight-col','dimmed-col');
});
document.getElementById('filterInfo').classList.remove('active');
}

/* ── Topic scroll ── */
function scrollToTopic(id){const el=document.getElementById('topic-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}
const observer=new IntersectionObserver(entries=>{entries.forEach(en=>{if(en.isIntersecting){const tid=en.target.dataset.topic;document.querySelectorAll('.topic-tab').forEach(t=>{t.classList.toggle('active',t.dataset.target==='topic-'+tid)})}})},{rootMargin:'-120px 0px -60% 0px'});
document.querySelectorAll('.topic-section').forEach(s=>observer.observe(s));

/* ── Theme ── */
function toggleTheme(){
const h=document.documentElement,c=h.getAttribute('data-theme'),n=c==='dark'?'light':'dark';
h.setAttribute('data-theme',n);document.getElementById('themeBtn').textContent=n==='dark'?'☀️':'🌙';
localStorage.setItem('theme-paris2026',n);
}
(function(){
const s=localStorage.getItem('theme-paris2026');
if(s){document.documentElement.setAttribute('data-theme',s);document.getElementById('themeBtn').textContent=s==='dark'?'☀️':'🌙'}
else if(window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.setAttribute('data-theme','dark');document.getElementById('themeBtn').textContent='☀️'}
})();

/* ── Rankings persistence ── */
function loadRanks(){try{return JSON.parse(localStorage.getItem(LS_RANKS))||{}}catch(e){return{}}}
function saveRanks(r){localStorage.setItem(LS_RANKS,JSON.stringify(r))}
function loadWeights(){try{return JSON.parse(localStorage.getItem(LS_WEIGHTS))||{}}catch(e){return{}}}
function saveWeights(w){localStorage.setItem(LS_WEIGHTS,JSON.stringify(w))}

/* ── Drag and drop ── */
let draggedChip=null;

function initDragDrop(){
  document.querySelectorAll('.rank-chip').forEach(chip=>{
    chip.addEventListener('dragstart',e=>{
      draggedChip=chip;
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain',chip.dataset.cand);
    });
    chip.addEventListener('dragend',()=>{
      if(draggedChip)draggedChip.classList.remove('dragging');
      draggedChip=null;
      document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
    });
    // Touch support
    chip.addEventListener('touchstart',onTouchStart,{passive:false});
    chip.addEventListener('touchmove',onTouchMove,{passive:false});
    chip.addEventListener('touchend',onTouchEnd,{passive:false});
  });

  // All drop zones (pool + rank slots)
  document.querySelectorAll('.ranking-zone, .rank-dropzone').forEach(zone=>{
    zone.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';zone.classList.add('drag-over')});
    zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
    zone.addEventListener('drop',e=>{
      e.preventDefault();
      zone.classList.remove('drag-over');
      if(!draggedChip)return;
      // Only accept chips from same topic
      const chipTopic=draggedChip.dataset.topic;
      const zoneTopic=zone.dataset.topic;
      if(chipTopic!==zoneTopic)return;
      zone.appendChild(draggedChip);
      updateDropzoneStyles();
      saveCurrentRanks(chipTopic);
      updateLeaderboard();
    });
  });
}

/* ── Touch DnD fallback ── */
let touchClone=null,touchStartX,touchStartY,touchChip=null;
function onTouchStart(e){
  touchChip=e.currentTarget;
  const t=e.touches[0];
  touchStartX=t.clientX;touchStartY=t.clientY;
  touchClone=touchChip.cloneNode(true);
  touchClone.style.position='fixed';touchClone.style.zIndex='9999';
  touchClone.style.opacity='.8';touchClone.style.pointerEvents='none';
  touchClone.style.left=t.clientX-40+'px';touchClone.style.top=t.clientY-20+'px';
  document.body.appendChild(touchClone);
  touchChip.classList.add('dragging');
}
function onTouchMove(e){
  e.preventDefault();
  if(!touchClone)return;
  const t=e.touches[0];
  touchClone.style.left=t.clientX-40+'px';touchClone.style.top=t.clientY-20+'px';
  // Highlight zone under finger
  document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
  const el=document.elementFromPoint(t.clientX,t.clientY);
  if(el){
    const zone=el.closest('.ranking-zone, .rank-dropzone');
    if(zone&&zone.dataset.topic===touchChip.dataset.topic)zone.classList.add('drag-over');
  }
}
function onTouchEnd(e){
  if(!touchClone||!touchChip){cleanup();return}
  const t=e.changedTouches[0];
  const el=document.elementFromPoint(t.clientX,t.clientY);
  if(el){
    const zone=el.closest('.ranking-zone, .rank-dropzone');
    if(zone&&zone.dataset.topic===touchChip.dataset.topic){
      zone.appendChild(touchChip);
      saveCurrentRanks(touchChip.dataset.topic);
      updateLeaderboard();
    }
  }
  cleanup();
  function cleanup(){
    if(touchClone&&touchClone.parentNode)touchClone.parentNode.removeChild(touchClone);
    touchClone=null;
    if(touchChip)touchChip.classList.remove('dragging');
    touchChip=null;
    document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
    updateDropzoneStyles();
  }
}

function updateDropzoneStyles(){
  document.querySelectorAll('.rank-dropzone').forEach(z=>{
    z.classList.toggle('has-chips',z.children.length>0);
  });
}

function saveCurrentRanks(topicId){
  const ranks=loadRanks();
  if(!ranks[topicId])ranks[topicId]={};
  // Clear old ranks for this topic
  CANDS.forEach(c=>delete ranks[topicId][c.id]);
  // Read from DOM
  for(let i=1;i<=6;i++){
    const slot=document.getElementById('slot-'+topicId+'-'+i);
    if(!slot)continue;
    slot.querySelectorAll('.rank-chip').forEach(chip=>{
      ranks[topicId][chip.dataset.cand]=i;
    });
  }
  // Chips still in pool = unranked
  saveRanks(ranks);
}

/* ── Leaderboard ── */
function onWeight(el){
const t=el.dataset.topic,v=parseInt(el.value);
const w=loadWeights();w[t]=v;saveWeights(w);
document.getElementById('wv-'+t).textContent=v;
updateLeaderboard();
}

function updateLeaderboard(){
const ranks=loadRanks(),weights=loadWeights();
const activeCands=currentTour===2?CANDS.filter(c=>!ELIMINATED_IDS.includes(c.id)):CANDS;
const scores={};
activeCands.forEach(c=>{let num=0,den=0;
TOPICS.forEach(tid=>{
  const w=weights[tid]!==undefined?weights[tid]:5;
  if(w===0)return;
  const r=ranks[tid]&&ranks[tid][c.id];
  if(r===undefined||r===null)return;
  const maxRank=activeCands.length;
  const score=maxRank+1-r;
  num+=score*w;den+=w;
});
scores[c.id]=den>0?num/den:null;
});
const activeCandCount=currentTour===2?CANDS.filter(c=>!ELIMINATED_IDS.includes(c.id)).length:CANDS.length;
const maxScore=activeCandCount; // theoretical max
const sorted=CANDS.map(c=>({...c,score:scores[c.id]})).sort((a,b)=>{
if(a.score===null&&b.score===null)return 0;
if(a.score===null)return 1;if(b.score===null)return -1;
return b.score-a.score;
});
const container=document.getElementById('lbResults');
const isAnon=document.body.classList.contains('anon-mode');
const amap=getAnonMap();
sorted.forEach((s,i)=>{
const row=container.querySelector('[data-candidate="'+s.id+'"]');
if(!row)return;
row.querySelector('.lb-pos').textContent=s.score!==null?(i+1):'—';
const nm=isAnon?amap[s.id]:s.name;
row.querySelector('.lb-cname').textContent=nm;
const bar=row.querySelector('.lb-bar');
if(s.score!==null){
  bar.style.width=(s.score/maxScore*100)+'%';
  if(!isAnon)bar.style.background=s.color;else bar.style.background='#9CA3AF';
  row.querySelector('.lb-score').textContent=s.score.toFixed(1)+'/'+maxScore;
}else{bar.style.width='0%';row.querySelector('.lb-score').textContent='—';}
container.appendChild(row);
});
}

/* ── Anonymous mode ── */
function shuffleArray(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function getAnonMap(){
try{const m=JSON.parse(localStorage.getItem(LS_ANON_MAP));if(m&&Object.keys(m).length===CANDS.length)return m}catch(e){}
return generateAnonMap();
}
function generateAnonMap(){
const activeCands=currentTour===2?CANDS.filter(c=>!ELIMINATED_IDS.includes(c.id)):CANDS;
const letters=shuffleArray(['A','B','C','D','E','F'].slice(0,activeCands.length));
const m={};activeCands.forEach((c,i)=>{m[c.id]='Candidat '+letters[i]});
// Also map eliminated to keep structure intact
CANDS.filter(c=>ELIMINATED_IDS.includes(c.id)).forEach(c=>{m[c.id]=m[c.id]||'Candidat X'});
localStorage.setItem(LS_ANON_MAP,JSON.stringify(m));return m;
}

function toggleAnon(){
const isAnon=document.body.classList.contains('anon-mode');
if(isAnon){revealCandidates();return}
const map=generateAnonMap();
document.body.classList.add('anon-mode');
applyAnonLabels(map);
sortColumnsAlphabetically(map);
document.querySelector('.anon-btn').classList.add('active');
document.querySelector('.anon-btn').textContent='🎭 Anonyme ✓';
localStorage.setItem(LS_ANON,'1');
updateLeaderboard();
}

function applyAnonLabels(map){
// Candidate cards
document.querySelectorAll('.candidate-card').forEach(card=>{
  const cid=card.dataset.candidate;const lbl=map[cid];
  if(!lbl)return;
  card.querySelector('.cand-avatar').textContent=lbl.slice(-1);
  card.querySelector('.cand-name').textContent=lbl;
  card.querySelector('.cand-party').textContent='';
});
// Table column headers
document.querySelectorAll('.col-name').forEach(el=>{
  const cid=el.dataset.cand;if(map[cid])el.textContent=map[cid];
});
document.querySelectorAll('.col-party').forEach(el=>{
  const cid=el.dataset.cand;if(cid)el.textContent='';
});
// Ranking chips
document.querySelectorAll('.chip-label').forEach(el=>{
  const cid=el.dataset.cand;if(map[cid])el.textContent=map[cid];
});
// Leaderboard
document.querySelectorAll('.lb-cname').forEach(el=>{
  const cid=el.dataset.cand;if(map[cid])el.textContent=map[cid];
});
// Hide polls
document.querySelectorAll('.cand-poll').forEach(el=>el.style.display='none');
if(activeFilter){
  const fi=document.getElementById('filterInfo');
  fi.textContent='✕ '+map[activeFilter];
}
}

/* ── Sort columns alphabetically by anon label (A leftmost, F rightmost) ── */
function sortColumnsAlphabetically(map){
  // Build sorted order: sort CANDS by their anon letter
  const sorted=[...CANDS].sort((a,b)=>{
    const la=map[a.id]||'', lb=map[b.id]||'';
    return la.localeCompare(lb);
  });
  const sortedIds=sorted.map(c=>c.id);

  document.querySelectorAll('.compare-table').forEach(table=>{
    table.querySelectorAll('tr').forEach(row=>{
      const cells=Array.from(row.children);
      if(cells.length<2)return;
      const dataCells=cells.slice(1);
      const cellMap={};
      dataCells.forEach(cell=>{
        const cid=cell.dataset.cand||cell.querySelector('[data-cand]')?.dataset.cand;
        if(cid)cellMap[cid]=cell;
      });
      sortedIds.forEach(cid=>{
        if(cellMap[cid])row.appendChild(cellMap[cid]);
      });
    });
  });

  // Sort ranking chips alphabetically within each zone
  document.querySelectorAll('.ranking-zone, .rank-dropzone').forEach(zone=>{
    const chips=Array.from(zone.querySelectorAll('.rank-chip'));
    chips.sort((a,b)=>{
      const la=map[a.dataset.cand]||'',lb=map[b.dataset.cand]||'';
      return la.localeCompare(lb);
    });
    chips.forEach(c=>zone.appendChild(c));
  });
}

function restoreTableColumns(){
  const candOrder=CANDS.map(c=>c.id);
  document.querySelectorAll('.compare-table').forEach(table=>{
    table.querySelectorAll('tr').forEach(row=>{
      const cells=Array.from(row.children);
      if(cells.length<2)return;
      const dataCells=cells.slice(1);
      const cellMap={};
      dataCells.forEach(cell=>{
        const cid=cell.dataset.cand||cell.querySelector('[data-cand]')?.dataset.cand;
        if(cid)cellMap[cid]=cell;
      });
      candOrder.forEach(cid=>{
        if(cellMap[cid])row.appendChild(cellMap[cid]);
      });
    });
  });
}

function revealCandidates(){
  document.body.classList.add('revealing');
  document.body.classList.remove('anon-mode');
  // Restore real names
  CANDS.forEach(c=>{
    document.querySelectorAll('[data-candidate="'+c.id+'"] .cand-name').forEach(el=>el.textContent=c.name);
    document.querySelectorAll('[data-candidate="'+c.id+'"] .cand-party').forEach(el=>el.textContent=c.party);
    document.querySelectorAll('[data-candidate="'+c.id+'"] .cand-avatar').forEach(el=>el.textContent=c.initials);
    document.querySelectorAll('.col-name[data-cand="'+c.id+'"]').forEach(el=>el.textContent=c.name);
    document.querySelectorAll('.col-party[data-cand="'+c.id+'"]').forEach(el=>el.textContent=c.party);
    document.querySelectorAll('.chip-label[data-cand="'+c.id+'"]').forEach(el=>el.textContent=c.name);
    document.querySelectorAll('.lb-cname[data-cand="'+c.id+'"]').forEach(el=>el.textContent=c.name);
  });
  document.querySelectorAll('.cand-poll').forEach(el=>el.style.display='');
  restoreTableColumns();
  // Reorder columns by poll % (original order)
  document.querySelector('.anon-btn').classList.remove('active');
  document.querySelector('.anon-btn').textContent='🎭 Mode Anonyme';
  localStorage.setItem(LS_ANON,'0');
  updateLeaderboard();
  if(activeFilter){
    const names={gregoire:'E. Grégoire',dati:'R. Dati',bournazel:'P-Y. Bournazel',knafo:'S. Knafo',chikirou:'S. Chikirou',mariani:'T. Mariani'};
    document.getElementById('filterInfo').textContent='✕ '+names[activeFilter];
  }
  setTimeout(()=>document.body.classList.remove('revealing'),700);
}

function resetAll(){
  localStorage.removeItem(LS_RANKS);localStorage.removeItem(LS_WEIGHTS);
  // Move all chips back to pool
  TOPICS.forEach(tid=>{
    const pool=document.getElementById('pool-'+tid);
    if(!pool)return;
    for(let i=1;i<=6;i++){
      const slot=document.getElementById('slot-'+tid+'-'+i);
      if(!slot)continue;
      while(slot.firstChild)pool.appendChild(slot.firstChild);
    }
  });
  document.querySelectorAll('.wt-slider').forEach(s=>{s.value=5});
  document.querySelectorAll('.wt-val').forEach(v=>v.textContent='5');
  updateDropzoneStyles();
  updateLeaderboard();
}

/* ── Init ── */
function initRanks(){
  const ranks=loadRanks();
  Object.keys(ranks).forEach(tid=>{
    Object.keys(ranks[tid]).forEach(cid=>{
      const rank=ranks[tid][cid];
      const chip=document.querySelector('.rank-chip[data-topic="'+tid+'"][data-cand="'+cid+'"]');
      const slot=document.getElementById('slot-'+tid+'-'+rank);
      if(chip&&slot)slot.appendChild(chip);
    });
  });
  const w=loadWeights();
  Object.keys(w).forEach(t=>{
    const sl=document.querySelector('.wt-slider[data-topic="'+t+'"]');
    if(sl){sl.value=w[t];const lbl=document.getElementById('wv-'+t);if(lbl)lbl.textContent=w[t]}
  });
  updateDropzoneStyles();
  updateLeaderboard();
}

function initAnon(){
  const wasRevealed=localStorage.getItem(LS_ANON)==='0';
  if(!wasRevealed){
    const map=generateAnonMap();
    document.body.classList.add('anon-mode');
    applyAnonLabels(map);
    sortColumnsAlphabetically(map);
    document.querySelector('.anon-btn').classList.add('active');
    document.querySelector('.anon-btn').textContent='🎭 Anonyme ✓';
    localStorage.setItem(LS_ANON,'1');
  }
}

/* ── Main View Tabs ── */
function switchMainView(view){
  document.body.classList.remove('view-resultats','view-comparaison');
  document.body.classList.add('view-'+view);
  document.querySelectorAll('.main-view-tab').forEach(function(t){
    t.classList.toggle('active',t.getAttribute('data-view')===view);
  });
  localStorage.setItem('lmv-main-view',view);
  window.scrollTo({top:document.getElementById('mainViewTabs').offsetTop-70,behavior:'smooth'});
}
(function initMainView(){
  var saved=localStorage.getItem('lmv-main-view')||'resultats';
  document.body.classList.add('view-'+saved);
  document.querySelectorAll('.main-view-tab').forEach(function(t){
    t.classList.toggle('active',t.getAttribute('data-view')===saved);
  });
})();

(function(){
  initTour();
  initRanks();
  initDragDrop();
  initAnon();
})();

