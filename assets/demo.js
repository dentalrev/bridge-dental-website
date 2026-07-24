/* =========================================================
   Bridge Analytics — live interactive demo (sample data)
   Renders the #ba-demo dashboard on the analytics landing page.

   Self-contained: no dependencies, no network calls, no storage.
   All figures are generated for a FICTIONAL practice ("Sunrise
   Dental Studio") relative to today's date, so the demo never
   looks stale. Pace bands use the product's real thresholds
   (>=1.05 ahead, >=0.95 on pace, >=0.80 slightly behind) so the
   rings, badges and forecast can never contradict each other.
   The "steady" scenario deliberately keeps one amber metric —
   the demo shows the honest product, not a fake-perfect one.
   ========================================================= */
(function () {
  'use strict';

  var root = document.getElementById('ba-demo');
  if (!root) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- formatting ---------- */

  function money(v) {
    return '$' + Math.round(v).toLocaleString('en-US');
  }
  function moneyShort(v) {
    if (v >= 1e6) { var m = v / 1e6; return '$' + (m >= 10 ? Math.round(m) : m.toFixed(1)) + 'M'; }
    if (v >= 1e3) { var k = v / 1e3; return '$' + (k >= 10 ? Math.round(k) : k.toFixed(1)) + 'K'; }
    return '$' + Math.round(v);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function stars(avg) {
    var filled = Math.round(avg);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled) + ' ' + avg.toFixed(1);
  }

  /* ---------- working-day math (Mon–Fri) ---------- */

  function workingDaysInMonth(y, m) {
    var days = new Date(y, m + 1, 0).getDate(), n = 0;
    for (var d = 1; d <= days; d++) {
      var dow = new Date(y, m, d).getDay();
      if (dow !== 0 && dow !== 6) n++;
    }
    return n;
  }
  function workingDaysElapsed(y, m, day) {
    var n = 0;
    for (var d = 1; d <= day; d++) {
      var dow = new Date(y, m, d).getDay();
      if (dow !== 0 && dow !== 6) n++;
    }
    return n;
  }
  function toIso(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* ---------- pace bands (product thresholds) ---------- */

  var BAND_UI = {
    ahead:           { label: '▲ Ahead',           cls: 'up' },
    on_pace:         { label: '● On Pace',         cls: 'ok' },
    slightly_behind: { label: '▼ Slightly Behind', cls: 'warn' },
    behind:          { label: '▼ Behind',          cls: 'down' }
  };
  function bandFor(ratio) {
    if (ratio >= 1.05) return 'ahead';
    if (ratio >= 0.95) return 'on_pace';
    if (ratio >= 0.8) return 'slightly_behind';
    return 'behind';
  }

  /* ---------- scenario fixtures ---------- */

  var GOALS = { production: 165000, collections: 155000, newPatients: 32, googleReviews: 12 };

  var TUNING = {
    steady: {
      label: 'Steady month',
      production: 0.997, collections: 0.884, newPatients: 1.09, googleReviews: 0.97,
      googleAvg: 4.8, todayNet: 0.97, todayColl: 0.92,
      agingTotal: 86420, agingFracs: [0.48, 0.26, 0.15],
      newToday: 2, reappt: 86.7, broken: 1, winsTotal: 6
    },
    record: {
      label: 'Record month',
      production: 1.118, collections: 1.071, newPatients: 1.27, googleReviews: 1.17,
      googleAvg: 4.9, todayNet: 0.97, todayColl: 0.92,
      agingTotal: 71340, agingFracs: [0.61, 0.22, 0.11],
      newToday: 3, reappt: 91.3, broken: 0, winsTotal: 9
    }
  };

  var DAY_FACTORS = [1.12, 0.94, 1.05, 0.88, 1.02, 0.97, 1.08];

  function build(key, now) {
    var t = TUNING[key];
    var y = now.getFullYear(), m = now.getMonth(), day = now.getDate();
    var total = workingDaysInMonth(y, m);
    var elapsed = Math.max(workingDaysElapsed(y, m, day), 1);
    var frac = elapsed / total;

    function metric(mult, goal, isCount) {
      var current = isCount ? Math.round(goal * frac * mult) : Math.round(goal * frac * mult);
      var expected = goal * frac;
      var ratio = expected > 0 ? current / expected : 0;
      return { current: current, goal: goal, band: bandFor(ratio), pct: Math.min(current / goal, 1) };
    }

    var prod = metric(t.production, GOALS.production);
    var coll = metric(t.collections, GOALS.collections);
    var np = metric(t.newPatients, GOALS.newPatients, true);
    var rev = metric(t.googleReviews, GOALS.googleReviews, true);
    var avgDailyProd = Math.round(prod.current / elapsed);
    var avgDailyColl = Math.round(coll.current / elapsed);

    /* forecast — same band as the production ring, so they can't disagree */
    var remaining = Math.max(total - elapsed, 0);
    var remainingScheduled = Math.round(avgDailyProd * remaining * 1.14);
    var projected = Math.round(prod.current + remainingScheduled * 0.87);

    /* today — a day in progress; health dots use daily-goal pace */
    var todayNet = Math.round(avgDailyProd * t.todayNet);
    var todayColl = Math.round(avgDailyColl * t.todayColl);
    var dailyProdGoal = GOALS.production / total;
    var dailyCollGoal = GOALS.collections / total;
    var today = {
      scheduled: Math.round(avgDailyProd * 1.06),
      net: todayNet,
      netBand: bandFor(todayNet / dailyProdGoal),
      collections: todayColl,
      collBand: bandFor(todayColl / dailyCollGoal),
      adjustments: Math.round(avgDailyProd * 0.028),
      newPatients: t.newToday,
      npBand: bandFor(t.newToday / (GOALS.newPatients / total)),
      googleAvg: t.googleAvg,
      sameDay: Math.round(avgDailyProd * 0.11),
      reappt: t.reappt,
      broken: t.broken
    };

    /* aging — buckets sum exactly to the total */
    var g = t.agingTotal;
    var b0 = Math.round(g * t.agingFracs[0]);
    var b31 = Math.round(g * t.agingFracs[1]);
    var b61 = Math.round(g * t.agingFracs[2]);
    var b90 = g - b0 - b31 - b61;
    var ins = Math.round(g * 0.58);

    /* providers — fictional; splits sum to the practice MTD production */
    var provDefs = [
      { name: 'Dr. Avery Stone', share: 0.46, hyg: false },
      { name: 'Dr. Jordan Pierce', share: 0.34, hyg: false },
      { name: 'Sam Reyes, RDH', share: 0.17, hyg: true }
    ];
    var providers = provDefs.map(function (p) {
      var production = Math.round(prod.current * p.share);
      var expected = GOALS.production * p.share * frac;
      return { name: p.name, hyg: p.hyg, production: production, band: bandFor(production / expected) };
    });

    /* practice win */
    var lastMonth = new Date(y, m - 1, 1);
    var monthYear = function (d) {
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };
    var win = key === 'record'
      ? {
          icon: '🏆', name: 'Best Production Day',
          line: 'Your highest net production day of ' + y + '.',
          compare: money(21480) + ' · previous best ' + money(18930)
        }
      : {
          icon: '🎯', name: 'Goal Getter',
          line: monthYear(lastMonth) + ' closed at or above the collections goal.',
          compare: money(Math.round(GOALS.collections * 1.021)) + ' · goal ' + money(GOALS.collections)
        };

    /* day map for snapshot paging — weekdays only, ±7 calendar days */
    var days = {}, pastIdx = 0, futureIdx = 0;
    for (var off = -10; off <= 10; off++) {
      if (off === 0) continue;
      var d = new Date(y, m, day + off);
      var dw = d.getDay();
      if (dw === 0 || dw === 6) continue;
      var iso = toIso(d);
      if (off < 0) {
        var f = DAY_FACTORS[pastIdx++ % DAY_FACTORS.length];
        var net = Math.round(avgDailyProd * f);
        days[iso] = {
          scheduled: Math.round(net * 1.07), net: net,
          collections: Math.round(avgDailyColl * f),
          adjustments: Math.round(net * 0.03),
          newPatients: pastIdx % 3 === 0 ? 2 : 1,
          googleAvg: t.googleAvg,
          sameDay: Math.round(net * 0.1),
          reappt: 84 + (pastIdx % 5),
          broken: pastIdx % 3 === 0 ? 1 : 0
        };
      } else {
        var ff = DAY_FACTORS[futureIdx++ % DAY_FACTORS.length];
        days[iso] = {
          scheduled: Math.round(avgDailyProd * ff * 1.02), net: 0,
          collections: 0, adjustments: 0, newPatients: 0,
          googleAvg: 0, sameDay: 0, reappt: 0, broken: 0
        };
      }
    }

    /* ytd + last-year glance */
    var monthsIntoYear = m + frac;
    return {
      key: key,
      workingDays: { elapsed: elapsed, total: total },
      monthName: now.toLocaleDateString('en-US', { month: 'long' }),
      rings: [
        { label: 'Net Production', v: prod, fmt: 'money' },
        { label: 'Collections', v: coll, fmt: 'money' },
        { label: 'New Patients', v: np, fmt: 'count' },
        { label: 'Google Reviews', v: rev, fmt: 'count' }
      ],
      forecast: { projected: projected, gap: projected - GOALS.production, goal: GOALS.production, band: prod.band },
      ytd: {
        production: Math.round(GOALS.production * (key === 'record' ? 1.032 : 0.968) * monthsIntoYear),
        collections: Math.round(GOALS.collections * (key === 'record' ? 1.032 : 0.968) * monthsIntoYear),
        lastYearMonth: Math.round(GOALS.production * 0.919)
      },
      aging: { total: g, buckets: [b0, b31, b61, b90], insurance: ins, patient: g - ins },
      providers: providers,
      win: win, winsTotal: t.winsTotal,
      today: today,
      days: days,
      googleAvg: t.googleAvg
    };
  }

  /* ---------- rendering ---------- */

  var AGING_META = [
    { label: '0-30d', color: '#10b981' },
    { label: '31-60d', color: '#f59e0b' },
    { label: '61-90d', color: '#f87171' },
    { label: '90+d', color: '#991b1b' }
  ];
  var RANK_COLORS = ['#d97706', '#94a3b8', '#b45309'];
  var RING = { r: 52, size: 128, width: 13 };
  var CIRC = 2 * Math.PI * RING.r;

  function badge(band) {
    var ui = BAND_UI[band];
    return '<span class="bad-badge bad-badge--' + ui.cls + '">' + ui.label + '</span>';
  }

  function ringHtml(ring, idx) {
    var pct = Math.round((ring.v.current / ring.v.goal) * 100);
    var sub = ring.fmt === 'money'
      ? moneyShort(ring.v.current) + ' <em>of ' + moneyShort(ring.v.goal) + '</em>'
      : ring.v.current + ' <em>of ' + ring.v.goal + '</em>';
    return (
      '<div class="bad-ringcard">' +
        '<div class="bad-ring" data-ring="' + idx + '" data-pct="' + pct + '">' +
          '<svg viewBox="0 0 ' + RING.size + ' ' + RING.size + '" aria-hidden="true">' +
            '<circle class="bad-ring__track" cx="64" cy="64" r="' + RING.r + '" stroke-width="' + RING.width + '"/>' +
            '<circle class="bad-ring__bar bad-ring__bar--' + BAND_UI[ring.v.band].cls + '" cx="64" cy="64" r="' + RING.r + '"' +
              ' stroke-width="' + RING.width + '" stroke-dasharray="' + CIRC.toFixed(1) + '"' +
              ' stroke-dashoffset="' + CIRC.toFixed(1) + '" transform="rotate(-90 64 64)"/>' +
          '</svg>' +
          '<div class="bad-ring__center">' +
            '<strong class="bad-ring__pct" data-count="' + pct + '">0%</strong>' +
            badge(ring.v.band) +
            '<span class="bad-ring__sub">' + sub + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="bad-ringcard__label">' + esc(ring.label) + '</p>' +
      '</div>'
    );
  }

  function snapshotRows(dayData, isToday, s) {
    if (!dayData) {
      return '<p class="bad-snap__closed">No data recorded for this day — the office may have been closed.</p>';
    }
    function dot(band) {
      if (!isToday || !band) return '<i class="bad-dot"></i>';
      var cls = BAND_UI[band].cls;
      return '<i class="bad-dot bad-dot--' + cls + '"></i>';
    }
    var rows = [
      { l: 'Net Production', v: money(dayData.scheduled) + ' / ' + money(dayData.net), d: dot(isToday ? s.today.netBand : null),
        t: money(dayData.scheduled) + ' scheduled · ' + money(dayData.net) + ' completed so far' },
      { l: 'Collections', v: money(dayData.collections), d: dot(isToday ? s.today.collBand : null) },
      { l: 'Adjustments', v: money(dayData.adjustments), d: dot(null) },
      { l: 'New Patients', v: String(dayData.newPatients), d: dot(isToday ? s.today.npBand : null) },
      { l: 'Google Review Avg', v: dayData.googleAvg ? stars(dayData.googleAvg) : '—', d: dot(null), star: true },
      { l: 'Same Day Treatment', v: money(dayData.sameDay), d: dot(null) },
      { l: 'Reappointment Rate', v: dayData.reappt ? dayData.reappt.toFixed(1) + '%' : '—', d: dot(null) },
      { l: 'Broken Appts', v: String(dayData.broken), d: dot(null) }
    ];
    return rows.map(function (r) {
      return '<div class="bad-snap__row"' + (r.t ? ' title="' + esc(r.t) + '"' : '') + '>' +
        '<span class="bad-snap__lbl">' + r.d + esc(r.l) + '</span>' +
        '<span class="bad-snap__val' + (r.star ? ' bad-snap__val--star' : '') + '">' + esc(r.v) + '</span>' +
      '</div>';
    }).join('');
  }

  function snapshotHtml(s, state) {
    var todayIso = toIso(new Date());
    var isToday = state.selectedDate === todayIso;
    var shown = new Date(state.selectedDate + 'T00:00:00');
    var dayName = shown.toLocaleDateString('en-US', { weekday: 'long' });
    var dateStr = shown.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    var dayData = isToday
      ? { scheduled: s.today.scheduled, net: s.today.net, collections: s.today.collections,
          adjustments: s.today.adjustments, newPatients: s.today.newPatients, googleAvg: s.today.googleAvg,
          sameDay: s.today.sameDay, reappt: s.today.reappt, broken: s.today.broken }
      : (s.days[state.selectedDate] || null);
    return (
      '<div class="bad-snap__head">' +
        '<strong>' + (isToday ? "Today's Snapshot" : 'Daily Snapshot') + '</strong>' +
        '<span class="bad-snap__nav">' +
          '<button type="button" data-day="-1" aria-label="Previous day">‹</button>' +
          '<button type="button" data-day="1" aria-label="Next day">›</button>' +
        '</span>' +
      '</div>' +
      '<div class="bad-snap__date">' + dayName + ', ' + dateStr +
        (isToday ? '' : ' <button type="button" class="bad-snap__today" data-day="0">Today</button>') +
      '</div>' +
      '<div class="bad-snap__rows">' + snapshotRows(dayData, isToday, s) + '</div>'
    );
  }

  function demoHtml(s, state) {
    var wd = s.workingDays;
    var gap = s.forecast.gap;
    var agingSegs = s.aging.buckets.map(function (amt, i) {
      var pct = (amt / s.aging.total) * 100;
      return '<i style="width:' + pct.toFixed(2) + '%;background:' + AGING_META[i].color + '" title="' +
        AGING_META[i].label + ': ' + moneyShort(amt) + '"></i>';
    }).join('');
    var agingLegend = s.aging.buckets.map(function (amt, i) {
      return '<span class="bad-aging__leg"><i style="background:' + AGING_META[i].color + '"></i>' +
        AGING_META[i].label + '<strong>' + moneyShort(amt) + '</strong></span>';
    }).join('');
    var board = s.providers.map(function (p, i) {
      return '<div class="bad-board__row">' +
        '<span class="bad-board__rank" style="color:' + RANK_COLORS[i] + '">' + (i + 1) + '</span>' +
        '<span class="bad-board__name">' + esc(p.name) +
          (p.hyg ? ' <span class="bad-board__tag">Hygiene</span>' : '') + '</span>' +
        '<span class="bad-board__prod">' + money(p.production) + '</span>' +
        badge(p.band) +
      '</div>';
    }).join('');

    return (
      '<div class="bad__bar">' +
        '<div class="bad__monthline">' +
          '<span class="bad__monthlabel">' + s.monthName.toUpperCase() + ' — MONTH TO DATE</span>' +
          '<span class="bad__days">' + (wd.total - wd.elapsed) + ' of ' + wd.total + ' working days remaining</span>' +
        '</div>' +
        '<div class="bad__track"><i style="width:' + ((wd.elapsed / wd.total) * 100).toFixed(1) + '%"></i></div>' +
      '</div>' +

      '<div class="bad-strip">' +
        '<span class="bad-strip__label">Month-End Forecast</span>' +
        '<span>Projected to land at <strong>' + money(s.forecast.projected) + '</strong> production</span>' +
        '<span class="bad-badge bad-badge--' + BAND_UI[s.forecast.band].cls + '">' +
          (gap >= 0 ? '+' : '−') + money(Math.abs(gap)) + ' vs goal</span>' +
        '<span class="bad-strip__meta">goal ' + money(s.forecast.goal) + '</span>' +
      '</div>' +

      '<div class="bad-strip">' +
        '<span class="bad-strip__label">YTD Production</span><strong>' + money(s.ytd.production) + '</strong>' +
        '<span class="bad-strip__sep"></span>' +
        '<span class="bad-strip__label">YTD Collections</span><strong>' + money(s.ytd.collections) + '</strong>' +
        '<span class="bad-strip__sep"></span>' +
        '<span class="bad-strip__label">This month last year</span><strong>' + money(s.ytd.lastYearMonth) + '</strong>' +
        '<span class="bad-strip__meta">production</span>' +
      '</div>' +

      '<div class="bad__grid">' +
        '<div class="bad__main">' +
          '<div class="bad__rings">' + s.rings.map(ringHtml).join('') + '</div>' +

          '<div class="bad-card bad-aging">' +
            '<div class="bad-card__head"><strong>AR Aging Overview</strong><strong>' + moneyShort(s.aging.total) + '</strong></div>' +
            '<div class="bad-aging__bar">' + agingSegs + '</div>' +
            '<div class="bad-aging__legend">' + agingLegend + '</div>' +
            '<p class="bad-aging__split">Insurance: ' + moneyShort(s.aging.insurance) + ' · Patient: ' + moneyShort(s.aging.patient) + '</p>' +
          '</div>' +

          '<div class="bad-card bad-board">' +
            '<div class="bad-card__head"><strong>🏆 Provider Leaderboard</strong><span class="bad-strip__meta">' + s.monthName + '</span></div>' +
            board +
          '</div>' +

          '<div class="bad-card bad-wins">' +
            '<div class="bad-card__head"><strong>🎉 Practice Wins</strong><span class="bad-strip__meta">' + s.winsTotal + ' this year</span></div>' +
            '<div class="bad-wins__body">' +
              '<span class="bad-wins__icon">' + s.win.icon + '</span>' +
              '<div><strong class="bad-wins__name">' + esc(s.win.name) + '</strong>' +
              '<p class="bad-wins__line">' + esc(s.win.line) + '</p>' +
              '<p class="bad-wins__compare">' + esc(s.win.compare) + '</p></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<aside class="bad__side"><div class="bad-snap" id="bad-snap">' + snapshotHtml(s, state) + '</div></aside>' +
      '</div>'
    );
  }

  /* ---------- animation ---------- */

  function animate() {
    var rings = root.querySelectorAll('.bad-ring');
    rings.forEach(function (el) {
      var pct = Math.min(parseInt(el.getAttribute('data-pct'), 10), 100);
      var bar = el.querySelector('.bad-ring__bar');
      var num = el.querySelector('.bad-ring__pct');
      var target = parseInt(num.getAttribute('data-count'), 10);
      var offset = CIRC * (1 - pct / 100);
      if (REDUCED) {
        bar.style.transition = 'none';
        bar.style.strokeDashoffset = offset;
        num.textContent = target + '%';
        return;
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bar.style.strokeDashoffset = offset;
        });
      });
      var t0 = null, DUR = 900;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / DUR, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        num.textContent = Math.round(target * eased) + '%';
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- state + events ---------- */

  var state = {
    scenario: 'steady',
    selectedDate: toIso(new Date()),
    built: null,
    animated: false
  };
  var NAV_RANGE = 7;

  function addDays(iso, delta) {
    var d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    return toIso(d);
  }

  function renderAll(runAnim) {
    state.built = build(state.scenario, new Date());
    var toggle =
      '<div class="bad__toggle" role="group" aria-label="Demo scenario">' +
        Object.keys(TUNING).map(function (k) {
          return '<button type="button" data-scenario="' + k + '"' +
            (k === state.scenario ? ' class="is-on" aria-pressed="true"' : ' aria-pressed="false"') + '>' +
            TUNING[k].label + '</button>';
        }).join('') +
      '</div>';
    root.innerHTML = '<div class="bad">' + toggle + demoHtml(state.built, state) + '</div>';
    if (runAnim) animate();
  }

  root.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    if (btn.hasAttribute('data-scenario')) {
      var k = btn.getAttribute('data-scenario');
      if (k !== state.scenario) {
        state.scenario = k;
        state.selectedDate = toIso(new Date());
        renderAll(true);
      }
      return;
    }
    if (btn.hasAttribute('data-day')) {
      var delta = parseInt(btn.getAttribute('data-day'), 10);
      var todayIso = toIso(new Date());
      var next = delta === 0 ? todayIso : addDays(state.selectedDate, delta);
      if (next < addDays(todayIso, -NAV_RANGE) || next > addDays(todayIso, NAV_RANGE)) return;
      state.selectedDate = next;
      var snap = document.getElementById('bad-snap');
      if (snap) snap.innerHTML = snapshotHtml(state.built, state);
    }
  });

  /* first render: paint immediately, animate when scrolled into view */
  renderAll(false);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !state.animated) {
          state.animated = true;
          animate();
          io.disconnect();
        }
      });
    }, { threshold: 0.25 });
    io.observe(root);
  } else {
    state.animated = true;
    animate();
  }
})();
