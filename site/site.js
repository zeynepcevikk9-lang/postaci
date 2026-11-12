// Erken erişim formu. Kayıtların gideceği adres formdaki data-endpoint
// özelliğinden okunur; boşsa form gönderilmez ve ziyaretçiye açıkça söylenir.
(function () {
  var form = document.getElementById('join-form');
  var msg = document.getElementById('form-msg');
  if (!form || !msg) return;

  function show(text, kind) {
    msg.textContent = text;
    msg.className = 'form-msg ' + (kind || '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var agency = form.agency.value.trim();
    var email = form.email.value.trim();

    if (!agency) { show('Ajans adını yazın.', 'err'); form.agency.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { show('Geçerli bir e-posta adresi yazın.', 'err'); form.email.focus(); return; }

    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) {
      show('Kayıt formu henüz açılmadı. Kısa süre sonra tekrar deneyin.', 'err');
      return;
    }

    var button = form.querySelector('button');
    button.disabled = true;
    show('Gönderiliyor…');

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agency: agency, email: email, clients: form.clients.value })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        show('Listeye eklendiniz. Hesabınız açıldığında e-postayla haber vereceğiz.', 'ok');
      })
      .catch(function () {
        show('Kayıt gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.', 'err');
      })
      .then(function () { button.disabled = false; });
  });
})();
