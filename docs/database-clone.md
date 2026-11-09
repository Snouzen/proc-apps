# Salinan database aplikasi untuk pengujian

Identitas dan batas akses sumber/tujuan ada di [database-environments.md](database-environments.md). Produksi hanya sumber baca; perubahan dan restore hanya untuk development.

## Hasil 4 November 2026

Data bisnis prod telah disalin ke dev. Akun/password serta audit keamanan/konfigurasi dev dipertahankan sesuai pilihan pengguna. Hasil diverifikasi berdasarkan jumlah baris dan checksum dari koneksi dev yang baru setelah commit.

Folder backup: `D:\Projects\proc-apps\database-backups.local`.

- `latest-source.json`: menunjuk snapshot tabel aplikasi prod yang lengkap dan terverifikasi.
- `latest-target.json`: menunjuk snapshot pemulihan dev sebelum restore.
- `clone-receipt.json`: bukti restore dan hasil pemeriksaan.
- Subfolder snapshot masing-masing berisi `manifest.json`, `key.dpapi`, dan file tabel terenkripsi `*.enc`.

Jangan menghapus folder backup atau hanya menyalin file `.enc` tanpa manifest dan kuncinya. Kunci menggunakan Windows DPAPI CurrentUser: file backup tidak otomatis dapat didekripsi oleh akun/komputer lain. Folder dibatasi ACL dan diabaikan Git. Jangan unggah backup atau kunci ke repository/chat.

Snapshot ini mencakup 13 tabel aplikasi di schema `public`, termasuk salinan terenkripsi `User` dan `AuditLog` untuk keperluan cadangan. Restore pengujian hanya mengganti 11 tabel bisnis serta audit bisnis, sambil mempertahankan `User` dan audit keamanan dev. Supabase Auth, berkas Storage, konfigurasi platform, serta schema sistem lainnya tidak disalin.

## Pengaman script

`scripts/db-clone-data.cjs` memiliki tahap terpisah: `snapshot-source`, `backup-dev`, dan `restore-dev --apply`. Pemeriksaan koneksi dipatok ke project ref prod/dev yang diketahui. Script menolak koneksi tulis ke sumber. Setiap proses yang mengakses prod harus dijelaskan dahulu kepada pengguna sesuai instruksi proyek.

Restore memverifikasi kedua backup secara lokal, mengecek schema dan data dev yang akan ditimpa, lalu menggunakan satu transaksi dev. Foreign key tetap aktif, tidak ada TRUNCATE CASCADE, dan tidak ada perubahan Storage. Kegagalan sebelum commit dibatalkan; jika respons commit tidak pasti, status harus diperiksa sebelum mengulang.

File data memuat representasi JSON asli PostgreSQL: angka/desimal tidak diubah menjadi Number JavaScript dalam jalur restore. Insert menyebutkan nama kolom eksplisit untuk menangani perbedaan urutan kolom antardatabase.

## Sebelum menjalankan aplikasi untuk pengujian

Clone tidak mengganti konfigurasi aplikasi. Pastikan koneksi database, kredensial Supabase API/Storage, dan rahasia sesi menggunakan lingkungan dev sebelum melakukan pengujian tulis. Jangan menjalankan tes lewat koneksi utama yang masih menunjuk prod. Referensi URL berkas prod dapat tetap ada dalam data hasil clone; tidak ada file Storage yang telah diduplikasi.
