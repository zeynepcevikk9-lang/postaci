// Postacı tanıtım sitesi: telefon menüsü, fiyat dönemi, panele giden bağlantılar.
(function () {
  // Panel adresi <html data-app-url="..."> özniteliğinden okunur.
  var appUrl = (document.documentElement.getAttribute('data-app-url') || '').replace(/\/+$/, '');
  var paths = { register: '/auth', login: '/auth/login' };
  document.querySelectorAll('a[data-app]').forEach(function (a) {
    var path = paths[a.getAttribute('data-app')];
    if (appUrl && path) {
      a.setAttribute('href', appUrl + path);
    }
  });

  // Telefon menüsü
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Fiyat dönemi: aylık / yıllık
  var periodButtons = document.querySelectorAll('.toggle button');
  periodButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var period = b.getAttribute('data-period');
      periodButtons.forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      document.querySelectorAll('.price [data-month]').forEach(function (el) {
        el.textContent = el.getAttribute('data-' + period);
      });
    });
  });

  var year = document.getElementById('year');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
})();
