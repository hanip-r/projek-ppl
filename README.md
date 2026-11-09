[README.md](https://github.com/user-attachments/files/33851536/README.md)
# Tumbuloka (tanpa database)

Buka `index.html` di browser (perlu internet untuk Bootstrap/ikon/font dari CDN).

Front-end
- tanpa ada nya fitur login dan bisa di akses oleh siapa aja yang memiliki tanman yang ada di daftar tanaman
- pengguna/pemilik tanaman bisa memilih tanman dan melakukan penjadwalan sendiri

Struktur
- index.html (login), register.html (daftar), app.html (aplikasi)
- assets/css/style.css, assets/js/{store,login,register,app}.js

Data disimpan di localStorage browser (per akun). Hanya untuk demo front-end:
kata sandi tidak di-hash dan tidak ada server.
