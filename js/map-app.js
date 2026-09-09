// ---- World map bitmap (84 x 36), generated from real coastline data (land-110m), run-length encoded ----
const MAP_ROWS = [
  [['.',20],['#',18],['.',7],['#',3],['.',16],['#',1],['.',19]],
  [['.',14],['#',1],['.',4],['#',5],['.',4],['#',9],['.',25],['#',6],['.',16]],
  [['.',4],['#',5],['.',3],['#',6],['.',1],['#',7],['.',3],['#',8],['.',10],['#',2],['.',5],['#',1],['.',3],['#',21],['.',3],['#',1],['.',1]],
  [['#',2],['.',1],['#',20],['.',1],['#',3],['.',3],['#',4],['.',3],['#',1],['.',7],['#',39]],
  [['.',3],['#',17],['.',4],['#',2],['.',5],['#',1],['.',11],['#',3],['.',1],['#',35],['.',2]],
  [['.',11],['#',11],['.',2],['#',4],['.',13],['#',1],['.',2],['#',2],['.',1],['#',27],['.',4],['#',2],['.',4]],
  [['.',12],['#',17],['.',12],['#',34],['.',9]],
  [['.',13],['#',14],['.',14],['#',33],['.',10]],
  [['.',13],['#',13],['.',14],['#',3],['.',1],['#',5],['.',2],['#',2],['.',1],['#',19],['.',11]],
  [['.',13],['#',12],['.',15],['#',2],['.',6],['#',22],['.',1],['#',1],['.',2],['#',1],['.',9]],
  [['.',14],['#',10],['.',16],['#',5],['.',5],['#',20],['.',3],['#',1],['.',10]],
  [['.',15],['#',5],['.',2],['#',1],['.',16],['#',31],['.',14]],
  [['.',17],['#',2],['.',19],['#',18],['.',2],['#',12],['.',14]],
  [['.',18],['#',2],['.',1],['#',1],['.',16],['#',17],['.',4],['#',3],['.',2],['#',3],['.',17]],
  [['.',20],['#',2],['.',16],['#',16],['.',5],['#',2],['.',4],['#',3],['.',16]],
  [['.',22],['#',1],['.',1],['#',4],['.',11],['#',15],['.',6],['#',1],['.',5],['#',1],['.',17]],
  [['.',24],['#',6],['.',10],['#',2],['.',1],['#',10],['.',12],['#',1],['.',3],['#',1],['.',14]],
  [['.',23],['#',8],['.',13],['#',8],['.',13],['#',1],['.',2],['#',2],['.',14]],
  [['.',23],['#',10],['.',11],['#',7],['.',15],['#',1],['.',1],['#',1],['.',4],['#',3],['.',8]],
  [['.',23],['#',11],['.',11],['#',6],['.',24],['#',2],['.',7]],
  [['.',24],['#',9],['.',12],['#',7],['.',20],['#',2],['.',1],['#',1],['.',8]],
  [['.',25],['#',8],['.',12],['#',6],['.',1],['#',2],['.',16],['#',6],['.',8]],
  [['.',26],['#',6],['.',13],['#',5],['.',2],['#',1],['.',16],['#',8],['.',7]],
  [['.',25],['#',6],['.',14],['#',5],['.',18],['#',10],['.',6]],
  [['.',25],['#',5],['.',16],['#',3],['.',20],['#',9],['.',6]],
  [['.',25],['#',4],['.',45],['#',3],['.',7]],
  [['.',25],['#',2],['.',55],['#',1],['.',1]],
  [['.',25],['#',2],['.',54],['#',1],['.',2]],
  [['.',24],['#',2],['.',58]],
  [['.',25],['#',1],['.',58]],
  [['.',84]],
  [['.',84]],
  [['.',26],['#',1],['.',23],['#',8],['.',2],['#',18],['.',6]],
  [['.',18],['#',10],['.',10],['#',44],['.',2]],
  [['.',6],['#',18],['.',7],['#',1],['.',3],['#',45],['.',4]],
  [['.',7],['#',74],['.',3]],
];

function expandMapRow(segments){
  let out = '';
  for (const [ch, count] of segments) out += ch.repeat(count);
  return out;
}
const MAP_GRID = MAP_ROWS.map(expandMapRow);
const MAP_LAND_CELLS = [];
for (let r = 0; r < MAP_GRID.length; r++) {
  for (let c = 0; c < MAP_GRID[r].length; c++) {
    if (MAP_GRID[r][c] === '#') MAP_LAND_CELLS.push([r, c]);
  }
}

let studyDates = new Set();
let landRects = [];

function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function todayDate() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

function buildWorldMapSvg() {
  const svg = document.getElementById('worldmap');
  if (!svg) return;
  svg.innerHTML = '';
  landRects = [];
  MAP_LAND_CELLS.forEach(([r, c]) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', c);
    rect.setAttribute('y', r);
    rect.setAttribute('width', 0.86);
    rect.setAttribute('height', 0.86);
    rect.setAttribute('class', 'map-land');
    svg.appendChild(rect);
    landRects.push(rect);
  });
}

function computeStreaks() {
  if (studyDates.size === 0) return { current: 0, best: 0 };
  const dates = Array.from(studyDates).map(s => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }).sort((a, b) => a - b);
  let best = 1, run = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round((dates[i] - dates[i - 1]) / 86400000);
    if (diff === 1) run++; else if (diff > 1) run = 1;
    if (run > best) best = run;
  }
  const today = todayDate();
  let cursor = new Date(today), current = 0;
  if (!studyDates.has(fmtDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (studyDates.has(fmtDate(cursor))) { current++; cursor.setDate(cursor.getDate() - 1); }
  return { current, best };
}

let calCells = [];

function buildCalendar() {
  const grid = document.getElementById('calGrid');
  const months = document.getElementById('calMonths');
  if (!grid || !months) return;
  grid.innerHTML = ''; months.innerHTML = ''; calCells = [];

  const totalDays = 371;
  const today = todayDate();
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  const startPad = start.getDay();
  const totalCells = startPad + totalDays;
  const weeks = Math.ceil(totalCells / 7);
  grid.style.gridTemplateColumns = `repeat(${weeks}, 12px)`;
  months.style.gridTemplateColumns = `repeat(${weeks}, 12px)`;

  const monthFmt = new Intl.DateTimeFormat(getLang() === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' });
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    let label = '';
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      if (idx < startPad) continue;
      const dayNum = idx - startPad;
      if (dayNum >= totalDays) continue;
      const dt = new Date(start); dt.setDate(dt.getDate() + dayNum);
      if (dt.getMonth() !== lastMonth) { label = monthFmt.format(dt); lastMonth = dt.getMonth(); }
    }
    const cell = document.createElement('div');
    cell.textContent = label;
    months.appendChild(cell);
  }

  const dateFmt = new Intl.DateTimeFormat(getLang() === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    const dayNum = i - startPad;
    if (dayNum < 0 || dayNum >= totalDays) {
      cell.className = 'cal-day pad';
      grid.appendChild(cell);
      continue;
    }
    const dt = new Date(start); dt.setDate(dt.getDate() + dayNum);
    const key = fmtDate(dt);
    cell.className = 'cal-day';
    cell.title = dateFmt.format(dt);
    grid.appendChild(cell);
    calCells.push({ el: cell, date: key });
  }
}

function renderMapStats() {
  const total = studyDates.size;
  landRects.forEach((rect, idx) => rect.classList.toggle('filled', idx < total));
  calCells.forEach(({ el, date }) => el.classList.toggle('done', studyDates.has(date)));

  const pct = MAP_LAND_CELLS.length ? Math.round((total / MAP_LAND_CELLS.length) * 1000) / 10 : 0;
  const pctClamped = Math.min(100, pct);
  const { current, best } = computeStreaks();

  const statGrid = document.getElementById('mapStatGrid');
  if (statGrid) {
    statGrid.innerHTML = `
      <div class="card stat-box"><div class="num">${current}</div><div class="label">${t('map_streak')}</div></div>
      <div class="card stat-box"><div class="num">${best}</div><div class="label">${t('map_best')}</div></div>
      <div class="card stat-box"><div class="num">${total}</div><div class="label">${t('map_days')}</div></div>
      <div class="card stat-box"><div class="num">${pctClamped}%</div><div class="label">${t('map_filled')}</div></div>
    `;
  }
  const meta = document.getElementById('mapMeta');
  if (meta) meta.textContent = `${Math.min(total, MAP_LAND_CELLS.length)} / ${MAP_LAND_CELLS.length}`;
}

async function initMap() {
  buildWorldMapSvg();
  buildCalendar();
  try {
    const res = await fetch('data/korean-progress.json', { cache: 'no-store' });
    const arr = res.ok ? await res.json() : [];
    studyDates = new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    studyDates = new Set();
  }
  renderMapStats();
}

document.addEventListener('DOMContentLoaded', initMap);
