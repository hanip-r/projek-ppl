[README.md](https://github.com/user-attachments/files/33851536/README.md)
# Tumbuloka (tanpa database)

Buka `index.html` di browser (perlu internet untuk Bootstrap/ikon/font dari CDN).

Front-end
- Pengguna: user@tumbuloka.com / user123 (tab "Pengguna")
- juga bisa dapat membuat daftar pengguna baru

Struktur
- index.html (login), register.html (daftar), app.html (aplikasi)
- assets/css/style.css, assets/js/{store,login,register,app}.js

Data disimpan di localStorage browser (per akun). Hanya untuk demo front-end:
kata sandi tidak di-hash dan tidak ada server.
