/* Морской бюджет — учёт финансов моряка-контрактника. Данные хранятся только на этом устройстве. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = Charts.esc;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const num = (v) => {
    const n = parseFloat(String(v ?? '').replace(/[\s ]/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  };
  const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (f(x) || 0), 0);

  /* ================= Справочники ================= */
  const APP_VERSION = '1.4';
  const STORAGE_KEY = 'seafin-data-v1';
  const CURRENCIES = {
    USD: { symbol: '$', name: 'Доллар США' },
    UAH: { symbol: '₴', name: 'Гривна' },
    MDL: { symbol: 'L', name: 'Молдавский лей' },
  };
  const S = (n) => `var(--series-${n})`;

  const INCOME_CATS = [
    { key: 'salary', name: 'Зарплата по контракту', short: 'Зарплата', color: S(1) },
    { key: 'passive', name: 'Проценты, дивиденды, аренда', short: 'Проценты и аренда', color: S(3) },
    { key: 'other', name: 'Прочие доходы', short: 'Прочие доходы', color: S(4) },
  ];

  const ASSET_TYPES = {
    real: ['Квартира', 'Дом', 'Земельный участок', 'Гараж / паркинг', 'Коммерческая недвижимость', 'Другое'],
    movable: ['Автомобиль', 'Мотоцикл / лодка', 'Техника и электроника', 'Ювелирные изделия', 'Другое'],
  };

  const INV_TYPES = {
    crypto: { name: 'Криптовалюта', short: 'Крипта', color: S(3) },
    deposit: { name: 'Банковские депозиты', short: 'Депозиты', color: S(4) },
    stocks: { name: 'Акции и фонды', short: 'Акции', color: S(5) },
    cash: { name: 'Наличные и сбережения', short: 'Наличные', color: S(6) },
    other: { name: 'Другие инвестиции', short: 'Другое', color: S(7) },
  };

  const COINS = {
    BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin', BNB: 'binancecoin', SOL: 'solana',
    XRP: 'ripple', TON: 'the-open-network', ADA: 'cardano', DOGE: 'dogecoin', TRX: 'tron', LTC: 'litecoin', DOT: 'polkadot',
  };

  const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8M5 14a7 7 0 0 0 14 0"/>',
    building: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-5h6v5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    ship: '<path d="M3 17l2 4h14l2-4-9-3z"/><path d="M6 15V9h12v6M12 4v5M9 6h6"/>',
    beach: '<path d="M4 20h16"/><path d="M12 20c0-6 0-9-3-12M9 8c-2-1-4 0-5 1 2 0 4 0 5-1zm0 0c0-2 1-4 3-4-1 1-2 3-3 4zm0 0c2-1 4-1 6 1-2 0-4 0-6-1z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  const TABS = [
    { id: 'dashboard', title: 'Обзор', short: 'Обзор', icon: 'home' },
    { id: 'months', title: 'Доходы и расходы', short: 'Месяцы', icon: 'calendar' },
    { id: 'contracts', title: 'Контракты', short: 'Рейсы', icon: 'anchor' },
    { id: 'assets', title: 'Имущество', short: 'Имущество', icon: 'building' },
    { id: 'invest', title: 'Инвестиции', short: 'Инвест.', icon: 'chart' },
    { id: 'settings', title: 'Настройки', short: 'Ещё', icon: 'sliders' },
  ];

  /* ================= Состояние ================= */
  const DEFAULT_STATE = () => ({
    version: 1,
    settings: { currency: 'USD', rates: { USD: 1, UAH: 41.8, MDL: 17.1 }, ratesUpdated: null, autoRates: true, cryptoUpdated: null, theme: 'auto' },
    months: [], contracts: [], assets: [], debts: [], investments: [], snapshots: {},
  });

  function normalize(raw) {
    const d = DEFAULT_STATE();
    const s = Object.assign(d, raw || {});
    s.settings = Object.assign(DEFAULT_STATE().settings, raw && raw.settings);
    s.settings.rates = Object.assign({ USD: 1, UAH: 41.8, MDL: 17.1 }, s.settings.rates);
    s.settings.rates.USD = 1;
    ['months', 'contracts', 'assets', 'debts', 'investments'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    if (!s.snapshots || typeof s.snapshots !== 'object') s.snapshots = {};
    // Переход со старого формата: бонусы входят в зарплату, расходы по категориям — в одну общую сумму
    s.months.forEach((m) => {
      m.income = m.income || {};
      m.expense = m.expense || {};
      if ('bonus' in m.income) {
        const total = num(m.income.salary) + num(m.income.bonus);
        delete m.income.bonus;
        if (total) m.income.salary = total;
      }
      const old = Object.keys(m.expense).filter((k) => k !== 'total');
      if (old.length) {
        const total = num(m.expense.total) + sum(old, (k) => num(m.expense[k]));
        m.expense = total ? { total } : {};
      }
    });
    if (!CURRENCIES[s.settings.currency]) s.settings.currency = 'USD';
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return normalize(null);
    }
  }

  let state = load();
  const ui = { tab: 'dashboard', period: '12m' };
  try {
    const savedUi = JSON.parse(localStorage.getItem(STORAGE_KEY + '-ui') || '{}');
    if (TABS.some((t) => t.id === savedUi.tab)) ui.tab = savedUi.tab;
    if (savedUi.period) ui.period = savedUi.period;
  } catch (e) { /* без сохранённых настроек интерфейса */ }
  const hashTab = location.hash.slice(1);
  if (TABS.some((t) => t.id === hashTab)) ui.tab = hashTab;

  function persistUi() {
    try { localStorage.setItem(STORAGE_KEY + '-ui', JSON.stringify(ui)); } catch (e) { /* ignore */ }
  }

  function save() {
    updateSnapshot();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('Не удалось сохранить данные в браузере. Сделайте резервную копию в «Настройках».', 'error');
    }
  }

  /* ================= Валюта и форматирование ================= */
  const cur = () => state.settings.currency;
  const rate = (c) => num(state.settings.rates[c]) || 1;
  const conv = (amount, from, to = cur()) => (num(amount) / rate(from || 'USD')) * rate(to);
  const toUSD = (amount, from) => conv(amount, from, 'USD');

  const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const nfC = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });
  const minus = (s) => s.replace(/^-/, '−');

  function fmt(v, c = cur()) {
    const a = Math.abs(v);
    return minus((a < 100 ? nf2 : nf0).format(v)) + ' ' + CURRENCIES[c].symbol;
  }
  const fmtSigned = (v, c) => (v > 0 ? '+' : '') + fmt(v, c);
  const fmtCompact = (v, c = cur()) => minus(nfC.format(v)) + ' ' + CURRENCIES[c].symbol;
  const fmtAxis = (v) => minus(nfC.format(v));
  const fmtNum = (v) => minus(nf2.format(v));
  const fmtPct = (v) => (v == null || !isFinite(v) ? '—' : minus(nf0.format(v * 100)) + '%');
  const fmtSignedPct = (v) => (v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + minus(new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(v * 100)) + '%');
  const tone = (v) => (v > 0.005 ? 'pos' : v < -0.005 ? 'neg' : '');

  /* ================= Даты ================= */
  const pad2 = (n) => String(n).padStart(2, '0');
  const monthKey = (d = new Date()) => d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  function monthLabel(k, full) {
    const [y, m] = k.split('-').map(Number);
    return full ? `${MONTHS_FULL[m - 1]} ${y}` : `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
  }
  function addMonths(k, n) {
    let [y, m] = k.split('-').map(Number);
    m += n;
    y += Math.floor((m - 1) / 12);
    m = (((m - 1) % 12) + 12) % 12 + 1;
    return y + '-' + pad2(m);
  }
  function monthRange(a, b) {
    const out = [];
    for (let k = a; k <= b && out.length < 600; k = addMonths(k, 1)) out.push(k);
    return out;
  }
  const parseDate = (s) => {
    if (!s) return null;
    const [y, m, d] = String(s).split('-').map(Number);
    return y ? new Date(y, (m || 1) - 1, d || 1) : null;
  };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const DAY = 86400000;
  const daysBetween = (a, b) => Math.round((b - a) / DAY);
  const fmtDate = (s) => { const d = parseDate(s); return d ? `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}` : '—'; };
  const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  function addMonthsDate(d, n) {
    const r = new Date(d);
    r.setMonth(r.getMonth() + n);
    return r;
  }
  function fmtDuration(days) {
    if (days < 31) return `${days} дн.`;
    const months = Math.floor(days / 30.4375);
    const y = Math.floor(months / 12), m = months % 12;
    if (y) return `${y} ${plural(y, 'год', 'года', 'лет')}${m ? ` ${m} мес.` : ''}`;
    const d = Math.round(days - months * 30.4375);
    return `${m} мес.${d ? ` ${d} дн.` : ''}`;
  }
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  /* ================= Расчёты ================= */
  function monthTotals(m) {
    const inc = {};
    let income = 0;
    INCOME_CATS.forEach((c) => { const v = conv(m.income && m.income[c.key], m.incomeCur); inc[c.key] = v; income += v; });
    const expense = conv(m.expense && m.expense.total, m.expenseCur);
    return { inc, income, expense, balance: income - expense };
  }
  const monthsMap = () => Object.fromEntries(state.months.map((m) => [m.id, m]));
  const sortedMonths = () => [...state.months].sort((a, b) => (a.id < b.id ? 1 : -1));

  function periodKeys(p) {
    const ks = state.months.map((m) => m.id).sort();
    const now = monthKey();
    const last = ks.length && ks[ks.length - 1] > now ? ks[ks.length - 1] : now;
    if (/^\d{4}$/.test(p)) return monthRange(p + '-01', p + '-12');
    if (p === 'all' && ks.length) return monthRange(ks[0] < addMonths(last, -11) ? ks[0] : addMonths(last, -11), last);
    return monthRange(addMonths(last, -11), last);
  }
  function periodLabel(p) {
    if (p === 'all') return 'за всё время';
    if (/^\d{4}$/.test(p)) return `за ${p} год`;
    return 'за 12 месяцев';
  }

  function depositCalc(i, at = today()) {
    const principal = num(i.principal);
    const start = parseDate(i.start);
    const term = num(i.term);
    const r = num(i.rate) / 100;
    if (!start || !principal) return { value: principal, atEnd: principal, end: null };
    const end = term ? addMonthsDate(start, term) : null;
    const growth = (months) => (i.capitalization ? principal * Math.pow(1 + r / 12, months) : principal * (1 + (r * months) / 12));
    let elapsed = Math.max(0, (at - start) / DAY / 30.4375);
    if (term) elapsed = Math.min(elapsed, term);
    return { value: growth(elapsed), atEnd: term ? growth(term) : null, end };
  }

  function invCalc(i) {
    if (i.type === 'crypto') return { value: num(i.qty) * num(i.price), invested: num(i.invested) };
    if (i.type === 'deposit') { const d = depositCalc(i); return { value: d.value, invested: num(i.principal), dep: d }; }
    const value = num(i.value);
    return { value, invested: String(i.invested ?? '').trim() === '' ? value : num(i.invested) };
  }
  const invValue = (i, to = cur()) => conv(invCalc(i).value, i.currency, to);
  const invInvested = (i, to = cur()) => conv(invCalc(i).invested, i.currency, to);

  const totalAssets = (to = cur(), kind) => sum(state.assets.filter((a) => !kind || a.kind === kind), (a) => conv(a.value, a.currency, to));
  const totalInvest = (to = cur()) => sum(state.investments, (i) => invValue(i, to));
  const isOwed = (d) => d.direction === 'owed'; // мне должны
  const myDebts = () => state.debts.filter((d) => !isOwed(d));
  const owedToMe = () => state.debts.filter(isOwed);
  const totalDebts = (to = cur()) => sum(myDebts(), (d) => conv(d.amount, d.currency, to));
  const totalOwed = (to = cur()) => sum(owedToMe(), (d) => conv(d.amount, d.currency, to));
  const netWorth = (to = cur()) => totalAssets(to) + totalInvest(to) + totalOwed(to) - totalDebts(to);
  const snapWorth = (s) => s.a + s.i + (s.r || 0) - s.d;

  function avgMonthlyExpense() {
    const last = sortedMonths().slice(0, 12);
    if (!last.length) return 0;
    return sum(last, (m) => monthTotals(m).expense) / last.length;
  }

  function updateSnapshot() {
    const hasAny = state.assets.length || state.investments.length || state.debts.length;
    const k = monthKey();
    if (!hasAny && !state.snapshots[k]) return;
    state.snapshots[k] = { a: Math.round(totalAssets('USD')), i: Math.round(totalInvest('USD')), r: Math.round(totalOwed('USD')), d: Math.round(totalDebts('USD')) };
  }

  function contractDates(c) {
    return { s: parseDate(c.start), e: parseDate(c.end) };
  }
  function seaStatus() {
    const t = today();
    const list = state.contracts.map((c) => ({ c, ...contractDates(c) })).filter((x) => x.s);
    const current = list.find((x) => x.s <= t && (!x.e || x.e >= t));
    if (current) {
      const total = current.e ? daysBetween(current.s, current.e) : null;
      const passed = daysBetween(current.s, t);
      const left = current.e ? daysBetween(t, current.e) : null;
      return { sea: true, c: current.c, total, passed, left };
    }
    const past = list.filter((x) => x.e && x.e < t).sort((a, b) => b.e - a.e)[0];
    const next = list.filter((x) => x.s > t).sort((a, b) => a.s - b.s)[0];
    return { sea: false, past, next, ashore: past ? daysBetween(past.e, t) : null };
  }
  function seaDaysTotal() {
    const t = today();
    return sum(state.contracts, (c) => {
      const { s, e } = contractDates(c);
      if (!s || s > t) return 0;
      const end = e && e < t ? e : t;
      return Math.max(0, daysBetween(s, end) + 1);
    });
  }
  function contractEarnings(c, to = cur()) {
    const { s, e } = contractDates(c);
    if (!s || !e) return 0;
    return conv((num(c.salary) * Math.max(0, daysBetween(s, e) + 1)) / 30.4375, c.currency, to);
  }
  function monthIsAtSea(k) {
    const [y, m] = k.split('-').map(Number);
    const ms = new Date(y, m - 1, 1), me = new Date(y, m, 0);
    return state.contracts.some((c) => {
      const { s, e } = contractDates(c);
      return s && s <= me && (!e || e >= ms);
    });
  }

  /* ================= Общие элементы интерфейса ================= */
  function toast(msg, type = '', ms = 3200) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.className = 'toast'), ms);
  }

  const kpi = (label, value, sub = '', cls = '') =>
    `<div class="kpi ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value" title="${esc(String(value).replace(/<[^>]+>/g, ''))}">${value}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;

  const card = (title, sub, body, extra = '', cls = '') =>
    `<section class="card ${cls}"><div class="card-head"><div><h3>${title}</h3>${sub ? `<p class="card-sub">${sub}</p>` : ''}</div>${extra}</div>${body}</section>`;

  const chartBox = (id) => `<div class="chart" id="${id}"></div>`;

  function periodPicker() {
    const years = [...new Set(state.months.map((m) => m.id.slice(0, 4)))].sort().reverse();
    const opts = [['12m', '12 месяцев'], ...years.map((y) => [y, y]), ['all', 'Всё время']];
    return `<div class="seg period" role="group" aria-label="Период">${opts
      .map(([v, l]) => `<button type="button" class="${ui.period === v ? 'on' : ''}" data-action="period" data-v="${v}">${l}</button>`)
      .join('')}</div>`;
  }

  function currencySwitch(action = 'currency', value = cur()) {
    return `<div class="seg" role="group" aria-label="Валюта">${Object.keys(CURRENCIES)
      .map((c) => `<button type="button" class="${value === c ? 'on' : ''}" data-action="${action}" data-v="${c}" title="${CURRENCIES[c].name}">${CURRENCIES[c].symbol} ${c}</button>`)
      .join('')}</div>`;
  }

  const curOptions = (sel) => Object.keys(CURRENCIES).map((c) => `<option value="${c}" ${sel === c ? 'selected' : ''}>${c} ${CURRENCIES[c].symbol}</option>`).join('');

  /* ================= Отрисовка ================= */
  const chartJobs = [];
  const later = (fn) => chartJobs.push(fn);

  function render() {
    const tab = TABS.find((t) => t.id === ui.tab) || TABS[0];
    $('#nav').innerHTML = TABS.map((t) => `<button type="button" class="nav-btn ${t.id === tab.id ? 'active' : ''}" data-action="tab" data-v="${t.id}">${icon(t.icon)}<span>${t.title}</span></button>`).join('');
    $('#tabbar').innerHTML = TABS.map((t) => `<button type="button" class="tab-btn ${t.id === tab.id ? 'active' : ''}" data-action="tab" data-v="${t.id}" aria-label="${t.title}">${icon(t.icon)}<span>${t.short}</span></button>`).join('');
    $('#pageTitle').textContent = tab.title;
    $('#topCurrency').innerHTML = currencySwitch();
    $('#themeBtn').innerHTML = icon(isDark() ? 'sun' : 'moon');
    $('#themeBtn').title = isDark() ? 'Светлая тема' : 'Тёмная тема';
    document.title = `${tab.title} · Морской бюджет`;

    chartJobs.length = 0;
    const views = { dashboard: viewDashboard, months: viewMonths, contracts: viewContracts, assets: viewAssets, invest: viewInvest, settings: viewSettings };
    $('#view').innerHTML = views[tab.id]();
    drawCharts();
  }
  function drawCharts() {
    Charts.hideTip();
    chartJobs.forEach((fn) => fn());
  }

  /* ---------- Обзор ---------- */
  function statusBanner() {
    const st = seaStatus();
    if (!state.contracts.length) {
      return `<div class="banner">${`<div class="banner-icon">${icon('anchor')}</div>`}<div class="banner-main"><div class="banner-title">Добавьте свои контракты</div><div class="banner-sub">Тогда приложение покажет, сколько дней осталось до конца рейса и сколько вы на берегу.</div></div><button class="btn" data-action="tab" data-v="contracts">К контрактам</button></div>`;
    }
    if (st.sea) {
      const c = st.c;
      const pct = st.total ? Math.min(100, (st.passed / st.total) * 100) : 0;
      const expected = st.left != null ? conv((num(c.salary) * st.left) / 30.4375, c.currency) : 0;
      return `<div class="banner sea"><div class="banner-icon">${icon('ship')}</div><div class="banner-main">
        <div class="banner-title">В рейсе · ${esc(c.vessel || 'судно')}${c.position ? ` <span class="muted">· ${esc(c.position)}</span>` : ''}</div>
        <div class="banner-sub">${st.left != null ? `До окончания контракта <b>${st.left} ${plural(st.left, 'день', 'дня', 'дней')}</b> (${fmtDate(c.end)}) · ещё заработаете ≈ <b>${fmt(expected)}</b>` : `В рейсе ${st.passed} дн.`}</div>
        ${st.total ? `<div class="progress" title="Пройдено ${Math.round(pct)}% контракта"><i style="width:${pct}%"></i></div>` : ''}
      </div></div>`;
    }
    const nextTxt = st.next ? ` · следующий контракт с <b>${fmtDate(st.next.c.start)}</b> (через ${daysBetween(today(), st.next.s)} дн.)` : '';
    return `<div class="banner shore"><div class="banner-icon">${icon('beach')}</div><div class="banner-main">
      <div class="banner-title">На берегу${st.ashore != null ? ` · ${st.ashore} ${plural(st.ashore, 'день', 'дня', 'дней')}` : ''}</div>
      <div class="banner-sub">${st.past ? `Последний контракт закончился ${fmtDate(st.past.c.end)}` : 'Контракт ещё не начался'}${nextTxt}</div>
    </div></div>`;
  }

  function welcome() {
    return `<section class="card welcome">
      <div class="welcome-icon">${icon('anchor')}</div>
      <h2>Добро пожаловать в «Морской бюджет»</h2>
      <p>Простой учёт денег для моряка на контрактах. Не нужно записывать каждую покупку — <b>достаточно раз в месяц</b> внести итоговые доходы и расходы.</p>
      <ol class="steps">
        <li><b>Раз в месяц</b> внесите доходы и общую сумму расходов за месяц.</li>
        <li>Добавьте <b>контракты</b>, <b>имущество</b> и <b>инвестиции</b> — крипту, депозиты, сбережения.</li>
        <li>Смотрите диаграммы и капитал в долларах, гривнах или леях.</li>
      </ol>
      <div class="welcome-actions">
        <button class="btn primary" data-action="add-month">${icon('plus')} Внести первый месяц</button>
        <button class="btn" data-action="demo">Посмотреть на примере</button>
      </div>
      <p class="hint">Все данные хранятся только на этом устройстве. Не забывайте делать резервную копию в «Настройках».</p>
    </section>`;
  }

  function viewDashboard() {
    const empty = !state.months.length && !state.assets.length && !state.investments.length && !state.contracts.length;
    if (empty) return welcome();

    const keys = periodKeys(ui.period);
    const map = monthsMap();
    const rows = keys.map((k) => ({ k, t: map[k] ? monthTotals(map[k]) : null }));
    const income = sum(rows, (r) => r.t && r.t.income);
    const expense = sum(rows, (r) => r.t && r.t.expense);
    const saved = income - expense;
    const savingsRate = income ? saved / income : null;
    const nw = netWorth();
    const liquid = totalInvest();
    const avgExp = avgMonthlyExpense();
    const runway = avgExp ? liquid / avgExp : null;
    const filled = rows.filter((r) => r.t).length;

    const snapKeys = Object.keys(state.snapshots).sort();
    const prevSnap = snapKeys.length > 1 ? state.snapshots[snapKeys[snapKeys.length - 2]] : null;
    const prevNw = prevSnap ? conv(snapWorth(prevSnap), 'USD') : null;

    later(() => {
      Charts.bars($('#c-ie'), {
        labels: keys.map((k) => monthLabel(k)),
        titles: keys.map((k) => monthLabel(k, true) + (map[k] ? (map[k].status === 'sea' ? ' · в рейсе' : ' · на берегу') : ' · нет данных')),
        series: [
          { name: 'Доходы', color: S(1), values: rows.map((r) => (r.t ? r.t.income : 0)) },
          { name: 'Расходы', color: S(2), values: rows.map((r) => (r.t ? r.t.expense : 0)) },
        ],
        fmt: (v) => fmt(v), fmtAxis,
        extra: (i) => (rows[i].t ? '<div class="tt-sep"></div>' + `<div class="tt-row"><span class="n">Остаток</span><b class="${tone(rows[i].t.balance)}">${fmtSigned(rows[i].t.balance)}</b></div>` : ''),
        label: 'Доходы и расходы по месяцам',
        empty: 'Внесите итоги хотя бы одного месяца',
      });
      Charts.donut($('#c-src'), {
        items: INCOME_CATS.map((c) => ({ name: c.short, color: c.color, value: sum(rows, (r) => r.t && r.t.inc[c.key]) })),
        fmt: (v) => fmt(v), fmtCenter: (v) => fmtCompact(v), centerLabel: 'доходы',
        empty: 'Нет доходов за период',
      });
      Charts.line($('#c-nw'), {
        labels: snapKeys.map((k) => monthLabel(k)),
        titles: snapKeys.map((k) => monthLabel(k, true)),
        series: [{ name: 'Чистый капитал', color: S(1), values: snapKeys.map((k) => { const s = state.snapshots[k]; return conv(snapWorth(s), 'USD'); }) }],
        area: true, fmt: (v) => fmt(v), fmtAxis, zero: false,
        extra: (i) => { const s = state.snapshots[snapKeys[i]]; return '<div class="tt-sep"></div>' + `<div class="tt-row"><span class="n">Имущество</span><b>${fmt(conv(s.a, 'USD'))}</b></div><div class="tt-row"><span class="n">Инвестиции</span><b>${fmt(conv(s.i, 'USD'))}</b></div>${s.r ? `<div class="tt-row"><span class="n">Мне должны</span><b>${fmt(conv(s.r, 'USD'))}</b></div>` : ''}<div class="tt-row"><span class="n">Я должен</span><b>${fmt(-conv(s.d, 'USD'))}</b></div>`; },
        empty: 'История появится после добавления имущества или инвестиций',
      });
      const inv = (t) => sum(state.investments.filter((i) => i.type === t), (i) => invValue(i));
      Charts.donut($('#c-alloc'), {
        items: [
          { name: 'Недвижимость', value: totalAssets(cur(), 'real'), color: S(1) },
          { name: 'Движимое имущество', value: totalAssets(cur(), 'movable'), color: S(2) },
          { name: 'Криптовалюта', value: inv('crypto'), color: INV_TYPES.crypto.color },
          { name: 'Депозиты', value: inv('deposit'), color: INV_TYPES.deposit.color },
          { name: 'Акции и фонды', value: inv('stocks'), color: INV_TYPES.stocks.color },
          { name: 'Сбережения и прочее', value: inv('cash') + inv('other'), color: INV_TYPES.cash.color },
          { name: 'Мне должны', value: totalOwed(), color: S(7) },
        ],
        fmt: (v) => fmt(v), fmtCenter: (v) => fmtCompact(v), centerLabel: 'активы',
        empty: 'Добавьте имущество или инвестиции',
      });
    });

    const nwDelta = prevNw != null ? nw - prevNw : null;
    return `
      ${statusBanner()}
      <div class="kpis">
        ${kpi('Чистый капитал', fmt(nw), nwDelta != null ? `<span class="${tone(nwDelta)}">${fmtSigned(nwDelta)}</span> с прошлого снимка` : 'имущество + инвестиции ± долги', 'hero')}
        ${kpi(`Доходы ${periodLabel(ui.period)}`, fmt(income), filled ? `внесено месяцев: ${filled}` : 'нет данных')}
        ${kpi(`Расходы ${periodLabel(ui.period)}`, fmt(expense), filled ? `в среднем ${fmt(expense / filled)} в месяц` : 'нет данных')}
        ${kpi('В распоряжении', `<span class="${tone(saved)}">${fmtSigned(saved)}</span>`, savingsRate != null ? `это ${fmtPct(savingsRate)} от доходов` : '')}
        ${kpi('Финансовая подушка', runway != null ? `${nf0.format(Math.floor(runway))} мес.` : '—', runway != null ? `столько можно прожить на берегу на сбережения (${fmtCompact(liquid)})` : 'нужны данные о расходах и сбережениях')}
      </div>
      <div class="section-head"><h2>Динамика</h2>${periodPicker()}</div>
      <div class="grid-2">
        ${card('Доходы и расходы по месяцам', `в ${cur()} · наведите на месяц, чтобы увидеть детали`, chartBox('c-ie'), '', 'span-2')}
        ${card('Откуда деньги', `источники дохода ${periodLabel(ui.period)}`, chartBox('c-src'))}
        ${card('Распределение активов', 'где лежат ваши деньги сейчас', chartBox('c-alloc'))}
        ${card('Чистый капитал во времени', 'снимок сохраняется автоматически каждый месяц', chartBox('c-nw'), '', 'span-2')}
      </div>`;
  }

  /* ---------- Месяцы ---------- */
  function viewMonths() {
    const keys = periodKeys(ui.period);
    const map = monthsMap();
    const rows = keys.map((k) => ({ k, t: map[k] ? monthTotals(map[k]) : null }));
    later(() => {
      const filled = rows.filter((r) => r.t);
      const avgExp = filled.length ? sum(filled, (r) => r.t.expense) / filled.length : 0;
      Charts.bars($('#c-spend'), {
        labels: keys.map((k) => monthLabel(k)),
        titles: keys.map((k) => monthLabel(k, true) + (map[k] ? (map[k].status === 'sea' ? ' · в рейсе' : ' · на берегу') : ' · нет данных')),
        series: [{ name: 'Расходы', color: S(2), values: rows.map((r) => (r.t ? r.t.expense : 0)) }],
        fmt: (v) => fmt(v), fmtAxis, height: 260,
        extra: (ix) => {
          if (!rows[ix].t || !avgExp) return '';
          const d = rows[ix].t.expense - avgExp;
          return `<div class="tt-sep"></div><div class="tt-row"><span class="n">Среднее</span><b>${fmt(avgExp)}</b></div><div class="tt-row"><span class="n">Разница</span><b>${fmtSigned(d)}</b></div>`;
        },
        label: 'Расходы по месяцам',
        empty: 'Нет расходов за выбранный период',
      });
      let acc = 0;
      Charts.line($('#c-cum'), {
        labels: keys.map((k) => monthLabel(k)),
        titles: keys.map((k) => monthLabel(k, true)),
        series: [{ name: 'Накоплено', color: S(3), values: rows.map((r) => (acc += r.t ? r.t.balance : 0)) }],
        area: true, fmt: (v) => fmtSigned(v), fmtAxis,
        extra: (i) => (rows[i].t ? `<div class="tt-row"><span class="n">За месяц</span><b class="${tone(rows[i].t.balance)}">${fmtSigned(rows[i].t.balance)}</b></div>` : '<div class="tt-row"><span class="n">Месяц не внесён</span></div>'),
        empty: 'Нет данных за выбранный период',
      });
      const sea = rows.filter((r) => r.t && map[r.k].status === 'sea');
      const shore = rows.filter((r) => r.t && map[r.k].status !== 'sea');
      const avg = (arr, f) => (arr.length ? sum(arr, f) / arr.length : 0);
      Charts.bars($('#c-seashore'), {
        labels: ['В рейсе', 'На берегу'],
        titles: [`В рейсе · ${sea.length} мес.`, `На берегу · ${shore.length} мес.`],
        series: [
          { name: 'Средний доход', color: S(1), values: [avg(sea, (r) => r.t.income), avg(shore, (r) => r.t.income)] },
          { name: 'Средний расход', color: S(2), values: [avg(sea, (r) => r.t.expense), avg(shore, (r) => r.t.expense)] },
        ],
        fmt: (v) => fmt(v), fmtAxis, height: 240,
        empty: 'Нет данных за выбранный период',
      });
    });

    const list = sortedMonths();
    const table = list.length
      ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Месяц</th><th>Где</th><th class="num">Доходы</th><th class="num">Расходы</th><th class="num">Остаток</th><th class="num hide-sm">Отложено</th></tr></thead>
          <tbody>${list.map((m) => {
            const t = monthTotals(m);
            return `<tr data-action="edit-month" data-id="${m.id}" tabindex="0">
              <td><b>${monthLabel(m.id, true)}</b>${m.note ? `<div class="cell-note">${esc(m.note)}</div>` : ''}</td>
              <td>${m.status === 'sea' ? '<span class="badge sea">В рейсе</span>' : '<span class="badge shore">На берегу</span>'}</td>
              <td class="num">${fmt(t.income)}</td>
              <td class="num">${fmt(t.expense)}</td>
              <td class="num ${tone(t.balance)}"><b>${fmtSigned(t.balance)}</b></td>
              <td class="num hide-sm">${t.income && t.balance >= 0 ? fmtPct(t.balance / t.income) : '—'}</td></tr>`;
          }).join('')}</tbody></table></div>`
      : `<div class="empty-block">Пока нет ни одного месяца. Нажмите «Внести месяц» — это займёт пару минут.</div>`;

    return `
      <div class="section-head">
        <p class="lead">Раз в месяц внесите итоговые суммы — по чекам считать не нужно, достаточно примерных цифр.</p>
        <button class="btn primary" data-action="add-month">${icon('plus')} Внести месяц</button>
      </div>
      <div class="section-head"><h2>Диаграммы</h2>${periodPicker()}</div>
      <div class="grid-2">
        ${card('Расходы по месяцам', `${periodLabel(ui.period)}, в ${cur()} · наведите на месяц, чтобы сравнить со средним`, chartBox('c-spend'), '', 'span-2')}
        ${card('Накопленные сбережения', `сумма остатков ${periodLabel(ui.period)}`, chartBox('c-cum'))}
        ${card('Рейс или берег', 'средний месяц в море и дома', chartBox('c-seashore'))}
      </div>
      ${card('Все месяцы', 'нажмите на строку, чтобы изменить', table)}`;
  }

  function defaultNewMonth() {
    const have = new Set(state.months.map((m) => m.id));
    const now = monthKey();
    const prev = addMonths(now, -1);
    if (!have.has(prev)) return prev;
    if (!have.has(now)) return now;
    return addMonths(sortedMonths()[0].id, 1);
  }

  function openMonthForm(id) {
    const existing = id ? state.months.find((m) => m.id === id) : null;
    const initKey = existing ? existing.id : defaultNewMonth();
    const prev = sortedMonths().find((m) => m.id < initKey);
    let m = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: initKey,
      status: monthIsAtSea(initKey) ? 'sea' : 'shore',
      incomeCur: prev ? prev.incomeCur : 'USD',
      expenseCur: prev ? prev.expenseCur : cur(),
      income: {}, expense: {}, note: '',
    };

    const inputs = (cats, group) => cats.map((c) => `<label class="field"><span>${c.name}</span><input name="${group}_${c.key}" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(m[group][c.key] ?? '')}"></label>`).join('');
    const body = `
      <div class="form-grid">
        <label class="field"><span>Месяц</span><input type="month" name="id" required value="${m.id}"></label>
        <div class="field"><span>Где вы были в этом месяце</span>
          <div class="seg wide" data-seg="status">
            <button type="button" data-v="sea" class="${m.status === 'sea' ? 'on' : ''}">${icon('ship')} В рейсе</button>
            <button type="button" data-v="shore" class="${m.status !== 'sea' ? 'on' : ''}">${icon('beach')} На берегу</button>
          </div></div>
      </div>
      ${!existing && prev ? `<button type="button" class="btn small ghost copy-prev" data-copy>${icon('refresh')} Заполнить как в ${monthLabel(prev.id, true).toLowerCase()}</button>` : ''}
      <div class="group">
        <div class="group-head"><h4>Доходы</h4><label class="inline">Валюта <select name="incomeCur">${curOptions(m.incomeCur)}</select></label></div>
        <div class="form-grid">${inputs(INCOME_CATS, 'income')}</div>
      </div>
      <div class="group">
        <div class="group-head"><h4>Расходы</h4><label class="inline">Валюта <select name="expenseCur">${curOptions(m.expenseCur)}</select></label></div>
        <div class="form-grid"><label class="field full"><span>Все расходы за месяц</span><input name="expense_total" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(m.expense.total ?? '')}"><small class="hint">Одна общая сумма: сколько всего потрачено за месяц</small></label></div>
      </div>
      <label class="field full mt"><span>Заметка (необязательно)</span><textarea name="note" rows="2" placeholder="Например: ремонт машины, отпуск, продление документов">${esc(m.note || '')}</textarea></label>
      <div class="form-summary" id="msum"></div>`;

    openModal({
      title: existing ? `Итоги: ${monthLabel(existing.id, true)}` : 'Внести итоги месяца',
      body, wide: true, canDelete: !!existing,
      onMount(form) {
        const read = () => {
          const fd = new FormData(form);
          const r = { id: fd.get('id'), status: m.status, incomeCur: fd.get('incomeCur'), expenseCur: fd.get('expenseCur'), income: {}, expense: {}, note: String(fd.get('note') || '').trim() };
          INCOME_CATS.forEach((c) => { const v = String(fd.get('income_' + c.key) || '').trim(); if (v) r.income[c.key] = num(v); });
          const exp = String(fd.get('expense_total') || '').trim();
          if (exp) r.expense.total = num(exp);
          return r;
        };
        const summary = () => {
          const t = monthTotals(read());
          $('#msum').innerHTML = `<div><span>Доходы</span><b>${fmt(t.income)}</b></div><div><span>Расходы</span><b>${fmt(t.expense)}</b></div><div><span>Остаток</span><b class="${tone(t.balance)}">${fmtSigned(t.balance)}</b></div>`;
        };
        summary();
        form.addEventListener('input', summary);
        form.addEventListener('change', (e) => {
          if (e.target.name === 'id' && !existing && e.target.value) {
            m.status = monthIsAtSea(e.target.value) ? 'sea' : 'shore';
            $$('[data-seg="status"] button', form).forEach((b) => b.classList.toggle('on', b.dataset.v === m.status));
          }
          summary();
        });
        $$('[data-seg="status"] button', form).forEach((b) => b.addEventListener('click', () => {
          m.status = b.dataset.v;
          $$('[data-seg="status"] button', form).forEach((x) => x.classList.toggle('on', x === b));
        }));
        const copyBtn = $('[data-copy]', form);
        if (copyBtn) copyBtn.addEventListener('click', () => {
          INCOME_CATS.forEach((c) => { form.elements[`income_${c.key}`].value = prev.income[c.key] ?? ''; });
          form.elements.expense_total.value = prev.expense.total ?? '';
          form.elements.incomeCur.value = prev.incomeCur;
          form.elements.expenseCur.value = prev.expenseCur;
          summary();
          toast('Суммы скопированы — поправьте то, что изменилось');
        });
        return {
          submit() {
            const r = read();
            if (!/^\d{4}-\d{2}$/.test(r.id || '')) { toast('Выберите месяц', 'error'); return false; }
            const clash = state.months.find((x) => x.id === r.id && (!existing || x.id !== existing.id));
            if (clash && !confirm(`${monthLabel(r.id, true)} уже внесён. Заменить его новыми данными?`)) return false;
            state.months = state.months.filter((x) => x.id !== r.id && (!existing || x.id !== existing.id));
            state.months.push(r);
            save();
            toast(`${monthLabel(r.id, true)} сохранён`);
            return true;
          },
          remove() {
            state.months = state.months.filter((x) => x.id !== existing.id);
            save();
            toast('Месяц удалён');
          },
        };
      },
    });
  }

  /* ---------- Контракты ---------- */
  function viewContracts() {
    const list = [...state.contracts].sort((a, b) => (a.start < b.start ? 1 : -1));
    const st = seaStatus();
    const seaDays = seaDaysTotal();
    const t = today();
    const done = state.contracts.filter((c) => { const d = contractDates(c); return d.s && d.s <= t; });
    const earned = sum(done, (c) => {
      const { s, e } = contractDates(c);
      const end = e && e < t ? e : t;
      return conv((num(c.salary) * (daysBetween(s, end) + 1)) / 30.4375, c.currency);
    });
    const avgSalary = done.length ? sum(done, (c) => conv(c.salary, c.currency)) / done.length : 0;

    const timeline = () => {
      const items = state.contracts.map((c) => ({ c, ...contractDates(c) })).filter((x) => x.s && x.e).sort((a, b) => a.s - b.s);
      if (!items.length) return '<div class="chart-empty">Добавьте контракты с датами начала и окончания</div>';
      const min = new Date(items[0].s.getFullYear(), 0, 1);
      const maxEnd = new Date(Math.max(...items.map((x) => +x.e), +t));
      const max = new Date(maxEnd.getFullYear() + 1, 0, 1);
      const span = max - min;
      const pos = (d) => (((d - min) / span) * 100).toFixed(2);
      const years = [];
      for (let y = min.getFullYear(); y < max.getFullYear(); y++) years.push(y);
      return `<div class="timeline">
        <div class="tl-row tl-years"><div class="tl-label"></div><div class="tl-track">${years.map((y) => `<span style="left:${pos(new Date(y, 0, 1))}%">${y}</span>`).join('')}</div></div>
        ${items.map((x) => {
          const future = x.s > t, current = x.s <= t && x.e >= t;
          return `<div class="tl-row"><div class="tl-label" title="${esc(x.c.vessel)}">${esc(x.c.vessel || 'Контракт')}</div><div class="tl-track">
            ${years.map((y) => `<i class="tl-grid" style="left:${pos(new Date(y, 0, 1))}%"></i>`).join('')}
            <button type="button" class="tl-bar ${future ? 'future' : ''} ${current ? 'current' : ''}" data-action="edit-contract" data-id="${x.c.id}" style="left:${pos(x.s)}%;width:${Math.max(0.8, pos(x.e) - pos(x.s))}%" title="${esc(x.c.vessel)}: ${fmtDate(x.c.start)} — ${fmtDate(x.c.end)}"></button>
            <i class="tl-today" style="left:${pos(t)}%"></i></div></div>`;
        }).join('')}
        <div class="legend tl-legend"><span class="legend-item"><i class="legend-swatch" style="background:var(--series-1)"></i>Отработанный контракт</span><span class="legend-item"><i class="legend-swatch future-swatch"></i>Будущий контракт</span><span class="legend-item"><i class="legend-line"></i>Сегодня</span></div>
      </div>`;
    };

    const cards = list.length ? `<div class="list">${list.map((c) => {
      const { s, e } = contractDates(c);
      const days = s && e ? daysBetween(s, e) + 1 : null;
      const state_ = s > t ? '<span class="badge">Будущий</span>' : e && e < t ? '<span class="badge shore">Завершён</span>' : '<span class="badge sea">Сейчас</span>';
      return `<button type="button" class="item" data-action="edit-contract" data-id="${c.id}">
        <div class="item-main"><div class="item-title">${esc(c.vessel || 'Судно не указано')} ${state_}</div>
        <div class="item-sub">${[c.position, c.company].filter(Boolean).map(esc).join(' · ') || '—'}</div>
        <div class="item-sub">${fmtDate(c.start)} — ${fmtDate(c.end)}${days ? ` · ${fmtDuration(days)}` : ''}</div></div>
        <div class="item-side"><div class="item-value">${fmt(conv(c.salary, c.currency))}<span class="muted"> /мес.</span></div>
        <div class="item-sub">${c.currency !== cur() ? fmt(num(c.salary), c.currency) + ' · ' : ''}всего ≈ ${fmt(contractEarnings(c))}</div></div>
      </button>`;
    }).join('')}</div>` : '<div class="empty-block">Здесь будет история ваших рейсов: судно, компания, должность, сроки и зарплата.</div>';

    return `
      <div class="section-head"><p class="lead">История рейсов помогает видеть морской стаж, заработок по контрактам и время на берегу.</p>
        <button class="btn primary" data-action="add-contract">${icon('plus')} Добавить контракт</button></div>
      <div class="kpis">
        ${kpi('Сейчас', st.sea ? 'В рейсе' : 'На берегу', st.sea ? (st.left != null ? `осталось ${st.left} дн.` : '') : st.ashore != null ? `${st.ashore} дн. после рейса` : '', 'hero')}
        ${kpi('Морской стаж', seaDays ? fmtDuration(seaDays) : '—', `${seaDays} ${plural(seaDays, 'день', 'дня', 'дней')} в море`)}
        ${kpi('Заработано по контрактам', fmt(earned), 'по ставке, без бонусов')}
        ${kpi('Средняя зарплата', avgSalary ? fmt(avgSalary) : '—', 'в месяц по контрактам')}
      </div>
      ${card('Хронология рейсов', 'нажмите на полосу, чтобы открыть контракт', timeline())}
      ${card('Все контракты', '', cards)}`;
  }

  function openContractForm(id) {
    const c = id ? state.contracts.find((x) => x.id === id) : null;
    const last = [...state.contracts].sort((a, b) => (a.start < b.start ? 1 : -1))[0];
    openForm({
      title: c ? 'Контракт' : 'Новый контракт',
      data: c || { currency: last ? last.currency : 'USD', company: last ? last.company : '', position: last ? last.position : '' },
      fields: [
        { key: 'vessel', label: 'Судно', placeholder: 'Например: MV Ocean Star', required: true },
        { key: 'position', label: 'Должность', placeholder: 'Например: Второй помощник' },
        { key: 'company', label: 'Компания / крюинг', full: true },
        { key: 'start', label: 'Начало контракта', type: 'date', required: true },
        { key: 'end', label: 'Окончание (план или факт)', type: 'date', required: true },
        { key: 'salary', label: 'Зарплата в месяц', type: 'money', curKey: 'currency', full: true },
        { key: 'note', label: 'Заметка', type: 'textarea', full: true },
      ],
      validate: (v) => (v.start && v.end && v.end < v.start ? 'Окончание не может быть раньше начала' : ''),
      onSave(v) {
        if (c) Object.assign(c, v); else state.contracts.push({ id: uid(), ...v });
        save();
        toast('Контракт сохранён');
      },
      onDelete: c ? () => { state.contracts = state.contracts.filter((x) => x !== c); save(); toast('Контракт удалён'); } : null,
    });
  }

  /* ---------- Имущество ---------- */
  function viewAssets() {
    const real = state.assets.filter((a) => a.kind === 'real');
    const mov = state.assets.filter((a) => a.kind === 'movable');
    const totReal = totalAssets(cur(), 'real'), totMov = totalAssets(cur(), 'movable'), totDebt = totalDebts(), totOwed = totalOwed();

    const assetRow = (a) => {
      const v = conv(a.value, a.currency);
      const bought = String(a.purchasePrice ?? '').trim() !== '' ? conv(a.purchasePrice, a.currency) : null;
      const change = bought != null ? v - bought : null;
      return `<button type="button" class="item" data-action="edit-asset" data-id="${a.id}">
        <div class="item-main"><div class="item-title">${esc(a.name || a.type)}</div>
        <div class="item-sub">${esc(a.type || '')}${a.purchaseDate ? ` · куплено ${fmtDate(a.purchaseDate)}` : ''}${a.note ? ` · ${esc(a.note)}` : ''}</div></div>
        <div class="item-side"><div class="item-value">${fmt(v)}</div>
        <div class="item-sub">${a.currency !== cur() ? fmt(num(a.value), a.currency) : ''}${change != null ? `${a.currency !== cur() ? ' · ' : ''}<span class="${tone(change)}">${fmtSigned(change)}</span> к цене покупки` : ''}</div></div>
      </button>`;
    };
    const section = (title, kind, items, total) => card(title, items.length ? `итого ${fmt(total)}` : '',
      items.length ? `<div class="list">${items.sort((a, b) => conv(b.value, b.currency) - conv(a.value, a.currency)).map(assetRow).join('')}</div>`
        : `<div class="empty-block">${kind === 'real' ? 'Квартира, дом, участок, гараж…' : 'Автомобиль, лодка, техника, украшения…'}</div>`,
      `<button class="btn small" data-action="add-asset" data-v="${kind}">${icon('plus')} Добавить</button>`);

    const debtRow = (d) => {
      const owed = isOwed(d);
      const due = parseDate(d.due);
      const overdue = due && due < today();
      const parts = [];
      if (num(d.payment)) parts.push(`${owed ? 'возвращают' : 'платёж'} ${fmt(num(d.payment), d.currency)} в месяц`);
      if (due) parts.push(overdue ? `<b class="neg">срок прошёл ${fmtDate(d.due)}</b>` : `вернуть до ${fmtDate(d.due)}`);
      if (d.note) parts.push(esc(d.note));
      return `<button type="button" class="item" data-action="edit-debt" data-id="${d.id}">
          <div class="item-main"><div class="item-title">${esc(d.name)}</div><div class="item-sub">${parts.join(' · ')}</div></div>
          <div class="item-side"><div class="item-value ${owed ? 'pos' : 'neg'}">${owed ? fmtSigned(conv(d.amount, d.currency)) : fmt(-conv(d.amount, d.currency))}</div><div class="item-sub">${d.currency !== cur() ? fmt(num(d.amount), d.currency) : ''}</div></div></button>`;
    };
    const debtCard = (dir) => {
      const owed = dir === 'owed';
      const items = owed ? owedToMe() : myDebts();
      const total = owed ? totOwed : totDebt;
      return card(owed ? 'Мне должны' : 'Я должен',
        items.length ? `итого ${fmt(total)} — ${owed ? 'прибавляются к капиталу' : 'вычитаются из капитала'}` : owed ? 'деньги, которые вы дали в долг' : 'кредиты, рассрочки, займы',
        items.length ? `<div class="list">${items.sort((a, b) => conv(b.amount, b.currency) - conv(a.amount, a.currency)).map(debtRow).join('')}</div>`
          : `<div class="empty-block">${owed ? 'Никто не должен. Если дадите кому-то в долг — запишите здесь, чтобы не забыть.' : 'Долгов нет — отлично!'}</div>`,
        `<button class="btn small" data-action="add-debt" data-v="${dir}">${icon('plus')} Добавить</button>`);
    };
    const debts = `<div class="grid-2">${debtCard('owe')}${debtCard('owed')}</div>`;

    later(() => {
      Charts.hbars($('#c-assets'), {
        items: state.assets.map((a) => ({ name: a.name || a.type, value: conv(a.value, a.currency), color: a.kind === 'real' ? S(1) : S(2) })),
        legend: [{ name: 'Недвижимое', color: S(1) }, { name: 'Движимое', color: S(2) }],
        fmt: (v) => fmt(v), share: true, empty: 'Добавьте имущество, чтобы увидеть диаграмму',
      });
      Charts.donut($('#c-assets-kind'), {
        items: [{ name: 'Недвижимое', value: totReal, color: S(1) }, { name: 'Движимое', value: totMov, color: S(2) }],
        fmt: (v) => fmt(v), fmtCenter: (v) => fmtCompact(v), centerLabel: 'имущество', empty: 'Нет имущества',
      });
    });

    return `
      <div class="kpis">
        ${kpi('Всё имущество', fmt(totReal + totMov), `${state.assets.length} ${plural(state.assets.length, 'объект', 'объекта', 'объектов')}`, 'hero')}
        ${kpi('Недвижимое', fmt(totReal), `${real.length} шт.`)}
        ${kpi('Движимое', fmt(totMov), `${mov.length} шт.`)}
        ${kpi('Я должен', totDebt ? `<span class="neg">${fmt(-totDebt)}</span>` : fmt(0), myDebts().length ? `платежи ${fmt(sum(myDebts(), (d) => conv(d.payment, d.currency)))} в месяц` : 'нет долгов')}
        ${kpi('Мне должны', totOwed ? `<span class="pos">${fmtSigned(totOwed)}</span>` : fmt(0), owedToMe().length ? `${owedToMe().length} ${plural(owedToMe().length, 'человек', 'человека', 'человек')}` : 'никто не должен')}
      </div>
      <div class="grid-2 asset-charts">
        ${card('Стоимость объектов', 'оценочная рыночная стоимость сейчас', chartBox('c-assets'))}
        ${card('Недвижимое и движимое', 'соотношение', chartBox('c-assets-kind'))}
      </div>
      <div class="grid-2">
        ${section('Недвижимое имущество', 'real', real, totReal)}
        ${section('Движимое имущество', 'movable', mov, totMov)}
      </div>
      ${debts}`;
  }

  function openAssetForm(id, kind) {
    const a = id ? state.assets.find((x) => x.id === id) : null;
    const k = a ? a.kind : kind || 'real';
    openForm({
      title: a ? 'Имущество' : k === 'real' ? 'Новая недвижимость' : 'Новое движимое имущество',
      data: a || { kind: k, type: ASSET_TYPES[k][0], currency: 'USD' },
      fields: (v) => [
        { key: 'kind', label: 'Вид имущества', type: 'select', rerender: true, options: [{ value: 'real', label: 'Недвижимое' }, { value: 'movable', label: 'Движимое' }] },
        { key: 'type', label: 'Тип', type: 'select', options: ASSET_TYPES[v.kind || 'real'].map((t) => ({ value: t, label: t })) },
        { key: 'name', label: 'Название', placeholder: v.kind === 'movable' ? 'Например: Toyota RAV4, 2019' : 'Например: Квартира в Одессе, 2 комн.', full: true, required: true },
        { key: 'value', label: 'Стоимость сейчас (оценка)', type: 'money', curKey: 'currency', full: true, required: true },
        { key: 'purchasePrice', label: 'Цена покупки', type: 'number', hint: 'в той же валюте, необязательно' },
        { key: 'purchaseDate', label: 'Дата покупки', type: 'date' },
        { key: 'note', label: 'Заметка', type: 'textarea', full: true },
      ],
      onSave(v) {
        if (!ASSET_TYPES[v.kind].includes(v.type)) v.type = ASSET_TYPES[v.kind][0];
        if (a) Object.assign(a, v); else state.assets.push({ id: uid(), ...v });
        save();
        toast('Имущество сохранено');
      },
      onDelete: a ? () => { state.assets = state.assets.filter((x) => x !== a); save(); toast('Удалено'); } : null,
    });
  }

  function openDebtForm(id, dir) {
    const d = id ? state.debts.find((x) => x.id === id) : null;
    const start = d ? (isOwed(d) ? 'owed' : 'owe') : dir === 'owed' ? 'owed' : 'owe';
    openForm({
      title: d ? (start === 'owed' ? 'Мне должны' : 'Мой долг') : start === 'owed' ? 'Кто-то должен мне' : 'Новый долг или кредит',
      data: d ? { ...d, direction: start } : { direction: start, currency: cur() },
      fields: (v) => {
        const owed = v.direction === 'owed';
        return [
          { key: 'direction', label: 'Кто кому должен', type: 'select', rerender: true, full: true, options: [
            { value: 'owe', label: 'Я должен (кредит, рассрочка, заём)' },
            { value: 'owed', label: 'Мне должны (дал в долг)' },
          ] },
          { key: 'name', label: owed ? 'Кто должен' : 'Название', placeholder: owed ? 'Например: Сергей, брат' : 'Например: Кредит на авто', full: true, required: true },
          { key: 'amount', label: owed ? 'Сколько ещё должны вернуть' : 'Сколько осталось выплатить', type: 'money', curKey: 'currency', full: true, required: true },
          { key: 'payment', label: owed ? 'Возвращают в месяц' : 'Платёж в месяц', type: 'number', hint: 'в той же валюте, необязательно' },
          { key: 'due', label: 'Вернуть до', type: 'date', hint: 'необязательно' },
          { key: 'note', label: 'Заметка', type: 'text', full: true },
        ];
      },
      onSave(v) {
        if (d) { Object.keys(d).forEach((k) => k !== 'id' && delete d[k]); Object.assign(d, v); } else state.debts.push({ id: uid(), ...v });
        save();
        toast('Сохранено');
      },
      onDelete: d ? () => { state.debts = state.debts.filter((x) => x !== d); save(); toast('Удалено'); } : null,
    });
  }

  /* ---------- Инвестиции ---------- */
  function viewInvest() {
    const total = totalInvest();
    const invested = sum(state.investments, (i) => invInvested(i));
    const profit = total - invested;
    const avgExp = avgMonthlyExpense();

    const invRow = (i) => {
      const c = invCalc(i);
      const v = conv(c.value, i.currency);
      const p = c.value - c.invested;
      let sub = '';
      if (i.type === 'crypto') sub = `${fmtNum(num(i.qty))} ${esc((i.symbol || '').toUpperCase())} × ${fmt(num(i.price), i.currency)}`;
      else if (i.type === 'deposit') {
        const end = c.dep.end;
        const ended = end && end < today();
        sub = `${fmtNum(num(i.rate))}% годовых · ${i.capitalization ? 'с капитализацией' : 'без капитализации'}${end ? ` · ${ended ? '<b class="neg">срок истёк</b> ' : 'до '}${fmtDate(isoDate(end))}` : ''}`;
        if (c.dep.atEnd && !ended) sub += ` · в конце срока ${fmt(c.dep.atEnd, i.currency)}`;
      } else sub = esc(i.note || '');
      const showProfit = c.invested > 0 && i.type !== 'cash';
      return `<button type="button" class="item" data-action="edit-inv" data-id="${i.id}">
        <div class="item-main"><div class="item-title">${esc(i.name || INV_TYPES[i.type].name)}</div><div class="item-sub">${sub}</div></div>
        <div class="item-side"><div class="item-value">${fmt(v)}</div>
        <div class="item-sub">${i.currency !== cur() ? fmt(c.value, i.currency) : ''}${showProfit ? `${i.currency !== cur() ? ' · ' : ''}<span class="${tone(p)}">${fmtSigned(conv(p, i.currency))} (${fmtSignedPct(p / c.invested)})</span>` : ''}</div></div>
      </button>`;
    };

    const groups = Object.entries(INV_TYPES).map(([type, meta]) => {
      const items = state.investments.filter((i) => i.type === type);
      if (!items.length) return '';
      const t = sum(items, (i) => invValue(i));
      return `<div class="inv-group"><div class="inv-group-head"><span><i class="legend-swatch" style="background:${meta.color}"></i>${meta.name}</span><b>${fmt(t)}</b></div>
        <div class="list">${items.sort((a, b) => invValue(b) - invValue(a)).map(invRow).join('')}</div></div>`;
    }).join('');

    later(() => {
      Charts.donut($('#c-inv'), {
        items: Object.entries(INV_TYPES).map(([type, meta]) => ({ name: meta.name, color: meta.color, value: sum(state.investments.filter((i) => i.type === type), (i) => invValue(i)) })),
        fmt: (v) => fmt(v), fmtCenter: (v) => fmtCompact(v), centerLabel: 'портфель', empty: 'Добавьте первую инвестицию',
      });
      const types = Object.keys(INV_TYPES).filter((t) => state.investments.some((i) => i.type === t));
      Charts.bars($('#c-inv-profit'), {
        labels: types.map((t) => INV_TYPES[t].short),
        titles: types.map((t) => INV_TYPES[t].name),
        series: [
          { name: 'Вложено', color: S(1), values: types.map((t) => sum(state.investments.filter((i) => i.type === t), (i) => invInvested(i))) },
          { name: 'Стоит сейчас', color: S(2), values: types.map((t) => sum(state.investments.filter((i) => i.type === t), (i) => invValue(i))) },
        ],
        fmt: (v) => fmt(v), fmtAxis, height: 240,
        extra: (ix) => {
          const t = types[ix];
          const its = state.investments.filter((i) => i.type === t);
          const d = sum(its, (i) => invValue(i)) - sum(its, (i) => invInvested(i));
          return `<div class="tt-sep"></div><div class="tt-row"><span class="n">Результат</span><b class="${tone(d)}">${fmtSigned(d)}</b></div>`;
        },
        empty: 'Добавьте первую инвестицию',
      });
    });

    const hasCrypto = state.investments.some((i) => i.type === 'crypto');
    return `
      <div class="section-head"><p class="lead">Раз в месяц обновите стоимость: курс крипты, остаток на счёте, стоимость акций. Проценты по депозитам считаются автоматически.</p>
        <div class="btn-row">${hasCrypto ? `<button class="btn" data-action="update-crypto">${icon('refresh')} Обновить цены крипты</button>` : ''}
        <button class="btn primary" data-action="add-inv">${icon('plus')} Добавить</button></div></div>
      <div class="kpis">
        ${kpi('Портфель сейчас', fmt(total), `${state.investments.length} ${plural(state.investments.length, 'позиция', 'позиции', 'позиций')}`, 'hero')}
        ${kpi('Вложено', fmt(invested), 'собственные деньги')}
        ${kpi('Доход / убыток', `<span class="${tone(profit)}">${fmtSigned(profit)}</span>`, invested ? fmtSignedPct(profit / invested) + ' к вложенному' : '')}
        ${kpi('Хватит на', avgExp ? `${nf0.format(Math.floor(total / avgExp))} мес.` : '—', avgExp ? `при расходах ${fmt(avgExp)} в месяц` : 'внесите расходы по месяцам')}
      </div>
      <div class="grid-2">
        ${card('Структура портфеля', 'по видам инвестиций', chartBox('c-inv'))}
        ${card('Вложено и стоимость сейчас', 'по видам инвестиций', chartBox('c-inv-profit'))}
      </div>
      ${card('Мои инвестиции', state.settings.cryptoUpdated && hasCrypto ? `цены крипты обновлены ${new Date(state.settings.cryptoUpdated).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}` : '',
        groups || '<div class="empty-block">Криптовалюта, банковские депозиты, акции, наличные сбережения — всё в одном месте.</div>')}`;
  }

  function openInvForm(id) {
    const inv = id ? state.investments.find((x) => x.id === id) : null;
    openForm({
      title: inv ? 'Инвестиция' : 'Новая инвестиция',
      data: inv || { type: 'crypto', currency: 'USD', symbol: 'BTC', capitalization: false },
      fields: (v) => {
        const f = [
          { key: 'type', label: 'Вид', type: 'select', rerender: true, full: true, options: Object.entries(INV_TYPES).map(([k, m]) => ({ value: k, label: m.name })) },
        ];
        if (v.type === 'crypto') f.push(
          { key: 'symbol', label: 'Монета (тикер)', placeholder: 'BTC', list: Object.keys(COINS), hint: 'BTC, ETH, USDT, SOL… — тогда цену можно обновить онлайн' },
          { key: 'name', label: 'Название / где хранится', placeholder: 'Например: Binance, холодный кошелёк' },
          { key: 'qty', label: 'Количество монет', type: 'number', required: true },
          { key: 'price', label: 'Цена 1 монеты сейчас', type: 'money', curKey: 'currency' },
          { key: 'invested', label: 'Сколько всего вложено', type: 'number', hint: 'в валюте цены — чтобы видеть доход', full: true },
        );
        else if (v.type === 'deposit') f.push(
          { key: 'name', label: 'Банк', placeholder: 'Например: ПриватБанк, maib', full: true, required: true },
          { key: 'principal', label: 'Сумма вклада', type: 'money', curKey: 'currency', full: true, required: true },
          { key: 'rate', label: 'Ставка, % годовых', type: 'number' },
          { key: 'term', label: 'Срок, месяцев', type: 'number' },
          { key: 'start', label: 'Дата открытия', type: 'date' },
          { key: 'capitalization', label: 'Проценты добавляются к вкладу (капитализация)', type: 'checkbox' },
        );
        else f.push(
          { key: 'name', label: 'Название', placeholder: v.type === 'cash' ? 'Например: Доллары дома, накопительный счёт' : v.type === 'stocks' ? 'Например: ETF S&P 500' : 'Например: золото, доля в бизнесе', full: true, required: true },
          { key: 'value', label: 'Стоимость сейчас', type: 'money', curKey: 'currency', full: true, required: true },
          ...(v.type === 'cash' ? [] : [{ key: 'invested', label: 'Сколько вложено', type: 'number', hint: 'в той же валюте, необязательно', full: true }]),
        );
        f.push({ key: 'note', label: 'Заметка', type: 'text', full: true });
        return f;
      },
      onSave(v) {
        if (v.type === 'crypto') { v.symbol = coinSymbol(v.symbol); if (!v.name) v.name = v.symbol; }
        if (inv) { Object.keys(inv).forEach((k) => k !== 'id' && delete inv[k]); Object.assign(inv, v); } else state.investments.push({ id: uid(), ...v });
        save();
        toast('Инвестиция сохранена');
      },
      onDelete: inv ? () => { state.investments = state.investments.filter((x) => x !== inv); save(); toast('Удалено'); } : null,
    });
  }

  /* ---------- Настройки ---------- */
  function viewSettings() {
    const r = state.settings.rates;
    const upd = state.settings.ratesUpdated ? new Date(state.settings.ratesUpdated).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : 'вручную';
    const themeOpt = (v, l) => `<button type="button" class="${state.settings.theme === v ? 'on' : ''}" data-action="set-theme" data-v="${v}">${l}</button>`;
    return `
      <div class="grid-2">
        ${card('Валюта отображения', 'все суммы пересчитываются в выбранную валюту', `${currencySwitch()}<p class="hint mt">Суммы вводятся в любой валюте — в каждой форме есть выбор: доллар, гривна или лей.</p>`)}
        ${card('Курсы валют', `обновлено: ${esc(upd)}`, `
          <form class="rates" id="ratesForm">
            <label class="field"><span>1 $ USD = ₴ гривен</span><input name="UAH" inputmode="decimal" value="${esc(r.UAH)}"></label>
            <label class="field"><span>1 $ USD = L леев</span><input name="MDL" inputmode="decimal" value="${esc(r.MDL)}"></label>
          </form>
          <div class="btn-row mt"><button class="btn primary" data-action="save-rates">Сохранить курсы</button><button class="btn" data-action="update-rates">${icon('refresh')} Загрузить из интернета</button></div>
          <p class="hint mt">Без интернета (например, в рейсе) просто введите курс вручную. Для пересчёта используется текущий курс.</p>`)}
        ${card('Оформление', '', `<div class="seg">${themeOpt('auto', 'Как в системе')}${themeOpt('light', 'Светлая')}${themeOpt('dark', 'Тёмная')}</div>`)}
        ${card('Резервная копия', 'данные хранятся только в этом браузере', `
          <div class="btn-row"><button class="btn primary" data-action="export">Сохранить копию (файл)</button><button class="btn" data-action="import">Загрузить из файла</button></div>
          <p class="hint mt">Делайте копию раз в месяц и храните её в облаке или отправьте себе в мессенджер — так данные не потеряются при смене телефона.</p>
          <input type="file" id="importFile" accept="application/json,.json" hidden>`)}
        ${card('Пример и очистка', '', `
          <div class="btn-row"><button class="btn" data-action="demo">Загрузить пример данных</button><button class="btn danger" data-action="reset">Удалить все данные</button></div>
          <p class="hint mt">Пример заменит текущие данные — сначала сохраните копию, если уже что-то вносили.</p>`)}
        ${card('Как пользоваться', `версия приложения ${APP_VERSION}`, `<ol class="steps small">
          <li>В начале месяца откройте «Доходы и расходы» → «Внести месяц». Укажите итоговые суммы за прошлый месяц.</li>
          <li>Обновите стоимость инвестиций и имущества, если она изменилась.</li>
          <li>Капитал на «Обзоре» сохраняется автоматически раз в месяц — так строится график роста.</li>
          <li>Сделайте резервную копию.</li></ol>`)}
      </div>`;
  }

  /* ================= Модальные окна и формы ================= */
  let modalApi = null;
  function openModal({ title, body, wide, canDelete, onMount }) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-backdrop"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="mtitle">
      <div class="modal-head"><h2 id="mtitle">${title}</h2><button type="button" class="icon-btn" data-mclose aria-label="Закрыть">${icon('close')}</button></div>
      <form class="modal-body" id="mform" novalidate autocomplete="off">${body}</form>
      <div class="modal-foot">${canDelete ? '<button type="button" class="btn danger ghost" data-mdelete>Удалить</button>' : ''}<span class="spacer"></span>
        <button type="button" class="btn" data-mclose>Отмена</button><button type="submit" form="mform" class="btn primary">Сохранить</button></div>
    </div></div>`;
    document.body.classList.add('modal-open');
    const form = $('#mform');
    modalApi = onMount(form) || {};
    const backdrop = $('.modal-backdrop', root);
    backdrop.addEventListener('pointerdown', (e) => { backdrop._down = e.target === backdrop; });
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop && backdrop._down) closeModal(); });
    $$('[data-mclose]', root).forEach((b) => b.addEventListener('click', closeModal));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (modalApi.submit && modalApi.submit() !== false) { closeModal(); render(); }
    });
    const del = $('[data-mdelete]', root);
    if (del) del.addEventListener('click', () => {
      if (confirm('Удалить запись? Это действие нельзя отменить.')) { modalApi.remove(); closeModal(); render(); }
    });
    const first = $('input:not([type=hidden]):not([type=checkbox]), select', form);
    if (first && window.matchMedia('(pointer: fine)').matches) first.focus();
  }
  function closeModal() {
    $('#modal-root').innerHTML = '';
    document.body.classList.remove('modal-open');
    modalApi = null;
  }

  function fieldHTML(f, values) {
    const v = values[f.key] ?? f.default ?? '';
    const cls = `field ${f.full ? 'full' : ''}`;
    const id = 'f_' + f.key;
    const hint = f.hint ? `<small class="hint">${f.hint}</small>` : '';
    const req = f.required ? ' <em class="req">*</em>' : '';
    switch (f.type) {
      case 'select':
        return `<label class="${cls}"><span>${f.label}</span><select id="${id}" name="${f.key}" ${f.rerender ? 'data-rerender' : ''}>${f.options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${hint}</label>`;
      case 'money':
        return `<div class="${cls}"><label for="${id}">${f.label}${req}</label><div class="money"><input id="${id}" name="${f.key}" inputmode="decimal" placeholder="0" value="${esc(v)}"><select name="${f.curKey}" aria-label="Валюта">${curOptions(values[f.curKey] || cur())}</select></div>${hint}</div>`;
      case 'checkbox':
        return `<label class="check field full"><input type="checkbox" name="${f.key}" ${v ? 'checked' : ''}><span>${f.label}</span></label>`;
      case 'textarea':
        return `<label class="${cls}"><span>${f.label}</span><textarea id="${id}" name="${f.key}" rows="2">${esc(v)}</textarea>${hint}</label>`;
      default: {
        const type = f.type === 'number' ? 'text' : f.type || 'text';
        const list = f.list ? `<datalist id="${id}_list">${f.list.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>` : '';
        return `<label class="${cls}"><span>${f.label}${req}</span><input id="${id}" type="${type}" name="${f.key}" ${f.type === 'number' ? 'inputmode="decimal"' : ''} ${f.list ? `list="${id}_list"` : ''} placeholder="${esc(f.placeholder || (f.type === 'number' ? '0' : ''))}" value="${esc(v)}">${list}${hint}</label>`;
      }
    }
  }

  function openForm({ title, fields, data = {}, onSave, onDelete, validate }) {
    let values = JSON.parse(JSON.stringify(data));
    const list = () => (typeof fields === 'function' ? fields(values) : fields);
    const body = () => `<div class="form-grid">${list().map((f) => fieldHTML(f, values)).join('')}</div>`;
    const collect = (form) => {
      const out = {};
      list().forEach((f) => {
        const el = form.elements[f.key];
        if (!el) return;
        if (f.type === 'checkbox') out[f.key] = el.checked;
        else if (f.type === 'number' || f.type === 'money') { const s = el.value.trim(); out[f.key] = s === '' ? '' : num(s); }
        else out[f.key] = el.value.trim();
        if (f.curKey) out[f.curKey] = form.elements[f.curKey].value;
      });
      return out;
    };
    openModal({
      title, body: body(), canDelete: !!onDelete,
      onMount(form) {
        form.addEventListener('change', (e) => {
          if (e.target.hasAttribute('data-rerender')) {
            values = { ...values, ...collect(form) };
            form.innerHTML = body();
          }
        });
        return {
          submit() {
            values = { ...values, ...collect(form) };
            const missing = list().find((f) => f.required && (values[f.key] === '' || values[f.key] == null));
            if (missing) { toast(`Заполните поле «${missing.label}»`, 'error'); const el = form.elements[missing.key]; if (el) el.focus(); return false; }
            const err = validate && validate(values);
            if (err) { toast(err, 'error'); return false; }
            // Сохраняем только поля текущей формы (и вид), чтобы не тянуть лишнее при смене типа
            const clean = {};
            list().forEach((f) => { clean[f.key] = values[f.key]; if (f.curKey) clean[f.curKey] = values[f.curKey]; });
            onSave(clean);
            return true;
          },
          remove: onDelete,
        };
      },
    });
  }

  /* ================= Сеть: курсы и цены ================= */
  async function fetchJSON(url, ms = 10000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function updateRates(silent) {
    try {
      const data = await fetchJSON('https://open.er-api.com/v6/latest/USD');
      if (!data || !data.rates || !data.rates.UAH || !data.rates.MDL) throw new Error('bad data');
      state.settings.rates = { USD: 1, UAH: +data.rates.UAH.toFixed(4), MDL: +data.rates.MDL.toFixed(4) };
      state.settings.ratesUpdated = new Date().toISOString();
      state.settings.autoRates = true;
      save();
      render();
      if (!silent) toast(`Курсы обновлены: 1 $ = ${fmtNum(state.settings.rates.UAH)} ₴ = ${fmtNum(state.settings.rates.MDL)} L`);
    } catch (e) {
      if (!silent) toast('Не удалось загрузить курсы — нет интернета? Введите курс вручную.', 'error');
    }
  }

  // Названия монет, которые люди часто пишут вместо тикера
  const COIN_ALIASES = {
    BITCOIN: 'BTC', 'БИТКОИН': 'BTC', 'БИТКОЙН': 'BTC', 'БИТОК': 'BTC', XBT: 'BTC',
    ETHEREUM: 'ETH', ETHER: 'ETH', 'ЭФИР': 'ETH', 'ЭФИРИУМ': 'ETH', 'ЕФІР': 'ETH',
    TETHER: 'USDT', 'ТЕЗЕР': 'USDT', 'USD COIN': 'USDC', BINANCE: 'BNB', 'BINANCE COIN': 'BNB',
    SOLANA: 'SOL', 'СОЛАНА': 'SOL', RIPPLE: 'XRP', TONCOIN: 'TON', 'ТОН': 'TON', CARDANO: 'ADA',
    DOGECOIN: 'DOGE', 'ДОГИКОИН': 'DOGE', TRON: 'TRX', LITECOIN: 'LTC', 'ЛАЙТКОИН': 'LTC', POLKADOT: 'DOT',
  };
  function coinSymbol(raw) {
    let x = String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ');
    x = x.replace(/[\s_\-(]*(TRC|ERC|BEP|SPL)[\s-]?20\)?$/, '').trim(); // USDT TRC20 → USDT
    return COIN_ALIASES[x] || x;
  }

  // Цена 1 монеты в долларах: пробуем несколько бесплатных сервисов по очереди
  const PRICE_SOURCES = [
    { name: 'Coinbase', url: (c) => `https://api.coinbase.com/v2/exchange-rates?currency=${c}`, read: (d) => d && d.data && d.data.rates && +d.data.rates.USD },
    { name: 'Binance', skip: (c) => c === 'USDT', url: (c) => `https://api.binance.com/api/v3/ticker/price?symbol=${c}USDT`, read: (d) => d && +d.price },
    { name: 'CryptoCompare', url: (c) => `https://min-api.cryptocompare.com/data/price?fsym=${c}&tsyms=USD`, read: (d) => d && +d.USD },
    { name: 'CoinGecko', skip: (c) => !COINS[c], url: (c) => `https://api.coingecko.com/api/v3/simple/price?ids=${COINS[c]}&vs_currencies=usd`, read: (d, c) => d && d[COINS[c]] && +d[COINS[c]].usd },
  ];
  async function coinPrice(sym) {
    let reached = false; // хоть один сервис ответил (значит интернет есть)
    for (const src of PRICE_SOURCES) {
      if (src.skip && src.skip(sym)) continue;
      try {
        const res = await fetch(src.url(encodeURIComponent(sym)), { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined });
        reached = true;
        if (!res.ok) continue;
        const p = src.read(await res.json(), sym);
        if (p > 0 && isFinite(p)) return { price: p, source: src.name };
      } catch (e) { /* сервис недоступен — пробуем следующий */ }
    }
    return { price: null, reached };
  }

  async function updateCrypto() {
    const items = state.investments.filter((i) => i.type === 'crypto');
    const noSymbol = items.filter((i) => !coinSymbol(i.symbol));
    const withSymbol = items.filter((i) => coinSymbol(i.symbol));
    if (!withSymbol.length) { toast('У монет не указан тикер (BTC, ETH, USDT…). Откройте монету и заполните поле «Монета».', 'error', 6000); return; }
    if (!navigator.onLine) { toast('Нет подключения к интернету. Цены можно ввести вручную.', 'error', 5000); return; }
    const btn = $('[data-action="update-crypto"]');
    if (btn) { btn.disabled = true; btn.lastChild.textContent = ' Загружаю цены…'; }
    const syms = [...new Set(withSymbol.map((i) => coinSymbol(i.symbol)))];
    const results = Object.fromEntries(await Promise.all(syms.map(async (c) => [c, await coinPrice(c)])));
    const ok = [], failed = [];
    withSymbol.forEach((i) => {
      const c = coinSymbol(i.symbol);
      const r = results[c];
      if (r.price) {
        if (i.currency && i.currency !== 'USD' && num(i.invested)) i.invested = toUSD(i.invested, i.currency);
        i.symbol = c; i.price = r.price; i.currency = 'USD';
        if (!ok.includes(c)) ok.push(c);
      } else if (!failed.includes(c)) failed.push(c);
    });
    if (ok.length) { state.settings.cryptoUpdated = new Date().toISOString(); save(); }
    render();
    const nobody = failed.length && !ok.length && syms.every((c) => !results[c].reached);
    if (nobody) toast('Сервисы цен недоступны: нет интернета, или их блокирует VPN / блокировщик рекламы. Попробуйте позже или введите цену вручную.', 'error', 8000);
    else if (failed.length) toast(`${ok.length ? `Обновлено: ${ok.join(', ')}. ` : ''}Не нашлась цена для: ${failed.join(', ')} — проверьте тикер монеты или введите цену вручную.`, 'error', 8000);
    else toast(`Цены обновлены: ${ok.join(', ')}${noSymbol.length ? ` (у ${noSymbol.length} монет не указан тикер)` : ''}`, '', 4000);
  }

  /* ================= Резервная копия ================= */
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `morskoy-budget-${isoDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Файл резервной копии сохранён');
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || !Array.isArray(data.months)) throw new Error('format');
        if (!confirm('Заменить текущие данные данными из файла?')) return;
        state = normalize(data);
        save();
        applyTheme();
        render();
        toast('Данные загружены');
      } catch (e) {
        toast('Это не похоже на файл резервной копии «Морского бюджета»', 'error');
      }
    };
    reader.readAsText(file);
  }

  /* ================= Пример данных ================= */
  function demoState() {
    const s = DEFAULT_STATE();
    s.settings = { ...state.settings };
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const r100 = (a, b) => Math.round((a + rnd() * (b - a)) / 100) * 100;
    s.contracts = [
      { id: uid(), vessel: 'MV Atlantic Spirit', position: 'Второй помощник', company: 'Oceanic Crew Ltd', start: '2025-01-12', end: '2025-06-28', salary: 6200, currency: 'USD', note: '' },
      { id: uid(), vessel: 'MV Nordic Breeze', position: 'Второй помощник', company: 'Baltic Marine Management', start: '2025-10-04', end: '2026-03-22', salary: 6500, currency: 'USD', note: '' },
      { id: uid(), vessel: 'MT Danube Star', position: 'Старший помощник', company: 'Danube Shipping Co', start: '2026-07-18', end: '2027-01-20', salary: 8900, currency: 'USD', note: 'Контракт 6 месяцев ±1' },
    ];
    const keys = monthRange('2025-01', '2026-10');
    keys.forEach((k) => {
      const [y, m] = k.split('-').map(Number);
      const ms = new Date(y, m - 1, 1), me = new Date(y, m, 0), dim = me.getDate();
      let salary = 0, seaDays = 0;
      s.contracts.forEach((c) => {
        const cs = parseDate(c.start), ce = parseDate(c.end);
        const a = cs > ms ? cs : ms, b = ce < me ? ce : me;
        if (b >= a) { const d = daysBetween(a, b) + 1; seaDays += d; salary += (c.salary * d) / dim; }
      });
      const sea = seaDays > dim / 2;
      const nextStart = s.contracts.some((c) => c.start.slice(0, 7) === addMonths(k, 1));
      const winter = [11, 12, 1, 2, 3].includes(m);
      s.months.push({
        id: k, status: sea ? 'sea' : 'shore', incomeCur: 'USD', expenseCur: 'UAH',
        income: {
          salary: Math.round(salary / 10) * 10,
          ...(k >= '2026-02' ? { passive: Math.round(35 + rnd() * 25) } : {}),
          ...(!sea && rnd() < 0.3 ? { other: r100(200, 600) } : {}),
        },
        expense: {
          total: r100(52000, 64000) + (winter ? 4500 : 0) + (sea ? 0 : r100(30000, 50000)) + (nextStart ? r100(18000, 28000) : 0) + (rnd() < 0.3 ? r100(4000, 12000) : 0),
        },
        note: k === '2025-08' ? 'Отпуск с семьёй' : k === '2026-06' ? 'Медкомиссия, продление сертификатов' : '',
      });
    });
    s.assets = [
      { id: uid(), kind: 'real', type: 'Квартира', name: 'Квартира в Одессе, 2 комн.', value: 68000, currency: 'USD', purchasePrice: 52000, purchaseDate: '2021-05-20', note: '' },
      { id: uid(), kind: 'real', type: 'Земельный участок', name: 'Участок под Кишинёвом', value: 210000, currency: 'MDL', purchasePrice: 180000, purchaseDate: '2023-08-01', note: '10 соток' },
      { id: uid(), kind: 'movable', type: 'Автомобиль', name: 'Toyota RAV4, 2019', value: 21500, currency: 'USD', purchasePrice: 26000, purchaseDate: '2022-03-10', note: '' },
      { id: uid(), kind: 'movable', type: 'Техника и электроника', name: 'Ноутбук, телефон, техника', value: 65000, currency: 'UAH', purchasePrice: '', purchaseDate: '', note: '' },
    ];
    s.debts = [
      { id: uid(), direction: 'owe', name: 'Рассрочка за ремонт', amount: 48000, currency: 'UAH', payment: 8000, due: '2027-05-01', note: '' },
      { id: uid(), direction: 'owed', name: 'Сергей (одолжил на машину)', amount: 1500, currency: 'USD', payment: '', due: '2027-03-01', note: '' },
    ];
    s.investments = [
      { id: uid(), type: 'crypto', symbol: 'BTC', name: 'Binance', qty: 0.15, price: 95000, currency: 'USD', invested: 9800, note: '' },
      { id: uid(), type: 'crypto', symbol: 'ETH', name: 'Холодный кошелёк', qty: 2.5, price: 3400, currency: 'USD', invested: 7200, note: '' },
      { id: uid(), type: 'crypto', symbol: 'USDT', name: 'Резерв в USDT', qty: 3000, price: 1, currency: 'USD', invested: 3000, note: '' },
      { id: uid(), type: 'deposit', name: 'Депозит в долларах', principal: 10000, currency: 'USD', rate: 4.5, term: 12, start: '2026-01-15', capitalization: false, note: '' },
      { id: uid(), type: 'deposit', name: 'Депозит в гривне', principal: 200000, currency: 'UAH', rate: 14, term: 12, start: '2026-04-01', capitalization: true, note: '' },
      { id: uid(), type: 'stocks', name: 'ETF S&P 500', value: 7200, invested: 6000, currency: 'USD', note: '' },
      { id: uid(), type: 'cash', name: 'Наличные доллары дома', value: 5000, currency: 'USD', note: '' },
    ];
    return s;
  }

  function loadDemo() {
    if ((state.months.length || state.assets.length || state.investments.length) && !confirm('Пример заменит ваши текущие данные. Продолжить?')) return;
    state = demoState();
    // история капитала для примера: плавный рост к текущему значению
    const a = totalAssets('USD'), i = totalInvest('USD'), d = totalDebts('USD'), r = totalOwed('USD');
    let seed = 5;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const keys = monthRange('2025-01', addMonths(monthKey(), -1));
    keys.forEach((k, ix) => {
      const p = ix / keys.length;
      state.snapshots[k] = { a: Math.round(a * (1.04 - 0.04 * p)), i: Math.round(i * (0.35 + 0.65 * p) * (1 + (rnd() - 0.5) * 0.08)), r: ix >= keys.length - 6 ? Math.round(r) : 0, d: Math.round(d * (2.2 - 1.2 * p)) };
    });
    save();
    ui.period = '12m';
    render();
    toast('Загружен пример — посмотрите все вкладки');
  }

  /* ================= Тема ================= */
  const isDark = () => {
    const t = state.settings.theme;
    return t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  };
  function applyTheme() {
    const t = state.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = isDark() ? '#0f1318' : '#f3f5f8';
  }

  /* ================= События ================= */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.closest('#modal-root')) return;
    const { action, v, id } = el.dataset;
    switch (action) {
      case 'tab':
        ui.tab = v; persistUi();
        history.replaceState(null, '', '#' + v);
        render(); window.scrollTo(0, 0); break;
      case 'currency': state.settings.currency = v; save(); render(); break;
      case 'period': ui.period = v; persistUi(); render(); break;
      case 'add-month': openMonthForm(); break;
      case 'edit-month': openMonthForm(id); break;
      case 'add-contract': openContractForm(); break;
      case 'edit-contract': openContractForm(id); break;
      case 'add-asset': openAssetForm(null, v); break;
      case 'edit-asset': openAssetForm(id); break;
      case 'add-debt': openDebtForm(null, v); break;
      case 'edit-debt': openDebtForm(id); break;
      case 'add-inv': openInvForm(); break;
      case 'edit-inv': openInvForm(id); break;
      case 'update-crypto': updateCrypto(); break;
      case 'update-rates': updateRates(false); break;
      case 'save-rates': {
        const f = $('#ratesForm');
        const uah = num(f.elements.UAH.value), mdl = num(f.elements.MDL.value);
        if (uah <= 0 || mdl <= 0) { toast('Курс должен быть больше нуля', 'error'); break; }
        state.settings.rates = { USD: 1, UAH: uah, MDL: mdl };
        state.settings.ratesUpdated = null;
        state.settings.autoRates = false;
        save(); render(); toast('Курсы сохранены'); break;
      }
      case 'export': exportData(); break;
      case 'import': $('#importFile').click(); break;
      case 'demo': loadDemo(); break;
      case 'reset':
        if (confirm('Удалить ВСЕ данные? Сначала рекомендуем сохранить резервную копию.') && confirm('Точно удалить? Восстановить будет нельзя.')) {
          const settings = state.settings;
          state = DEFAULT_STATE();
          state.settings = settings;
          save(); render(); toast('Все данные удалены');
        }
        break;
      case 'set-theme': state.settings.theme = v; save(); applyTheme(); render(); break;
      case 'theme': state.settings.theme = isDark() ? 'light' : 'dark'; save(); applyTheme(); render(); break;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalApi) closeModal();
    if (e.key === 'Enter' && e.target.matches('tr[data-action]')) e.target.click();
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'importFile' && e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.chart')) Charts.hideTip();
  });
  window.addEventListener('scroll', () => Charts.hideTip(), { passive: true });
  let lastW = window.innerWidth, rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; drawCharts(); } }, 150);
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyTheme(); render(); });

  /* ================= Старт ================= */
  $('#appVersion').textContent = 'Версия ' + APP_VERSION;
  applyTheme();
  if (state.assets.length || state.investments.length || state.debts.length) save(); // снимок капитала за текущий месяц
  render();
  // Курсы обновляются автоматически раз в 12 часов, если есть интернет и курс не задан вручную
  const last = state.settings.ratesUpdated ? new Date(state.settings.ratesUpdated) : null;
  if (state.settings.autoRates !== false && navigator.onLine && (!last || Date.now() - last > 12 * 3600000)) updateRates(true);
})();
