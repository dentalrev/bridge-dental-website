/* Bridge Dental — shared interactions */
(function () {
  // mobile nav
  document.addEventListener('click', function (e) {
    var burger = e.target.closest('.nav__burger');
    if (burger) {
      var links = burger.closest('.nav__inner').querySelector('.nav__links');
      if (links) links.classList.toggle('open');
    }
  });

  // scroll reveal
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  function bindReveal() { document.querySelectorAll('.reveal:not(.in)').forEach(function (el) { io.observe(el); }); }
  document.addEventListener('DOMContentLoaded', bindReveal);
  bindReveal();

  // pricing monthly/yearly toggle
  document.addEventListener('click', function (e) {
    var sw = e.target.closest('.switch');
    if (!sw) return;
    var yearly = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', yearly ? 'true' : 'false');
    document.querySelectorAll('[data-monthly]').forEach(function (el) {
      el.textContent = yearly ? el.getAttribute('data-yearly') : el.getAttribute('data-monthly');
    });
    var save = document.querySelector('[data-save-note]');
    if (save) save.style.visibility = yearly ? 'visible' : 'hidden';
  });

  // form submit — posts JSON to our own /api/lead function, which relays the
  // lead to admin@bridgedental.ai via Resend.
  var FORM_ENDPOINT = '/api/lead';
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-demo-form]');
    if (!form) return;
    e.preventDefault();
    var status = form.querySelector('.form-status');
    var required = form.querySelectorAll('[required]');
    var ok = true;
    required.forEach(function (f) {
      if (!f.value.trim()) { ok = false; f.style.borderColor = '#ef3a66'; }
      else { f.style.borderColor = ''; }
    });
    if (status) status.classList.remove('ok', 'err');
    if (!ok) {
      if (status) {
        status.textContent = 'Please complete the required fields so we can follow up.';
        status.classList.add('err', 'show');
      }
      return;
    }
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; }

    var payload = {};
    new FormData(form).forEach(function (value, key) {
      if (typeof value !== 'string') return;
      payload[key] = value;
    });
    payload.form_subject = form.getAttribute('data-subject') || 'New Bridge Dental submission';
    payload.source_page = location.pathname;

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        // Surface real failures through the existing error UI instead of
        // showing a success message for a lead that never got sent.
        if (!r.ok || body.ok === false) throw new Error('lead relay failed');
        return body;
      });
    }).then(function () {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      if (status) {
        status.textContent = form.getAttribute('data-success') ||
          'Thanks — your request is in. The Bridge Dental team will reach out about early access.';
        status.classList.remove('err');
        status.classList.add('ok', 'show');
      }
      form.reset();
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      if (status) {
        status.textContent = 'Sorry — something went wrong sending that. Please email admin@bridgedental.ai directly and we\u2019ll follow up.';
        status.classList.remove('ok');
        status.classList.add('err', 'show');
      }
    });
  });
})();
