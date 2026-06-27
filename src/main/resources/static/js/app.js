'use strict';

// ─── Portfolio config (simulated holdings) ─────────────────
const PORTFOLIO = {
    RELIANCE:   { qty: 50,  buyPrice: 2650 },
    TCS:        { qty: 30,  buyPrice: 3500 },
    INFY:       { qty: 100, buyPrice: 1420 },
    HDFCBANK:   { qty: 80,  buyPrice: 1580 },
    ICICIBANK:  { qty: 120, buyPrice: 1100 },
    SBIN:       { qty: 200, buyPrice: 750  },
    BAJFINANCE: { qty: 10,  buyPrice: 6500 },
    MARUTI:     { qty: 5,   buyPrice: 11500},
    LT:         { qty: 40,  buyPrice: 3400 },
    TITAN:      { qty: 20,  buyPrice: 3200 },
};

const INVESTED = Object.values(PORTFOLIO).reduce((s, p) => s + p.qty * p.buyPrice, 0);

// ─── State ─────────────────────────────────────────────────
let lastPrices = {};
let eventSource = null;
let reconnectTimer = null;
let tickerContent = null;
let initialized = false;

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    startClock();
    connect();
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
});

// ─── SSE ───────────────────────────────────────────────────
function connect() {
    if (eventSource) eventSource.close();
    clearTimeout(reconnectTimer);

    setConnStatus(false);

    // Fetch initial snapshot immediately so the page isn't blank
    fetch('/api/snapshot')
        .then(r => r.json())
        .then(data => {
            if (!initialized) {
                initTable(data.stocks);
                updateTicker(data.indices);
                initialized = true;
            }
            render(data);
        })
        .catch(() => {});

    eventSource = new EventSource('/api/stream');

    eventSource.addEventListener('market-update', e => {
        setConnStatus(true);
        const data = JSON.parse(e.data);
        if (!initialized) {
            initTable(data.stocks);
            updateTicker(data.indices);
            initialized = true;
        }
        render(data);
    });

    eventSource.onerror = () => {
        setConnStatus(false);
        eventSource.close();
        reconnectTimer = setTimeout(connect, 3000);
    };
}

function setConnStatus(connected) {
    document.getElementById('conn-dot').className = 'conn-dot' + (connected ? '' : ' disconnected');
    document.getElementById('conn-status').textContent = connected ? 'Live' : 'Reconnecting…';
}

// ─── Render full update ─────────────────────────────────────
function render(data) {
    updateMarketStatus(data.marketStatus);
    updateHeaderIndices(data.indices);
    updateTicker(data.indices);
    updateStockRows(data.stocks);
    updatePortfolio(data.stocks);
    updateMovers(data.stocks);
    updateBreadth(data.stocks);
}

// ─── Market status ──────────────────────────────────────────
function updateMarketStatus(status) {
    const badge = document.getElementById('market-badge');
    const text  = document.getElementById('market-status-text');
    const open  = status === 'OPEN';
    badge.className = 'market-status-badge' + (open ? '' : ' closed');
    text.textContent = open ? 'MARKET OPEN' : 'MARKET CLOSED';
}

// ─── Header indices ──────────────────────────────────────────
function updateHeaderIndices(indices) {
    const container = document.getElementById('header-indices');
    if (!indices) return;
    const show = indices.slice(0, 3);
    if (container.children.length !== show.length) {
        container.innerHTML = '';
        show.forEach(idx => {
            const d = document.createElement('div');
            d.className = 'hdr-idx';
            d.id = `hidx-${idx.shortName.replace(/\s+/g, '-')}`;
            d.innerHTML = `<span class="hdr-idx-name">${idx.shortName}</span>
                           <span class="hdr-idx-val num">${fmt(idx.value)}</span>
                           <span class="hdr-idx-chg num ${idx.changePercent >= 0 ? 'positive' : 'negative'}">
                               ${idx.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(idx.changePercent).toFixed(2)}%
                           </span>`;
            container.appendChild(d);
        });
    } else {
        show.forEach((idx, i) => {
            const d = container.children[i];
            d.querySelector('.hdr-idx-val').textContent = fmt(idx.value);
            const chgEl = d.querySelector('.hdr-idx-chg');
            chgEl.textContent = `${idx.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(idx.changePercent).toFixed(2)}%`;
            chgEl.className = `hdr-idx-chg num ${idx.changePercent >= 0 ? 'positive' : 'negative'}`;
        });
    }
}

// ─── Ticker tape ────────────────────────────────────────────
function updateTicker(indices) {
    const track = document.getElementById('ticker-track');
    if (!indices) return;

    const buildItems = () => indices.map(idx => `
        <div class="ticker-item">
            <span class="ticker-sym">${idx.shortName}</span>
            <span class="ticker-val num">${fmt(idx.value)}</span>
            <span class="ticker-chg num ${idx.changePercent >= 0 ? 'positive' : 'negative'}">
                ${idx.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(idx.changePercent).toFixed(2)}%
            </span>
        </div>`).join('');

    // Duplicate for seamless loop
    const html = buildItems() + buildItems();
    if (track.innerHTML !== html && !tickerContent) {
        track.innerHTML = html;
        tickerContent = html;
    } else if (tickerContent) {
        // Update values without rebuilding (avoid animation reset)
        const spans = track.querySelectorAll('.ticker-item');
        indices.forEach((idx, i) => {
            const even = spans[i];
            const odd  = spans[i + indices.length];
            [even, odd].forEach(el => {
                if (!el) return;
                el.querySelector('.ticker-val').textContent = fmt(idx.value);
                const chg = el.querySelector('.ticker-chg');
                chg.textContent = `${idx.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(idx.changePercent).toFixed(2)}%`;
                chg.className = `ticker-chg num ${idx.changePercent >= 0 ? 'positive' : 'negative'}`;
            });
        });
    }
}

// ─── Stock table init ────────────────────────────────────────
function initTable(stocks) {
    const tbody = document.getElementById('stock-tbody');
    tbody.innerHTML = '';
    stocks.forEach((s, i) => {
        const row = document.createElement('tr');
        row.id = `row-${s.symbol}`;
        row.innerHTML = rowHTML(s, i + 1);
        tbody.appendChild(row);
        lastPrices[s.symbol] = s.price;
        drawSparkline(row.querySelector('canvas'), s.sparkline);
    });
}

function rowHTML(s, rank) {
    const pos = s.changePercent >= 0;
    return `
        <td class="col-rank">${rank}</td>
        <td class="col-stock">
            <div class="stock-sym">${s.symbol}</div>
            <div class="stock-name">${s.name}</div>
            <div class="stock-sector">${s.sector}</div>
        </td>
        <td><span class="price-cell num" id="price-${s.symbol}">₹${fmt(s.price)}</span></td>
        <td><span class="change-cell ${pos ? 'positive' : 'negative'} num" id="chg-${s.symbol}">
            ${pos ? '+' : ''}${fmt(s.change)}
        </span></td>
        <td><span class="pct-cell ${pos ? 'pos' : 'neg'} num" id="pct-${s.symbol}">
            ${pos ? '+' : ''}${s.changePercent.toFixed(2)}%
        </span></td>
        <td class="vol-cell num" id="vol-${s.symbol}">${fmtVol(s.volume)}</td>
        <td class="hl-cell col-hl">
            <span class="hl-high num">₹${fmt(s.high)}</span>
            <span class="hl-sep">/</span>
            <span class="hl-low num">₹${fmt(s.low)}</span>
        </td>
        <td class="col-chart">
            <canvas width="80" height="32" class="sparkline-canvas" id="spark-${s.symbol}"></canvas>
        </td>`;
}

// ─── Stock row updates ────────────────────────────────────────
function updateStockRows(stocks) {
    stocks.forEach(s => {
        const prev = lastPrices[s.symbol];
        if (prev === undefined) return;

        const priceEl  = document.getElementById(`price-${s.symbol}`);
        const chgEl    = document.getElementById(`chg-${s.symbol}`);
        const pctEl    = document.getElementById(`pct-${s.symbol}`);
        const volEl    = document.getElementById(`vol-${s.symbol}`);
        const canvas   = document.getElementById(`spark-${s.symbol}`);

        if (!priceEl) return;

        const pos = s.changePercent >= 0;

        // Price flash
        if (s.price !== prev) {
            priceEl.classList.remove('flash-up', 'flash-down');
            void priceEl.offsetWidth; // reflow to restart animation
            priceEl.classList.add(s.price > prev ? 'flash-up' : 'flash-down');
        }
        lastPrices[s.symbol] = s.price;

        priceEl.textContent = `₹${fmt(s.price)}`;

        chgEl.textContent = `${pos ? '+' : ''}${fmt(s.change)}`;
        chgEl.className = `change-cell ${pos ? 'positive' : 'negative'} num`;

        pctEl.textContent = `${pos ? '+' : ''}${s.changePercent.toFixed(2)}%`;
        pctEl.className = `pct-cell ${pos ? 'pos' : 'neg'} num`;

        volEl.textContent = fmtVol(s.volume);

        // H/L cells
        const row = document.getElementById(`row-${s.symbol}`);
        if (row) {
            const hlCell = row.querySelector('.hl-cell');
            if (hlCell) {
                hlCell.innerHTML = `
                    <span class="hl-high num">₹${fmt(s.high)}</span>
                    <span class="hl-sep">/</span>
                    <span class="hl-low num">₹${fmt(s.low)}</span>`;
            }
        }

        drawSparkline(canvas, s.sparkline);
    });
}

// ─── Portfolio ───────────────────────────────────────────────
function updatePortfolio(stocks) {
    let currentValue = 0;
    let openValue    = 0;

    stocks.forEach(s => {
        const p = PORTFOLIO[s.symbol];
        if (!p) return;
        currentValue += s.price * p.qty;
        openValue    += s.open  * p.qty;
    });

    const dayPnl       = currentValue - openValue;
    const dayPnlPct    = openValue ? (dayPnl / openValue) * 100 : 0;
    const totalReturn  = currentValue - INVESTED;
    const totalRetPct  = (totalReturn / INVESTED) * 100;

    const portEl    = document.getElementById('portfolio-value');
    const invEl     = document.getElementById('portfolio-invested');
    const dayEl     = document.getElementById('day-pnl');
    const dayPctEl  = document.getElementById('day-pnl-pct');
    const totEl     = document.getElementById('total-returns');
    const totPctEl  = document.getElementById('total-returns-pct');
    const posEl     = document.getElementById('positions-count');

    portEl.textContent   = `₹${fmtINR(currentValue)}`;
    portEl.className     = `summary-value ${totalReturn >= 0 ? 'positive' : 'negative'}`;
    invEl.textContent    = `Invested: ₹${fmtINR(INVESTED)}`;

    dayEl.textContent    = `${dayPnl >= 0 ? '+' : ''}₹${fmtINR(Math.abs(dayPnl))}`;
    dayEl.className      = `summary-value ${dayPnl >= 0 ? 'positive' : 'negative'}`;
    dayPctEl.textContent = `${dayPnl >= 0 ? '+' : ''}${dayPnlPct.toFixed(2)}%`;
    dayPctEl.className   = `summary-sub ${dayPnl >= 0 ? 'positive' : 'negative'}`;

    totEl.textContent    = `${totalReturn >= 0 ? '+' : '-'}₹${fmtINR(Math.abs(totalReturn))}`;
    totEl.className      = `summary-value ${totalReturn >= 0 ? 'positive' : 'negative'}`;
    totPctEl.textContent = `${totalReturn >= 0 ? '+' : ''}${totalRetPct.toFixed(2)}%`;
    totPctEl.className   = `summary-sub ${totalReturn >= 0 ? 'positive' : 'negative'}`;

    posEl.textContent = Object.keys(PORTFOLIO).length;
}

// ─── Market movers ────────────────────────────────────────────
function updateMovers(stocks) {
    const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
    const gainers = sorted.slice(0, 5);
    const losers  = sorted.slice(-5).reverse();

    renderMovers('top-gainers', gainers, true);
    renderMovers('top-losers',  losers,  false);
}

function renderMovers(containerId, list, isGainer) {
    const el = document.getElementById(containerId);
    el.innerHTML = list.map(s => `
        <div class="mover-row">
            <div class="mover-left">
                <span class="mover-sym">${s.symbol}</span>
                <span class="mover-name">${s.sector}</span>
            </div>
            <div class="mover-right">
                <span class="mover-price num">₹${fmt(s.price)}</span>
                <span class="mover-pct num ${isGainer ? 'positive' : 'negative'}">
                    ${isGainer ? '▲' : '▼'} ${Math.abs(s.changePercent).toFixed(2)}%
                </span>
            </div>
        </div>`).join('');
}

// ─── Market breadth ───────────────────────────────────────────
function updateBreadth(stocks) {
    const advances = stocks.filter(s => s.changePercent >= 0).length;
    const declines = stocks.length - advances;
    const advPct   = (advances / stocks.length) * 100;
    const decPct   = 100 - advPct;

    document.getElementById('breadth-advance').style.width = advPct + '%';
    document.getElementById('breadth-decline').style.width = decPct + '%';
    document.getElementById('advance-count').textContent = `Advances: ${advances}`;
    document.getElementById('decline-count').textContent = `Declines: ${declines}`;
}

// ─── Sparkline canvas ─────────────────────────────────────────
function drawSparkline(canvas, data) {
    if (!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const isPos = data[data.length - 1] >= data[0];
    const color = isPos
        ? getComputedStyle(document.documentElement).getPropertyValue('--green').trim()
        : getComputedStyle(document.documentElement).getPropertyValue('--red').trim();

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    ctx.clearRect(0, 0, W, H);

    // Area fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '05');

    ctx.beginPath();
    data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 4) - 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 4) - 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

// ─── Clock (IST) ──────────────────────────────────────────────
function startClock() {
    function tick() {
        const now = new Date();
        const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const h = String(ist.getHours()).padStart(2, '0');
        const m = String(ist.getMinutes()).padStart(2, '0');
        const s = String(ist.getSeconds()).padStart(2, '0');
        document.getElementById('clock').textContent = `${h}:${m}:${s} IST`;
    }
    tick();
    setInterval(tick, 1000);
}

// ─── Theme ────────────────────────────────────────────────────
function loadTheme() {
    const saved = localStorage.getItem('arkstock-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('arkstock-theme', next);

    // Redraw sparklines after theme change
    setTimeout(() => {
        document.querySelectorAll('.sparkline-canvas').forEach(c => {
            const sym = c.id.replace('spark-', '');
            const el  = document.getElementById(`price-${sym}`);
            if (el) { /* data still in DOM, sparklines re-render on next tick */ }
        });
    }, 50);
}

// ─── Formatters ───────────────────────────────────────────────
function fmt(n) {
    if (n === undefined || n === null) return '—';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtINR(n) {
    if (n >= 1e7)  return (n / 1e7).toFixed(2)  + ' Cr';
    if (n >= 1e5)  return (n / 1e5).toFixed(2)  + ' L';
    if (n >= 1000) return (n / 1000).toFixed(2) + ' K';
    return n.toFixed(2);
}

function fmtVol(v) {
    if (v >= 1e7) return (v / 1e7).toFixed(2) + 'Cr';
    if (v >= 1e5) return (v / 1e5).toFixed(2) + 'L';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return String(v);
}
