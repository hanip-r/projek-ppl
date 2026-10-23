/* ==========================================================
   Tumbuloka - Aplikasi utama (SPA sederhana berbasis hash)
   ========================================================== */
(function () {
  'use strict';

  Store.init();
  var sess = Store.getSession();
  if (!sess) { location.replace('index.html'); return; }
  var isAdmin = sess.role === 'admin';
  var D = Store.getData(sess.email);
  function save() { Store.saveData(sess.email, D); }

  /* ---------- Util ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var MONL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var DAYL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function fmt(iso) {
    if (!iso) return '-';
    var p = iso.split('-');
    return p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0];
  }
  function monthLabel(ym) {
    if (!ym) return 'Semua periode';
    var p = ym.split('-');
    return MONL[+p[1] - 1] + ' ' + p[0];
  }
  function todayISO() { return Store.todayISO(); }
  function pct(a, b) { return b ? (Math.round((a / b) * 1000) / 10).toString().replace('.', ',') : '0'; }

  function catById(id) { return D.categories.filter(function (c) { return c.id === id; })[0]; }
  function plantById(id) { return D.plants.filter(function (p) { return p.id === id; })[0]; }
  function typeById(id) { return D.careTypes.filter(function (t) { return t.id === id; })[0]; }
  function catName(id) { var c = catById(id); return c ? c.name : '-'; }
  function plantName(id) { var p = plantById(id); return p ? p.name : '(dihapus)'; }
  function typeName(id) { var t = typeById(id); return t ? t.name : '(dihapus)'; }
  function sortLogs(list, dir) {
    return list.slice().sort(function (a, b) {
      return dir === 'asc' ? (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) : (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    });
  }
  function plantCount(catId) { return D.plants.filter(function (p) { return p.categoryId === catId; }).length; }
  function cmpText(a, b) { return String(a).localeCompare(String(b), 'id'); }

  function paginate(list, page, per) {
    var pages = Math.max(1, Math.ceil(list.length / per));
    page = Math.min(Math.max(1, page || 1), pages);
    var start = (page - 1) * per;
    return {
      items: list.slice(start, start + per), page: page, pages: pages, total: list.length,
      from: list.length ? start + 1 : 0, to: Math.min(start + per, list.length)
    };
  }
  function pagerHTML(p, key, noun) {
    var btns = '<button data-action="page" data-key="' + key + '" data-page="' + (p.page - 1) + '"' + (p.page <= 1 ? ' disabled' : '') + ' aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>';
    for (var i = 1; i <= p.pages; i++) {
      btns += '<button class="' + (i === p.page ? 'active' : '') + '" data-action="page" data-key="' + key + '" data-page="' + i + '">' + i + '</button>';
    }
    btns += '<button data-action="page" data-key="' + key + '" data-page="' + (p.page + 1) + '"' + (p.page >= p.pages ? ' disabled' : '') + ' aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button>';
    return '<div class="pager"><span>Menampilkan ' + p.from + '–' + p.to + ' dari ' + p.total + ' ' + noun + '</span><div class="pg">' + btns + '</div></div>';
  }
  function emptyHTML(msg) {
    return '<div class="empty"><i class="bi bi-inbox"></i>' + esc(msg) + '</div>';
  }
  function condBadge(c) {
    return '<span class="badge-tb ' + (c === 'Sehat' ? 'badge-ok' : 'badge-warn') + '">' + esc(c) + '</span>';
  }
  function options(list, valKey, labKey, selected, allLabel) {
    var h = allLabel ? '<option value="">' + esc(allLabel) + '</option>' : '';
    list.forEach(function (o) {
      h += '<option value="' + esc(o[valKey]) + '"' + (String(o[valKey]) === String(selected) ? ' selected' : '') + '>' + esc(o[labKey]) + '</option>';
    });
    return h;
  }

  /* ---------- Toast, modal, konfirmasi ---------- */
  function toast(msg, type) {
    var el = document.createElement('div');
    el.className = 'toast align-items-center border-0 text-bg-' + (type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'success');
    el.setAttribute('role', 'status');
    el.innerHTML = '<div class="d-flex"><div class="toast-body">' + esc(msg) + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Tutup"></button></div>';
    $('#toasts').appendChild(el);
    var t = new bootstrap.Toast(el, { delay: 3000 });
    el.addEventListener('hidden.bs.toast', function () { el.remove(); });
    t.show();
  }

  var formModal = new bootstrap.Modal($('#formModal'));
  var confirmModal = new bootstrap.Modal($('#confirmModal'));

  function formDialog(cfg) {
    var body = cfg.fields.map(function (f) {
      var id = 'f_' + f.name, req = f.required ? ' required' : '', ctl;
      if (f.type === 'select') {
        ctl = '<select class="form-select" id="' + id + '" name="' + f.name + '"' + req + '>' + options(f.options, 'value', 'label', f.value) + '</select>';
      } else if (f.type === 'textarea') {
        ctl = '<textarea class="form-control" id="' + id + '" name="' + f.name + '" rows="3" maxlength="' + (f.max || 300) + '" placeholder="' + esc(f.placeholder || '') + '"' + req + '>' + esc(f.value) + '</textarea>';
      } else {
        ctl = '<input class="form-control" type="' + (f.type || 'text') + '" id="' + id + '" name="' + f.name + '" value="' + esc(f.value) + '" placeholder="' + esc(f.placeholder || '') + '" maxlength="' + (f.max || 80) + '"' + (f.min ? ' minlength="' + f.min + '"' : '') + req + '>';
      }
      return '<div class="mb-3"><label class="form-label" for="' + id + '">' + esc(f.label) + (f.required ? ' <span class="text-danger">*</span>' : '') + '</label>' + ctl +
        '<div class="invalid-feedback">' + esc(f.error || 'Wajib diisi.') + '</div></div>';
    }).join('');
    $('#formModalTitle').textContent = cfg.title;
    $('#formModalBody').innerHTML = '<form id="genForm" novalidate>' + body +
      '<div class="alert alert-danger py-2 small d-none" id="formErr"></div>' +
      '<div class="d-flex justify-content-end gap-2"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Batal</button>' +
      '<button type="submit" class="btn btn-primary">' + esc(cfg.submit || 'Simpan') + '</button></div></form>';
    var form = $('#genForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('was-validated');
      if (!form.checkValidity()) return;
      var v = {};
      cfg.fields.forEach(function (f) { v[f.name] = form.elements[f.name].value.trim(); });
      var r = cfg.onSubmit(v);
      if (typeof r === 'string') {
        var box = $('#formErr');
        box.textContent = r;
        box.classList.remove('d-none');
        return;
      }
      formModal.hide();
    });
    formModal.show();
  }

  function infoDialog(title, html) {
    $('#formModalTitle').textContent = title;
    $('#formModalBody').innerHTML = html + '<div class="text-end mt-3"><button class="btn btn-primary" data-bs-dismiss="modal">Tutup</button></div>';
    formModal.show();
  }

  function confirmDialog(title, msg, onYes) {
    $('#confirmTitle').textContent = title;
    $('#confirmMsg').textContent = msg;
    $('#confirmYes').onclick = function () { confirmModal.hide(); onYes(); };
    confirmModal.show();
  }

  /* ---------- Ekspor ---------- */
  function safeCell(c) {
    var s = String(c == null ? '' : c);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // cegah formula injection di Excel
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function downloadCSV(name, rows) {
    var csv = '﻿' + rows.map(function (r) { return r.map(safeCell).join(','); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  /* ---------- State filter per halaman ---------- */
  var today = todayISO();
  var ui = {
    kategori: { q: '', sort: 'nama' },
    tanaman: { q: '', cat: '', cond: '', page: 1 },
    jenis: { q: '', page: 1 },
    catatan: { q: '', plant: '', type: '', month: today.slice(0, 7), page: 1 },
    riwayat: { from: today.slice(0, 8) + '01', to: today, plant: '', sort: 'desc', page: 1, applied: null },
    rekap: { month: today.slice(0, 7), cat: '', applied: null },
    filter: { q: '', cat: '', loc: '', cond: '', applied: { q: '', cat: '', loc: '', cond: '' }, page: 1 },
    pengguna: { q: '' }
  };
  ui.riwayat.applied = { from: ui.riwayat.from, to: ui.riwayat.to, plant: '' };
  ui.rekap.applied = { month: ui.rekap.month, cat: '' };

  /* ==========================================================
     HALAMAN
     ========================================================== */
  var pages = {};

  /* ---------- Beranda ---------- */
  pages.beranda = {
    title: 'Beranda',
    html: function () {
      var sehat = D.plants.filter(function (p) { return p.condition === 'Sehat'; }).length;
      var need = D.plants.filter(function (p) { return p.condition !== 'Sehat'; });
      var recent = sortLogs(D.logs, 'desc').slice(0, 5);
      var users = isAdmin ? Store.getUsers().length : 0;
      var h = '<div class="page-head"><div><h1>Halo, ' + esc(sess.name.split(' ')[0]) + '!</h1><p>Ringkasan kebun digital Anda hari ini.</p></div>' +
        '<div class="d-flex gap-2 flex-wrap"><button class="btn btn-primary" data-action="add-catatan"><i class="bi bi-plus-lg me-1"></i>Catat Perawatan</button></div></div>';
      h += '<div class="row g-3 mb-4">' +
        statCard('Total Tanaman', D.plants.length, 'Dalam ' + D.categories.length + ' kategori', 'bi-flower2') +
        statCard('Aktivitas', D.logs.length, 'Seluruh catatan perawatan', 'bi-journal-text') +
        statCard('Sehat', sehat, pct(sehat, D.plants.length) + '% dari seluruh tanaman', 'bi-heart') +
        (isAdmin ? statCard('Pengguna', users, 'Akun terdaftar (admin)', 'bi-people') :
          statCard('Perlu Perawatan', need.length, pct(need.length, D.plants.length) + '% dari seluruh tanaman', 'bi-exclamation-triangle')) +
        '</div>';
      h += '<div class="row g-3"><div class="col-lg-6"><div class="tb-card panel h-100"><h5 class="mb-3">Perlu perhatian</h5>';
      if (!need.length) h += emptyHTML('Semua tanaman sehat. Kerja bagus!');
      else {
        h += need.map(function (p) {
          return '<div class="d-flex align-items-center justify-content-between py-2 border-bottom"><div><span class="fs-4 me-2">' + esc(p.emoji || '🌱') + '</span><b>' + esc(p.name) + '</b> ' +
            '<small class="text-muted ms-1">' + esc(p.location) + '</small></div>' +
            '<button class="btn btn-sm btn-outline-tb" data-action="log-tanaman" data-id="' + p.id + '">Catat</button></div>';
        }).join('');
      }
      h += '</div></div><div class="col-lg-6"><div class="tb-card panel h-100"><div class="d-flex justify-content-between align-items-center mb-3"><h5 class="mb-0">Aktivitas terbaru</h5><a href="#/riwayat" class="small fw-bold">Lihat semua</a></div>';
      if (!recent.length) h += emptyHTML('Belum ada aktivitas.');
      else {
        h += recent.map(function (l) {
          return '<div class="py-2 border-bottom small"><div class="d-flex justify-content-between"><b>' + esc(plantName(l.plantId)) + ' · ' + esc(typeName(l.typeId)) + '</b><span class="text-muted">' + fmt(l.date) + '</span></div><span class="text-muted">' + esc(l.note) + '</span></div>';
        }).join('');
      }
      h += '</div></div></div>';
      return h;
    }
  };
  function statCard(label, num, sub, icon) {
    return '<div class="col-6 col-xl-3"><div class="tb-card stat-card"><div class="lbl"><span>' + esc(label) + '</span><i class="bi ' + icon + '" style="color:var(--tb-600)"></i></div>' +
      '<div class="num">' + num + '</div><div class="sub">' + esc(sub) + '</div></div></div>';
  }

  /* ---------- Kategori ---------- */
  pages.kategori = {
    title: 'Kategori Tanaman',
    html: function () {
      var active = D.categories.filter(function (c) { return plantCount(c.id) > 0; }).length;
      return '<div class="page-head"><div><h1>Kategori Tanaman</h1><p>Kelola kategori dan jumlah tanaman di taman Anda.</p></div>' +
        '<div class="d-flex gap-2"><button class="btn btn-outline-tb" data-action="export-kategori"><i class="bi bi-download me-1"></i>Ekspor Data</button>' +
        '<button class="btn btn-primary" data-action="add-kategori"><i class="bi bi-plus-lg me-1"></i>Tambah Kategori</button></div></div>' +
        '<div class="row g-3 mb-4">' +
        '<div class="col-md-4"><div class="tb-card stat-card"><div class="lbl">Total Kategori</div><div class="num">' + D.categories.length + '</div></div></div>' +
        '<div class="col-md-4"><div class="tb-card stat-card"><div class="lbl">Total Tanaman</div><div class="num">' + D.plants.length + '</div></div></div>' +
        '<div class="col-md-4"><div class="tb-card stat-card"><div class="lbl">Kategori Aktif</div><div class="num">' + active + '</div></div></div></div>' +
        '<div class="tb-card panel"><div class="row g-2 mb-3"><div class="col-md-8"><div class="input-icon"><i class="bi bi-search"></i>' +
        '<input class="form-control" id="kQ" placeholder="Cari kategori..." value="' + esc(ui.kategori.q) + '"></div></div>' +
        '<div class="col-md-4"><select class="form-select" id="kSort"><option value="nama"' + (ui.kategori.sort === 'nama' ? ' selected' : '') + '>Urutkan: Nama</option>' +
        '<option value="jumlah"' + (ui.kategori.sort === 'jumlah' ? ' selected' : '') + '>Urutkan: Jumlah tanaman</option></select></div></div>' +
        '<div id="results"></div></div>';
    },
    results: function () {
      var s = ui.kategori, q = s.q.toLowerCase();
      var list = D.categories.filter(function (c) { return c.name.toLowerCase().indexOf(q) > -1; });
      list.sort(function (a, b) {
        return s.sort === 'jumlah' ? plantCount(b.id) - plantCount(a.id) || cmpText(a.name, b.name) : cmpText(a.name, b.name);
      });
      if (!list.length) { $('#results').innerHTML = emptyHTML('Kategori tidak ditemukan.'); return; }
      $('#results').innerHTML = '<div class="table-responsive"><table class="table table-tb"><thead><tr><th>NAMA KATEGORI</th><th>JUMLAH TANAMAN</th><th class="text-end">AKSI</th></tr></thead><tbody>' +
        list.map(function (c) {
          return '<tr><td><span class="cat-ico">' + esc(c.icon || '🌱') + '</span><b>' + esc(c.name) + '</b></td><td>' + plantCount(c.id) + '</td>' +
            '<td class="text-end"><button class="btn-icon" title="Edit" aria-label="Edit ' + esc(c.name) + '" data-action="edit-kategori" data-id="' + c.id + '"><i class="bi bi-pencil-square"></i></button>' +
            '<button class="btn-icon danger" title="Hapus" aria-label="Hapus ' + esc(c.name) + '" data-action="del-kategori" data-id="' + c.id + '"><i class="bi bi-trash"></i></button></td></tr>';
        }).join('') + '</tbody></table></div>';
    },
    mount: function () {
      $('#kQ').addEventListener('input', function () { ui.kategori.q = this.value; pages.kategori.results(); });
      $('#kSort').addEventListener('change', function () { ui.kategori.sort = this.value; pages.kategori.results(); });
      pages.kategori.results();
    }
  };

  function kategoriForm(id) {
    var c = id ? catById(id) : null;
    formDialog({
      title: c ? 'Edit Kategori' : 'Tambah Kategori',
      fields: [
        { name: 'name', label: 'Nama kategori', value: c ? c.name : '', required: true, placeholder: 'Contoh: Sayuran', max: 40 },
        { name: 'icon', label: 'Ikon (emoji)', value: c ? c.icon : '🌱', placeholder: '🌱', max: 4 }
      ],
      onSubmit: function (v) {
        var dup = D.categories.some(function (x) { return x.name.toLowerCase() === v.name.toLowerCase() && (!c || x.id !== c.id); });
        if (dup) return 'Nama kategori sudah ada.';
        if (c) { c.name = v.name; c.icon = v.icon || '🌱'; }
        else D.categories.push({ id: Store.uid('c'), name: v.name, icon: v.icon || '🌱' });
        save(); toast(c ? 'Kategori diperbarui.' : 'Kategori ditambahkan.'); render();
      }
    });
  }

  /* ---------- Data Tanaman ---------- */
  function plantCardHTML(p) {
    return '<div class="col-md-6 col-xl-4"><div class="tb-card plant-card"><div class="plant-img" aria-hidden="true">' + esc(p.emoji || '🌱') + '</div>' +
      '<div class="plant-body"><div class="d-flex justify-content-between align-items-start"><h5>' + esc(p.name) + '</h5><div class="d-flex">' +
      '<button class="btn-icon" title="Edit" aria-label="Edit ' + esc(p.name) + '" data-action="edit-tanaman" data-id="' + p.id + '"><i class="bi bi-pencil-square"></i></button>' +
      '<button class="btn-icon danger" title="Hapus" aria-label="Hapus ' + esc(p.name) + '" data-action="del-tanaman" data-id="' + p.id + '"><i class="bi bi-trash"></i></button></div></div>' +
      '<div class="d-flex align-items-center gap-2 mt-1"><small class="text-muted">' + esc(catName(p.categoryId)) + '</small>' + condBadge(p.condition) + '</div>' +
      '<div class="plant-meta"><i class="bi bi-geo-alt"></i>' + esc(p.location) + '</div>' +
      '<div class="plant-meta"><i class="bi bi-calendar3"></i>Ditanam ' + fmt(p.plantedAt) + '</div>' +
      '<button class="btn btn-sm btn-outline-tb mt-3" data-action="log-tanaman" data-id="' + p.id + '"><i class="bi bi-droplet me-1"></i>Catat perawatan</button>' +
      '</div></div></div>';
  }
  function plantSummary() {
    var sehat = D.plants.filter(function (p) { return p.condition === 'Sehat'; }).length;
    return D.plants.length + ' tanaman terdaftar · ' + sehat + ' sehat · ' + (D.plants.length - sehat) + ' perlu perawatan';
  }

  pages.tanaman = {
    title: 'Data Tanaman',
    html: function () {
      var s = ui.tanaman;
      return '<div class="page-head"><div><h1>Data Tanaman</h1><p>Kenali setiap tanaman dan pantau kondisinya dari satu tempat.</p></div>' +
        '<button class="btn btn-primary" data-action="add-tanaman"><i class="bi bi-plus-lg me-1"></i>Tambah Tanaman</button></div>' +
        '<div class="row g-2 mb-2"><div class="col-lg-5"><div class="input-icon"><i class="bi bi-search"></i><input class="form-control" id="tQ" placeholder="Cari nama tanaman..." value="' + esc(s.q) + '"></div></div>' +
        '<div class="col-6 col-lg-2"><select class="form-select" id="tCat">' + options(D.categories, 'id', 'name', s.cat, 'Semua kategori') + '</select></div>' +
        '<div class="col-6 col-lg-2"><select class="form-select" id="tCond"><option value="">Semua kondisi</option><option value="Sehat"' + (s.cond === 'Sehat' ? ' selected' : '') + '>Sehat</option><option value="Perlu perawatan"' + (s.cond === 'Perlu perawatan' ? ' selected' : '') + '>Perlu perawatan</option></select></div>' +
        '<div class="col-lg-3"><a href="#/filter" class="btn btn-outline-tb w-100"><i class="bi bi-sliders me-1"></i>Pencarian &amp; Filter</a></div></div>' +
        '<p class="small text-muted mb-3">' + plantSummary() + '</p><div id="results"></div>';
    },
    results: function () {
      var s = ui.tanaman, q = s.q.toLowerCase();
      var list = D.plants.filter(function (p) {
        return p.name.toLowerCase().indexOf(q) > -1 && (!s.cat || p.categoryId === s.cat) && (!s.cond || p.condition === s.cond);
      });
      if (!list.length) { $('#results').innerHTML = emptyHTML('Tidak ada tanaman yang cocok.'); return; }
      var pg = paginate(list, s.page, 6); s.page = pg.page;
      $('#results').innerHTML = '<div class="row g-3">' + pg.items.map(plantCardHTML).join('') + '</div>' + pagerHTML(pg, 'tanaman', 'tanaman');
    },
    mount: function () {
      var s = ui.tanaman;
      $('#tQ').addEventListener('input', function () { s.q = this.value; s.page = 1; pages.tanaman.results(); });
      $('#tCat').addEventListener('change', function () { s.cat = this.value; s.page = 1; pages.tanaman.results(); });
      $('#tCond').addEventListener('change', function () { s.cond = this.value; s.page = 1; pages.tanaman.results(); });
      pages.tanaman.results();
    }
  };

  function tanamanForm(id) {
    var p = id ? plantById(id) : null;
    if (!D.categories.length) { toast('Tambahkan kategori terlebih dahulu.', 'warning'); location.hash = '#/kategori'; return; }
    formDialog({
      title: p ? 'Edit Tanaman' : 'Tambah Tanaman',
      fields: [
        { name: 'name', label: 'Nama tanaman', value: p ? p.name : '', required: true, max: 50 },
        { name: 'categoryId', label: 'Kategori', type: 'select', value: p ? p.categoryId : D.categories[0].id, required: true, options: D.categories.map(function (c) { return { value: c.id, label: c.name }; }) },
        { name: 'location', label: 'Lokasi', value: p ? p.location : '', required: true, placeholder: 'Contoh: Kebun belakang', max: 50 },
        { name: 'plantedAt', label: 'Tanggal tanam', type: 'date', value: p ? p.plantedAt : todayISO(), required: true },
        { name: 'condition', label: 'Kondisi', type: 'select', value: p ? p.condition : 'Sehat', required: true, options: [{ value: 'Sehat', label: 'Sehat' }, { value: 'Perlu perawatan', label: 'Perlu perawatan' }] },
        { name: 'emoji', label: 'Ikon (emoji)', value: p ? p.emoji : '🌱', max: 4 }
      ],
      onSubmit: function (v) {
        if (v.plantedAt > todayISO()) return 'Tanggal tanam tidak boleh di masa depan.';
        var obj = { name: v.name, categoryId: v.categoryId, location: v.location, plantedAt: v.plantedAt, condition: v.condition, emoji: v.emoji || '🌱' };
        if (p) Object.assign(p, obj); else { obj.id = Store.uid('p'); D.plants.push(obj); }
        save(); toast(p ? 'Tanaman diperbarui.' : 'Tanaman ditambahkan.'); render();
      }
    });
  }

  /* ---------- Jenis Perawatan ---------- */
  pages.jenis = {
    title: 'Jenis Perawatan',
    html: function () {
      return '<div class="page-head"><div><h1>Jenis Perawatan</h1><p>Kelola jenis aktivitas untuk perawatan tanaman yang konsisten.</p></div>' +
        '<button class="btn btn-primary" data-action="add-jenis"><i class="bi bi-plus-lg me-1"></i>Tambah Jenis Perawatan</button></div>' +
        '<div class="tb-card panel mb-3"><h5 class="mb-0 fs-6">Daftar jenis perawatan</h5><p class="small text-muted mb-3" id="jCount"></p>' +
        '<div class="input-icon mb-3" style="max-width:380px"><i class="bi bi-search"></i><input class="form-control" id="jQ" placeholder="Cari jenis perawatan..." value="' + esc(ui.jenis.q) + '"></div>' +
        '<div id="results"></div></div>' +
        '<div class="row g-3"><div class="col-md-6"><div class="tb-card panel"><i class="bi bi-droplet" style="color:var(--tb-600)"></i><h6 class="mt-2 mb-1">Sesuaikan kebutuhan</h6><p class="small text-muted mb-0">Setiap tanaman membutuhkan frekuensi perawatan yang berbeda.</p></div></div>' +
        '<div class="col-md-6"><div class="tb-card panel"><i class="bi bi-journal-text" style="color:var(--tb-600)"></i><h6 class="mt-2 mb-1">Catat secara rutin</h6><p class="small text-muted mb-0">Tambahkan jenis perawatan pada setiap aktivitas yang dilakukan.</p></div></div></div>';
    },
    results: function () {
      var s = ui.jenis, q = s.q.toLowerCase();
      $('#jCount').textContent = D.careTypes.length + ' jenis perawatan tersedia untuk pencatatan aktivitas.';
      var list = D.careTypes.filter(function (t) { return (t.name + ' ' + t.desc).toLowerCase().indexOf(q) > -1; });
      if (!list.length) { $('#results').innerHTML = emptyHTML('Jenis perawatan tidak ditemukan.'); return; }
      var pg = paginate(list, s.page, 5); s.page = pg.page;
      $('#results').innerHTML = '<div class="table-responsive"><table class="table table-tb"><thead><tr><th>Jenis perawatan</th><th>Deskripsi</th><th class="text-end">Aksi</th></tr></thead><tbody>' +
        pg.items.map(function (t) {
          return '<tr><td><b>' + esc(t.name) + '</b></td><td class="text-muted">' + esc(t.desc) + '</td><td class="text-end text-nowrap">' +
            '<button class="btn-icon" title="Edit" aria-label="Edit ' + esc(t.name) + '" data-action="edit-jenis" data-id="' + t.id + '"><i class="bi bi-pencil-square"></i></button>' +
            '<button class="btn-icon danger" title="Hapus" aria-label="Hapus ' + esc(t.name) + '" data-action="del-jenis" data-id="' + t.id + '"><i class="bi bi-trash"></i></button></td></tr>';
        }).join('') + '</tbody></table></div>' + pagerHTML(pg, 'jenis', 'jenis perawatan');
    },
    mount: function () {
      $('#jQ').addEventListener('input', function () { ui.jenis.q = this.value; ui.jenis.page = 1; pages.jenis.results(); });
      pages.jenis.results();
    }
  };

  function jenisForm(id) {
    var t = id ? typeById(id) : null;
    formDialog({
      title: t ? 'Edit Jenis Perawatan' : 'Tambah Jenis Perawatan',
      fields: [
        { name: 'name', label: 'Nama jenis perawatan', value: t ? t.name : '', required: true, max: 40 },
        { name: 'desc', label: 'Deskripsi', type: 'textarea', value: t ? t.desc : '', required: true, max: 200 }
      ],
      onSubmit: function (v) {
        var dup = D.careTypes.some(function (x) { return x.name.toLowerCase() === v.name.toLowerCase() && (!t || x.id !== t.id); });
        if (dup) return 'Nama jenis perawatan sudah ada.';
        if (t) { t.name = v.name; t.desc = v.desc; }
        else D.careTypes.push({ id: Store.uid('t'), name: v.name, desc: v.desc });
        save(); toast(t ? 'Jenis perawatan diperbarui.' : 'Jenis perawatan ditambahkan.'); render();
      }
    });
  }

  /* ---------- Catatan Perawatan ---------- */
  function logForm(id, presetPlant) {
    var l = id ? D.logs.filter(function (x) { return x.id === id; })[0] : null;
    if (!D.plants.length || !D.careTypes.length) { toast('Tambahkan tanaman dan jenis perawatan terlebih dahulu.', 'warning'); return; }
    formDialog({
      title: l ? 'Edit Catatan' : 'Tambah Catatan',
      fields: [
        { name: 'date', label: 'Tanggal', type: 'date', value: l ? l.date : todayISO(), required: true },
        { name: 'plantId', label: 'Tanaman', type: 'select', value: l ? l.plantId : (presetPlant || D.plants[0].id), required: true, options: D.plants.map(function (p) { return { value: p.id, label: p.name }; }) },
        { name: 'typeId', label: 'Jenis perawatan', type: 'select', value: l ? l.typeId : D.careTypes[0].id, required: true, options: D.careTypes.map(function (t) { return { value: t.id, label: t.name }; }) },
        { name: 'note', label: 'Catatan', type: 'textarea', value: l ? l.note : '', required: true, placeholder: 'Contoh: Disiram 500 ml pada pagi hari.', max: 250 }
      ],
      onSubmit: function (v) {
        if (v.date > todayISO()) return 'Tanggal tidak boleh di masa depan.';
        if (l) { l.date = v.date; l.plantId = v.plantId; l.typeId = v.typeId; l.note = v.note; }
        else D.logs.unshift({ id: Store.uid('l'), date: v.date, plantId: v.plantId, typeId: v.typeId, note: v.note });
        save(); toast(l ? 'Catatan diperbarui.' : 'Catatan ditambahkan.'); render();
      }
    });
  }
  function filterLogs(s) {
    var q = (s.q || '').toLowerCase();
    return D.logs.filter(function (l) {
      if (s.plant && l.plantId !== s.plant) return false;
      if (s.type && l.typeId !== s.type) return false;
      if (s.month && l.date.slice(0, 7) !== s.month) return false;
      if (q && (l.note + ' ' + plantName(l.plantId) + ' ' + typeName(l.typeId)).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  pages.catatan = {
    title: 'Catatan Perawatan',
    html: function () {
      var s = ui.catatan;
      return '<div class="page-head"><div><h1>Catatan Perawatan</h1><p>Simpan setiap aktivitas dan detail perawatan tanaman Anda.</p></div>' +
        '<button class="btn btn-primary" data-action="add-catatan"><i class="bi bi-plus-lg me-1"></i>Tambah Catatan</button></div>' +
        '<div class="tb-card panel mb-3"><h5 class="mb-0 fs-6">Daftar catatan</h5><p class="small text-muted mb-3" id="cCount"></p>' +
        '<div class="row g-2 mb-3"><div class="col-lg-4"><div class="input-icon"><i class="bi bi-search"></i><input class="form-control" id="cQ" placeholder="Cari catatan atau tanaman..." value="' + esc(s.q) + '"></div></div>' +
        '<div class="col-6 col-lg-3"><select class="form-select" id="cPlant">' + options(D.plants, 'id', 'name', s.plant, 'Semua tanaman') + '</select></div>' +
        '<div class="col-6 col-lg-3"><select class="form-select" id="cType">' + options(D.careTypes, 'id', 'name', s.type, 'Semua perawatan') + '</select></div>' +
        '<div class="col-lg-2"><input type="month" class="form-control" id="cMonth" value="' + esc(s.month) + '" aria-label="Bulan"></div></div>' +
        '<div id="results"></div></div>' +
        '<div class="note-box"><i class="bi bi-info-circle mt-1"></i><div><b>Perawatan hari ini sudah dicatat?</b><span>Catatan yang lengkap membantu Anda mengetahui kapan tanaman terakhir disiram, dipupuk, atau dirawat.</span></div></div>';
    },
    results: function () {
      var s = ui.catatan;
      var list = sortLogs(filterLogs(s), 'desc');
      $('#cCount').textContent = list.length + ' aktivitas tercatat' + (s.month ? ' pada periode ' + monthLabel(s.month) : '') + '.';
      if (!list.length) { $('#results').innerHTML = emptyHTML('Belum ada catatan untuk filter ini.'); return; }
      var pg = paginate(list, s.page, 7); s.page = pg.page;
      $('#results').innerHTML = '<div class="table-responsive"><table class="table table-tb"><thead><tr><th>Tanggal</th><th>Tanaman</th><th>Jenis perawatan</th><th>Catatan</th><th class="text-end">Aksi</th></tr></thead><tbody>' +
        pg.items.map(function (l) {
          return '<tr><td class="fw-bold text-nowrap">' + fmt(l.date) + '</td><td>' + esc(plantName(l.plantId)) + '</td><td>' + esc(typeName(l.typeId)) + '</td><td class="text-muted">' + esc(l.note) + '</td>' +
            '<td class="text-end text-nowrap"><button class="btn-icon" title="Edit" aria-label="Edit catatan" data-action="edit-catatan" data-id="' + l.id + '"><i class="bi bi-pencil-square"></i></button>' +
            '<button class="btn-icon danger" title="Hapus" aria-label="Hapus catatan" data-action="del-catatan" data-id="' + l.id + '"><i class="bi bi-trash"></i></button></td></tr>';
        }).join('') + '</tbody></table></div>' + pagerHTML(pg, 'catatan', 'catatan');
    },
    mount: function () {
      var s = ui.catatan;
      function bind(id, key, ev) { $(id).addEventListener(ev, function () { s[key] = this.value; s.page = 1; pages.catatan.results(); }); }
      bind('#cQ', 'q', 'input'); bind('#cPlant', 'plant', 'change'); bind('#cType', 'type', 'change'); bind('#cMonth', 'month', 'change');
      pages.catatan.results();
    }
  };

  /* ---------- Riwayat Perawatan ---------- */
  pages.riwayat = {
    title: 'Riwayat Perawatan',
    html: function () {
      var s = ui.riwayat;
      return '<div class="page-head"><div><h1>Riwayat Perawatan</h1><p>Telusuri seluruh perjalanan perawatan tanaman di kebun Anda.</p></div>' +
        '<button class="btn btn-outline-tb" data-action="export-riwayat"><i class="bi bi-download me-1"></i>Ekspor Riwayat</button></div>' +
        '<div class="tb-card panel mb-3"><h5 class="fs-6 mb-3">Rentang riwayat</h5><div class="row g-2 align-items-end">' +
        '<div class="col-md-3"><label class="form-label" for="rFrom">Tanggal mulai</label><input type="date" class="form-control" id="rFrom" value="' + esc(s.from) + '"></div>' +
        '<div class="col-md-3"><label class="form-label" for="rTo">Tanggal akhir</label><input type="date" class="form-control" id="rTo" value="' + esc(s.to) + '"></div>' +
        '<div class="col-md-4"><label class="form-label" for="rPlant">Tanaman</label><select class="form-select" id="rPlant">' + options(D.plants, 'id', 'name', s.plant, 'Semua tanaman') + '</select></div>' +
        '<div class="col-md-2"><button class="btn btn-primary w-100" data-action="apply-riwayat"><i class="bi bi-funnel me-1"></i>Tampilkan</button></div></div>' +
        '<div class="text-danger small mt-2 d-none" id="rErr"></div></div>' +
        '<div class="tb-card panel"><div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fs-6 mb-0">Riwayat aktivitas</h5>' +
        '<button class="btn btn-link btn-sm text-muted text-decoration-none" data-action="sort-riwayat" id="rSort"></button></div><div id="results"></div></div>';
    },
    list: function () {
      var a = ui.riwayat.applied;
      return sortLogs(D.logs.filter(function (l) {
        return (!a.from || l.date >= a.from) && (!a.to || l.date <= a.to) && (!a.plant || l.plantId === a.plant);
      }), ui.riwayat.sort);
    },
    results: function () {
      var s = ui.riwayat, a = s.applied;
      $('#rSort').innerHTML = '<i class="bi bi-sort-' + (s.sort === 'desc' ? 'down' : 'up') + ' me-1"></i>' + (s.sort === 'desc' ? 'Terbaru lebih dulu' : 'Terlama lebih dulu');
      var list = pages.riwayat.list();
      if (!list.length) { $('#results').innerHTML = emptyHTML('Tidak ada aktivitas pada rentang ini.'); return; }
      var pg = paginate(list, s.page, 7); s.page = pg.page;
      $('#results').innerHTML = '<div class="table-responsive"><table class="table table-tb"><thead><tr><th>Tanggal</th><th>Tanaman</th><th>Jenis perawatan</th><th>Catatan</th><th class="text-end">Aksi</th></tr></thead><tbody>' +
        pg.items.map(function (l) {
          return '<tr><td class="fw-bold text-nowrap">' + fmt(l.date) + '</td><td>' + esc(plantName(l.plantId)) + '</td><td>' + esc(typeName(l.typeId)) + '</td><td class="text-muted">' + esc(l.note) + '</td>' +
            '<td class="text-end"><button class="btn btn-sm btn-link text-decoration-none fw-bold" data-action="detail-log" data-id="' + l.id + '"><i class="bi bi-eye me-1"></i>Detail</button></td></tr>';
        }).join('') + '</tbody></table></div>' + pagerHTML(pg, 'riwayat', 'aktivitas · ' + (a.from ? fmt(a.from) : '…') + ' – ' + (a.to ? fmt(a.to) : '…'));
    },
    mount: function () { pages.riwayat.results(); }
  };

  /* ---------- Rekap & Laporan ---------- */
  var PALETTE = ['#145a3d', '#2d8a57', '#86c4a0', '#b8d99a', '#d9eadf', '#c9a45c', '#8fa7c9', '#d29a9a'];

  function rekapData() {
    var a = ui.rekap.applied;
    var plants = D.plants.filter(function (p) { return !a.cat || p.categoryId === a.cat; });
    var ids = plants.map(function (p) { return p.id; });
    var logs = D.logs.filter(function (l) {
      return ids.indexOf(l.plantId) > -1 && (!a.month || l.date.slice(0, 7) === a.month);
    });
    var sehat = plants.filter(function (p) { return p.condition === 'Sehat'; }).length;
    var perCat = D.categories.filter(function (c) { return !a.cat || c.id === a.cat; }).map(function (c) {
      return { name: c.name, count: plantCount(c.id) };
    });
    var perType = D.careTypes.map(function (t) {
      return { name: t.name, count: logs.filter(function (l) { return l.typeId === t.id; }).length };
    });
    return { plants: plants, logs: logs, sehat: sehat, need: plants.length - sehat, perCat: perCat, perType: perType, a: a };
  }

  pages.rekap = {
    title: 'Rekap & Laporan',
    html: function () {
      var s = ui.rekap;
      return '<div class="page-head"><div><h1>Rekap &amp; Laporan</h1><p>Lihat ringkasan kebun dan aktivitas perawatan dalam satu laporan.</p></div>' +
        '<div class="d-flex gap-2 no-print"><button class="btn btn-outline-tb" data-action="export-pdf"><i class="bi bi-file-earmark-pdf me-1"></i>Ekspor PDF</button>' +
        '<button class="btn btn-primary" data-action="export-xls"><i class="bi bi-file-earmark-spreadsheet me-1"></i>Ekspor Excel</button></div></div>' +
        '<div class="row g-2 align-items-end mb-3 no-print"><div class="col-md-3"><label class="form-label" for="pMonth">Periode</label><input type="month" class="form-control" id="pMonth" value="' + esc(s.month) + '"></div>' +
        '<div class="col-md-4"><label class="form-label" for="pCat">Kategori</label><select class="form-select" id="pCat">' + options(D.categories, 'id', 'name', s.cat, 'Semua kategori') + '</select></div>' +
        '<div class="col-md-2"><button class="btn btn-primary w-100" data-action="apply-rekap"><i class="bi bi-funnel me-1"></i>Tampilkan</button></div></div>' +
        '<div id="results"></div>';
    },
    results: function () {
      var r = rekapData(), a = r.a;
      var total = r.plants.length, nLogs = r.logs.length;
      var maxC = Math.max(1, Math.max.apply(null, r.perCat.map(function (x) { return x.count; }).concat([0])));
      var h = '<p class="small text-muted">Periode: <b>' + esc(monthLabel(a.month)) + '</b> · Kategori: <b>' + esc(a.cat ? catName(a.cat) : 'Semua kategori') + '</b></p>';
      h += '<div class="row g-3 mb-3">' +
        statCard('Total Tanaman', total, 'Dalam ' + r.perCat.length + ' kategori', 'bi-flower2') +
        statCard('Aktivitas', nLogs, 'Pada periode terpilih', 'bi-journal-text') +
        statCard('Sehat', r.sehat, pct(r.sehat, total) + '% dari seluruh tanaman', 'bi-heart') +
        statCard('Perlu Perawatan', r.need, pct(r.need, total) + '% dari seluruh tanaman', 'bi-exclamation-triangle') + '</div>';

      // Bar chart
      h += '<div class="row g-3 mb-3"><div class="col-lg-6"><div class="tb-card panel h-100"><h5 class="fs-6 mb-0">Tanaman per kategori</h5><p class="small text-muted">Distribusi ' + D.plants.length + ' tanaman di kebun Anda</p>';
      if (!r.perCat.length) h += emptyHTML('Belum ada kategori.');
      else {
        h += '<div class="bar-chart" role="img" aria-label="Grafik batang tanaman per kategori">' + r.perCat.map(function (c) {
          return '<div class="bar-col"><span>' + c.count + '</span><div class="bar" style="height:' + Math.round((c.count / maxC) * 80) + '%"></div></div>';
        }).join('') + '</div><div class="bar-labels">' + r.perCat.map(function (c) { return '<span>' + esc(c.name) + '</span>'; }).join('') + '</div>';
      }
      h += '</div></div>';

      // Donut
      var stops = [], acc = 0;
      r.perType.forEach(function (t, i) {
        if (!t.count) return;
        var from = acc / nLogs * 100; acc += t.count; var to = acc / nLogs * 100;
        stops.push(PALETTE[i % PALETTE.length] + ' ' + from.toFixed(2) + '% ' + to.toFixed(2) + '%');
      });
      var grad = nLogs ? 'conic-gradient(' + stops.join(',') + ')' : 'conic-gradient(#e6efe9 0 100%)';
      h += '<div class="col-lg-6"><div class="tb-card panel h-100"><h5 class="fs-6 mb-0">Aktivitas perawatan</h5><p class="small text-muted">Distribusi ' + nLogs + ' aktivitas pada periode terpilih</p>' +
        '<div class="donut-wrap"><div class="donut" style="background:' + grad + '" role="img" aria-label="Grafik donat aktivitas"><div class="donut-center"><b>' + nLogs + '</b><small>Aktivitas</small></div></div>' +
        '<ul class="legend">' + r.perType.map(function (t, i) {
          return '<li><i style="background:' + PALETTE[i % PALETTE.length] + '"></i>' + esc(t.name) + '<span>' + t.count + '</span></li>';
        }).join('') + '</ul></div></div></div></div>';

      // Insight
      var needNames = r.plants.filter(function (p) { return p.condition !== 'Sehat'; }).map(function (p) { return p.name; });
      var top = r.perType.slice().sort(function (x, y) { return y.count - x.count; })[0];
      var head = !total ? 'Belum ada tanaman pada kategori ini' : (r.sehat / total >= 0.5 ? 'Sebagian besar tanaman Anda dalam kondisi sehat' : 'Banyak tanaman Anda memerlukan perawatan');
      var body = (needNames.length ? 'Periksa ' + needNames.join(' dan ') + ' yang memerlukan perawatan. ' : 'Semua tanaman dalam kondisi baik. ') +
        (top && top.count ? top.name + ' menyumbang ' + pct(top.count, nLogs) + '% aktivitas pada periode ini.' : 'Belum ada aktivitas pada periode ini.');
      h += '<div class="note-box"><i class="bi bi-leaf mt-1"></i><div><b>' + esc(head) + '</b><span>' + esc(body) + '</span></div></div>';
      $('#results').innerHTML = h;
    },
    mount: function () { pages.rekap.results(); }
  };

  /* ---------- Pencarian & Filter ---------- */
  pages.filter = {
    title: 'Pencarian & Filter',
    html: function () {
      var s = ui.filter;
      var locs = D.plants.map(function (p) { return p.location; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).sort(cmpText).map(function (l) { return { v: l, n: l }; });
      return '<div class="page-head"><div><h1>Pencarian &amp; Filter</h1><p>Temukan tanaman berdasarkan kategori, lokasi, dan kondisi.</p></div>' +
        '<a href="#/tanaman" class="btn btn-outline-tb"><i class="bi bi-arrow-left me-1"></i>Kembali ke Data Tanaman</a></div>' +
        '<div class="tb-card panel mb-4"><h5 class="fs-6 mb-0">Filter tanaman</h5><p class="small text-muted mb-3">Gunakan satu atau beberapa filter untuk mempersempit pencarian.</p>' +
        '<div class="mb-3"><label class="form-label" for="fQ">Nama tanaman</label><div class="input-icon"><i class="bi bi-search"></i><input class="form-control" id="fQ" placeholder="Cari nama tanaman..." value="' + esc(s.q) + '"></div></div>' +
        '<div class="row g-2 align-items-end"><div class="col-md-3"><label class="form-label" for="fCat">Kategori</label><select class="form-select" id="fCat">' + options(D.categories, 'id', 'name', s.cat, 'Semua kategori') + '</select></div>' +
        '<div class="col-md-3"><label class="form-label" for="fLoc">Lokasi</label><select class="form-select" id="fLoc">' + options(locs, 'v', 'n', s.loc, 'Semua lokasi') + '</select></div>' +
        '<div class="col-md-3"><label class="form-label" for="fCond">Kondisi</label><select class="form-select" id="fCond"><option value="">Semua kondisi</option><option value="Sehat"' + (s.cond === 'Sehat' ? ' selected' : '') + '>Sehat</option><option value="Perlu perawatan"' + (s.cond === 'Perlu perawatan' ? ' selected' : '') + '>Perlu perawatan</option></select></div>' +
        '<div class="col-md-3 d-flex gap-2"><button class="btn btn-primary flex-grow-1" data-action="apply-filter"><i class="bi bi-search me-1"></i>Terapkan</button><button class="btn btn-outline-tb" data-action="reset-filter"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset</button></div></div></div>' +
        '<div id="results"></div>';
    },
    results: function () {
      var a = ui.filter.applied, q = a.q.toLowerCase();
      var list = D.plants.filter(function (p) {
        return p.name.toLowerCase().indexOf(q) > -1 && (!a.cat || p.categoryId === a.cat) && (!a.loc || p.location === a.loc) && (!a.cond || p.condition === a.cond);
      });
      var chips = [];
      if (a.q) chips.push(['q', '"' + a.q + '"']);
      if (a.cat) chips.push(['cat', catName(a.cat)]);
      if (a.loc) chips.push(['loc', a.loc]);
      if (a.cond) chips.push(['cond', a.cond]);
      var h = '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2"><h5 class="mb-0">Hasil pencarian</h5><small class="text-muted">' + list.length + ' tanaman ditemukan dari ' + D.plants.length + ' tanaman</small></div>';
      if (chips.length) h += '<div class="d-flex gap-2 flex-wrap mb-3">' + chips.map(function (c) { return '<button class="chip" data-action="rm-chip" data-key="' + c[0] + '">' + esc(c[1]) + ' <i class="bi bi-x"></i></button>'; }).join('') + '</div>';
      if (!list.length) h += emptyHTML('Tidak ada tanaman yang cocok dengan filter.');
      else {
        var pg = paginate(list, ui.filter.page, 6); ui.filter.page = pg.page;
        h += '<div class="row g-3">' + pg.items.map(plantCardHTML).join('') + '</div>' + (pg.pages > 1 ? pagerHTML(pg, 'filter', 'tanaman') : '');
      }
      $('#results').innerHTML = h;
    },
    mount: function () { pages.filter.results(); }
  };

  /* ---------- Kelola Pengguna (khusus admin) ---------- */
  pages.pengguna = {
    title: 'Kelola Pengguna',
    admin: true,
    html: function () {
      return '<div class="page-head"><div><h1>Kelola Pengguna</h1><p>Atur akun pengguna dan admin Tumbuloka.</p></div>' +
        '<button class="btn btn-primary" data-action="add-user"><i class="bi bi-plus-lg me-1"></i>Tambah Pengguna</button></div>' +
        '<div class="tb-card panel"><div class="input-icon mb-3" style="max-width:380px"><i class="bi bi-search"></i><input class="form-control" id="uQ" placeholder="Cari nama atau email..." value="' + esc(ui.pengguna.q) + '"></div><div id="results"></div></div>';
    },
    results: function () {
      var q = ui.pengguna.q.toLowerCase();
      var list = Store.getUsers().filter(function (u) { return (u.name + ' ' + u.email).toLowerCase().indexOf(q) > -1; });
      if (!list.length) { $('#results').innerHTML = emptyHTML('Pengguna tidak ditemukan.'); return; }
      $('#results').innerHTML = '<div class="table-responsive"><table class="table table-tb"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Terdaftar</th><th class="text-end">Aksi</th></tr></thead><tbody>' +
        list.map(function (u) {
          var me = u.email === sess.email;
          return '<tr><td><b>' + esc(u.name) + '</b>' + (me ? ' <small class="text-muted">(Anda)</small>' : '') + '</td><td>' + esc(u.email) + '</td>' +
            '<td><span class="badge-tb ' + (u.role === 'admin' ? 'badge-admin' : 'badge-ok') + '">' + (u.role === 'admin' ? 'Admin' : 'Pengguna') + '</span></td><td>' + fmt(u.createdAt) + '</td>' +
            '<td class="text-end text-nowrap"><button class="btn-icon" title="Edit" aria-label="Edit ' + esc(u.name) + '" data-action="edit-user" data-id="' + esc(u.email) + '"><i class="bi bi-pencil-square"></i></button>' +
            (me ? '' : '<button class="btn-icon danger" title="Hapus" aria-label="Hapus ' + esc(u.name) + '" data-action="del-user" data-id="' + esc(u.email) + '"><i class="bi bi-trash"></i></button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    },
    mount: function () {
      $('#uQ').addEventListener('input', function () { ui.pengguna.q = this.value; pages.pengguna.results(); });
      pages.pengguna.results();
    }
  };

  function adminCount() { return Store.getUsers().filter(function (u) { return u.role === 'admin'; }).length; }

  function userForm(email) {
    var u = email ? Store.findUser(email) : null;
    var me = u && u.email === sess.email;
    var fields = [
      { name: 'name', label: 'Nama lengkap', value: u ? u.name : '', required: true, min: 2, max: 60, error: 'Nama minimal 2 karakter.' }
    ];
    if (!u) fields.push({ name: 'email', label: 'Email', type: 'email', value: '', required: true, max: 80, error: 'Masukkan email yang valid.' });
    fields.push({ name: 'password', label: u ? 'Kata sandi baru (kosongkan bila tidak diubah)' : 'Kata sandi', type: 'password', value: '', required: !u, min: 6, max: 60, error: 'Minimal 6 karakter.' });
    if (!me) fields.push({ name: 'role', label: 'Peran', type: 'select', value: u ? u.role : 'pengguna', required: true, options: [{ value: 'pengguna', label: 'Pengguna' }, { value: 'admin', label: 'Admin' }] });
    formDialog({
      title: u ? 'Edit Pengguna' : 'Tambah Pengguna', fields: fields,
      onSubmit: function (v) {
        if (v.password && v.password.length < 6) return 'Kata sandi minimal 6 karakter.';
        if (u) {
          if (u.role === 'admin' && v.role === 'pengguna' && adminCount() <= 1) return 'Tidak bisa menurunkan admin terakhir.';
          var patch = { name: v.name };
          if (v.password) patch.password = v.password;
          if (!me && v.role) patch.role = v.role;
          Store.updateUser(u.email, patch);
          toast('Pengguna diperbarui.');
        } else {
          var r = Store.addUser({ name: v.name, email: v.email, password: v.password, role: v.role });
          if (!r.ok) return r.error;
          toast('Pengguna ditambahkan.');
        }
        render();
      }
    });
  }

  /* ==========================================================
     Router & render
     ========================================================== */
  var current = 'beranda';

  function routeFromHash() {
    var r = (location.hash || '').replace(/^#\/?/, '').split('?')[0] || 'beranda';
    if (!pages[r]) r = 'beranda';
    if (pages[r].admin && !isAdmin) { r = 'beranda'; }
    return r;
  }

  function updateBell() {
    var need = D.plants.filter(function (p) { return p.condition !== 'Sehat'; });
    var dot = $('#bellDot');
    dot.textContent = need.length;
    dot.classList.toggle('d-none', !need.length);
    $('#bellMenu').innerHTML = '<div class="px-2 py-1 fw-bold small">Notifikasi</div>' + (need.length ?
      need.map(function (p) {
        return '<a class="dropdown-item rounded small py-2" href="#/tanaman"><b>' + esc(p.name) + '</b> perlu perawatan<br><span class="text-muted">' + esc(p.location) + '</span></a>';
      }).join('') : '<div class="px-2 py-2 small text-muted">Tidak ada notifikasi baru.</div>');
  }

  function render() {
    current = routeFromHash();
    var pg = pages[current];
    $('#view').innerHTML = pg.html();
    $('#crumb').textContent = pg.title;
    document.title = pg.title + ' - Tumbuloka';
    $$('.nav-item-tb[data-route]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route').split(' ').indexOf(current) > -1);
    });
    if (pg.mount) pg.mount();
    updateBell();
    closeNav();
  }

  function rerenderResults() { if (pages[current].results) pages[current].results(); }

  function openNav() { $('#sidebar').classList.add('open'); $('#backdrop').classList.add('show'); }
  function closeNav() { $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show'); }

  /* ==========================================================
     Event delegasi
     ========================================================== */
  var actions = {
    'nav-toggle': function () { $('#sidebar').classList.contains('open') ? closeNav() : openNav(); },
    'logout': function () { Store.clearSession(); location.replace('index.html'); },
    'reset-data': function () {
      confirmDialog('Reset data kebun?', 'Seluruh data kebun akun ini dikembalikan ke contoh awal.', function () {
        D = Store.resetData(sess.email); toast('Data kebun direset.'); render();
      });
    },
    'page': function (el) {
      var key = el.getAttribute('data-key'), n = parseInt(el.getAttribute('data-page'), 10);
      if (!ui[key] || isNaN(n)) return;
      ui[key].page = n; rerenderResults();
    },

    'add-kategori': function () { kategoriForm(); },
    'edit-kategori': function (el) { kategoriForm(el.getAttribute('data-id')); },
    'del-kategori': function (el) {
      var c = catById(el.getAttribute('data-id'));
      if (!c) return;
      if (plantCount(c.id) > 0) { toast('Kategori "' + c.name + '" masih memiliki tanaman.', 'warning'); return; }
      confirmDialog('Hapus kategori?', 'Kategori "' + c.name + '" akan dihapus.', function () {
        D.categories = D.categories.filter(function (x) { return x.id !== c.id; });
        save(); toast('Kategori dihapus.'); render();
      });
    },
    'export-kategori': function () {
      var rows = [['Nama Kategori', 'Jumlah Tanaman']];
      D.categories.forEach(function (c) { rows.push([c.name, plantCount(c.id)]); });
      downloadCSV('kategori-tanaman.csv', rows); toast('Data kategori diunduh (CSV).');
    },

    'add-tanaman': function () { tanamanForm(); },
    'edit-tanaman': function (el) { tanamanForm(el.getAttribute('data-id')); },
    'del-tanaman': function (el) {
      var p = plantById(el.getAttribute('data-id'));
      if (!p) return;
      var n = D.logs.filter(function (l) { return l.plantId === p.id; }).length;
      confirmDialog('Hapus tanaman?', '"' + p.name + '" dihapus' + (n ? ' beserta ' + n + ' catatan perawatannya.' : '.'), function () {
        D.plants = D.plants.filter(function (x) { return x.id !== p.id; });
        D.logs = D.logs.filter(function (l) { return l.plantId !== p.id; });
        save(); toast('Tanaman dihapus.'); render();
      });
    },
    'log-tanaman': function (el) { logForm(null, el.getAttribute('data-id')); },

    'add-jenis': function () { jenisForm(); },
    'edit-jenis': function (el) { jenisForm(el.getAttribute('data-id')); },
    'del-jenis': function (el) {
      var t = typeById(el.getAttribute('data-id'));
      if (!t) return;
      if (D.logs.some(function (l) { return l.typeId === t.id; })) { toast('Jenis "' + t.name + '" dipakai pada catatan perawatan.', 'warning'); return; }
      confirmDialog('Hapus jenis perawatan?', '"' + t.name + '" akan dihapus.', function () {
        D.careTypes = D.careTypes.filter(function (x) { return x.id !== t.id; });
        save(); toast('Jenis perawatan dihapus.'); render();
      });
    },

    'add-catatan': function () { logForm(); },
    'edit-catatan': function (el) { logForm(el.getAttribute('data-id')); },
    'del-catatan': function (el) {
      var id = el.getAttribute('data-id');
      confirmDialog('Hapus catatan?', 'Catatan perawatan ini akan dihapus.', function () {
        D.logs = D.logs.filter(function (l) { return l.id !== id; });
        save(); toast('Catatan dihapus.'); render();
      });
    },
    'detail-log': function (el) {
      var l = D.logs.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      if (!l) return;
      var p = plantById(l.plantId);
      infoDialog('Detail Aktivitas',
        '<dl class="row mb-0 small"><dt class="col-4 text-muted">Tanggal</dt><dd class="col-8 fw-bold">' + fmt(l.date) + '</dd>' +
        '<dt class="col-4 text-muted">Tanaman</dt><dd class="col-8">' + esc(plantName(l.plantId)) + '</dd>' +
        '<dt class="col-4 text-muted">Kategori</dt><dd class="col-8">' + esc(p ? catName(p.categoryId) : '-') + '</dd>' +
        '<dt class="col-4 text-muted">Lokasi</dt><dd class="col-8">' + esc(p ? p.location : '-') + '</dd>' +
        '<dt class="col-4 text-muted">Perawatan</dt><dd class="col-8">' + esc(typeName(l.typeId)) + '</dd>' +
        '<dt class="col-4 text-muted">Catatan</dt><dd class="col-8">' + esc(l.note) + '</dd></dl>');
    },

    'apply-riwayat': function () {
      var from = $('#rFrom').value, to = $('#rTo').value, err = $('#rErr');
      if (from && to && from > to) { err.textContent = 'Tanggal mulai tidak boleh setelah tanggal akhir.'; err.classList.remove('d-none'); return; }
      err.classList.add('d-none');
      var s = ui.riwayat; s.from = from; s.to = to; s.plant = $('#rPlant').value;
      s.applied = { from: from, to: to, plant: s.plant }; s.page = 1; pages.riwayat.results();
    },
    'sort-riwayat': function () { ui.riwayat.sort = ui.riwayat.sort === 'desc' ? 'asc' : 'desc'; ui.riwayat.page = 1; pages.riwayat.results(); },
    'export-riwayat': function () {
      var rows = [['Tanggal', 'Tanaman', 'Jenis perawatan', 'Catatan']];
      pages.riwayat.list().forEach(function (l) { rows.push([l.date, plantName(l.plantId), typeName(l.typeId), l.note]); });
      downloadCSV('riwayat-perawatan.csv', rows); toast('Riwayat diunduh (CSV).');
    },

    'apply-rekap': function () {
      ui.rekap.month = $('#pMonth').value; ui.rekap.cat = $('#pCat').value;
      ui.rekap.applied = { month: ui.rekap.month, cat: ui.rekap.cat }; pages.rekap.results();
    },
    'export-pdf': function () { window.print(); },
    'export-xls': function () {
      var r = rekapData();
      var rows = [['Rekap Tumbuloka'], ['Periode', monthLabel(r.a.month)], ['Kategori', r.a.cat ? catName(r.a.cat) : 'Semua kategori'], [],
        ['Total tanaman', r.plants.length], ['Aktivitas', r.logs.length], ['Sehat', r.sehat], ['Perlu perawatan', r.need], [], ['Jenis perawatan', 'Jumlah']];
      r.perType.forEach(function (t) { rows.push([t.name, t.count]); });
      rows.push([], ['Tanggal', 'Tanaman', 'Jenis perawatan', 'Catatan']);
      sortLogs(r.logs, 'desc').forEach(function (l) { rows.push([l.date, plantName(l.plantId), typeName(l.typeId), l.note]); });
      downloadCSV('rekap-tumbuloka-' + (r.a.month || 'semua') + '.csv', rows);
      toast('Rekap diunduh sebagai CSV (dapat dibuka di Excel).');
    },

    'apply-filter': function () {
      var s = ui.filter;
      s.q = $('#fQ').value.trim(); s.cat = $('#fCat').value; s.loc = $('#fLoc').value; s.cond = $('#fCond').value;
      s.applied = { q: s.q, cat: s.cat, loc: s.loc, cond: s.cond }; s.page = 1; pages.filter.results();
    },
    'reset-filter': function () {
      var s = ui.filter; s.q = s.cat = s.loc = s.cond = '';
      s.applied = { q: '', cat: '', loc: '', cond: '' }; s.page = 1;
      render();
    },
    'rm-chip': function (el) {
      var k = el.getAttribute('data-key'), s = ui.filter;
      s[k] = ''; s.applied[k] = ''; s.page = 1;
      var map = { q: '#fQ', cat: '#fCat', loc: '#fLoc', cond: '#fCond' };
      if ($(map[k])) $(map[k]).value = '';
      pages.filter.results();
    },

    'add-user': function () { userForm(); },
    'edit-user': function (el) { userForm(el.getAttribute('data-id')); },
    'del-user': function (el) {
      var u = Store.findUser(el.getAttribute('data-id'));
      if (!u || u.email === sess.email) return;
      if (u.role === 'admin' && adminCount() <= 1) { toast('Tidak bisa menghapus admin terakhir.', 'warning'); return; }
      confirmDialog('Hapus pengguna?', u.name + ' (' + u.email + ') beserta data kebunnya akan dihapus.', function () {
        Store.deleteUser(u.email); toast('Pengguna dihapus.'); render();
      });
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var fn = actions[el.getAttribute('data-action')];
    if (fn) { e.preventDefault(); fn(el); }
  });
  $('#backdrop').addEventListener('click', closeNav);
  window.addEventListener('hashchange', render);

  /* ---------- Inisialisasi ---------- */
  $('#uName').textContent = sess.name;
  $('#uEmail').textContent = sess.email;
  $('#uAvatar').textContent = (sess.name || '?').trim().charAt(0).toUpperCase();
  $('#uSub').textContent = isAdmin ? 'Administrator' : 'Kebun pribadi';
  if (isAdmin) $('#adminNav').classList.remove('d-none');
  (function () {
    var d = new Date();
    $('#todayLabel').textContent = DAYL[d.getDay()] + ', ' + d.getDate() + ' ' + MONL[d.getMonth()] + ' ' + d.getFullYear();
  })();
  render();
})();
