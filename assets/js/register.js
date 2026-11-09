/* Tumbuloka - logika halaman pendaftaran */
(function () {
  'use strict';
  Store.init();
  if (Store.getSession()) { location.replace('app.html'); return; }

  var $ = function (s) { return document.querySelector(s); };
  var form = $('#regForm');
  var alertBox = $('#regAlert');
  var passEl = $('#password');
  var confirmEl = $('#confirm');

  function checkConfirm() {
    // Tandai tidak valid bila konfirmasi berbeda dengan kata sandi
    confirmEl.setCustomValidity(confirmEl.value === passEl.value ? '' : 'beda');
  }
  passEl.addEventListener('input', checkConfirm);
  confirmEl.addEventListener('input', checkConfirm);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    alertBox.classList.add('d-none');
    checkConfirm();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    var res = Store.addUser({
      name: $('#name').value,
      email: $('#email').value,
      password: passEl.value,
      role: 'pengguna'
    });
    if (!res.ok) {
      alertBox.textContent = res.error;
      alertBox.classList.remove('d-none');
      return;
    }
    var user = Store.findUser($('#email').value);
    Store.setSession(user, false);
    var btn = $('#regBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Membuat akun...';
    setTimeout(function () { location.href = 'app.html'; }, 400);
  });
})();
