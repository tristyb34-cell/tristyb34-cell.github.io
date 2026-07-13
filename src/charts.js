/* ============================================================
   DAX — tiny dependency-free SVG charts
   ============================================================ */

// values: array of numbers. Returns an inline sparkline <svg>.
export function sparkline(values, { w = 96, h = 28, stroke = 'var(--accent)' } = {}) {
  if (!values || values.length === 0) return '';
  if (values.length === 1) values = [values[0], values[0]];
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / span) * (h - 4) - 2).toFixed(1)}`);
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(' ')}"/>
    <circle cx="${pts[pts.length-1].split(',')[0]}" cy="${pts[pts.length-1].split(',')[1]}" r="2.6" fill="${stroke}"/>
  </svg>`;
}

// series: [{x:Date|string, y:number}]. Returns a labelled line chart <svg>.
export function lineChart(series, { w = 320, h = 160, stroke = 'var(--accent)', fmt = (v) => v } = {}) {
  if (!series || series.length === 0) return '<div class="lead" style="text-align:center;padding:20px;">No data yet.</div>';
  const pad = { l: 34, r: 10, t: 12, b: 22 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const ys = series.map(s => s.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const n = series.length;
  const x = i => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = v => pad.t + ih - ((v - min) / (max - min)) * ih;
  const pts = series.map((s, i) => `${x(i).toFixed(1)},${y(s.y).toFixed(1)}`);
  const area = `${pad.l},${pad.t + ih} ${pts.join(' ')} ${(pad.l + iw).toFixed(1)},${pad.t + ih}`;
  const gridY = [min, (min + max) / 2, max];
  return `<svg class="chart" width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    ${gridY.map(g => `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>
      <text x="2" y="${(y(g)+3).toFixed(1)}" fill="var(--text-faint)" font-size="9">${fmt(Math.round(g*10)/10)}</text>`).join('')}
    <polygon points="${area}" fill="${stroke}" opacity="0.10"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${series.map((s, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(s.y).toFixed(1)}" r="3" fill="${stroke}"/>`).join('')}
  </svg>`;
}

// last `weeks` of activity as a GitHub-style heatmap. active = Set of 'YYYY-MM-DD'.
export function heatmap(activeSet, { weeks = 12 } = {}) {
  const today = new Date();
  const cells = [];
  const total = weeks * 7;
  // align so the last column ends today
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, on: activeSet.has(key) });
  }
  const on = cells.filter(c => c.on).length;
  return `<div class="heat" role="img" aria-label="Activity, last ${weeks} weeks: ${on} of ${total} days trained">${cells.map(c =>
    `<span class="heat-cell ${c.on ? 'on' : ''}" data-key="${c.key}" title="${c.key}"></span>`).join('')}</div>`;
}
