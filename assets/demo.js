/* =========================================================
   Bridge Analytics + Reputation — live interactive demo
   Renders the #ba-demo product tour on the analytics landing page.

   Self-contained: no dependencies, no network calls, no storage.
   All figures are generated for a FICTIONAL practice ("Sunrise
   Dental Studio") relative to today's date, so the demo never
   looks stale. Pace bands use the product's real thresholds
   (>=1.05 ahead, >=0.95 on pace, >=0.80 slightly behind) so the
   gauges, badges and forecast can never contradict each other.
   Dashboard layout mirrors the product's 2026-08 redesign: the
   month-end forecast hero (one big number), a band of four linear
   MTD gauges with a working-day pace tick (replaced the rings),
   Needs Attention, My Checklist, AR aging, provider leaderboard,
   and the Today's Snapshot rail with the Practice Wins chip.
   The "steady" scenario deliberately keeps amber states — the
   demo shows the honest product, not a fake-perfect one.

   Structure: two products (Analytics / Reputation) switched by
   the mini sidebar; each product has tabs; each tab is a pure
   render function over the fixture builders below.
   ========================================================= */
(function () {
  'use strict';

  var root = document.getElementById('ba-demo');
  if (!root) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= formatting ================= */

  function money(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
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
  function starRow(rating, size) {
    var out = '<span class="bad-stars' + (size === 'lg' ? ' bad-stars--lg' : '') + '" aria-label="' + rating + ' stars">';
    for (var i = 1; i <= 5; i++) {
      out += '<i class="' + (i <= Math.round(rating) ? 'on' : '') + '">★</i>';
    }
    return out + '</span>';
  }
  function toIso(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function fmtDate(d, opts) { return d.toLocaleDateString('en-US', opts); }

  /* ================= working days / pace ================= */

  function workingDaysInMonth(y, m) {
    var days = new Date(y, m + 1, 0).getDate(), n = 0;
    for (var d = 1; d <= days; d++) { var w = new Date(y, m, d).getDay(); if (w !== 0 && w !== 6) n++; }
    return n;
  }
  function workingDaysElapsed(y, m, day) {
    var n = 0;
    for (var d = 1; d <= day; d++) { var w = new Date(y, m, d).getDay(); if (w !== 0 && w !== 6) n++; }
    return n;
  }

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
  function badge(band) {
    var ui = BAND_UI[band];
    return '<span class="bad-badge bad-badge--' + ui.cls + '">' + ui.label + '</span>';
  }

  /* ================= analytics fixtures ================= */

  var GOALS = { production: 165000, collections: 155000, newPatients: 32, googleReviews: 12 };

  var TUNING = {
    steady: {
      label: 'Steady month',
      production: 0.997, collections: 0.884, newPatients: 1.09, googleReviews: 0.97,
      googleAvg: 4.8, todayNet: 0.97, todayColl: 0.92,
      agingTotal: 86420, agingFracs: [0.48, 0.26, 0.15],
      newToday: 2, reappt: 86.7, broken: 1, winsTotal: 6,
      recoverable: 182400, recoverablePts: 412, unaccepted: 46800, unacceptedPts: 19,
      monthlyLift: 0.968, caseAccept: 63.5
    },
    record: {
      label: 'Record month',
      production: 1.118, collections: 1.071, newPatients: 1.27, googleReviews: 1.17,
      googleAvg: 4.9, todayNet: 0.97, todayColl: 0.92,
      agingTotal: 71340, agingFracs: [0.61, 0.22, 0.11],
      newToday: 3, reappt: 91.3, broken: 0, winsTotal: 9,
      recoverable: 149800, recoverablePts: 344, unaccepted: 38200, unacceptedPts: 14,
      monthlyLift: 1.032, caseAccept: 71.2
    }
  };

  var DAY_FACTORS = [1.12, 0.94, 1.05, 0.88, 1.02, 0.97, 1.08];
  var MONTH_FACTORS = [0.92, 0.97, 1.06, 1.01, 0.95, 1.03, 1.0, 0.98, 1.05, 1.08, 0.99, 0.9];

  var PROVIDER_DEFS = [
    { name: 'Dr. Avery Stone', abbr: 'AS', share: 0.46, hyg: false },
    { name: 'Dr. Jordan Pierce', abbr: 'JP', share: 0.34, hyg: false },
    { name: 'Sam Reyes, RDH', abbr: 'SR', share: 0.17, hyg: true }
  ];

  /* Fictional patients for lists (never real people). */
  var PATIENTS = [
    { last: 'Ames', first: 'Ann', phone: '(555) 201-0101' },
    { last: 'Ruiz', first: 'David', phone: '(555) 201-0140' },
    { last: 'Lin', first: 'Grace', phone: '(555) 201-0177' },
    { last: 'Webb', first: 'Marcus', phone: '(555) 201-0192' },
    { last: 'Patel', first: 'Nina', phone: '(555) 201-0155' },
    { last: 'Cole', first: 'Owen', phone: '(555) 201-0166' }
  ];

  function build(key, now) {
    var t = TUNING[key];
    var y = now.getFullYear(), m = now.getMonth(), day = now.getDate();
    var total = workingDaysInMonth(y, m);
    var elapsed = Math.max(workingDaysElapsed(y, m, day), 1);
    var frac = elapsed / total;

    function metric(mult, goal) {
      var current = Math.round(goal * frac * mult);
      var expected = goal * frac;
      return { current: current, goal: goal, band: bandFor(expected > 0 ? current / expected : 0) };
    }

    var prod = metric(t.production, GOALS.production);
    var coll = metric(t.collections, GOALS.collections);
    var np = metric(t.newPatients, GOALS.newPatients);
    var rev = metric(t.googleReviews, GOALS.googleReviews);
    var avgDailyProd = Math.round(prod.current / elapsed);
    var avgDailyColl = Math.round(coll.current / elapsed);
    var collectionRatePct = key === 'record' ? 98.6 : 96.4;

    var remaining = Math.max(total - elapsed, 0);
    var remainingScheduled = Math.round(avgDailyProd * remaining * 1.14);
    var projected = Math.round(prod.current + remainingScheduled * 0.87);

    var todayNet = Math.round(avgDailyProd * t.todayNet);
    var todayColl = Math.round(avgDailyColl * t.todayColl);
    var today = {
      scheduled: Math.round(avgDailyProd * 1.06),
      net: todayNet,
      netBand: bandFor(todayNet / (GOALS.production / total)),
      collections: todayColl,
      collBand: bandFor(todayColl / (GOALS.collections / total)),
      adjustments: Math.round(avgDailyProd * 0.028),
      newPatients: t.newToday,
      npBand: bandFor(t.newToday / (GOALS.newPatients / total)),
      googleAvg: t.googleAvg,
      sameDay: Math.round(avgDailyProd * 0.11),
      reappt: t.reappt,
      broken: t.broken,
      appointments: 21,
      scheduledProdDay: Math.round(avgDailyProd * 1.06)
    };

    /* aging buckets sum exactly to the total */
    var g = t.agingTotal;
    var b0 = Math.round(g * t.agingFracs[0]);
    var b31 = Math.round(g * t.agingFracs[1]);
    var b61 = Math.round(g * t.agingFracs[2]);
    var b90 = g - b0 - b31 - b61;
    var ins = Math.round(g * 0.58);
    var buckets = [b0, b31, b61, b90];
    var claims = [64, 31, 17, 12];

    var providers = PROVIDER_DEFS.map(function (p, i) {
      var production = Math.round(prod.current * p.share);
      var expected = GOALS.production * p.share * frac;
      var hours = elapsed * 7;
      return {
        name: p.name, abbr: p.abbr, hyg: p.hyg,
        production: production,
        band: bandFor(production / expected),
        avg3mo: Math.round((production / frac) * 0.95),
        perHour: Math.round(production / hours),
        casePresented: Math.round(production * 1.38),
        caseAccepted: Math.round(production * 1.38 * (t.caseAccept / 100)),
        sameDay: Math.round(production * 0.09),
        reappt: p.hyg ? 91.5 : 82.4,
        perio: p.hyg ? 44 : 4,
        collections: Math.round(coll.current * p.share),
        procedures: 40 + i * 9 + elapsed,
        spark: [0.88, 1.02, 0.95, 1.06].map(function (f) { return Math.round((production / frac) * f / 12); })
      };
    });

    /* day map for the snapshot arrows */
    var days = {}, pastIdx = 0, futureIdx = 0;
    for (var off = -10; off <= 10; off++) {
      if (off === 0) continue;
      var d = new Date(y, m, day + off);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      var iso = toIso(d);
      if (off < 0) {
        var f = DAY_FACTORS[pastIdx++ % DAY_FACTORS.length];
        var net = Math.round(avgDailyProd * f);
        days[iso] = {
          scheduled: Math.round(net * 1.07), net: net,
          collections: Math.round(avgDailyColl * f),
          adjustments: Math.round(net * 0.03),
          newPatients: pastIdx % 3 === 0 ? 2 : 1,
          googleAvg: t.googleAvg, sameDay: Math.round(net * 0.1),
          reappt: 84 + (pastIdx % 5), broken: pastIdx % 3 === 0 ? 1 : 0
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

    /* monthly series (per metric, months 0..11; current month = MTD) */
    function series(fullMonthValue, mtdValue, liftPrior) {
      var cur = [], prior = [];
      for (var i = 0; i < 12; i++) {
        var base = fullMonthValue * MONTH_FACTORS[i];
        prior.push(Math.round(base * 0.92 * liftPrior));
        if (i < m) cur.push(Math.round(base * t.monthlyLift));
        else if (i === m) cur.push(mtdValue);
        else cur.push(0);
      }
      return { cur: cur, prior: prior };
    }
    var monthly = [
      { key: 'production', label: 'Net Production', color: '#10b981', fmt: 'money', s: series(GOALS.production, prod.current, 1) },
      { key: 'collections', label: 'Collections', color: '#3b82f6', fmt: 'money', s: series(GOALS.collections, coll.current, 1) },
      { key: 'newPatients', label: 'New Patients', color: '#f59e0b', fmt: 'count', s: series(GOALS.newPatients, np.current, 1) },
      { key: 'appointments', label: 'Appointments', color: '#8b5cf6', fmt: 'count', s: series(21 * total, 21 * elapsed, 1) },
      { key: 'reappointments', label: 'Reappointments', color: '#06b6d4', fmt: 'count', s: series(Math.round(21 * total * 0.62), Math.round(21 * elapsed * 0.62), 1) },
      { key: 'reviews', label: 'Google Reviews', color: '#eab308', fmt: 'count', s: series(GOALS.googleReviews, rev.current, 1) }
    ];

    /* treatment plan cases (mirrors the Tx Plan Tracker sheet) */
    var addD = function (delta) { return new Date(y, m, day + delta); };
    var fmtMD = function (d) { return fmtDate(d, { month: 'short', day: 'numeric', year: 'numeric' }); };
    var txCases = [
      { p: PATIENTS[0], planDate: fmtMD(addD(-28)), doctor: 'Dr. Stone', owner: 'Casey R.', plan: 5500, done: 800, status: 'noappt', next: null, follow: fmtMD(addD(0)), overdue: false, procs: 'D2740 ×6' },
      { p: PATIENTS[1], planDate: fmtMD(addD(-12)), doctor: 'Dr. Pierce', owner: 'Unassigned', plan: 8200, done: 0, status: 'noappt', next: null, follow: fmtMD(addD(-1)), overdue: true, procs: 'D6010, D6058' },
      { p: PATIENTS[2], planDate: fmtMD(addD(-5)), doctor: 'Dr. Stone', owner: 'Casey R.', plan: 3100, done: 3100, status: 'sched', next: fmtMD(addD(4)), follow: null, overdue: false, procs: 'D2950 ×2, D2740' },
      { p: PATIENTS[3], planDate: fmtMD(addD(-34)), doctor: 'Dr. Pierce', owner: 'Casey R.', plan: 12400, done: 2400, status: 'missed', next: null, follow: fmtMD(addD(-3)), overdue: true, procs: 'D6104, D6010 ×3' },
      { p: PATIENTS[4], planDate: fmtMD(addD(-9)), doctor: 'Dr. Stone', owner: 'Unassigned', plan: 1850, done: 0, status: 'noappt', next: null, follow: fmtMD(addD(5)), overdue: false, procs: 'D2392 ×3' },
      { p: PATIENTS[5], planDate: fmtMD(addD(-20)), doctor: 'Dr. Pierce', owner: 'Casey R.', plan: 6700, done: 6700, status: 'complete', next: null, follow: null, overdue: false, procs: 'D2740 ×4' }
    ];

    /* follow-up queue */
    var followUps = {
      due: [
        { p: PATIENTS[1], outcome: 'Left voicemail', note: 'wants AM slot', date: fmtMD(addD(0)) },
        { p: PATIENTS[3], outcome: 'No answer', note: 'try cell after 3pm', date: fmtMD(addD(0)) }
      ],
      week: [
        { p: PATIENTS[0], outcome: 'Spoke — thinking it over', note: 'crown financing', date: fmtMD(addD(2)) },
        { p: PATIENTS[4], outcome: 'Texted reminder', note: '', date: fmtMD(addD(5)) }
      ],
      scheduled: [
        { p: PATIENTS[2], outcome: 'Booked', note: 'confirmed', date: fmtMD(addD(4)) }
      ]
    };

    var monthName = fmtDate(now, { month: 'long' });
    return {
      key: key,
      now: now, year: y, month: m, day: day,
      workingDays: { elapsed: elapsed, total: total },
      monthName: monthName,
      monthYear: fmtDate(now, { month: 'long', year: 'numeric' }),
      kpis: [
        { label: 'Net Production', v: prod, fmt: 'money' },
        { label: 'Collections', v: coll, fmt: 'money' },
        { label: 'New Patients', v: np, fmt: 'count' },
        { label: 'Google Reviews', v: rev, fmt: 'count' }
      ],
      prodMtd: prod.current, collMtd: coll.current, npMtd: np.current, revMtd: rev.current,
      avgDailyProd: avgDailyProd, avgDailyColl: avgDailyColl,
      collectionRatePct: collectionRatePct,
      caseAccept: t.caseAccept,
      forecast: { projected: projected, gap: projected - GOALS.production, goal: GOALS.production, band: prod.band },
      ytd: {
        production: Math.round(GOALS.production * t.monthlyLift * (m + frac)),
        collections: Math.round(GOALS.collections * t.monthlyLift * (m + frac)),
        lastYearMonth: Math.round(GOALS.production * 0.919)
      },
      aging: { total: g, buckets: buckets, claims: claims, insurance: ins, patient: g - ins },
      providers: providers,
      win: key === 'record'
        ? { icon: '🏆', name: 'Best Production Day', line: 'Your highest net production day of ' + y + '.', compare: money(21480) + ' · previous best ' + money(18930) }
        : { icon: '🎯', name: 'Goal Getter', line: fmtDate(new Date(y, m - 1, 1), { month: 'long', year: 'numeric' }) + ' closed at or above the collections goal.', compare: money(Math.round(GOALS.collections * 1.021)) + ' · goal ' + money(GOALS.collections) },
      winsTotal: t.winsTotal,
      attention: {
        fiveStar: rev.current,
        needsReply: 1,
        ar90: b90,
        followUpsDue: followUps.due.length
      },
      checklist: [
        'Call the ' + followUps.due.length + ' overdue treatment-plan follow-ups',
        'Verify insurance for ' + (key === 'record' ? 1 : 3) + ' patients on tomorrow’s schedule',
        'Reply to Marcus D.’s 4-star review'
      ],
      today: today,
      days: days,
      googleAvg: t.googleAvg,
      monthly: monthly,
      txCases: txCases,
      followUps: followUps,
      patientConn: {
        recoverable: t.recoverable, recoverablePts: t.recoverablePts,
        broken: t.broken, unverified: key === 'record' ? 1 : 3,
        newPatients: np.current, unaccepted: t.unaccepted, unacceptedPts: t.unacceptedPts,
        brokenMonth: key === 'record' ? 11 : 23, rebooked: key === 'record' ? 52 : 41
      }
    };
  }

  /* ================= reputation fixtures ================= */

  var REVIEW_TEXTS = [
    { name: 'Leo P.', rating: 5, daysAgo: 1, text: 'Fantastic experience from start to finish. Thank you!' },
    { name: 'Marcus D.', rating: 4, daysAgo: 3, text: 'Great cleaning and thorough exam. Only reason for 4 stars is the wait was a little long.' },
    { name: 'Priya S.', rating: 5, daysAgo: 5, text: 'Dr. Stone explained every option clearly and the front desk sorted my insurance in minutes. Best dental visit I have had.' },
    { name: 'Dana W.', rating: 3, daysAgo: 6, text: 'Good care but the billing took a couple calls to sort out.' },
    { name: 'Tom H.', rating: 5, daysAgo: 9, text: 'Gentle hygienist, zero lecture, in and out on time. Exactly what I want.' },
    { name: 'Elena V.', rating: 5, daysAgo: 12, text: 'Brought both kids in — the team made it fun for them. Booking the whole family from now on.' },
    { name: 'Chris B.', rating: 4, daysAgo: 15, text: 'Clean office, friendly staff. Parking can be tricky at lunch.' },
    { name: 'Aisha K.', rating: 5, daysAgo: 19, text: 'They found a same-day slot when my crown cracked before a work trip. Lifesavers.' }
  ];

  function buildReputation(now) {
    var addD = function (delta) { return new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta); };
    var fmtMD = function (d) { return fmtDate(d, { month: 'short', day: 'numeric', year: 'numeric' }); };
    var reviews = REVIEW_TEXTS.map(function (r) {
      var d = addD(-r.daysAgo);
      return {
        name: r.name, rating: r.rating, text: r.text,
        date: d, dateLabel: fmtMD(d),
        rel: r.daysAgo === 1 ? 'yesterday' : r.daysAgo + ' days ago'
      };
    });
    return {
      rating: 4.8, totalReviews: 214, trendMonth: '+0.2',
      reviewsThisMonth: 12, reviewsLastMonth: 8,
      responseRate: 92, responded: 46, respondedOf: 50,
      pendingRequests: 4,
      reviews: reviews,
      needsResponse: [
        { name: 'Marcus D.', rating: 4, text: 'Great cleaning and thorough exam. Only reason for 4 stars is the wait was a little long.' },
        { name: 'Dana W.', rating: 3, text: 'Good care but the billing took a couple calls to sort out.' },
        { name: 'Leo P.', rating: 5, text: 'Fantastic experience from start to finish. Thank you!' }
      ],
      velocity: [2, 3, 1, 4, 3, 5, 4, 3],
      themes: [
        { label: 'Friendly staff', n: 42, tone: 'pos' },
        { label: 'Short wait times', n: 28, tone: 'pos' },
        { label: 'Clear pricing', n: 19, tone: 'pos' },
        { label: 'Gentle hygienist', n: 15, tone: 'pos' },
        { label: 'Billing confusion', n: 4, tone: 'neg' }
      ],
      distribution: [180, 22, 7, 3, 2],
      history: [
        { date: fmtMD(addD(-1)), avg: 4.8 }, { date: fmtMD(addD(-2)), avg: 4.8 },
        { date: fmtMD(addD(-3)), avg: 4.8 }, { date: fmtMD(addD(-4)), avg: 4.7 },
        { date: fmtMD(addD(-5)), avg: 4.7 }, { date: fmtMD(addD(-6)), avg: 4.7 }
      ],
      requests: {
        pending: [
          { name: 'Ann Ames', type: 'Hygiene recall', time: fmtMD(addD(0)) + ', 8:40 AM', countdown: 'Sending in 2h 59m' },
          { name: 'David Ruiz', type: 'Crown seat', time: fmtMD(addD(0)) + ', 10:10 AM', countdown: 'Sending in 4h 59m' },
          { name: 'Grace Lin', type: 'New patient exam', time: fmtMD(addD(0)) + ', 1:30 PM', countdown: 'Sending in 19h 59m' },
          { name: 'Marcus Webb', type: 'Whitening', time: fmtMD(addD(0)) + ', 3:15 PM', countdown: 'Sending in 25h 59m' }
        ],
        sent: [
          { name: 'Nina Patel', channel: 'Text', date: fmtMD(addD(-1)), status: 'Review Posted' },
          { name: 'Owen Cole', channel: 'Text', date: fmtMD(addD(-1)), status: 'Delivered' },
          { name: 'Priya S.', channel: 'Email', date: fmtMD(addD(-2)), status: 'Delivered' },
          { name: 'Tom H.', channel: 'Text', date: fmtMD(addD(-3)), status: 'Sent' }
        ],
        excluded: [
          { name: 'Elena V.', date: fmtMD(addD(-14)), reason: 'Patient preference', by: 'Casey R.' }
        ]
      },
      /* Auto-draft every review: each unanswered review arrives with an AI
         draft already written (2026-08-07 product update). Worst-first. */
      drafts: [
        {
          name: 'Dana W.', rating: 3, date: fmtMD(addD(-6)), status: 'needs',
          text: 'Good care but the billing took a couple calls to sort out.',
          draft: 'Thank you for the honest feedback, Dana — and we’re sorry the billing took more than one call. We’ve reviewed how estimates are explained at checkout so it’s clear the first time. We’re glad the care itself felt good, and we’d love to make the whole visit that smooth.'
        },
        {
          name: 'Marcus D.', rating: 4, date: fmtMD(addD(-3)), status: 'draft',
          text: 'Great cleaning and thorough exam. Only reason for 4 stars is the wait was a little long.',
          draft: 'Thank you, Marcus! We’re glad the cleaning and exam felt thorough. You’re right about the wait that day — we’ve adjusted our morning schedule so gentle dental care at Sunrise Dental Studio starts on time. See you at your next visit!'
        },
        {
          name: 'Leo P.', rating: 5, date: fmtMD(addD(-1)), status: 'draft',
          text: 'Fantastic experience from start to finish. Thank you!',
          draft: 'Thank you, Leo! Reviews like this make the whole team’s day. We’ll see you at your next visit to Sunrise Dental Studio!'
        }
      ],
      unanswered: 3,
      market: {
        rank: 1, total: 4,
        standings: [
          { name: 'Sunrise Dental Studio', rating: 4.9, reviews: 1214, gained30: 26, you: true },
          { name: 'Cedar Park Dental', rating: 4.8, reviews: 587, gained30: 13 },
          { name: 'Meridian Smiles', rating: 4.8, reviews: 252, gained30: 0 },
          { name: 'Brightleaf Dental', rating: 4.4, reviews: 97, gained30: 4 }
        ],
        race: 'Review race, last 28 days: you +26 · fastest mover Cedar Park Dental +13'
      },
      ranks: [
        { term: 'dentist near me', pos: 3, move: 1 },
        { term: 'dentist springfield', pos: 2, move: 0 },
        { term: 'emergency dentist', pos: 5, move: -1 },
        { term: 'invisalign springfield', pos: 8, move: 2 },
        { term: 'pediatric dentist', pos: null, move: null }
      ],
      /* Bridge Score — the composite 0-100 with receipts (never a black box). */
      score: {
        value: 91, band: 'Excellent',
        parts: [
          { label: 'Star rating', v: 98 },
          { label: 'Review volume', v: 100 },
          { label: 'Responsiveness', v: 63, low: true },
          { label: 'Listing health', v: null }
        ],
        foot1: 'Answers 58% of reviews · ~4 days to reply · last 90 days',
        foot2: '#1 of 4 nearby practices',
        dots: [62, 75, 88]
      },
      /* Scoreboard — one tile per surface; unknown renders “—”, never zero. */
      platforms: [
        { name: 'Google', dot: '#4285f4', trend: '+0.1 (30d)', rating: 4.9, meta: '1,214 reviews · <b>+26 in 30d</b> · synced 1m ago', link: 'Reply to 3 waiting reviews →', dim: false },
        { name: 'Yelp', dot: '#ef4444', trend: '', rating: 4.2, meta: '9 reviews · synced 16 hours ago', link: 'Ask for reviews →', dim: true },
        { name: 'Facebook', dot: '#6366f1', trend: '', rating: null, meta: 'No review count yet · Not connected', link: 'Connect Facebook →', dim: false },
        { name: 'Instagram', dot: '#c05cf0', trend: '', rating: null, meta: 'Posts publish via Brand Studio', link: 'Open Brand Studio →', dim: true },
        { name: 'TikTok', dot: '#22262f', trend: '', rating: null, meta: 'Posts publish via Brand Studio', link: 'Open Brand Studio →', dim: true }
      ],
      /* Brand Studio — the calm Create landing. */
      studio: {
        suggestions: [
          { icon: 'calcheck', label: '“Why patients choose us” is ready', hint: 'A ten-second look and it goes out on schedule', hi: true },
          { icon: 'quote', label: 'Post a five-star review', hint: 'Written from this week’s reviews' },
          { icon: 'trend', label: 'Make one like The Smile Co.', hint: 'Personal + family moments out-perform polished ads.' }
        ],
        pills: [
          { icon: 'cal', label: 'Calendar' }, { icon: 'cam', label: 'Capture' },
          { icon: 'img', label: 'Add photos / videos' }, { icon: 'dl', label: 'Import' },
          { icon: 'palette', label: 'Brand Kit' }
        ],
        weekLine: '3 posts scheduled this week · next goes out Thursday 9:00 AM'
      },
      calendar: [
        { day: 'Mon', title: 'Patient praise — Leo P., ★★★★★', channels: ['FB', 'IG'], status: 'published', perf: '18 likes · 2 comments' },
        { day: 'Tue', title: 'Meet Dr. Stone', channels: ['FB', 'IG', 'GBP'], status: 'draft', perf: null },
        { day: 'Wed', title: 'Same-day crowns explainer', channels: ['FB', 'GBP'], status: 'scheduled', perf: null },
        { day: 'Thu', title: 'Team shout-out — Casey, 5 years', channels: ['FB', 'IG'], status: 'scheduled', perf: null },
        { day: 'Fri', title: 'Whitening special reminder', channels: ['IG', 'TikTok'], status: 'scheduled', perf: null }
      ],
      brand: {
        colors: ['#0d1340', '#ef3a66', '#f5f0e8', '#1f8a55'],
        fonts: 'Poppins · Mulish',
        voice: ['Warm', 'Plainspoken', 'Confident'],
        never: ['Clinical jargon', 'Discount-speak'],
        connections: [
          { name: 'Facebook', on: true }, { name: 'Instagram', on: true }, { name: 'Google Business', on: true },
          { name: 'TikTok', on: false }, { name: 'LinkedIn', on: false }
        ]
      },
      seoKeywords: ['gentle dental care', 'Sunrise Dental Studio']
    };
  }

  /* ================= tiny SVG charts ================= */

  function barChart(values, prior, color, h) {
    h = h || 120;
    var W = 300, n = values.length;
    var max = 1;
    values.concat(prior || []).forEach(function (v) { if (v > max) max = v; });
    var slot = W / n, bw = prior ? slot * 0.32 : slot * 0.55;
    var out = '<svg class="bad-chart" viewBox="0 0 ' + W + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">';
    [0.25, 0.5, 0.75].forEach(function (fy) {
      out += '<line x1="0" y1="' + (h * fy) + '" x2="' + W + '" y2="' + (h * fy) + '" stroke="#e5e7ef" stroke-dasharray="3 3" stroke-width="1"/>';
    });
    for (var i = 0; i < n; i++) {
      var x = i * slot + (slot - (prior ? bw * 2 + 2 : bw)) / 2;
      if (prior) {
        var ph = Math.round((prior[i] / max) * (h - 6));
        out += '<rect x="' + x + '" y="' + (h - ph) + '" width="' + bw + '" height="' + ph + '" rx="2" fill="#93c5fd"/>';
        x += bw + 2;
      }
      var vh = Math.round((values[i] / max) * (h - 6));
      if (vh > 0) out += '<rect x="' + x + '" y="' + (h - vh) + '" width="' + bw + '" height="' + vh + '" rx="2" fill="' + color + '"/>';
    }
    return out + '</svg>';
  }

  function sparkline(points) {
    var W = 72, H = 26, max = Math.max.apply(null, points), min = Math.min.apply(null, points);
    var span = max - min || 1;
    var coords = points.map(function (v, i) {
      return (i * (W - 6) / (points.length - 1) + 3) + ',' + (H - 4 - ((v - min) / span) * (H - 8));
    });
    return '<svg class="bad-spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<polyline points="' + coords.join(' ') + '" fill="none" stroke="#64748b" stroke-width="1.5"/>' +
      '<circle cx="' + coords[coords.length - 1].split(',')[0] + '" cy="' + coords[coords.length - 1].split(',')[1] + '" r="2" fill="#64748b"/></svg>';
  }

  /* ================= shared UI pieces ================= */

  var AGING_META = [
    { label: '0-30', color: '#10b981' }, { label: '31-60', color: '#f59e0b' },
    { label: '61-90', color: '#f87171' }, { label: '90+', color: '#991b1b' }
  ];
  var RANK_COLORS = ['#d97706', '#94a3b8', '#b45309'];
  var BAND_WORDS = { ahead: 'Ahead', on_pace: 'On pace', slightly_behind: 'Slightly behind', behind: 'Behind' };

  function sectionRule(label, extra) {
    return '<div class="bad-rule"><span>' + label + '</span><i></i>' + (extra || '') + '</div>';
  }

  function statCard(o) {
    return '<div class="bad-stat" style="border-top-color:' + o.color + '">' +
      '<span class="bad-stat__label">' + esc(o.label) + '</span>' +
      '<strong class="bad-stat__value">' + o.value + '</strong>' +
      (o.sub ? '<span class="bad-stat__sub">' + o.sub + '</span>' : '') +
    '</div>';
  }

  function statusPill(status) {
    var MAP = {
      sched: { label: 'Scheduled for treatment', cls: 'sched' },
      noappt: { label: 'No appt scheduled', cls: 'noappt' },
      missed: { label: 'Missed appt', cls: 'missed' },
      notint: { label: 'Not interested', cls: 'notint' },
      complete: { label: 'Tx complete', cls: 'complete' }
    };
    var s = MAP[status];
    return '<span class="bad-pill bad-pill--' + s.cls + '"><i></i>' + s.label + '</span>';
  }

  /* ================= analytics tab renderers ================= */

  /* Linear MTD gauge tile — mirrors the product's MtdKpiTile (value, thin
     bar with the working-day pace tick, dot + words status). */
  function tileHtml(s, kpi) {
    var cls = BAND_UI[kpi.v.band].cls;
    var fillPct = Math.min(Math.round((kpi.v.current / kpi.v.goal) * 100), 100);
    var tickPct = Math.min(Math.round((s.workingDays.elapsed / s.workingDays.total) * 100), 100);
    var value = kpi.fmt === 'money' ? moneyShort(kpi.v.current) : String(kpi.v.current);
    var goal = kpi.fmt === 'money' ? moneyShort(kpi.v.goal) : String(kpi.v.goal);
    var startW = state.animated ? fillPct : 0;
    return (
      '<div class="bad-tile">' +
        '<span class="bad-stat__label">' + esc(kpi.label) + '</span>' +
        '<div class="bad-tile__value">' + value + '</div>' +
        '<div class="bad-tile__goal">of ' + goal + ' goal</div>' +
        '<div class="bad-tile__track">' +
          '<i class="bad-tile__fill bad-tile__fill--' + cls + '" data-fill="' + fillPct + '" style="width:' + startW + '%"></i>' +
          '<i class="bad-tile__tick" style="left:' + tickPct + '%" title="Today’s pace"></i>' +
        '</div>' +
        '<div class="bad-tile__status bad-tile__status--' + cls + '"><i class="bad-dot bad-dot--' + cls + '"></i>' + BAND_WORDS[kpi.v.band] + '</div>' +
      '</div>'
    );
  }

  /* Dashboard hero — the one big number (C1 month-end forecast) with the
     goal-gap chip, month working-day progress, and the YTD glance. */
  function heroHtml(s) {
    var wd = s.workingDays;
    var gap = s.forecast.gap;
    var shown = state.animated ? money(s.forecast.projected) : money(0);
    return (
      '<div class="bad-hero2">' +
        '<div class="bad-hero2__top">' +
          '<div>' +
            '<span class="bad-stat__label">Month-End Forecast — ' + s.monthName + '</span>' +
            '<div class="bad-hero2__big"><span data-countup="' + s.forecast.projected + '">' + shown + '</span>' +
              '<span class="bad-badge bad-badge--' + BAND_UI[s.forecast.band].cls + '">' + (gap >= 0 ? '+' : '−') + money(Math.abs(gap)) + ' vs goal</span>' +
            '</div>' +
            '<div class="bad-hero2__goal">projected production · goal ' + money(s.forecast.goal) + '</div>' +
          '</div>' +
          '<span class="bad__days">' + (wd.total - wd.elapsed) + ' of ' + wd.total + ' working days remaining</span>' +
        '</div>' +
        '<div class="bad-hero2__bar"><div class="bad__track"><i style="width:' + ((wd.elapsed / wd.total) * 100).toFixed(1) + '%"></i></div></div>' +
        '<div class="bad-hero2__ytd">' +
          '<span class="bad-ytd"><b>YTD Production</b><strong>' + money(s.ytd.production) + '</strong></span>' +
          '<span class="bad-ytd"><b>YTD Collections</b><strong>' + money(s.ytd.collections) + '</strong></span>' +
          '<span class="bad-ytd"><b>This month last year</b><strong>' + money(s.ytd.lastYearMonth) + '</strong></span>' +
        '</div>' +
      '</div>'
    );
  }

  function snapshotRows(dayData, isToday, s) {
    if (!dayData) {
      return '<p class="bad-snap__closed">No data recorded for this day — the office may have been closed.</p>';
    }
    function dot(band) {
      if (!isToday || !band) return '<i class="bad-dot"></i>';
      return '<i class="bad-dot bad-dot--' + BAND_UI[band].cls + '"></i>';
    }
    function glyphStars(avg) {
      var f = Math.round(avg);
      return '★'.repeat(f) + '☆'.repeat(5 - f) + ' ' + avg.toFixed(1);
    }
    var rows = [
      { l: 'Net Production', v: money(dayData.scheduled) + ' / ' + money(dayData.net), d: dot(isToday ? s.today.netBand : null) },
      { l: 'Collections', v: money(dayData.collections), d: dot(isToday ? s.today.collBand : null) },
      { l: 'Adjustments', v: money(dayData.adjustments), d: dot(null) },
      { l: 'New Patients', v: String(dayData.newPatients), d: dot(isToday ? s.today.npBand : null) },
      { l: 'Google Review Avg', v: dayData.googleAvg ? glyphStars(dayData.googleAvg) : '—', d: dot(null), star: true },
      { l: 'Same Day Treatment', v: money(dayData.sameDay), d: dot(null) },
      { l: 'Reappointment Rate', v: dayData.reappt ? dayData.reappt.toFixed(1) + '%' : '—', d: dot(null) },
      { l: 'Broken Appts', v: String(dayData.broken), d: dot(null) }
    ];
    return rows.map(function (r) {
      return '<div class="bad-snap__row">' +
        '<span class="bad-snap__lbl">' + r.d + esc(r.l) + '</span>' +
        '<span class="bad-snap__val' + (r.star ? ' bad-snap__val--star' : '') + '">' + esc(r.v) + '</span>' +
      '</div>';
    }).join('');
  }

  function snapshotHtml(s) {
    var todayIso = toIso(new Date());
    var isToday = state.selectedDate === todayIso;
    var shown = new Date(state.selectedDate + 'T00:00:00');
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
      '<div class="bad-snap__date">' + fmtDate(shown, { weekday: 'long' }) + ', ' + fmtDate(shown, { month: 'long', day: 'numeric' }) +
        (isToday ? '' : ' <button type="button" class="bad-snap__today" data-day="0">Today</button>') +
      '</div>' +
      '<div class="bad-snap__rows">' + snapshotRows(dayData, isToday, s) + '</div>'
    );
  }

  function tabDashboard(s) {
    var agingSegs = s.aging.buckets.map(function (amt, i) {
      var pct = (amt / s.aging.total) * 100;
      return '<i style="width:' + pct.toFixed(2) + '%;background:' + AGING_META[i].color + '" title="' + AGING_META[i].label + 'd: ' + moneyShort(amt) + '"></i>';
    }).join('');
    var agingLegend = s.aging.buckets.map(function (amt, i) {
      return '<span class="bad-aging__leg"><i style="background:' + AGING_META[i].color + '"></i>' + AGING_META[i].label + 'd<strong>' + moneyShort(amt) + '</strong></span>';
    }).join('');
    var board = s.providers.slice().sort(function (a, b) { return b.production - a.production; }).map(function (p, i) {
      return '<div class="bad-board__row">' +
        '<span class="bad-board__rank" style="color:' + RANK_COLORS[i] + '">' + (i + 1) + '</span>' +
        '<span class="bad-board__name">' + esc(p.name) + (p.hyg ? ' <span class="bad-board__tag">Hygiene</span>' : '') + '</span>' +
        '<span class="bad-board__prod">' + money(p.production) + '</span>' +
        badge(p.band) +
      '</div>';
    }).join('');
    var a = s.attention;
    var attn =
      '<div class="bad-attn__row"><span class="bad-attn__icon">⭐</span>' +
        '<span><strong>' + a.fiveStar + ' five-star reviews</strong> this month — ' + a.needsReply + ' still ' + (a.needsReply === 1 ? 'needs' : 'need') + ' a reply</span>' +
        '<span class="bad-attn__link">Reply →</span></div>' +
      '<div class="bad-attn__row"><span class="bad-attn__icon">⏰</span>' +
        '<span><strong>' + moneyShort(a.ar90) + '</strong> in AR past 90 days</span>' +
        '<span class="bad-attn__link">View aging →</span></div>' +
      '<div class="bad-attn__row"><span class="bad-attn__icon">🔔</span>' +
        '<span><strong>' + a.followUpsDue + ' follow-ups</strong> due today</span>' +
        '<span class="bad-attn__link">Open queue →</span></div>';
    var check = s.checklist.map(function (item, i) {
      var done = !!state.ui.checked[i];
      return '<button type="button" class="bad-check__row' + (done ? ' is-done' : '') + '" data-check="' + i + '">' +
        '<i class="bad-check__box">' + (done ? '✓' : '') + '</i><span>' + esc(item) + '</span></button>';
    }).join('');

    return (
      heroHtml(s) +
      '<div class="bad-tiles" style="margin-top:12px">' + s.kpis.map(function (k) { return tileHtml(s, k); }).join('') + '</div>' +
      '<div class="bad__grid" style="margin-top:12px">' +
        '<div class="bad__main">' +
          '<div class="bad-card">' +
            '<div class="bad-card__head"><strong>Needs Attention</strong><span class="bad-strip__meta">today</span></div>' + attn +
          '</div>' +
          '<div class="bad-card">' +
            '<div class="bad-card__head"><strong>My Checklist</strong><span class="bad-strip__meta">+ Add task</span></div>' + check +
            '<p class="bad-foot" style="margin-top:6px">Personal to each user — with AI-recommended tasks tailored to their role.</p>' +
          '</div>' +
          '<div class="bad-card bad-aging">' +
            '<div class="bad-card__head"><strong>AR Aging Overview</strong><strong>' + moneyShort(s.aging.total) + '</strong></div>' +
            '<div class="bad-aging__bar">' + agingSegs + '</div>' +
            '<div class="bad-aging__legend">' + agingLegend + '</div>' +
            '<p class="bad-aging__split">Insurance: ' + moneyShort(s.aging.insurance) + ' · Patient: ' + moneyShort(s.aging.patient) + '</p>' +
          '</div>' +
          '<div class="bad-card">' +
            '<div class="bad-card__head"><strong>🏆 Provider Leaderboard</strong><span class="bad-strip__meta">' + s.monthName + '</span></div>' + board +
          '</div>' +
        '</div>' +
        '<aside class="bad__side">' +
          '<div class="bad-snap" id="bad-snap">' + snapshotHtml(s) + '</div>' +
          '<div class="bad-winschip">' +
            '<span class="bad-winschip__icon">' + s.win.icon + '</span>' +
            '<span class="bad-winschip__body"><strong>Practice Wins</strong><span>' + s.winsTotal + ' this year · latest: ' + esc(s.win.name) + '</span></span>' +
            '<span class="bad-winschip__new">1 NEW</span>' +
          '</div>' +
        '</aside>' +
      '</div>'
    );
  }

  function tabMonthly(s) {
    var yoy = state.ui.yoy;
    var cards = s.monthly.map(function (mm) {
      var ytdVal = mm.s.cur.reduce(function (a, b) { return a + b; }, 0);
      return '<div class="bad-mchart" style="border-top-color:' + mm.color + '">' +
        '<div class="bad-mchart__head"><span class="bad-stat__label">' + mm.label + '</span>' +
        '<strong style="color:' + mm.color + '">' + (mm.fmt === 'money' ? moneyShort(ytdVal) : ytdVal.toLocaleString()) + '</strong></div>' +
        '<span class="bad-stat__sub">YTD ' + s.year + '</span>' +
        barChart(mm.s.cur, yoy ? mm.s.prior : null, mm.color, 110) +
        '<div class="bad-mchart__axis"><span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span></div>' +
      '</div>';
    }).join('');
    return (
      '<div class="bad-card" style="margin-bottom:14px">' +
        '<div class="bad-card__head" style="margin-bottom:0"><strong>' + s.year + '</strong>' +
        '<label class="bad-switch"><input type="checkbox" data-yoy' + (yoy ? ' checked' : '') + '><i></i>Compare with prior years</label></div>' +
      '</div>' +
      '<div class="bad-mgrid">' + cards + '</div>' +
      (yoy ? '<p class="bad-foot" style="margin-top:10px">Light blue bars = ' + (s.year - 1) + '. Colored bars = ' + s.year + '.</p>' : '')
    );
  }

  function tabPatients(s) {
    var pc = s.patientConn;
    var fuTab = state.ui.fuq;
    var fu = s.followUps[fuTab];
    var fuRows = fu.length ? fu.map(function (r) {
      return '<div class="bad-fuq__row">' +
        '<strong>' + esc(r.p.last + ', ' + r.p.first) + '</strong>' +
        '<span class="bad-strip__meta">📞 ' + esc(r.p.phone) + '</span>' +
        '<span class="bad-fuq__note">' + esc(r.outcome) + (r.note ? ' — ' + esc(r.note) : '') + '</span>' +
        '<span class="bad-fuq__date">' + esc(r.date) + '</span>' +
        '<button type="button" class="bad-btn">Log contact</button>' +
      '</div>';
    }).join('') : '<p class="bad-foot" style="padding:14px 0">Nothing in this bucket.</p>';
    return (
      '<div class="bad-hero" role="figure">' +
        '<div class="bad-hero__icon">💤</div>' +
        '<div class="bad-hero__body">' +
          '<strong>Unscheduled Active Patients</strong>' +
          '<span class="bad-stat__sub">Seen in the last 18 months, no future appointment</span>' +
          '<div class="bad-hero__big">' + money(pc.recoverable) + ' <em>recoverable</em></div>' +
          '<span class="bad-stat__sub">' + pc.recoverablePts + ' patients · ranked by recoverable value</span>' +
        '</div><span class="bad-hero__chev">›</span>' +
      '</div>' +
      sectionRule('Day — ' + fmtDate(s.now, { weekday: 'long' }) + ', ' + fmtDate(s.now, { month: 'short', day: 'numeric' }) + ' (today)') +
      '<div class="bad-statgrid bad-statgrid--2">' +
        statCard({ label: 'Broken Appointments', color: '#f97316', value: String(pc.broken), sub: 'broke an appointment this day — call to rebook' }) +
        statCard({ label: 'Unverified Insurance', color: '#ef4444', value: String(pc.unverified), sub: 'on the schedule without a successful verification' }) +
      '</div>' +
      '<p class="bad-foot">This month: ' + pc.brokenMonth + ' broken appointments not yet rescheduled · ' + pc.rebooked + ' rebooked</p>' +
      sectionRule('Period — Month to date') +
      '<div class="bad-statgrid bad-statgrid--2">' +
        statCard({ label: 'New Patients', color: '#f59e0b', value: String(pc.newPatients), sub: 'first completed visit in this period' }) +
        statCard({ label: 'Unaccepted Treatment', color: '#6366f1', value: pc.unacceptedPts + ' <em class="bad-stat__dollar">' + moneyShort(pc.unaccepted) + '</em>', sub: 'treatment presented, not yet accepted or scheduled' }) +
      '</div>' +
      sectionRule('Follow-ups') +
      '<div class="bad-card">' +
        '<div class="bad-card__head"><strong>🔔 Follow-Up Queue</strong>' +
          '<span class="bad-fuq__tabs">' +
            '<button type="button" data-fuq="due" class="' + (fuTab === 'due' ? 'is-on' : '') + '">Due <b class="red">' + s.followUps.due.length + '</b></button>' +
            '<button type="button" data-fuq="week" class="' + (fuTab === 'week' ? 'is-on' : '') + '">Next 7 days <b class="amber">' + s.followUps.week.length + '</b></button>' +
            '<button type="button" data-fuq="scheduled" class="' + (fuTab === 'scheduled' ? 'is-on' : '') + '">Scheduled <b>' + s.followUps.scheduled.length + '</b></button>' +
          '</span>' +
        '</div>' + fuRows +
      '</div>'
    );
  }

  function tabTxPlans(s) {
    var filter = state.ui.txfilter;
    var cases = s.txCases;
    var counts = { all: 0, sched: 0, noappt: 0, missed: 0, notint: 0, complete: 0 };
    cases.forEach(function (c) { counts[c.status]++; if (c.status !== 'complete' && c.status !== 'notint') counts.all++; });
    var shown = cases.filter(function (c) {
      if (filter === 'all') return c.status !== 'complete' && c.status !== 'notint';
      return c.status === filter;
    });
    var openPipeline = 0, dueToday = 0, overdue = 0, unassigned = 0, planTotal = 0, openTotal = 0;
    cases.forEach(function (c) {
      planTotal += c.plan;
      if (c.status !== 'complete' && c.status !== 'notint') {
        openPipeline += (c.plan - c.done); openTotal += (c.plan - c.done);
        if (c.owner === 'Unassigned') unassigned++;
        if (c.overdue) overdue++;
        else if (c.follow && c.follow.indexOf(fmtDate(s.now, { month: 'short', day: 'numeric' })) === 0) dueToday++;
      }
    });
    var chip = function (key, label, n) {
      return '<button type="button" data-txfilter="' + key + '" class="bad-chipbtn' + (filter === key ? ' is-on' : '') + '">' + label + ' <b>' + n + '</b></button>';
    };
    var rows = shown.map(function (c) {
      var donePct = c.plan ? Math.round((c.done / c.plan) * 100) : 0;
      return '<tr>' +
        '<td><div class="bad-2line"><strong>' + esc(c.p.first + ' ' + c.p.last) + '</strong><span>' + esc(c.p.phone) + ' · ' + esc(c.procs) + '</span></div></td>' +
        '<td>' + c.planDate + '</td><td>' + esc(c.doctor) + '</td>' +
        '<td><span class="bad-select">' + esc(c.owner) + ' ▾</span></td>' +
        '<td class="num">' + money(c.plan) + '</td>' +
        '<td class="num">' + money(c.done) + ' <span class="bad-hint">(' + donePct + '%)</span></td>' +
        '<td>' + statusPill(c.status) + '</td>' +
        '<td>' + (c.next || '—') + '</td>' +
        '<td class="' + (c.overdue ? 'overdue' : '') + '">' + (c.follow || '—') + '</td>' +
        '<td class="bad-actions"><button type="button" class="bad-btn bad-btn--ghost">Note</button><button type="button" class="bad-btn">Log</button></td>' +
      '</tr>';
    }).join('');
    return (
      '<div class="bad-statgrid">' +
        statCard({ label: 'Open pipeline', color: '#6366f1', value: money(openPipeline), sub: counts.all + ' active plans' }) +
        statCard({ label: 'Follow-ups due today', color: '#f59e0b', value: String(dueToday), sub: 'cadence 2d → 2wk → 2mo' }) +
        statCard({ label: 'Overdue follow-ups', color: '#ef4444', value: String(overdue), sub: 'past their follow-up date' }) +
        statCard({ label: 'Unassigned plans', color: '#f59e0b', value: String(unassigned), sub: 'need an owner' }) +
      '</div>' +
      '<div class="bad-card" style="margin-top:14px">' +
        '<div class="bad-card__head"><strong>Coordinators</strong></div>' +
        '<table class="bad-table"><thead><tr><th>Owner</th><th class="num">Active plans</th><th class="num">Open $</th><th class="num">Due / overdue</th><th class="num">Completed $ %</th></tr></thead><tbody>' +
        '<tr><td>Casey R.</td><td class="num">3</td><td class="num">' + money(14700) + '</td><td class="num"><span class="red"><strong>1</strong></span> / 1</td><td class="num">41%</td></tr>' +
        '<tr><td>Unassigned</td><td class="num">2</td><td class="num">' + money(10050) + '</td><td class="num">0 / 1</td><td class="num">0%</td></tr>' +
        '</tbody></table>' +
      '</div>' +
      '<div class="bad-card" style="margin-top:14px">' +
        '<div class="bad-chipbar">' +
          chip('all', 'All active', counts.all) +
          chip('sched', 'Scheduled for treatment', counts.sched) +
          chip('noappt', 'No appt scheduled', counts.noappt) +
          chip('missed', 'Missed appt', counts.missed) +
          chip('notint', 'Not interested', counts.notint) +
          chip('complete', 'Tx complete', counts.complete) +
        '</div>' +
        '<div class="bad-scroll"><table class="bad-table bad-table--tight"><thead><tr><th>Patient</th><th>Plan date</th><th>Doctor</th><th>Owner</th><th class="num">Plan $</th><th class="num">Done $</th><th>Status</th><th>Next appt</th><th>Follow-up</th><th>Actions</th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="10" class="bad-foot" style="padding:16px">No treatment plan cases in this view.</td></tr>') + '</tbody></table></div>' +
        '<div class="bad-card__foot"><span>' + shown.length + ' cases</span><span>Plan ' + money(planTotal) + ' · Open ' + money(openTotal) + '</span></div>' +
      '</div>'
    );
  }

  function tabProviders(s) {
    var unattributed = s.prodMtd - s.providers.reduce(function (a, p) { return a + p.production; }, 0);
    var cards = s.providers.map(function (p) {
      var rows =
        '<div class="bad-prow"><span>Production / hr</span><strong>' + money(p.perHour) + '</strong></div>' +
        '<div class="bad-prow"><span>Case acceptance <em class="bad-hint">(' + moneyShort(p.caseAccepted) + ' of ' + moneyShort(p.casePresented) + ')</em></span><strong>' + s.caseAccept.toFixed(1) + '%</strong></div>' +
        '<div class="bad-prow"><span>Same-day treatment</span><strong>' + money(p.sameDay) + '</strong></div>' +
        (p.hyg
          ? '<div class="bad-prow"><span>Reappointment rate</span><strong>' + p.reappt.toFixed(1) + '%</strong></div>' +
            '<div class="bad-prow"><span>Perio % of production</span><strong>' + p.perio.toFixed(1) + '%</strong></div>'
          : '');
      return '<div class="bad-card bad-pcard">' +
        '<div class="bad-pcard__head"><div><strong>' + esc(p.name) + '</strong> ' +
          '<span class="bad-board__tag">' + p.abbr + '</span>' + (p.hyg ? ' <span class="bad-board__tag">Hygiene</span>' : '') +
        '</div>' + sparkline(p.spark) + '</div>' +
        '<div class="bad-pcard__big">' + money(p.production) + ' ' + badge(p.band) + '</div>' +
        '<span class="bad-stat__sub">MTD production · 3-mo avg ' + money(p.avg3mo) + '</span>' +
        '<div class="bad-pcard__rows">' + rows + '</div>' +
      '</div>';
    }).join('');
    return (
      '<div class="bad-daily__head"><h4>Provider Scorecards — ' + s.monthYear + '</h4></div>' +
      '<p class="bad-foot" style="margin:-6px 0 12px">MTD vs each provider’s trailing 3-month average · practice total ' + money(s.prodMtd) + ' (' + money(Math.max(unattributed, 0)) + ' unattributed)</p>' +
      '<div class="bad-pgrid">' + cards + '</div>'
    );
  }

  function reviewRows(reviews, sort) {
    var sorted = reviews.slice();
    if (sort === 'newest') sorted.sort(function (a, b) { return b.date - a.date; });
    if (sort === 'oldest') sorted.sort(function (a, b) { return a.date - b.date; });
    if (sort === 'highest') sorted.sort(function (a, b) { return b.rating - a.rating; });
    if (sort === 'lowest') sorted.sort(function (a, b) { return a.rating - b.rating; });
    return sorted.map(function (r) {
      return '<div class="bad-review">' +
        '<span class="bad-review__avatar">' + esc(r.name.charAt(0)) + '</span>' +
        '<div class="bad-review__body">' +
          '<div class="bad-review__top"><strong>' + esc(r.name) + '</strong>' + starRow(r.rating) + '</div>' +
          '<span class="bad-hint">' + esc(r.rel) + '</span>' +
          '<p>' + esc(r.text) + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function tabReviews(s, rep) {
    var sort = state.ui.sort;
    var sortBtn = function (key, label) {
      return '<button type="button" data-sort="' + key + '" class="bad-chipbtn' + (sort === key ? ' is-on' : '') + '">' + label + '</button>';
    };
    var histRows = rep.history.map(function (h) {
      return '<tr><td>' + h.date + '</td><td class="num">' + h.avg.toFixed(1) + '</td><td>' + starRow(h.avg) + '</td></tr>';
    }).join('');
    return (
      '<div class="bad-profile">' +
        '<div><strong>Sunrise Dental Studio</strong><span class="bad-stat__sub">4820 Meridian Ave, Springfield — fictional practice</span>' +
          '<div class="bad-profile__rating">' + starRow(rep.rating, 'lg') + '<strong>' + rep.rating.toFixed(1) + '</strong>' +
          '<span class="bad-board__tag">' + rep.totalReviews + ' reviews</span>' +
          '<span class="bad-hint">⟳ Synced today</span></div>' +
        '</div>' +
        '<button type="button" class="bad-btn bad-btn--ghost">View on Google ↗</button>' +
      '</div>' +
      '<div class="bad-revgrid">' +
        '<div class="bad-card">' +
          '<div class="bad-card__head"><strong>Reviews</strong>' +
            '<span class="bad-chipbar" style="margin:0">' + sortBtn('newest', 'Newest') + sortBtn('oldest', 'Oldest') + sortBtn('highest', 'Highest Rating') + sortBtn('lowest', 'Lowest Rating') + '</span>' +
          '</div>' +
          '<div id="bad-reviews">' + reviewRows(rep.reviews, sort) + '</div>' +
        '</div>' +
        '<div class="bad-card">' +
          '<div class="bad-card__head"><strong>Rating History</strong></div>' +
          '<table class="bad-table"><thead><tr><th>Date</th><th class="num">Avg</th><th>Stars</th></tr></thead><tbody>' + histRows + '</tbody></table>' +
          '<p class="bad-foot" style="margin-top:8px">History builds as the nightly sync runs.</p>' +
        '</div>' +
      '</div>'
    );
  }

  /* ================= reputation tab renderers ================= */

  function repStat(label, value, trend, sub) {
    return '<div class="bad-card bad-repstat">' +
      '<span class="bad-stat__label">' + label + '</span>' +
      '<strong class="bad-repstat__value">' + value + '</strong>' +
      '<span class="bad-stat__sub">' + (trend ? '<b class="bad-trend">' + trend + '</b> ' : '') + sub + '</span>' +
    '</div>';
  }

  function moveGlyph(m) {
    if (m === null) return '<span class="bad-move bad-move--flat">—</span>';
    if (m > 0) return '<span class="bad-move bad-move--up">▲ +' + m + '</span>';
    if (m < 0) return '<span class="bad-move bad-move--down">▼ ' + m + '</span>';
    return '<span class="bad-move bad-move--flat">±0</span>';
  }

  /* Compact lucide-style stroke icons for the reputation chrome. */
  function ico(paths, size, extra) {
    return '<svg width="' + (size || 14) + '" height="' + (size || 14) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + paths + '</svg>';
  }
  var ICO = {
    spark: ico('<path d="M9.9 4.2 11 2l1.1 2.2a6 6 0 0 0 2.7 2.7L17 8l-2.2 1.1a6 6 0 0 0-2.7 2.7L11 14l-1.1-2.2a6 6 0 0 0-2.7-2.7L5 8l2.2-1.1a6 6 0 0 0 2.7-2.7z"/><path d="M18 14l.6 1.4L20 16l-1.4.6L18 18l-.6-1.4L16 16l1.4-.6z"/>', 13),
    target: ico('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>', 13),
    sliders: ico('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>', 15),
    search: ico('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 12),
    bell: ico('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>', 15),
    help: ico('<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.4-3 4"/><path d="M12 17.5h.01"/>', 15),
    star: ico('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/>', 14, ' style="color:#f5b53f"'),
    sync: ico('<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>', 12),
    award: ico('<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>', 13),
    gauge: ico('<path d="m12 14 4-4"/><path d="M3.3 12a9 9 0 1 1 17.4 0"/>', 13),
    wand: ico('<path d="m15 4 5 5L9 20l-5 1 1-5z"/><path d="m14 7 3 3"/><path d="M5 6V4M4 5h2M19 15v-2M18 14h2"/>', 15),
    arrowr: ico('<path d="M5 12h14M13 6l6 6-6 6"/>', 13),
    up: ico('<path d="M7 17 17 7M8 7h9v9"/>', 12),
    cal: ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', 14),
    calcheck: ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>', 15),
    quote: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7v5c0 3.3-2.7 6-6 6v-2c2.2 0 4-1.8 4-4H5V7h6zM21 7v5c0 3.3-2.7 6-6 6v-2c2.2 0 4-1.8 4-4h-4V7h6z"/></svg>',
    trend: ico('<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>', 15),
    cam: ico('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>', 14),
    img: ico('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>', 14),
    dl: ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>', 14),
    palette: ico('<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.7-1.7h2c3 0 5.5-2.5 5.5-5.6C22 6 17.5 2 12 2z"/>', 14),
    pen: ico('<path d="m15 4 5 5L9 20l-5 1 1-5z"/>', 12),
    chart: ico('<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>', 13)
  };

  /* Track Overview — Bridge Score tile on the soft pink gradient. */
  function scoreHeroHtml(rep) {
    var s = rep.score;
    var rows = s.parts.map(function (pt) {
      var dash = pt.v === null;
      return '<div class="bad-score__row' + (pt.low ? ' is-low' : '') + (dash ? ' is-dash' : '') + '">' +
        '<span>' + esc(pt.label) + '</span>' +
        '<span class="bad-score__track">' + (dash ? '' : '<i style="width:' + pt.v + '%"></i>') + '</span>' +
        '<b>' + (dash ? '—' : pt.v) + '</b>' +
      '</div>';
    }).join('');
    var dots = s.dots.map(function (d) { return '<span class="d" style="left:' + d + '%"></span>'; }).join('');
    return (
      '<div class="bad-score">' +
        '<div class="bad-score__head"><span class="bad-score__label">' + ICO.gauge + ' Bridge Score</span>' +
          '<span class="bad-score__exc"><i></i>' + esc(s.band) + '</span></div>' +
        '<div class="bad-score__body">' +
          '<div class="bad-score__big">' + s.value + '<em>of 100</em></div>' +
          '<div>' + rows + '</div>' +
        '</div>' +
        '<p class="bad-score__foot1">' + esc(s.foot1) + '</p>' +
        '<p class="bad-score__foot2"><b>' + esc(s.foot2) + '</b> · same public signals for everyone</p>' +
        '<div class="bad-dotstrip"><span class="ln"></span>' + dots +
          '<span class="d you" style="right:0"></span><span class="lbl">you</span></div>' +
        '<p class="bad-score__cap">Each dot is a nearby practice on the same 0–100 score — further right is stronger.</p>' +
      '</div>'
    );
  }

  /* Track Overview — the five-surface dotted scoreboard. */
  function platformsHtml(rep) {
    return '<div class="bad-plat">' + rep.platforms.map(function (pf) {
      return '<div class="bad-plat__tile">' +
        '<div class="bad-plat__head"><span class="bad-plat__name"><i class="bad-plat__dot" style="background:' + pf.dot + '"></i>' + esc(pf.name) + '</span>' +
          (pf.trend ? '<span class="bad-plat__trend">' + esc(pf.trend) + '</span>' : '') + '</div>' +
        '<div class="bad-plat__big' + (pf.rating === null ? ' is-dash' : '') + '">' +
          (pf.rating === null ? '—' : pf.rating.toFixed(1) + ' ' + starRow(pf.rating)) + '</div>' +
        '<div class="bad-plat__meta">' + pf.meta + '</div>' +
        '<span class="bad-plat__link' + (pf.dim ? ' bad-plat__link--dim' : '') + '">' + esc(pf.link) + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  function tabRepOverview(rep) {
    var m = rep.market;
    var rows = m.standings.slice(0, 3).map(function (st, i) {
      var g = st.gained30 === 0 ? '<span class="num flat">±0</span>' : '<span class="num pos">+' + st.gained30 + '</span>';
      return '<div class="rp-mrow' + (st.you ? ' is-you' : '') + '"><span>' + (i + 1) + '.</span>' +
        '<span>' + esc(st.name) + (st.you ? '<span class="tag">you</span>' : '') + '</span>' +
        '<span class="num">' + st.rating.toFixed(1) + '★</span>' +
        '<span class="num">' + st.reviews.toLocaleString('en-US') + '</span>' + g + '</div>';
    }).join('');
    return (
      scoreHeroHtml(rep) +
      '<div style="margin-top:14px">' + platformsHtml(rep) + '</div>' +
      '<div class="rp-brow">' +
        '<div class="rp-bc">' +
          '<div class="rp-bc__head"><span class="lb">' + ICO.award + ' Your Market</span><span class="r">last 28 days</span></div>' +
          '<div class="rp-mkt__rank">#' + m.rank + '<small>of ' + m.total + ' tracked practices, by Google rating</small></div>' +
          '<p class="rp-mkt__lead">You lead your market.</p>' +
          '<span class="rp-mkt__how">' + ICO.trend + ' How to protect #1 →</span>' +
          '<div style="margin-top:8px">' + rows + '</div>' +
          '<p class="rp-mkt__race">' + esc(m.race) + '</p>' +
        '</div>' +
        '<div class="rp-bc">' +
          '<div class="rp-bc__head"><span class="lb">' + ICO.chart + ' New Reviews</span><span class="r">' + ICO.up + '</span></div>' +
          '<p class="rp-nr__lede">296 in the last 12 months · 97% five-star</p>' +
          '<div class="rp-nr__chart"><span class="rp-nr__lbl">8 this month</span>' +
            '<svg viewBox="0 0 400 130" width="100%" style="display:block" aria-hidden="true">' +
              '<defs><linearGradient id="rpnr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef3a66" stop-opacity=".16"/><stop offset="1" stop-color="#ef3a66" stop-opacity="0"/></linearGradient></defs>' +
              '<path d="M0 34 L36 54 L72 44 L108 66 L144 50 L180 38 L216 58 L252 46 L288 52 L324 42 L360 62 L396 80 L396 130 L0 130 Z" fill="url(#rpnr)"/>' +
              '<path d="M0 34 L36 54 L72 44 L108 66 L144 50 L180 38 L216 58 L252 46 L288 52 L324 42 L360 62 L396 80" fill="none" stroke="#ef3a66" stroke-width="2.5" stroke-linejoin="round"/>' +
              '<circle cx="396" cy="80" r="4" fill="#ef3a66"/>' +
            '</svg></div>' +
          '<div class="rp-nr__axis"><span>Oct</span><span>Sep</span></div>' +
        '</div>' +
        '<div class="rp-bc">' +
          '<div class="rp-bc__head"><span class="lb">' + ICO.spark + ' Today in Brand Studio</span></div>' +
          '<p class="rp-st__title">Approve Tuesday’s post</p>' +
          '<p class="rp-st__sub">2 posts this week are ready for a quick look before they go out.</p>' +
          '<button type="button" class="rp-st__btn">Review &amp; approve ' + ICO.arrowr + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function tabVisibility(rep) {
    var rankRows = rep.ranks.map(function (r) {
      return '<tr><td><strong>' + esc(r.term) + '</strong></td>' +
        '<td class="num">' + (r.pos === null ? '—' : '#' + r.pos) + '</td>' +
        '<td class="num">' + moveGlyph(r.move) + '</td></tr>';
    }).join('');
    var compRows = rep.market.standings.map(function (s) {
      return '<tr' + (s.you ? ' class="shaded"' : '') + '><td><strong>' + esc(s.name) + '</strong>' + (s.you ? ' <span class="bad-board__tag">You</span>' : '') + '</td>' +
        '<td class="num">' + (s.rating === null ? '—' : s.rating.toFixed(1)) + '</td>' +
        '<td class="num">' + s.reviews + '</td>' +
        '<td class="num">' + (s.gained30 === null ? '—' : '+' + s.gained30) + '</td></tr>';
    }).join('');
    return (
      '<div class="bad-card">' +
        '<div class="bad-card__head"><strong>Local Pack Rankings</strong><span class="bad-strip__meta">your tracked searches · checked daily</span></div>' +
        '<table class="bad-table"><thead><tr><th>Search</th><th class="num">Position</th><th class="num">7-day change</th></tr></thead><tbody>' + rankRows + '</tbody></table>' +
        '<p class="bad-foot" style="margin-top:8px">“—” means not enough ranking history yet — never shown as zero.</p>' +
      '</div>' +
      '<div class="bad-card" style="margin-top:14px">' +
        '<div class="bad-card__head"><strong>Competitor Momentum</strong><span class="bad-strip__meta">last 30 days</span></div>' +
        '<table class="bad-table"><thead><tr><th>Practice</th><th class="num">Rating</th><th class="num">Reviews</th><th class="num">Gained (30d)</th></tr></thead><tbody>' + compRows + '</tbody></table>' +
        '<p class="bad-foot" style="margin-top:8px">Movement comes from stored snapshots of public Google data — no invented estimates, no claims about competitors’ patients.</p>' +
      '</div>' +
      '<div class="bad-repgrid">' +
        '<div class="bad-card"><div class="bad-card__head"><strong>Review Velocity</strong><span class="bad-strip__meta">per week, last 8 weeks</span></div>' +
          barChart(rep.velocity, null, '#6366f1', 110) +
        '</div>' +
        '<div class="bad-card"><div class="bad-card__head"><strong>Rating Distribution</strong></div>' + ratingDistHtml(rep) + '</div>' +
      '</div>'
    );
  }

  function ratingDistHtml(rep) {
    var maxDist = Math.max.apply(null, rep.distribution);
    return rep.distribution.map(function (n, i) {
      var starsN = 5 - i;
      var color = starsN >= 4 ? '#10b981' : starsN === 3 ? '#eab308' : '#ef4444';
      return '<div class="bad-dist"><span>' + starsN + ' star' + (starsN > 1 ? 's' : '') + '</span>' +
        '<span class="bad-dist__track"><i style="width:' + ((n / maxDist) * 100).toFixed(1) + '%;background:' + color + '"></i></span>' +
        '<b>' + n + '</b></div>';
    }).join('');
  }

  /* ── Create: Brand Studio landing — the real dark calm screen. ── */
  function tabStudio(rep) {
    var sugs = rep.studio.suggestions.map(function (s) {
      return '<button type="button" class="bad-sug__card' + (s.hi ? ' is-hi' : '') + '">' +
        '<span class="bad-sug__top">' + ICO[s.icon] + '<span class="bad-sug__arrow">' + ICO.up + '</span></span>' +
        '<strong>' + esc(s.label) + '</strong>' +
        '<span class="bad-sug__hint">' + esc(s.hint) + '</span>' +
      '</button>';
    }).join('');
    var pills = rep.studio.pills.map(function (pl) {
      return '<span>' + ICO[pl.icon] + esc(pl.label) + '</span>';
    }).join('');
    return (
      '<div class="bad-studio">' +
        '<h4 class="bad-studio__q">What should we post today?</h4>' +
        '<button type="button" class="bad-askbar">' +
          '<span class="bad-askbar__wand">' + ICO.wand + '</span>' +
          '<span class="bad-askbar__ph">A whitening special… a team shout-out… anything</span>' +
          '<span class="bad-askbar__go">Create ' + ICO.arrowr + '</span>' +
        '</button>' +
        '<div class="bad-sug__wrap">' +
          '<span class="bad-stat__label">Suggested for you</span>' +
          '<div class="bad-sug">' + sugs + '</div>' +
        '</div>' +
        '<div class="bad-studio__pills">' + pills + '</div>' +
        '<p class="bad-studio__week">' + esc(rep.studio.weekLine) + '</p>' +
      '</div>' +
      '<div class="rp-drafts">' +
        '<div class="lb">Drafts</div>' +
        '<p class="sub">Posts you started. Nothing here is on the calendar or going anywhere until you approve it.</p>' +
        '<div class="rp-drow"><span class="thumb"></span>' +
          '<span class="t"><b>Casey and Jordan never cease to amaze. Congratulations on five years!</b><span>edited 33 minutes ago</span></span>' +
          '<button type="button" class="resume">' + ICO.pen + ' Resume</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── Create: Content Calendar — pre-filled week; approve, adjust, done. ── */
  function tabCalendar(rep) {
    var STATUS = {
      published: '<span class="bad-status bad-status--emerald">Published</span>',
      scheduled: '<span class="bad-status bad-status--blue">Scheduled</span>',
      draft: '<span class="bad-status bad-status--amberline">Awaiting OK</span>'
    };
    var days = rep.calendar.map(function (d) {
      return '<div class="bad-calday' + (d.status === 'draft' ? ' is-attn' : '') + '">' +
        '<div class="bad-calday__head"><strong>' + d.day + '</strong>' + STATUS[d.status] + '</div>' +
        '<p class="bad-calday__title">' + esc(d.title) + '</p>' +
        '<div class="bad-calday__ch">' + d.channels.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>' +
        (d.status === 'draft'
          ? '<button type="button" class="bad-btn" style="margin-top:8px">Approve →</button>'
          : d.perf
            ? '<p class="bad-hint" style="margin-top:8px">' + esc(d.perf) + '</p>'
            : '<p class="bad-hint" style="margin-top:8px">publishes automatically</p>') +
      '</div>';
    }).join('');
    return (
      '<div class="bad-card" style="margin-bottom:12px; padding-bottom:6px">' +
        '<div class="bad-card__head" style="margin-bottom:4px"><strong>This week</strong><span class="bad-strip__meta">posts publish themselves to your connected channels</span></div>' +
        '<p class="bad-foot" style="margin-bottom:10px">Bridge pre-fills the calendar in your brand — you approve, adjust, or just let it run. One draft is waiting on you.</p>' +
      '</div>' +
      '<div class="bad-cal">' + days + '</div>' +
      '<p class="bad-foot" style="margin-top:10px">Last week: 3 posts · 61 likes · 9 comments — and the comment inbox pulls replies from every channel into one place.</p>'
    );
  }

  /* ── Create: Brand Kit — identity stored once, used everywhere. ── */
  function tabBrandKit(rep) {
    var conns = rep.brand.connections.map(function (c) {
      return '<div class="bad-conn__row"><span>' + esc(c.name) + '</span>' +
        (c.on ? '<span class="bad-status bad-status--green">Connected</span>' : '<button type="button" class="bad-btn bad-btn--ghost">Connect</button>') +
      '</div>';
    }).join('');
    var chip = function (t, tone) { return '<span class="bad-theme bad-theme--' + tone + '">' + esc(t) + '</span>'; };
    return (
      '<div class="bad-repgrid" style="margin-top:0">' +
        '<div class="bad-card">' +
          '<div class="bad-card__head"><strong>Your Brand</strong><span class="bad-strip__meta">stored once, used in every post</span></div>' +
          '<span class="bad-stat__label" style="display:block;margin-bottom:7px">Colors</span>' +
          '<div class="bad-swatches">' + rep.brand.colors.map(function (cc) { return '<i style="background:' + cc + '"></i>'; }).join('') + '</div>' +
          '<span class="bad-stat__label" style="display:block;margin:14px 0 7px">Fonts</span>' +
          '<p class="bad-fb__text" style="margin:0">' + esc(rep.brand.fonts) + '</p>' +
          '<span class="bad-stat__label" style="display:block;margin:14px 0 7px">Voice — always</span>' +
          '<div class="bad-themes">' + rep.brand.voice.map(function (v) { return chip(v, 'pos'); }).join('') + '</div>' +
          '<span class="bad-stat__label" style="display:block;margin:14px 0 7px">Never</span>' +
          '<div class="bad-themes">' + rep.brand.never.map(function (v) { return chip(v, 'neg'); }).join('') + '</div>' +
        '</div>' +
        '<div class="bad-card">' +
          '<div class="bad-card__head"><strong>Connections</strong><span class="bad-strip__meta">where your posts go</span></div>' +
          conns +
          '<p class="bad-foot" style="margin-top:10px">A guided wizard connects each platform with a live test — no developer required.</p>' +
        '</div>' +
      '</div>'
    );
  }

  function tabRequests(rep) {
    var tab = state.ui.reqtab;
    var tb = function (key, label) {
      return '<button type="button" data-reqtab="' + key + '" class="bad-chipbtn' + (tab === key ? ' is-on' : '') + '">' + label + '</button>';
    };
    var body = '';
    if (tab === 'pending') {
      var rows = rep.requests.pending.map(function (r) {
        return '<tr><td><strong>' + esc(r.name) + '</strong></td><td>' + esc(r.type) + '</td><td>' + esc(r.time) + '</td>' +
          '<td class="bad-hint">' + esc(r.countdown) + '</td><td><button type="button" class="bad-btn bad-btn--ghost">Skip ▾</button></td></tr>';
      }).join('');
      body = '<div class="bad-card__head" style="margin-top:12px"><span class="bad-strip__meta">' + rep.requests.pending.length + ' pending requests</span>' +
        '<button type="button" class="bad-btn bad-btn--danger">⚠ Skip All Pending</button></div>' +
        '<table class="bad-table"><thead><tr><th>Patient Name</th><th>Appointment Type</th><th>Appointment Time</th><th>Countdown</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table>';
    } else if (tab === 'sent') {
      var STATUS_CLS = { 'Sent': 'blue', 'Delivered': 'green', 'Review Posted': 'emerald', 'Failed': 'red' };
      var srows = rep.requests.sent.map(function (r) {
        return '<tr><td><strong>' + esc(r.name) + '</strong></td><td><span class="bad-board__tag">' + r.channel + '</span></td><td>' + r.date + '</td>' +
          '<td><span class="bad-status bad-status--' + STATUS_CLS[r.status] + '">' + r.status + '</span></td></tr>';
      }).join('');
      body = '<table class="bad-table" style="margin-top:12px"><thead><tr><th>Patient Name</th><th>Channel</th><th>Sent Date</th><th>Status</th></tr></thead><tbody>' + srows + '</tbody></table>';
    } else {
      var erows = rep.requests.excluded.map(function (r) {
        return '<tr><td><strong>' + esc(r.name) + '</strong></td><td>' + r.date + '</td><td>' + esc(r.reason) + '</td><td>' + esc(r.by) + '</td>' +
          '<td><span class="red">Remove</span></td></tr>';
      }).join('');
      body = '<input class="bad-input" style="margin-top:12px" placeholder="Search by patient name..." readonly>' +
        '<table class="bad-table" style="margin-top:10px"><thead><tr><th>Patient Name</th><th>Excluded Date</th><th>Reason</th><th>Excluded By</th><th>Actions</th></tr></thead><tbody>' + erows + '</tbody></table>';
    }
    return (
      '<div class="bad-strip" style="margin-bottom:12px">' +
        '<span class="bad-strip__label">Automatic</span>' +
        '<span>Requests go out the moment the appointment <strong>ends</strong> — while the visit is still fresh.</span>' +
        '<button type="button" class="bad-btn bad-btn--ghost" style="margin-left:auto">📱 Text a patient</button>' +
      '</div>' +
      '<div class="bad-chipbar">' + tb('pending', '🕐 Pending') + tb('sent', '✈ Sent') + tb('excluded', '🚫 Excluded') + '</div>' +
      '<div class="bad-card" style="margin-top:12px">' + body + '</div>'
    );
  }

  function tabInbox(rep) {
    var queue = rep.drafts.slice().sort(function (a, b) { return a.rating - b.rating; });
    var cards = queue.map(function (d, i) {
      var open = state.ui.draftOpen === i;
      var badgeHtml = d.status === 'needs'
        ? '<span class="bad-status bad-status--amberline">Needs Response</span>'
        : '<span class="bad-status bad-status--grey">Draft Ready</span>';
      var expanded = !open ? '' :
        '<div class="bad-draft__body">' +
          '<div class="bad-draft__orig">' +
            '<span class="bad-review__avatar">' + esc(d.name.charAt(0)) + '</span>' +
            '<div><strong>' + esc(d.name) + '</strong> ' + starRow(d.rating) + ' <span class="bad-hint">' + d.date + '</span>' +
            '<p>' + esc(d.text) + '</p></div>' +
          '</div>' +
          '<span class="bad-stat__label" style="display:block;margin:12px 0 6px">AI draft — every review arrives with one</span>' +
          '<textarea class="bad-textarea" rows="4">' + esc(d.draft) + '</textarea>' +
          '<div class="bad-draft__seo"><span class="bad-stat__label" style="display:block;margin-bottom:4px">Guided edit</span>' +
            'Edits are checked against a HIPAA guardrail before posting — no treatment details, no confirming the reviewer is a patient.</div>' +
          '<div class="bad-draft__actions">' +
            '<button type="button" class="bad-btn">Post reply</button>' +
            '<button type="button" class="bad-btn bad-btn--ghost">✨ Regenerate</button>' +
            '<button type="button" class="bad-btn bad-btn--ghost">Copy to Clipboard</button>' +
            '<button type="button" class="bad-btn bad-btn--ghost">Open in Google ↗</button>' +
            '<button type="button" class="bad-btn bad-btn--ghost">✓ Mark as Responded</button>' +
          '</div>' +
        '</div>';
      return '<div class="bad-card bad-draft' + (open ? ' is-open' : '') + '">' +
        '<button type="button" class="bad-draft__row" data-draft="' + i + '">' +
          '<span class="bad-draft__chev">' + (open ? '▾' : '▸') + '</span>' + starRow(d.rating) +
          '<span class="bad-2line" style="text-align:left"><strong>' + esc(d.name) + '</strong><span>' + d.date + '</span></span>' +
          badgeHtml +
        '</button>' + expanded +
      '</div>';
    }).join('');
    return (
      '<div class="bad-daily__head"><h4>Review Inbox</h4><span class="bad-strip__meta">' + queue.length + ' unanswered · negatives and oldest first</span></div>' + cards +
      '<p class="bad-foot" style="margin-top:10px">Every review arrives with an AI draft. Edit → post (or copy) → mark responded. A human approves every reply.</p>'
    );
  }

  var ANALYTICS_TABS = [
    { key: 'dashboard', label: 'Dashboard', title: 'Analytics Dashboard', sub: 'Monitor your practice performance and key metrics', render: tabDashboard },
    { key: 'monthly', label: 'Monthly Trends', title: 'Monthly Trends', sub: 'Track monthly performance and year-over-year growth', render: tabMonthly },
    { key: 'patients', label: 'Patient Follow-Ups', title: 'Patient Follow-Ups', sub: 'Every patient list behind your numbers — unscheduled, broken, new, unaccepted, unverified', render: tabPatients },
    { key: 'txplans', label: 'Treatment Plans', title: 'Treatment Plan Tracker', sub: 'Every presented treatment plan with an owner, a status, and a follow-up date', render: tabTxPlans },
    { key: 'providers', label: 'Providers', title: 'Provider Scorecards', sub: 'Per-provider production, case acceptance, and hygiene metrics', render: tabProviders },
    { key: 'reviews', label: 'Google Reviews', title: 'Google Reviews', sub: 'Recent reviews and daily rating history from your Google Business Profile', render: null }
  ];
  var REP_TRACK_TABS = [
    { key: 'overview', label: 'Overview', title: "How's your reputation?", sub: 'Your Bridge Score, your scoreboard, and where you stand nearby', render: tabRepOverview },
    { key: 'inbox', label: 'Reviews', title: 'Every review, answered.', sub: 'Negative and oldest unanswered first — draft, edit, and respond', render: tabInbox },
    { key: 'visibility', label: 'Local Visibility', title: 'How patients find you.', sub: 'Local-pack rankings, competitor momentum, and rating trends', render: tabVisibility },
    { key: 'requests', label: 'Review Requests', title: 'Ask for the next review.', sub: 'Automated asks the moment the appointment ends', render: tabRequests }
  ];
  var REP_CREATE_TABS = [
    { key: 'studio', label: 'Studio', title: 'Brand Studio', sub: 'Branded content creation — today’s one thing, front and center', render: tabStudio },
    { key: 'calendar', label: 'Calendar', title: 'Content Calendar', sub: 'Your pre-filled posting calendar — approve, adjust, done', render: tabCalendar },
    { key: 'brand', label: 'Brand Kit', title: 'Brand Kit', sub: 'Logo, colors, fonts, and voice — stored once, used everywhere', render: tabBrandKit }
  ];

  function currentTabs() {
    if (state.product === 'analytics') return ANALYTICS_TABS;
    return state.repMode === 'track' ? REP_TRACK_TABS : REP_CREATE_TABS;
  }
  function tabStateKey() {
    if (state.product === 'analytics') return 'analytics';
    return state.repMode === 'track' ? 'repTrack' : 'repCreate';
  }
  function currentTab() {
    var key = state.tabs[tabStateKey()];
    var tabs = currentTabs();
    for (var i = 0; i < tabs.length; i++) if (tabs[i].key === key) return tabs[i];
    return tabs[0];
  }

  function renderView() {
    var tab = currentTab();
    var s = state.built, rep = state.rep;
    if (tab.key === 'reviews') return tabReviews(s, rep);
    return state.product === 'analytics' ? tab.render(s) : tab.render(rep);
  }

  function renderFrame() {
    var tab = currentTab();
    var prodBtn = function (key, icon, label) {
      return '<button type="button" data-product="' + key + '"' + (state.product === key ? ' class="is-on"' : '') +
        ' aria-label="' + label + '" title="' + label + '"><span>' + icon + '</span><b>' + label + '</b></button>';
    };
    var sidenav =
      '<aside class="bad-sidenav">' +
        '<span class="bad-sidenav__logo">B</span>' +
        prodBtn('analytics', '📊', 'Analytics') +
        prodBtn('reputation', '⭐', 'Reputation') +
      '</aside>';

    /* ── Reputation: the real product chrome — Create/Track bar, calm
       titles, pill tabs; Track pages light, Create pages dark. ── */
    if (state.product === 'reputation') {
      var pills = currentTabs().map(function (t) {
        return '<button type="button" data-tab="' + t.key + '"' + (t.key === tab.key ? ' class="is-on"' : '') + '>' + t.label +
          (t.key === 'inbox' ? ' <span class="rp-badge">3</span>' : '') + '</button>';
      }).join('');
      var seg = '<div class="rp-seg" role="group" aria-label="Reputation workspace">' +
        '<button type="button" data-repmode="create"' + (state.repMode === 'create' ? ' class="is-on"' : '') + '>' + ICO.spark + 'Create</button>' +
        '<button type="button" data-repmode="track"' + (state.repMode === 'track' ? ' class="is-on"' : '') + '>' + ICO.target + 'Track</button>' +
      '</div>';
      var bar = '<div class="rp-bar">' + seg + '<span class="rp-bar__grow"></span>' +
        '<span class="rp-bar__ic">' + ICO.sliders + '</span>' +
        '<span class="rp-search">' + ICO.search + 'Search...<span class="kbd">⌘K</span></span>' +
        '<span class="rp-bar__ic">' + ICO.bell + '</span><span class="rp-bar__ic">' + ICO.help + '</span>' +
        '<span class="rp-ava">AS</span><span class="rp-uname">Avery Stone</span>' +
      '</div>';
      var head;
      if (state.repMode === 'track') {
        var sub = tab.key === 'overview'
          ? '<div class="rp-sub">' + ICO.star + '<b>Sunrise Dental Studio</b> · reviews synced 1 min ago · ' + ICO.sync + ' sync</div>'
          : '';
        var chips = tab.key === 'overview'
          ? '<div class="rp-chips"><span class="rp-chip-wins">' + ICO.award + '9 wins</span><span class="rp-chip-plain">LOCAL TOP 3 <b>5/5</b></span></div>'
          : '';
        head = '<div class="rp-head"><div><span class="rp-eyebrow">Reputation</span><h4 class="rp-title">' + tab.title + '</h4>' + sub + '</div>' +
          '<div><div class="rp-tabs">' + pills + '</div>' + chips + '</div></div>';
      } else {
        head = '<div class="rp-head"><div><span class="rp-eyebrow">Brand Studio</span>' +
          (tab.key !== 'studio' ? '<h4 class="rp-title">' + tab.title + '</h4>' : '') +
          '</div><div class="rp-tabs">' + pills + '</div></div>';
      }
      root.innerHTML =
        '<div class="bad bad-frame">' + sidenav +
          '<div class="bad-bodycol">' + bar +
            '<div class="rp-body' + (state.repMode === 'create' ? ' rp-body--dark' : '') + '">' + head + renderView() + '</div>' +
          '</div>' +
        '</div>';
      return;
    }

    /* ── Analytics: unchanged frame ── */
    var tabsHtml = currentTabs().map(function (t) {
      return '<button type="button" data-tab="' + t.key + '"' + (t.key === tab.key ? ' class="is-on" aria-current="page"' : '') + '>' + t.label + '</button>';
    }).join('');
    var scenarioToggle =
      '<div class="bad__toggle" role="group" aria-label="Demo scenario">' +
        Object.keys(TUNING).map(function (k) {
          return '<button type="button" data-scenario="' + k + '"' +
            (k === state.scenario ? ' class="is-on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + TUNING[k].label + '</button>';
        }).join('') +
      '</div>';

    root.innerHTML =
      '<div class="bad bad-frame">' + sidenav +
        '<div class="bad-bodycol">' +
          '<div class="bad-apphead">' +
            '<div><strong>' + tab.title + '</strong><span>' + tab.sub + '</span></div>' + scenarioToggle +
          '</div>' +
          '<div class="bad-tabstrip" role="tablist">' + tabsHtml + '</div>' +
          '<div class="bad-viewport">' + renderView() + '</div>' +
        '</div>' +
      '</div>';

    if (tab.key === 'dashboard' && state.animated) animateDash();
  }

  /* ================= animation ================= */

  function animateDash() {
    /* gauge fills sweep in */
    root.querySelectorAll('.bad-tile__fill').forEach(function (el) {
      var pct = Math.min(parseInt(el.getAttribute('data-fill'), 10), 100);
      if (REDUCED) {
        el.style.transition = 'none';
        el.style.width = pct + '%';
        return;
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { el.style.width = pct + '%'; });
      });
    });
    /* the hero forecast counts up */
    root.querySelectorAll('[data-countup]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-countup'), 10);
      if (REDUCED) { el.textContent = money(target); return; }
      var t0 = null, DUR = 900;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / DUR, 1);
        el.textContent = money(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ================= state + events ================= */

  var params = (function () {
    try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; }
  })();

  var state = {
    product: params.get('product') === 'reputation' ? 'reputation' : 'analytics',
    /* The app opens Reputation on the Create workspace (Studio). */
    repMode: 'create',
    tabs: { analytics: 'dashboard', repTrack: 'overview', repCreate: 'studio' },
    scenario: params.get('scenario') === 'record' ? 'record' : 'steady',
    selectedDate: toIso(new Date()),
    built: null,
    rep: null,
    animated: false,
    ui: { yoy: true, sort: 'newest', txfilter: 'all', fuq: 'due', reqtab: 'pending', draftOpen: 0, respondSel: 0, handled: {}, checked: {}, copied: null }
  };
  var NAV_RANGE = 7;

  function addDays(iso, delta) {
    var d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    return toIso(d);
  }
  function rebuild() {
    state.built = build(state.scenario, new Date());
    state.rep = buildReputation(new Date());
  }
  function rerenderViewOnly() {
    var vp = root.querySelector('.bad-viewport');
    if (vp) { vp.innerHTML = renderView(); return; }
    renderFrame();
  }

  root.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var v;
    if ((v = btn.getAttribute('data-product')) !== null) {
      if (v !== state.product) { state.product = v; renderFrame(); }
    } else if ((v = btn.getAttribute('data-tab')) !== null) {
      if (v !== state.tabs[tabStateKey()]) { state.tabs[tabStateKey()] = v; renderFrame(); }
    } else if ((v = btn.getAttribute('data-repmode')) !== null) {
      if (v !== state.repMode) { state.repMode = v; renderFrame(); }
    } else if ((v = btn.getAttribute('data-scenario')) !== null) {
      if (v !== state.scenario) {
        state.scenario = v;
        state.selectedDate = toIso(new Date());
        rebuild();
        renderFrame();
      }
    } else if ((v = btn.getAttribute('data-day')) !== null) {
      var delta = parseInt(v, 10);
      var todayIso = toIso(new Date());
      var next = delta === 0 ? todayIso : addDays(state.selectedDate, delta);
      if (next < addDays(todayIso, -NAV_RANGE) || next > addDays(todayIso, NAV_RANGE)) return;
      state.selectedDate = next;
      var snap = document.getElementById('bad-snap');
      if (snap) snap.innerHTML = snapshotHtml(state.built);
    } else if ((v = btn.getAttribute('data-sort')) !== null) {
      state.ui.sort = v; rerenderViewOnly();
    } else if ((v = btn.getAttribute('data-txfilter')) !== null) {
      state.ui.txfilter = v; rerenderViewOnly();
    } else if ((v = btn.getAttribute('data-fuq')) !== null) {
      state.ui.fuq = v; rerenderViewOnly();
    } else if ((v = btn.getAttribute('data-reqtab')) !== null) {
      state.ui.reqtab = v; rerenderViewOnly();
    } else if ((v = btn.getAttribute('data-draft')) !== null) {
      var idx = parseInt(v, 10);
      state.ui.draftOpen = state.ui.draftOpen === idx ? -1 : idx;
      rerenderViewOnly();
    } else if ((v = btn.getAttribute('data-qsel')) !== null) {
      state.ui.respondSel = parseInt(v, 10);
      rerenderViewOnly();
    } else if ((v = btn.getAttribute('data-check')) !== null) {
      var ci = parseInt(v, 10);
      state.ui.checked[ci] = !state.ui.checked[ci];
      rerenderViewOnly();
    } else if ((v = btn.getAttribute('data-handle')) !== null) {
      state.ui.handled[parseInt(v, 10)] = true; rerenderViewOnly();
    } else if ((v = btn.getAttribute('data-copy')) !== null) {
      state.ui.copied = v; rerenderViewOnly();
      setTimeout(function () { if (state.ui.copied === v) { state.ui.copied = null; rerenderViewOnly(); } }, 2000);
    }
  });

  root.addEventListener('change', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-yoy')) {
      state.ui.yoy = e.target.checked;
      rerenderViewOnly();
    }
  });

  /* Marketing sections can deep-link into a demo product:
     <a href="#demo" data-demo-product="reputation" data-demo-mode="track"> */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-demo-product]');
    if (!a) return;
    var prod = a.getAttribute('data-demo-product');
    if (prod === 'analytics' || prod === 'reputation') {
      state.product = prod;
      var mode = a.getAttribute('data-demo-mode');
      if (mode === 'track' || mode === 'create') state.repMode = mode;
      renderFrame();
    }
  });

  /* first render: paint immediately, animate gauges when scrolled into view */
  rebuild();
  renderFrame();
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !state.animated) {
          state.animated = true;
          animateDash();
          io.disconnect();
        }
      });
    }, { threshold: 0.2 });
    io.observe(root);
  } else {
    state.animated = true;
    animateDash();
  }
})();
