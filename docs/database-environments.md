# Identitas database proc-apps

Dicatat atas instruksi pengguna pada 4 November 2026. Gunakan catatan ini untuk memverifikasi lingkungan sebelum menjalankan operasi database.

| Lingkungan | Organisasi | Paket menurut pengguna | Nama project | Project reference Supabase | Identitas pengguna PostgreSQL yang diberikan pengguna |
| --- | --- | --- | --- | --- | --- |
| Produksi | Snouzen's org | Pro | `proc-apps` | `rzjlkpumrsjpafduhlgt` | `postgres.rzjlkpumrsjpafduhlgt` |
| Development | Angga | Free | `proc-apps-dev` | `mytkqzkpywdrpnrgafss` | `postgres.mytkqzkpywdrpnrgafss` |

Nama organisasi, project, dan paket di atas berasal dari informasi pengguna, belum diverifikasi melalui dashboard Supabase. Project reference menjadi acuan identitas; nama dan paket dapat berubah.

Identitas tersebut bukan connection string lengkap: host, port, nama database, dan kredensial tetap harus disediakan melalui konfigurasi rahasia yang sesuai. Jangan menyimpan password atau connection string berkredensial dalam dokumentasi, log, maupun Git.

## Konteks penyalinan yang telah diizinkan

- Pengguna menyatakan koneksi aplikasi saat ini diarahkan ke database produksi; verifikasi identitas koneksi efektif sebelum operasi, karena konfigurasi dapat berubah.
- Pengguna mengizinkan penimpaan data testing database development dengan salinan data produksi untuk pengujian.
- Arah penyalinan: produksi `rzjlkpumrsjpafduhlgt` sebagai sumber baca, development `mytkqzkpywdrpnrgafss` sebagai tujuan tulis.
- Sebelum penimpaan, cocokkan kedua koneksi dengan project reference di atas dan pastikan sumber dan tujuan berbeda. Jika identitas tidak dapat diverifikasi, hentikan operasi.
- Izin penimpaan development tidak memberikan izin untuk mengubah database atau berkas storage produksi.
- Cakupan data sensitif, akun/sesi, dan referensi storage perlu ditetapkan sebelum penyalinan. Operasi penyalinan belum dilakukan saat catatan ini dibuat.

## Batas wajib perlindungan produksi

Instruksi eksplisit pengguna: database produksi belum memiliki backup yang tersedia bagi pengguna. Jangan menganggap backup Pro aktif atau dapat dipulihkan sebelum diverifikasi.

- Produksi hanya sumber baca. Dilarang mengeksekusi INSERT, UPDATE, DELETE, TRUNCATE, DROP, ALTER, CREATE, migrasi, reset, seed, perubahan role/permission, atau perubahan pengaturan database/project pada prod dalam pekerjaan ini.
- Sebelum setiap proses yang menyentuh prod, jelaskan kepada pengguna alasan, jenis akses/query, batas beban, dan tujuan hasilnya. Jika mengulang proses, jelaskan alasan pengulangannya.
- Gunakan transaksi READ ONLY yang diverifikasi oleh server, satu koneksi, query berurutan, batas waktu query dan penantian lock. Pengaturan timeout/read-only pada koneksi sesi bukan perubahan konfigurasi permanen database.
- SELECT tetap memakai resource dan dapat memegang lock baca; jangan menjanjikan dampak nol. Hindari load test, query berat tanpa batas, dan penguncian baris FOR UPDATE pada prod.
- Koneksi sumber harus cocok dengan project ref prod dan tujuan harus cocok dengan project ref dev. Jika keduanya sama atau tidak cocok, hentikan operasi sebelum penulisan apa pun.
- TLS wajib memverifikasi sertifikat dan hostname menggunakan CA tepercaya. Jangan melemahkan TLS untuk meloloskan penyalinan.
- Sebelum penimpaan dev, siapkan dan verifikasi salinan sumber yang dapat dipulihkan untuk cakupan tabel aplikasi yang disetujui. Dump tabel aplikasi bukan backup lengkap Supabase: Auth, Storage, konfigurasi platform, dan cakupan lain harus dinyatakan terpisah.
- File backup/data produksi lokal wajib disimpan di lokasi terlindungi yang diabaikan Git; jangan mencetak isi data sensitif atau kredensial ke chat/log.
- Izin menimpa dev tetap berlaku. Pemeriksaan baca saja, ekspor sumber, dan restore dev adalah tahap berbeda; laporkan tahap yang benar-benar sudah dijalankan.

## Catatan pemeriksaan 4 November 2026

- Pemeriksaan selesai pada `2026-11-04T03:24:37.533Z` (10:24 WIB). Alasan akses prod: memverifikasi sumber dan memetakan kompatibilitas struktur/jumlah data sebelum menyiapkan salinan.
- Prod dan dev diakses berurutan dengan satu koneksi per lingkungan, TLS dengan CA yang diberikan pengguna, default transaksi read-only, dan transaksi eksplisit `REPEATABLE READ READ ONLY`. Server mengonfirmasi `transaction_read_only = on`.
- Query hanya membaca identitas sesi/database, metadata kolom/constraint, jumlah baris, dan ukuran 13 tabel aplikasi. Tidak ada isi baris bisnis/password yang dicetak, tidak ada mutasi database, dan koneksi ditutup setelah pemeriksaan.
- Prod memiliki 51.901 baris total pada 13 tabel yang diperiksa, termasuk 16.578 PO, 22.270 item PO, 6.679 retur, 368 rekonsiliasi, dan 74 batch credit limit pada snapshot pemeriksaan.
- Tabel `PurchaseOrder`, `data_retur`, dan `reconciliations` berbeda urutan fisik kolom. Penyalinan wajib menggunakan nama kolom eksplisit, bukan mengandalkan urutan `SELECT *`.
- Tabel dev `realisasi_pemenuhan` belum memiliki kolom nullable `daftarRegional` (text), `daftarTanggal` (text[]), dan `tanggalAkhir` (timestamp) yang ada di prod. Penyesuaian struktur yang diperlukan hanya boleh menyasar dev.
- Laporan metadata lokal: `scratch/db-clone-preflight.json` (diabaikan Git). Sertifikat pengguna tersimpan sebagai `scratch/source-prod-ca.crt.crt` dan `scratch/target-dev-ca.crt.crt`; ekstensi ganda tidak mengubah isi sertifikat.
- Status tahap ini: pemeriksaan selesai; belum ada dump/backup data sumber yang dibuat atau diverifikasi, belum ada perubahan schema dev, dan belum ada restore/penimpaan dev.

## Penyesuaian struktur dev — selesai 4 November 2026

- Atas permintaan pengguna, script `scripts/db-align-dev-schema.cjs` dijalankan khusus menggunakan `TARGET_DEV_DATABASE_URL` dan hanya membuat koneksi ke project dev `mytkqzkpywdrpnrgafss`. Jumlah koneksi prod pada proses ini: 0.
- Script memakai metadata sumber dari laporan lokal sebelumnya, bukan mengakses ulang prod. Mode rencana baca saja dijalankan sebelum mode apply.
- Dalam satu transaksi, ditambahkan kolom nullable `daftarRegional text`, `daftarTanggal text[] DEFAULT ARRAY[]::text[]`, dan `tanggalAkhir timestamp(3) without time zone` pada `public.realisasi_pemenuhan` dev.
- Sebelum commit, jumlah baris dan checksum semua nilai kolom lama diverifikasi tetap sama; 1 baris testing dev dipertahankan. Lock tabel singkat dan timeout hanya berlaku pada dev.
- Setelah commit, verifikasi ulang melalui koneksi dev yang baru mengonfirmasi tidak ada kolom rencana yang tersisa. Script bersifat idempoten dan menolak koneksi dengan identitas selain dev.
- Bukti hasil lokal: `scratch/db-dev-schema-alignment.json`. Tidak ada perubahan `prisma/schema.prisma`, migrasi Prisma, konfigurasi utama koneksi, tabel/data prod, atau Storage.
- Status penyalinan: dump/backup sumber dan restore data prod ke dev belum dijalankan. Penyesuaian struktur dev ini tidak berarti database sudah di-clone.

## Clone data bisnis ke dev — selesai 4 November 2026

- Pengguna secara eksplisit memilih mempertahankan akun dan password dev. Tabel `User` dev tidak ditimpa. Audit keamanan/konfigurasi dev untuk entitas `AccessControl`, `RevokedSession`, `RateLimit`, dan `RateLimitAccount` juga dipertahankan.
- Akses prod hanya untuk snapshot tabel aplikasi dengan satu koneksi, default read-only dan transaksi `REPEATABLE READ READ ONLY`, cursor 500 baris, serta batas 15 detik per query. Tidak ada perintah tulis/migrasi atau operasi Storage prod.
- Snapshot pertama tidak lengkap karena representasi metadata primary key `name[]` dari driver; koneksi baca ditutup. Penyebab diperbaiki dengan tipe `text[]`; pengguna diberi alasan sebelum pengulangan. Snapshot parsial tidak dipakai.
- Snapshot prod yang berhasil: `database-backups.local/source-2026-11-04T03-49-10-482Z-de5658ce`, berisi 13 tabel aplikasi dan 51.928 baris. Seluruh file diverifikasi melalui dekripsi, jumlah baris, dan SHA-256. Ini snapshot tabel aplikasi, bukan backup penuh Supabase Auth/Storage/platform.
- Cadangan dev sebelum restore: `database-backups.local/target-2026-11-04T03-56-05-623Z-e5d73216`, berisi 13 tabel dan 18.907 baris. Cadangan juga terverifikasi.
- Direktori `database-backups.local` diabaikan Git dan dibatasi ACL untuk akun Windows saat ini serta SYSTEM. File data memakai gzip + AES-256-GCM; kunci dilindungi Windows DPAPI CurrentUser. Pemulihan kunci bergantung pada akun/profil Windows tersebut; jangan hapus folder, `key.dpapi`, atau profil pemilik tanpa menyiapkan pemulihan terpisah.
- Restore pertama gagal pada DNS dev (`ENOTFOUND`) sebelum penulisan dan sebelum percobaan commit. Setelah DNS diperiksa, restore diulang hanya ke dev, tanpa mengakses prod lagi.
- Restore yang berhasil hanya menghubungi project dev. Sebelas tabel bisnis diganti dalam satu transaksi, menggunakan nama kolom eksplisit tanpa CASCADE atau penonaktifan foreign key/trigger. Sebelum penimpaan, schema dan checksum dev dibandingkan terhadap backup; sesudah penyalinan, checksum dan jumlah baris diperiksa sebelum commit.
- Sebanyak 4.202 audit bisnis sumber disalin. Sebanyak 28 akun/password dev dan 26 log keamanan/konfigurasi dev diverifikasi tidak berubah.
- Selesai pada `2026-11-04T06:30:42.549Z` (13:30 WIB). Koneksi dev baru setelah commit mengonfirmasi seluruh pemeriksaan data lolos. Koneksi prod saat tahap restore: 0; operasi Storage: 0.
- Jumlah data bisnis hasil restore: Product 26; UnitProduksi 35; ritel_modern 860; credit_limit_batches 74; PurchaseOrder 16.583; PurchaseOrderItem 22.278; data_retur 6.684; promos 76; reconciliations 368; realisasi_pemenuhan 38; realisasi_pemenuhan_items 549.
- Bukti hasil: `database-backups.local/clone-receipt.json`. Script: `scripts/db-clone-data.cjs`.
- Konfigurasi `.env`, koneksi utama aplikasi, AUTH_SECRET, serta koneksi/key Supabase Storage tidak diubah oleh clone. Sebelum pengujian aplikasi, pilih seluruh konfigurasi dev secara konsisten; jangan mengarahkan hanya database ke dev sambil memakai kredensial Storage prod. URL file prod yang tersalin masih merupakan referensi, bukan berkas Storage yang diduplikasi.
