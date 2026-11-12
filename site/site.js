// Postacı tanıtım sitesi: menü, fiyat dönemi ve kayıt formu.
(function () {
  // Telefon menüsü
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Açılır menüler (dokunmatik ve klavye için tıklamayla da açılır)
  var dropdowns = document.querySelectorAll('.dd');
  dropdowns.forEach(function (dd) {
    var btn = dd.querySelector('.dd-btn');
    btn.addEventListener('click', function () {
      var open = !dd.classList.contains('is-open');
      dropdowns.forEach(function (d) {
        d.classList.remove('is-open');
        d.querySelector('.dd-btn').setAttribute('aria-expanded', 'false');
      });
      dd.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('.dd-btn')) return;
    dropdowns.forEach(function (d) {
      d.classList.remove('is-open');
      d.querySelector('.dd-btn').setAttribute('aria-expanded', 'false');
    });
  });

  // Aylık / yıllık fiyat
  var periodButtons = document.querySelectorAll('.toggle button');
  periodButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var period = b.getAttribute('data-period');
      periodButtons.forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', String(on));
      });
      document.querySelectorAll('.price [data-month]').forEach(function (el) {
        el.textContent = el.getAttribute('data-' + period);
      });
    });
  });

  // Kayıt formu. Kayıtların gideceği adres formdaki data-endpoint özelliğinden
  // okunur; boşsa form gönderilmez ve ziyaretçiye açıkça söylenir.
  var form = document.getElementById('join-form');
  var msg = document.getElementById('form-msg');
  var heroForm = document.getElementById('hero-form');

  function show(text, kind) {
    msg.textContent = text;
    msg.className = 'form-msg ' + (kind || '');
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  // Üstteki e-posta kutusu: adresi aşağıdaki forma taşır
  if (heroForm && form) {
    heroForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = document.getElementById('hero-email').value.trim();
      if (v) form.email.value = v;
      document.getElementById('basla').scrollIntoView();
      (form.agency.value ? form.email : form.agency).focus({ preventScroll: true });
    });
  }

  if (!form || !msg) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var agency = form.agency.value.trim();
    var email = form.email.value.trim();

    if (!agency) { show('Ajans adını yazın.', 'err'); form.agency.focus(); return; }
    if (!validEmail(email)) { show('Geçerli bir e-posta adresi yazın.', 'err'); form.email.focus(); return; }

    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) {
      show('Kayıt şu an alınamıyor. Kısa süre sonra tekrar deneyin.', 'err');
      return;
    }

    var button = form.querySelector('button');
    button.disabled = true;
    show('Gönderiliyor…');

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agency: agency, email: email, clients: form.clients.value, note: form.note.value.trim() })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        show('Kaydınızı aldık. Giriş bilgileriniz e-posta adresinize gönderilecek.', 'ok');
      })
      .catch(function () {
        show('Kayıt gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.', 'err');
      })
      .then(function () { button.disabled = false; });
  });
})();
