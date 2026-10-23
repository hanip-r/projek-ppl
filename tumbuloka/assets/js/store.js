/* ==========================================================
   Tumbuloka - Penyimpanan data (tanpa database)
   Semua data disimpan di localStorage browser.
   CATATAN: untuk demo front-end saja. Kata sandi disimpan apa adanya
   di browser; aplikasi sungguhan wajib memakai server + hashing.
   ========================================================== */
(function (w) {
  'use strict';

  var KEY_USERS = 'tumbuloka_users';
  var KEY_SESSION = 'tumbuloka_session';
  var KEY_DATA = 'tumbuloka_data_';

  function read(k, fallback) {
    try {
      var v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  function uid(prefix) {
    return (prefix || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ---------- Data awal ---------- */
  function seedData() {
    var categories = [
      { id: 'c1', name: 'Sayuran', icon: '🥬' },
      { id: 'c2', name: 'Buah', icon: '🍎' },
      { id: 'c3', name: 'Tanaman Hias', icon: '🪴' },
      { id: 'c4', name: 'Rempah', icon: '🌿' },
      { id: 'c5', name: 'Bunga', icon: '🌸' }
    ];
    var plants = [
      { id: 'p1', name: 'Cabai', categoryId: 'c1', location: 'Kebun belakang', plantedAt: '2026-09-12', condition: 'Sehat', emoji: '🌶️' },
      { id: 'p2', name: 'Tomat', categoryId: 'c2', location: 'Kebun belakang', plantedAt: '2026-09-15', condition: 'Perlu perawatan', emoji: '🍅' },
      { id: 'p3', name: 'Kangkung', categoryId: 'c1', location: 'Kebun belakang', plantedAt: '2026-09-20', condition: 'Sehat', emoji: '🥬' },
      { id: 'p4', name: 'Bayam', categoryId: 'c1', location: 'Teras rumah', plantedAt: '2026-09-22', condition: 'Sehat', emoji: '🌱' },
      { id: 'p5', name: 'Selada', categoryId: 'c1', location: 'Teras rumah', plantedAt: '2026-09-25', condition: 'Sehat', emoji: '🥗' },
      { id: 'p6', name: 'Bunga Matahari', categoryId: 'c5', location: 'Halaman depan', plantedAt: '2026-09-10', condition: 'Sehat', emoji: '🌻' },
      { id: 'p7', name: 'Stroberi', categoryId: 'c2', location: 'Teras rumah', plantedAt: '2026-09-05', condition: 'Sehat', emoji: '🍓' },
      { id: 'p8', name: 'Monstera', categoryId: 'c3', location: 'Ruang tamu', plantedAt: '2026-08-20', condition: 'Perlu perawatan', emoji: '🪴' },
      { id: 'p9', name: 'Lidah Mertua', categoryId: 'c3', location: 'Ruang tamu', plantedAt: '2026-08-15', condition: 'Sehat', emoji: '🌵' },
      { id: 'p10', name: 'Kemangi', categoryId: 'c4', location: 'Teras rumah', plantedAt: '2026-09-18', condition: 'Sehat', emoji: '🌿' },
      { id: 'p11', name: 'Serai', categoryId: 'c4', location: 'Kebun belakang', plantedAt: '2026-09-01', condition: 'Sehat', emoji: '🌾' },
      { id: 'p12', name: 'Mawar', categoryId: 'c5', location: 'Halaman depan', plantedAt: '2026-09-08', condition: 'Sehat', emoji: '🌹' }
    ];
    var careTypes = [
      { id: 't1', name: 'Penyiraman', desc: 'Memberikan air sesuai kebutuhan dan kelembapan media tanam.' },
      { id: 't2', name: 'Pemupukan', desc: 'Menambahkan nutrisi organik atau anorganik untuk pertumbuhan.' },
      { id: 't3', name: 'Pemangkasan', desc: 'Memotong daun atau ranting untuk menjaga kesehatan tanaman.' },
      { id: 't4', name: 'Pestisida', desc: 'Mengendalikan hama dan penyakit dengan dosis yang tepat.' },
      { id: 't5', name: 'Perawatan Lain', desc: 'Perawatan tambahan, seperti mengganti pot atau media tanam.' }
    ];
    // [hari di Okt 2026, id tanaman, id jenis, catatan]  (urut terbaru lebih dulu)
    var raw = [
      [10, 'p1', 't1', 'Disiram 500 ml pada pagi hari.'],
      [10, 'p2', 't2', 'Pupuk organik 2 sdm per pot.'],
      [9, 'p3', 't1', 'Media tanam dijaga tetap lembap.'],
      [9, 'p6', 't3', 'Daun kering bagian bawah dibuang.'],
      [8, 'p2', 't4', 'Larutan neem untuk kutu daun.'],
      [8, 'p4', 't1', 'Disiram 300 ml pada sore hari.'],
      [7, 'p5', 't5', 'Gemburkan media tanam.'],
      [7, 'p1', 't1', 'Disiram 400 ml pada pagi hari.'],
      [7, 'p8', 't1', 'Disiram secukupnya, tanah dicek dulu.'],
      [6, 'p3', 't1', 'Disiram pagi hari.'],
      [6, 'p10', 't2', 'Pupuk cair encer.'],
      [6, 'p7', 't1', 'Disiram 250 ml.'],
      [5, 'p4', 't1', 'Disiram 300 ml pada pagi hari.'],
      [5, 'p1', 't2', 'Pupuk kompos 1 sdm.'],
      [5, 'p12', 't3', 'Cabang mati dipangkas.'],
      [4, 'p5', 't1', 'Disiram pagi hari.'],
      [4, 'p9', 't1', 'Disiram sedikit, tanah masih kering.'],
      [3, 'p2', 't1', 'Disiram 500 ml.'],
      [3, 'p11', 't2', 'Pupuk kandang tipis.'],
      [3, 'p6', 't1', 'Disiram 600 ml.'],
      [2, 'p8', 't3', 'Daun menguning dipangkas.'],
      [2, 'p3', 't2', 'Pupuk organik cair.'],
      [2, 'p10', 't1', 'Disiram sore hari.'],
      [1, 'p1', 't4', 'Semprot larutan bawang putih.'],
      [1, 'p5', 't1', 'Disiram 200 ml.'],
      [1, 'p7', 't2', 'Pupuk buah 1 sdt.'],
      [1, 'p2', 't3', 'Tunas air dipangkas.'],
      [1, 'p12', 't5', 'Ganti media tanam pot.']
    ];
    var logs = raw.map(function (r, i) {
      return { id: 'l' + (i + 1), date: '2026-10-' + pad(r[0]), plantId: r[1], typeId: r[2], note: r[3] };
    });
    return { categories: categories, plants: plants, careTypes: careTypes, logs: logs };
  }

  /* ---------- Pengguna ---------- */
  function init() {
    var users = read(KEY_USERS, null);
    if (!users || !users.length) {
      write(KEY_USERS, [
        { name: 'Admin Tumbuloka', email: 'admin@tumbuloka.com', password: 'admin123', role: 'admin', createdAt: todayISO() },
        { name: 'Pemilik Tanaman', email: 'user@tumbuloka.com', password: 'user123', role: 'pengguna', createdAt: todayISO() }
      ]);
    }
  }
  function getUsers() { return read(KEY_USERS, []); }
  function normEmail(e) { return String(e || '').trim().toLowerCase(); }
  function findUser(email) {
    email = normEmail(email);
    return getUsers().filter(function (u) { return u.email === email; })[0] || null;
  }
  function addUser(u) {
    var email = normEmail(u.email);
    if (findUser(email)) return { ok: false, error: 'Email sudah terdaftar.' };
    var users = getUsers();
    users.push({
      name: String(u.name).trim(), email: email, password: String(u.password),
      role: u.role === 'admin' ? 'admin' : 'pengguna', createdAt: todayISO()
    });
    write(KEY_USERS, users);
    return { ok: true };
  }
  function updateUser(email, patch) {
    email = normEmail(email);
    var users = getUsers();
    var i = users.map(function (u) { return u.email; }).indexOf(email);
    if (i < 0) return { ok: false, error: 'Pengguna tidak ditemukan.' };
    Object.keys(patch).forEach(function (k) {
      if (k === 'name' || k === 'password' || k === 'role') users[i][k] = patch[k];
    });
    write(KEY_USERS, users);
    return { ok: true };
  }
  function deleteUser(email) {
    email = normEmail(email);
    write(KEY_USERS, getUsers().filter(function (u) { return u.email !== email; }));
    localStorage.removeItem(KEY_DATA + email);
  }

  /* ---------- Autentikasi ---------- */
  function login(email, password, role) {
    var u = findUser(email);
    if (!u || u.password !== password) return { ok: false, error: 'Email atau kata sandi salah.' };
    if (u.role !== role) {
      return {
        ok: false,
        error: role === 'admin'
          ? 'Akun ini bukan Admin. Silakan pilih tab "Pengguna".'
          : 'Akun ini adalah Admin. Silakan pilih tab "Admin".'
      };
    }
    return { ok: true, user: u };
  }
  function setSession(user, remember) {
    clearSession();
    var s = JSON.stringify({ email: user.email });
    (remember ? localStorage : sessionStorage).setItem(KEY_SESSION, s);
  }
  function getSession() {
    var raw = sessionStorage.getItem(KEY_SESSION) || localStorage.getItem(KEY_SESSION);
    if (!raw) return null;
    try {
      var s = JSON.parse(raw);
      var u = findUser(s.email);
      return u ? { name: u.name, email: u.email, role: u.role } : null;
    } catch (e) { return null; }
  }
  function clearSession() {
    sessionStorage.removeItem(KEY_SESSION);
    localStorage.removeItem(KEY_SESSION);
  }

  /* ---------- Data kebun (per pengguna) ---------- */
  function getData(email) {
    email = normEmail(email);
    var d = read(KEY_DATA + email, null);
    if (!d || !d.categories || !d.plants || !d.careTypes || !d.logs) {
      d = seedData();
      write(KEY_DATA + email, d);
    }
    return d;
  }
  function saveData(email, d) { write(KEY_DATA + normEmail(email), d); }
  function resetData(email) {
    var d = seedData();
    saveData(email, d);
    return d;
  }

  w.Store = {
    init: init, uid: uid, todayISO: todayISO,
    getUsers: getUsers, findUser: findUser, addUser: addUser, updateUser: updateUser, deleteUser: deleteUser,
    login: login, setSession: setSession, getSession: getSession, clearSession: clearSession,
    getData: getData, saveData: saveData, resetData: resetData, seedData: seedData
  };
})(window);
