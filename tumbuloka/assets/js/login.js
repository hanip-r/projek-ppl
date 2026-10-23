/* Tumbuloka - logika halaman login */
(function () {
  'use strict';
  Store.init();

  // Sudah login -> langsung ke aplikasi
  if (Store.getSession()) { location.replace('app.html'); return; }

  var role = 'pengguna';
  var $ = function (s) { return document.querySelector(s); };
  var form = $('#loginForm');
  var alertBox = $('#loginAlert');
  var emailEl = $('#email');
  var passEl = $('#password');

  var DEMO = {
    pengguna: { email: 'user@tumbuloka.com', pass: 'user123', title: 'Masuk ke Tumbuloka' },
    admin: { email: 'admin@tumbuloka.com', pass: 'admin123', title: 'Masuk sebagai Admin' }
  };

  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.classList.remove('d-none');
  }
  function hideAlert() { alertBox.classList.add('d-none'); }

  function renderDemo() {
    var d = DEMO[role];
    $('#loginTitle').textContent = d.title;
    $('#demoText').innerHTML =
      '<code>' + d.email + '</code> / <code>' + d.pass + '</code> ' +
      '<button type="button" id="fillDemo">Isi otomatis</button>';
    $('#fillDemo').addEventListener('click', function () {
      emailEl.value = d.email;
      passEl.value = d.pass;
      form.classList.remove('was-validated');
      hideAlert();
    });
  }

  // Tab Pengguna / Admin
  Array.prototype.forEach.call(document.querySelectorAll('.role-tabs button'), function (btn) {
    btn.addEventListener('click', function () {
      role = btn.getAttribute('data-role');
      Array.prototype.forEach.call(document.querySelectorAll('.role-tabs button'), function (b) {
        var on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      hideAlert();
      renderDemo();
    });
  });

  // Tampilkan / sembunyikan kata sandi
  $('#pwToggle').addEventListener('click', function () {
    var show = passEl.type === 'password';
    passEl.type = show ? 'text' : 'password';
    this.innerHTML = show ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    this.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  // Submit login
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAlert();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    var res = Store.login(emailEl.value, passEl.value, role);
    if (!res.ok) { showAlert(res.error); return; }

    Store.setSession(res.user, $('#remember').checked);
    var btn = $('#loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Masuk...';
    setTimeout(function () { location.href = 'app.html'; }, 350);
  });

  // Google (tidak tersedia tanpa server)
  $('#googleBtn').addEventListener('click', function () {
    showAlert('Login Google memerlukan server OAuth, sehingga tidak tersedia pada versi tanpa database ini. Gunakan email dan kata sandi.');
  });

  // Lupa kata sandi (simulasi)
  var forgotModal = new bootstrap.Modal($('#forgotModal'));
  $('#forgotLink').addEventListener('click', function (e) {
    e.preventDefault();
    $('#forgotForm').reset();
    $('#forgotForm').classList.remove('was-validated');
    $('#forgotMsg').classList.add('d-none');
    forgotModal.show();
  });
  $('#forgotForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    f.classList.add('was-validated');
    if (!f.checkValidity()) return;
    var msg = $('#forgotMsg');
    var u = Store.findUser($('#fEmail').value);
    msg.classList.remove('d-none', 'text-success', 'text-danger');
    if (!u) {
      msg.classList.add('text-danger');
      msg.textContent = 'Email tidak terdaftar.';
      return;
    }
    Store.updateUser(u.email, { password: $('#fPass').value });
    msg.classList.add('text-success');
    msg.textContent = 'Kata sandi berhasil diubah. Silakan masuk.';
    setTimeout(function () { forgotModal.hide(); }, 1100);
  });

  renderDemo();
})();
