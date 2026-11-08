let DICTIONARY=[], GRAMMAR=[];
let currentQuickFilter='all', currentSortOrder='newest', multiMeaningCounts={};
let currentGrammarTag='', currentGrammarLevel='', grammarSearchTimer=null;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function highlight(value, query){
  const safe=escapeHTML(value);
  if(!query) return safe;
  const escaped=query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  try{return safe.replace(new RegExp(`(${escaped})`,'ig'),'<mark>$1</mark>')}catch{return safe}
}
function debounce(fn, delay=180){let timer;return (...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay)}}
async function loadData(){
  const list=document.getElementById('dictList');
  if(list) list.innerHTML='<div class="skeleton-line"></div>'.repeat(4);
  try{
    const [d,g]=await Promise.all([
      fetch('data/dictionary.json').then(r=>{if(!r.ok)throw Error('dictionary');return r.json()}),
      fetch('data/grammar.json').then(r=>{if(!r.ok)throw Error('grammar');return r.json()})
    ]);
    DICTIONARY=Array.isArray(d)?d:[]; GRAMMAR=Array.isArray(g)?g:[];
    buildMultiMeaningCounts(); buildTagFilter(); buildQuickFilters(); buildSortFilter();
    buildGrammarTagCloud(); buildGrammarLevelFilter(); renderDict(); renderGrammar();
  }catch(err){
    const msg=t('data_load_error');
    ['dictList','grammarList'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=`<p class="empty-state">${escapeHTML(msg)}</p>`});
    console.error('Could not load dictionary data:',err);
  }
}
function buildMultiMeaningCounts(){multiMeaningCounts={};DICTIONARY.forEach(e=>multiMeaningCounts[e.Korean]=(multiMeaningCounts[e.Korean]||0)+1)}
function isMultiMeaning(e){return (multiMeaningCounts[e.Korean]||0)>1}
function buildTagFilter(){
 const sel=document.getElementById('tagFilter');if(!sel)return;
 const key=getLang()==='ru'?'rutag':'engtag', old=sel.value;
 const tags=[...new Set(DICTIONARY.map(e=>e[key]).filter(Boolean))].sort();
 sel.innerHTML=`<option value="">${escapeHTML(t('all_tags'))}</option>`+tags.map(x=>`<option value="${escapeHTML(x)}">${escapeHTML(x)}</option>`).join('');
 if(tags.includes(old))sel.value=old;sel.onchange=renderDict;
}
function buildQuickFilters(){
 const wrap=document.getElementById('quickFilters');if(!wrap)return;
 const opts=[['all',t('show_all')],['last10',t('last10')],['last30',t('last30')],['last50',t('last50')],['last100',t('last100')]];
 wrap.innerHTML=opts.map(([k,v])=>`<button type="button" data-key="${k}" class="${k===currentQuickFilter?'active':''}">${escapeHTML(v)}</button>`).join('');
 wrap.querySelectorAll('button').forEach(b=>b.onclick=()=>{currentQuickFilter=b.dataset.key;buildQuickFilters();renderDict()});
}
function buildSortFilter(){
 const sel=document.getElementById('sortFilter');if(!sel)return;
 sel.innerHTML=`<option value="newest">${escapeHTML(t('sort_newest'))}</option><option value="oldest">${escapeHTML(t('sort_oldest'))}</option>`;
 sel.value=currentSortOrder;sel.onchange=()=>{currentSortOrder=sel.value;renderDict()};
}
function tagColor(tag){const palette=['--tag-1','--tag-2','--tag-3','--tag-4','--tag-5','--tag-6','--tag-7','--tag-8'];let n=0;for(const c of String(tag||''))n=(n*31+c.charCodeAt(0))>>>0;return `var(${palette[n%palette.length]})`}
function renderDict(){
 const el=document.getElementById('dictList');if(!el)return;
 const q=(document.getElementById('dictSearch')?.value||'').trim(), low=q.toLowerCase();
 const tagKey=getLang()==='ru'?'rutag':'engtag', tagVal=document.getElementById('tagFilter')?.value||'';
 let data=[...DICTIONARY];if(currentQuickFilter.startsWith('last'))data=data.slice(-Number(currentQuickFilter.slice(4)));
 if(currentSortOrder==='newest')data.reverse();
 const found=data.filter(e=>{
  const hay=[e.Korean,e.English,e.Russian,e.rutag,e.engtag].join(' ').toLowerCase();
  return (!low||hay.includes(low))&&(!tagVal||e[tagKey]===tagVal)
 });
 el.innerHTML=found.map((e,i)=>`<article class="word-card" style="--i:${i};--tag-color:${tagColor(e[tagKey])}">
  <div class="kr">${highlight(e.Korean,q)}</div><div class="en">${highlight(e.English,q)}${isMultiMeaning(e)?`<span class="multi-badge">✦ ${escapeHTML(t('multi_meaning'))}</span>`:''}</div>
  <div class="ru">${highlight(e.Russian,q)}</div><span class="tag">${highlight(e[tagKey]||'',q)}</span></article>`).join('')||`<p class="empty-state">${escapeHTML(t('no_results'))}</p>`;
}
function buildGrammarTagCloud(){
 const wrap=document.getElementById('grammarTagCloud');if(!wrap)return;
 const key=getLang()==='ru'?'rutag':'engtag',counts={};GRAMMAR.forEach(g=>{const tag=g[key]||'other';counts[tag]=(counts[tag]||0)+1});
 const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
 if(currentGrammarTag&&!counts[currentGrammarTag])currentGrammarTag='';
 wrap.innerHTML=`<button type="button" data-tag="" class="${!currentGrammarTag?'active':''}">${escapeHTML(t('all_tags'))}</button>`+sorted.map(([tag,n])=>`<button type="button" data-tag="${escapeHTML(tag)}" class="${tag===currentGrammarTag?'active':''}">${escapeHTML(tag)} <span class="cnt">${n}</span></button>`).join('');
 wrap.querySelectorAll('button').forEach(b=>b.onclick=()=>{currentGrammarTag=b.dataset.tag;buildGrammarTagCloud();renderGrammar()});
}
function buildGrammarLevelFilter(){
 const sel=document.getElementById('grammarLevelFilter');if(!sel)return;
 const old=currentGrammarLevel,levels=[...new Set(GRAMMAR.map(g=>g.level).filter(x=>x!=null))].sort((a,b)=>a-b);
 sel.innerHTML=`<option value="">${escapeHTML(t('all_levels'))}</option>`+levels.map(l=>`<option value="${escapeHTML(l)}">${escapeHTML(t('grammar_level_'+l))}</option>`).join('');
 sel.value=old;sel.onchange=()=>{currentGrammarLevel=sel.value;renderGrammar()};
}
function renderExamples(raw,q){
 if(!raw)return '';
 return `<div class="example-chips">${String(raw).split(' / ').map(part=>{
  const pieces=part.split('—');const kr=pieces.shift().trim(),tr=pieces.join('—').trim();
  return `<div class="example-chip"><span class="kr-example">${highlight(kr,q)}</span>${tr?`<span class="translation">${highlight(tr,q)}</span>`:''}</div>`;
 }).join('')}</div>`;
}
function renderGrammar(){
 const el=document.getElementById('grammarList');if(!el)return;
 const q=(document.getElementById('grammarSearch')?.value||'').trim(),low=q.toLowerCase(),lang=getLang(),tagKey=lang==='ru'?'rutag':'engtag';
 const filtered=GRAMMAR.filter(g=>{
  const title=lang==='ru'?(g.ru_title||''):(g.en_title||''),expl=lang==='ru'?(g.ru_explanation||''):(g.en_explanation||''),example=lang==='ru'?(g.ru_example||''):(g.en_example||'');
  const hay=[title,expl,example,g.ru_title,g.en_title,g.ru_explanation,g.en_explanation,g.ru_example,g.en_example,g.engtag,g.rutag].join(' ').toLowerCase();
  return (!low||hay.includes(low))&&(!currentGrammarTag||g[tagKey]===currentGrammarTag)&&(!currentGrammarLevel||String(g.level)===String(currentGrammarLevel));
 });
 const count=document.getElementById('grammarResultCount');if(count)count.textContent=t('results_count').replace('{n}',filtered.length);
 el.innerHTML=filtered.map((g,i)=>{
  const title=lang==='ru'?(g.ru_title||''):(g.en_title||''),expl=lang==='ru'?(g.ru_explanation||''):(g.en_explanation||''),example=lang==='ru'?(g.ru_example||''):(g.en_example||'');
  const level=Math.min(4,Math.max(1,Number(g.level)||1));
  return `<article class="card grammar-card" style="--i:${i};--level-color:var(--level-${level})"><h3>${highlight(title,q)}<span class="g-tag">${escapeHTML(g[tagKey]||'')}</span><span class="g-level">${escapeHTML(t('grammar_level_'+g.level))}</span></h3><p class="expl">${highlight(expl,q)}</p>${renderExamples(example,q)}</article>`;
 }).join('')||`<p class="empty-state">${escapeHTML(t('no_results'))}</p>`;
}
document.addEventListener('DOMContentLoaded',()=>{
 loadData();
 const ds=document.getElementById('dictSearch'),gs=document.getElementById('grammarSearch');
 if(ds)ds.addEventListener('input',renderDict);
 if(gs)gs.addEventListener('input',debounce(renderGrammar,180));
 document.querySelectorAll('[data-grammar-query]').forEach(b=>b.addEventListener('click',()=>{if(gs){gs.value=b.dataset.grammarQuery;renderGrammar();gs.focus()}}));
 const reset=document.getElementById('grammarReset');if(reset)reset.onclick=()=>{currentGrammarTag='';currentGrammarLevel='';if(gs)gs.value='';const sel=document.getElementById('grammarLevelFilter');if(sel)sel.value='';buildGrammarTagCloud();renderGrammar()};
});
document.addEventListener('langChanged',()=>{buildTagFilter();buildQuickFilters();buildSortFilter();buildGrammarTagCloud();buildGrammarLevelFilter();renderDict();renderGrammar()});
