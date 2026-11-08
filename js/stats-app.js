let statDict=[],statGrammar=[],statDates=[];
const chartPalette=['var(--chart-1)','var(--chart-2)','var(--chart-3)','var(--chart-4)','var(--chart-5)','var(--chart-6)','var(--chart-7)','var(--chart-8)'];
const svgNS='http://www.w3.org/2000/svg';
function countLearnedWords(entries){return entries.length}
function countMultiMeaning(entries){const seen=new Set(),dupes=new Set();entries.forEach(e=>{if(seen.has(e.Korean))dupes.add(e.Korean);seen.add(e.Korean)});return dupes.size}
async function initStats(){
 try{
  const [d,g,p]=await Promise.all([
   fetch('data/dictionary.json').then(r=>{if(!r.ok)throw Error('dictionary');return r.json()}),
   fetch('data/grammar.json').then(r=>{if(!r.ok)throw Error('grammar');return r.json()}),
   fetch('data/korean-progress.json').then(r=>r.ok?r.json():[])
  ]);
  statDict=Array.isArray(d)?d:[];statGrammar=Array.isArray(g)?g:[];statDates=Array.isArray(p)?p:[];
  renderStats();
 }catch(err){const el=document.getElementById('statGrid');if(el)el.innerHTML=`<p>${t('data_load_error')}</p>`;console.error(err)}
}
function countsBy(entries,key){const c={};entries.forEach(e=>{const k=e[key]||'other';c[k]=(c[k]||0)+1});return c}
function makeSvg(tag,attrs={}){const n=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n}
function tooltip(text,x,y){let tip=document.getElementById('chartTooltip');if(!tip){tip=document.createElement('div');tip.id='chartTooltip';tip.className='chart-tooltip';document.body.appendChild(tip)}tip.textContent=text;tip.style.left=`${x}px`;tip.style.top=`${y}px`;tip.classList.add('show')}
function hideTooltip(){document.getElementById('chartTooltip')?.classList.remove('show')}
function attachTip(node,text){node.addEventListener('mousemove',e=>tooltip(text,e.clientX,e.clientY));node.addEventListener('mouseleave',hideTooltip);node.setAttribute('tabindex','0');node.setAttribute('aria-label',text)}
function renderDonut(){
 const wrap=document.getElementById('tagDonut');if(!wrap)return;
 const key=getLang()==='ru'?'rutag':'engtag',counts=countsBy(statDict,key);
 let rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]);if(rows.length>8){const rest=rows.slice(8).reduce((s,x)=>s+x[1],0);rows=rows.slice(0,8).concat([[t('chart_other'),rest]])}
 const total=rows.reduce((s,x)=>s+x[1],0)||1,circ=2*Math.PI*70;let offset=0;
 const svg=makeSvg('svg',{viewBox:'0 0 180 180',class:'donut-svg',role:'img','aria-label':t('stat_by_tag')});
 svg.appendChild(makeSvg('circle',{cx:90,cy:90,r:70,fill:'none',stroke:'var(--chart-muted)','stroke-width':22}));
 rows.forEach(([label,n],i)=>{const len=n/total*circ;const circle=makeSvg('circle',{cx:90,cy:90,r:70,fill:'none',stroke:chartPalette[i%chartPalette.length],'stroke-width':22,'stroke-dasharray':`${len} ${circ-len}`,'stroke-dashoffset':-offset,transform:'rotate(-90 90 90)',class:'donut-segment'});attachTip(circle,`${label}: ${n} (${Math.round(n/total*100)}%)`);svg.appendChild(circle);offset+=len});
 const center=makeSvg('text',{x:90,y:85,'text-anchor':'middle',fill:'var(--text)','font-size':24,'font-weight':800});center.textContent=statDict.length;svg.appendChild(center);
 const sub=makeSvg('text',{x:90,y:103,'text-anchor':'middle',fill:'var(--text-soft)','font-size':9});sub.textContent=t('stat_learned');svg.appendChild(sub);
 const legend=rows.map(([label,n],i)=>`<div class="legend-row"><span class="legend-dot" style="background:${chartPalette[i%chartPalette.length]}"></span><span>${escapeStat(label)}</span><strong>${Math.round(n/total*100)}%</strong></div>`).join('');
 wrap.innerHTML='<div class="donut-layout"><div id="donutSvgHost"></div><div class="donut-legend">'+legend+'</div></div>';
 wrap.querySelector('#donutSvgHost').appendChild(svg);
}
function escapeStat(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderBars(wrapId,rows,labelFn){
 const wrap=document.getElementById(wrapId);if(!wrap)return;
 const max=Math.max(1,...rows.map(x=>x.value));
 wrap.innerHTML=rows.map((r,i)=>`<div class="bar-row"><div class="bar-label">${escapeStat(labelFn(r.label))}</div><div class="bar-track"><div class="bar-fill" style="--bar-width:${r.value/max*100}%;background:${chartPalette[i%chartPalette.length]}"></div></div><div class="bar-count">${r.value}</div></div>`).join('')||'—';
 wrap.querySelectorAll('.bar-row').forEach((el,i)=>attachTip(el,`${labelFn(rows[i].label)}: ${rows[i].value}`));
}
function renderRadar(){
 const wrap=document.getElementById('grammarRadar');if(!wrap)return;
 const key=getLang()==='ru'?'rutag':'engtag',counts=countsBy(statGrammar,key),rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
 if(rows.length<3){wrap.innerHTML=`<p class="chart-desc">${t('chart_radar_empty')}</p>`;return}
 const max=Math.max(...rows.map(x=>x[1]),1),cx=170,cy=135,r=92,n=rows.length;
 const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n,rr=r*v;return [cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]};
 let html='<svg class="chart-svg" viewBox="0 0 340 285" role="img">';
 [0.25,.5,.75,1].forEach(v=>{html+=`<polygon points="${rows.map((_,i)=>pt(i,v).join(',')).join(' ')}" fill="none" stroke="var(--border)" stroke-width="1"/>`});
 rows.forEach((row,i)=>{const [x,y]=pt(i,1),[lx,ly]=pt(i,1.18);html+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--border)"/><text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="var(--text-soft)" font-size="9">${escapeStat(row[0].slice(0,15))}</text>`});
 const points=rows.map((row,i)=>pt(i,row[1]/max)).map(p=>p.join(',')).join(' ');
 html+=`<polygon points="${points}" fill="var(--primary)" fill-opacity=".2" stroke="var(--primary)" stroke-width="2"/>`;
 rows.forEach((row,i)=>{const [x,y]=pt(i,row[1]/max);html+=`<circle cx="${x}" cy="${y}" r="4" fill="var(--accent)" data-radar="${escapeStat(row[0])}" data-count="${row[1]}"/>`});
 html+='</svg>';wrap.innerHTML=html;
 wrap.querySelectorAll('[data-radar]').forEach(el=>attachTip(el,`${el.dataset.radar}: ${el.dataset.count}`));
}
function parseDates(){return [...new Set(statDates.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)))].map(s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)})}
function streakStats(dates){
 const days=new Set(dates.map(d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)),sorted=[...dates].sort((a,b)=>a-b);let best=0,run=0,prev=null;
 sorted.forEach(d=>{const key=d.toDateString();if(prev&&((d-prev)/86400000)===1)run++;else run=1;best=Math.max(best,run);prev=d});
 let cur=0,day=new Date();day.setHours(0,0,0,0);if(!days.has(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`))day.setDate(day.getDate()-1);
 while(days.has(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`)){cur++;day.setDate(day.getDate()-1)}
 return {current:cur,best};
}
function renderWeekdays(dates){
 const counts=Array(7).fill(0);dates.forEach(d=>counts[(d.getDay()+6)%7]++);
 const names=['mon','tue','wed','thu','fri','sat','sun'].map(k=>t('weekday_'+k));
 const rows=names.map((label,i)=>({label,value:counts[i]}));renderBars('weekdayBars',rows,x=>x);
}
function monthTitle(month,n){return t('month_tooltip').replace('{month}',month).replace('{n}',n)}
function renderMonths(dates){
 const wrap=document.getElementById('monthHeatmap');if(!wrap)return;
 const year=new Date().getFullYear(),counts=Array(12).fill(0);dates.forEach(d=>{if(d.getFullYear()===year)counts[d.getMonth()]++});
 const names=new Intl.DateTimeFormat(getLang()==='ru'?'ru-RU':'en-US',{month:'short'});const max=Math.max(1,...counts);
 wrap.innerHTML=counts.map((n,i)=>`<div class="month-cell" data-level="${n?Math.min(3,Math.ceil(n/max*3)):0}" title="${monthTitle(names.format(new Date(year,i,1)),n)}"><span>${names.format(new Date(year,i,1))}</span><strong>${n}</strong></div>`).join('');
}
function renderRing(){
 const wrap=document.getElementById('wordProgress');if(!wrap)return;
 const target=5000,pct=Math.min(100,statDict.length/target*100),circ=2*Math.PI*58;
 wrap.innerHTML=`<div class="ring-layout"><svg class="progress-ring" viewBox="0 0 140 140"><circle cx="70" cy="70" r="58" fill="none" stroke="var(--primary-soft)" stroke-width="11"/><circle cx="70" cy="70" r="58" fill="none" stroke="var(--primary)" stroke-width="11" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ*(1-pct/100)}" transform="rotate(-90 70 70)"/><text x="70" y="68" text-anchor="middle" class="ring-value">${Math.round(pct)}%</text><text x="70" y="84" text-anchor="middle" class="ring-label">${escapeStat(t('stat_learned'))}</text></svg><div><strong>${statDict.length} / ${target}</strong><p class="chart-desc">${t('chart_word_goal')}</p></div></div>`;
}
function renderMiniTiles(dates){
 const wrap=document.getElementById('miniStats');if(!wrap)return;
 const streak=streakStats(dates),tagKey=getLang()==='ru'?'rutag':'engtag',tags=countsBy(statDict,tagKey),top=Object.entries(tags).sort((a,b)=>b[1]-a[1])[0];
 const avg=statDict.length?(statDict.reduce((sum,e)=>sum+String(e.English||'').trim().split(/\\s+/).filter(Boolean).length,0)/statDict.length).toFixed(1):'0';
 const tiles=[[ '🔥',t('mini_current_streak'),streak.current],[ '🏆',t('mini_best_streak'),streak.best],[ '📚',t('mini_avg_entries'),avg],[ '🏷️',t('mini_top_tag'),top?top[0]:'—' ]];
 wrap.innerHTML=tiles.map(([icon,label,value])=>`<div class="card stat-box"><div class="label">${icon} ${escapeStat(label)}</div><div class="num">${escapeStat(value)}</div></div>`).join('');
}
function renderStats(){
 const grid=document.getElementById('statGrid');if(!grid)return;
 const learned=countLearnedWords(statDict),multi=countMultiMeaning(statDict),dates=parseDates();
 grid.innerHTML=`<div class="card stat-box"><div class="num">${learned}</div><div class="label">${t('stat_learned')}</div></div><div class="card stat-box"><div class="num">${multi}</div><div class="label">${t('stat_multi')}</div></div><div class="card stat-box"><div class="num">${statGrammar.length}</div><div class="label">${t('stat_grammar')}</div></div><div class="card stat-box"><div class="num">${dates.length}</div><div class="label">${t('map_days')}</div></div>`;
 const tagKey=getLang()==='ru'?'rutag':'engtag';renderDonut();
 renderBars('grammarLevelBars',[1,2,3,4].map(l=>({label:l,value:statGrammar.filter(g=>Number(g.level)===l).length})),l=>t('grammar_level_'+l));
 renderRadar();renderWeekdays(dates);renderMonths(dates);renderRing();renderMiniTiles(dates);
 // Preserve the legacy chart containers for external links/bookmarks.
 renderBars('tagBars',Object.entries(countsBy(statDict,tagKey)).map(([label,value])=>({label,value})),x=>x);
 renderBars('grammarTagBars',Object.entries(countsBy(statGrammar,tagKey)).map(([label,value])=>({label,value})),x=>x);
}
document.addEventListener('DOMContentLoaded',initStats);
