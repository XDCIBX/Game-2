/* Лёгкая библиотека SVG-диаграмм без внешних зависимостей (работает офлайн). */
(function (global) {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Всплывающая подсказка ---------- */
  let tipEl = null;
  const tip = () => tipEl || (tipEl = document.getElementById('tooltip'));

  function showTip(html, e) {
    const t = tip();
    if (!t) return;
    t.innerHTML = html;
    t.hidden = false;
    moveTip(e);
  }
  function moveTip(e) {
    const t = tip();
    if (!t || t.hidden || !e) return;
    const pad = 14;
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > window.innerWidth - 8) x = Math.max(8, e.clientX - w - pad);
    if (y + h > window.innerHeight - 8) y = Math.max(8, e.clientY - h - pad);
    t.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }
  function hideTip() {
    const t = tip();
    if (t) t.hidden = true;
  }

  const tipTitle = (s) => `<div class="tt-title">${esc(s)}</div>`;
  const tipRow = (name, value, color) =>
    `<div class="tt-row">${color ? `<i class="tt-dot" style="background:${color}"></i>` : ''}<span class="n">${esc(name)}</span><b>${esc(value)}</b></div>`;

  function legendHTML(series) {
    return `<div class="legend">${series
      .map((s) => `<span class="legend-item"><i class="legend-swatch" style="background:${s.color}"></i>${esc(s.name)}</span>`)
      .join('')}</div>`;
  }

  const emptyHTML = (msg) => `<div class="chart-empty">${esc(msg || 'Пока нет данных для диаграммы')}</div>`;

  /* ---------- Шкала ---------- */
  function niceTicks(min, max, count) {
    count = count || 4;
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (max === min) { max = min === 0 ? 1 : min + Math.abs(min) * 0.1; }
    const span = max - min;
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }

  function axisWidth(labels) {
    const longest = Math.max(...labels.map((s) => String(s).length));
    return Math.min(84, longest * 7 + 14);
  }

  function svgPoint(svg, e, W) {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width };
  }

  function barPath(x, y, w, h, r, color) {
    if (h <= 0.3 || w <= 0) return '';
    r = Math.max(0, Math.min(r, w / 2, h));
    const d = r > 0
      ? `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
      : `M${x},${y + h}V${y}H${x + w}V${y + h}Z`;
    return `<path d="${d}" style="fill:${color}"/>`;
  }

  /* ---------- Столбчатая диаграмма (сгруппированная или накопительная) ---------- */
  function bars(el, cfg) {
    if (!el) return;
    const { labels, series, stacked = false, height = 260 } = cfg;
    const fmt = cfg.fmt || String;
    const fmtAxis = cfg.fmtAxis || fmt;
    const n = labels.length;
    const hasData = series.some((s) => s.values.some((v) => v > 0));
    const legend = series.length > 1 && cfg.legend !== false ? legendHTML(series) : '';
    if (!n || !hasData) { el.innerHTML = legend + emptyHTML(cfg.empty); return; }

    const W = Math.max(280, el.clientWidth || 600), H = height;
    let max = 0;
    for (let i = 0; i < n; i++) {
      if (stacked) {
        let s = 0;
        series.forEach((se) => (s += Math.max(0, se.values[i] || 0)));
        max = Math.max(max, s);
      } else series.forEach((se) => (max = Math.max(max, se.values[i] || 0)));
    }
    const ticks = niceTicks(0, max, 4);
    const hi = ticks[ticks.length - 1];
    const tickLabels = ticks.map(fmtAxis);
    const M = { t: 10, r: 6, b: 28, l: axisWidth(tickLabels) };
    const pw = W - M.l - M.r, ph = H - M.t - M.b;
    const y = (v) => M.t + ph - (v / hi) * ph;
    const band = pw / n;
    const groupW = Math.max(4, Math.min(band * 0.72, stacked ? 40 : 56));

    let grid = '';
    ticks.forEach((t, ix) => {
      const yy = y(t).toFixed(1);
      grid += `<line x1="${M.l}" x2="${W - M.r}" y1="${yy}" y2="${yy}" class="grid${t === 0 ? ' base' : ''}"/>`;
      grid += `<text x="${M.l - 8}" y="${yy}" class="axis" text-anchor="end" dominant-baseline="middle">${esc(tickLabels[ix])}</text>`;
    });
    const step = Math.ceil(n / Math.max(1, Math.floor(pw / 54)));
    labels.forEach((l, i) => {
      if (i % step) return;
      grid += `<text x="${(M.l + band * i + band / 2).toFixed(1)}" y="${H - 8}" class="axis" text-anchor="middle">${esc(l)}</text>`;
    });

    let bands = '', marks = '';
    for (let i = 0; i < n; i++) {
      bands += `<rect class="hover-band" data-i="${i}" x="${(M.l + band * i).toFixed(1)}" y="${M.t}" width="${band.toFixed(1)}" height="${ph}"/>`;
      const gx = M.l + band * i + (band - groupW) / 2;
      if (stacked) {
        const vis = series.map((s, j) => ({ j, v: Math.max(0, s.values[i] || 0) })).filter((o) => o.v > 0);
        let acc = 0;
        vis.forEach((o, idx) => {
          const y0 = y(acc), y1 = y(acc + o.v);
          acc += o.v;
          const gap = idx > 0 ? 2 : 0;
          marks += barPath(gx, y1, groupW, y0 - y1 - gap, idx === vis.length - 1 ? 4 : 0, series[o.j].color);
        });
      } else {
        const k = series.length;
        const bw = (groupW - (k - 1) * 2) / k;
        series.forEach((s, j) => {
          const v = Math.max(0, s.values[i] || 0);
          if (!v) return;
          const yy = y(v);
          marks += barPath(gx + j * (bw + 2), yy, bw, y(0) - yy, 4, s.color);
        });
      }
    }

    el.innerHTML = `${legend}<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(cfg.label || '')}">${grid}<g>${bands}</g><g class="marks">${marks}</g></svg>`;

    const titles = cfg.titles || labels;
    el.querySelectorAll('.hover-band').forEach((r) => {
      const i = +r.dataset.i;
      const html = () => {
        let h = tipTitle(titles[i]);
        series.forEach((s) => (h += tipRow(s.name, fmt(s.values[i] || 0), s.color)));
        if (stacked && series.length > 1) {
          const tot = series.reduce((a, s) => a + (s.values[i] || 0), 0);
          h += '<div class="tt-sep"></div>' + tipRow('Итого', fmt(tot));
        }
        if (cfg.extra) h += cfg.extra(i) || '';
        return h;
      };
      const on = (e) => {
        el.querySelectorAll('.hover-band.on').forEach((b) => b.classList.remove('on'));
        r.classList.add('on');
        showTip(html(), e);
      };
      r.addEventListener('pointerenter', on);
      r.addEventListener('pointerdown', on);
      r.addEventListener('pointermove', moveTip);
      r.addEventListener('pointerleave', (e) => {
        r.classList.remove('on');
        if (e.pointerType !== 'touch') hideTip();
      });
    });
  }

  /* ---------- Линейная диаграмма ---------- */
  function line(el, cfg) {
    if (!el) return;
    const { labels, series, height = 240, area = false } = cfg;
    const fmt = cfg.fmt || String;
    const fmtAxis = cfg.fmtAxis || fmt;
    const n = labels.length;
    const vals = [];
    series.forEach((s) => s.values.forEach((v) => v != null && isFinite(v) && vals.push(v)));
    const legend = series.length > 1 ? legendHTML(series) : '';
    if (!n || !vals.length) { el.innerHTML = legend + emptyHTML(cfg.empty); return; }

    const W = Math.max(280, el.clientWidth || 600), H = height;
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (cfg.zero !== false) lo = Math.min(0, lo);
    const ticks = niceTicks(lo, hi, 4);
    lo = ticks[0]; hi = ticks[ticks.length - 1];
    const tickLabels = ticks.map(fmtAxis);
    const M = { t: 12, r: 18, b: 28, l: axisWidth(tickLabels) };
    const pw = W - M.l - M.r, ph = H - M.t - M.b;
    const x = (i) => (n === 1 ? M.l + pw / 2 : M.l + (i * pw) / (n - 1));
    const y = (v) => M.t + ph - ((v - lo) / (hi - lo)) * ph;

    let grid = '';
    ticks.forEach((t, ix) => {
      const yy = y(t).toFixed(1);
      grid += `<line x1="${M.l}" x2="${W - M.r}" y1="${yy}" y2="${yy}" class="grid${t === 0 ? ' base' : ''}"/>`;
      grid += `<text x="${M.l - 8}" y="${yy}" class="axis" text-anchor="end" dominant-baseline="middle">${esc(tickLabels[ix])}</text>`;
    });
    const step = Math.ceil(n / Math.max(1, Math.floor(pw / 58)));
    const shown = [];
    for (let i = 0; i < n; i += step) shown.push(i);
    if (shown[shown.length - 1] !== n - 1) {
      if (n - 1 - shown[shown.length - 1] < step * 0.6) shown.pop();
      shown.push(n - 1);
    }
    shown.forEach((i) => {
      grid += `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="axis" text-anchor="middle">${esc(labels[i])}</text>`;
    });

    let marks = '';
    series.forEach((s) => {
      let d = '', pen = false, first = -1, last = -1;
      s.values.forEach((v, i) => {
        if (v == null || !isFinite(v)) { pen = false; return; }
        d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
        if (first < 0) first = i;
        last = i;
      });
      if (area && first >= 0 && !s.values.slice(first, last + 1).some((v) => v == null)) {
        const base = y(Math.max(lo, Math.min(0, hi))).toFixed(1);
        marks += `<path d="${d}L${x(last).toFixed(1)},${base}L${x(first).toFixed(1)},${base}Z" style="fill:${s.color};opacity:.12"/>`;
      }
      marks += `<path d="${d}" fill="none" style="stroke:${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (last >= 0) marks += `<circle cx="${x(last).toFixed(1)}" cy="${y(s.values[last]).toFixed(1)}" r="4.5" class="dot" style="fill:${s.color}"/>`;
    });

    el.innerHTML = `${legend}<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(cfg.label || '')}">${grid}<g class="marks">${marks}</g><g class="hover-layer"></g><rect class="hit" x="${M.l - 10}" y="${M.t}" width="${pw + 20}" height="${ph}" fill="transparent"/></svg>`;

    const svg = el.querySelector('svg');
    const layer = el.querySelector('.hover-layer');
    const hit = el.querySelector('.hit');
    const titles = cfg.titles || labels;
    const move = (e) => {
      const p = svgPoint(svg, e, W);
      const i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(((p.x - M.l) / pw) * (n - 1))));
      const xx = x(i).toFixed(1);
      let g = `<line class="crosshair" x1="${xx}" x2="${xx}" y1="${M.t}" y2="${M.t + ph}"/>`;
      let h = tipTitle(titles[i]);
      series.forEach((s) => {
        const v = s.values[i];
        if (v == null) return;
        g += `<circle cx="${xx}" cy="${y(v).toFixed(1)}" r="5" class="dot" style="fill:${s.color}"/>`;
        h += tipRow(s.name, fmt(v), s.color);
      });
      if (cfg.extra) h += cfg.extra(i) || '';
      layer.innerHTML = g;
      showTip(h, e);
    };
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', (e) => {
      layer.innerHTML = '';
      if (e.pointerType !== 'touch') hideTip();
    });
  }

  /* ---------- Кольцевая диаграмма ---------- */
  function arcPath(cx, cy, R, r, a0, a1) {
    if (a1 - a0 >= Math.PI * 2 - 1e-4) {
      return `M${cx - R},${cy}A${R},${R} 0 1 1 ${cx + R},${cy}A${R},${R} 0 1 1 ${cx - R},${cy}Z` +
        `M${cx - r},${cy}A${r},${r} 0 1 0 ${cx + r},${cy}A${r},${r} 0 1 0 ${cx - r},${cy}Z`;
    }
    const p = (a, rad) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${p(a0, R)}A${R},${R} 0 ${large} 1 ${p(a1, R)}L${p(a1, r)}A${r},${r} 0 ${large} 0 ${p(a0, r)}Z`;
  }

  function donut(el, cfg) {
    if (!el) return;
    const fmt = cfg.fmt || String;
    const fmtCenter = cfg.fmtCenter || fmt;
    const data = cfg.items.filter((d) => d.value > 0);
    const total = data.reduce((a, d) => a + d.value, 0);
    if (!total) { el.innerHTML = emptyHTML(cfg.empty); return; }

    const cx = 100, cy = 100, R = 94, r = 68;
    let a = -Math.PI / 2, paths = '';
    data.forEach((d, i) => {
      const ang = (d.value / total) * Math.PI * 2;
      paths += `<path class="arc" data-i="${i}" fill-rule="evenodd" d="${arcPath(cx, cy, R, r, a, a + ang)}" style="fill:${d.color}"/>`;
      a += ang;
    });
    const pct = (v) => {
      const p = (v / total) * 100;
      return (p < 1 && p > 0 ? '<1' : Math.round(p)) + '%';
    };
    const legend = data
      .map((d, i) => `<li data-i="${i}"><i class="legend-swatch" style="background:${d.color}"></i><span class="name">${esc(d.name)}</span><span class="val">${esc(fmt(d.value))}</span><span class="pct">${pct(d.value)}</span></li>`)
      .join('');

    el.innerHTML = `<div class="donut"><svg viewBox="0 0 200 200" class="donut-svg" role="img" aria-label="${esc(cfg.label || '')}">${paths}` +
      `<text x="100" y="97" text-anchor="middle" class="donut-total">${esc(fmtCenter(total))}</text>` +
      `<text x="100" y="118" text-anchor="middle" class="donut-cap">${esc(cfg.centerLabel || 'Всего')}</text></svg>` +
      `<ul class="donut-legend">${legend}</ul></div>`;

    const root = el.querySelector('.donut');
    const activate = (i, e) => {
      root.classList.add('dim');
      root.querySelectorAll('[data-i]').forEach((n) => n.classList.toggle('on', +n.dataset.i === i));
      const d = data[i];
      showTip(tipTitle(d.name) + tipRow('Сумма', fmt(d.value), d.color) + tipRow('Доля', pct(d.value).replace('<', 'менее ')), e);
    };
    const reset = (e) => {
      root.classList.remove('dim');
      root.querySelectorAll('.on').forEach((n) => n.classList.remove('on'));
      if (!e || e.pointerType !== 'touch') hideTip();
    };
    root.querySelectorAll('[data-i]').forEach((n) => {
      const i = +n.dataset.i;
      n.addEventListener('pointerenter', (e) => activate(i, e));
      n.addEventListener('pointerdown', (e) => activate(i, e));
      n.addEventListener('pointermove', moveTip);
      n.addEventListener('pointerleave', reset);
    });
  }

  /* ---------- Горизонтальные столбцы (рейтинг) ---------- */
  function hbars(el, cfg) {
    if (!el) return;
    const fmt = cfg.fmt || String;
    const items = cfg.items.filter((d) => d.value > 0);
    if (cfg.sort !== false) items.sort((a, b) => b.value - a.value);
    if (!items.length) { el.innerHTML = emptyHTML(cfg.empty); return; }
    const max = Math.max(...items.map((d) => d.value));
    const total = items.reduce((a, d) => a + d.value, 0);
    const legend = cfg.legend ? legendHTML(cfg.legend) : '';
    el.innerHTML = legend + `<div class="hbars">${items
      .map((d) => `<div class="hbar-row"><div class="hbar-label" title="${esc(d.name)}">${esc(d.name)}</div>` +
        `<div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(1, (d.value / max) * 100).toFixed(1)}%;background:${d.color || 'var(--series-1)'}"></div></div>` +
        `<div class="hbar-val">${esc(fmt(d.value))}${cfg.share ? `<span class="hbar-pct">${Math.round((d.value / total) * 100)}%</span>` : ''}</div></div>`)
      .join('')}</div>`;
  }

  global.Charts = { bars, line, donut, hbars, hideTip, esc };
})(window);
