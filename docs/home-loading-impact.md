# Home: pemuatan awal dan diagnostik (5 November 2026)

## Dampak pada proses existing

- `usePoStats` dan `useMasterUnits` memuat data awal tanpa menunggu fokus browser. Tab background dapat melakukan pembacaan awal yang sebelumnya tertunda; tidak ada penambahan polling statistik.
- Hook tersebut digunakan bersama oleh halaman lain. Perubahan unit hanya menghilangkan penundaan karena fokus, tidak mengubah daftar, cache, endpoint, atau permission unit.
- Statistik memakai deadline UI 20 detik, error eksplisit, retry manual, pembatalan request lama, dan guard respons terlambat. Deadline bukan timeout query DB dan bukan batas sesi login.
- Home mengaktifkan opsi `useAuthData({ loadingDeadline: true })` untuk deadline UI 20 detik dan `authError`. Konsumen lain tidak mengaktifkan opsi ini sehingga tidak mendapat deadline atau perubahan roleReady pada error. Di Home, saat error layanan roleReady=false dan muncul retry. Tidak melakukan logout atau menghapus cookie. Promise sesi bersama tidak dibatalkan; retry manual memakai force untuk meminta verifikasi baru. Request lama mungkin masih bekerja di server tetapi guard generasi sesi mencegahnya menimpa cache baru.
- Home menyembunyikan widget turunan statistik saat gagal agar angka nol tidak dianggap hasil valid. Retry tidak me-refresh halaman atau menghapus form lain.
- RecentActivityWidget tetap interval 10 detik ketika terlihat; polling ditunda ketika document.hidden dan dilanjutkan ketika visible. Request yang masih berjalan tidak ditumpuk. Load pertama tetap berjalan meski tab tersembunyi.
- GET `/api/auth/me` dan GET `/api/access-control` mendapat pengukuran `auth`, `permissions`, `total` melalui Server-Timing dan log `[ReadTiming]`. Aktif pada development atau `READ_TIMING_ENABLED=1`; untuk `npm run start` aktifkan flag saat menjalankan server. Tidak perlu flag saat build. Log tidak mencakup identitas, token, password, body, SQL, atau raw error. Pengukuran tidak menambah query dan tidak mengubah payload/status maupun keputusan izin. POST access-control tidak diubah.
- Durasi `auth` masih gabungan pemeriksaan sesi dan query internal; durasi permission dapat termasuk cache/retry. Belum memisahkan antre koneksi dari eksekusi SQL. Pengukuran ini menemukan tahap lambat, bukan menyimpulkan root cause database.

## Checklist manual sebelum deploy

- [ ] `npm run build`, lalu jalankan production lokal dengan READ_TIMING_ENABLED=1 menggunakan konfigurasi dev.
- [ ] Home dimuat dengan fokus di DevTools: statistik muncul tanpa klik sidebar.
- [ ] Ulangi 5 kali, catat Finish dan Server-Timing `/api/auth/me` dan `/api/access-control`; browser Disable cache tidak menonaktifkan cache server.
- [ ] Pusat, RM, sitearea: jumlah dan scope data sesuai akun; widget/drilldown masih bekerja.
- [ ] Blokir `/api/po/stats` melalui DevTools: tampil error/retry, angka nol tidak ditampilkan sebagai hasil. Lepas blokir dan retry berhasil.
- [ ] Simulasikan request statistik tertunda >20 detik: skeleton berubah menjadi pesan timeout; retry pulih, respons lama tidak menimpa data baru.
- [ ] Blokir `/api/auth/me` dengan cache sesi browser kosong (profil incognito): tampil error/retry dan tidak ada logout otomatis.
- [ ] Pindah ke tab lain >10 detik: polling activities berhenti setelah request aktif selesai; kembali visible memuat lagi tanpa duplikasi.
- [ ] Cek halaman lain yang menggunakan useAuthData/useMasterUnits tetap memuat tanpa interaksi awal.

Perubahan ini tidak memerlukan migrasi atau penulisan database. Pengujian otomatis memakai mock; pengukuran DB dev nyata dan verifikasi visual dilakukan terpisah. Jangan menyatakan latensi 10 detik sudah teratasi sebelum diukur kembali.

## Hasil verifikasi implementasi

- `node scripts/test-home-loading.cjs`: 11/11 skenario lolos (hook aktual dengan React/network mock; polling visibility dan status/scope GET diuji).
- `node scripts/test-session-cookie-only.cjs`: 8/8 regresi sesi lolos, termasuk cookie 4 jam dan perpindahan tab.
- `npx tsc --noEmit`: exit 0.
- Full `npm run lint`: exit 0, 0 error; warning existing masih banyak. Setelah memperbaiki warning cleanup ref baru, lint terarah hook/helper/test juga exit 0.
- `git diff --check`: exit 0 (peringatan CRLF pada file Credit Limit dari pekerjaan sebelumnya).
- `npm run build`: gagal dengan internal Turbopack CSS worker (node process exited before connect), sama setelah retry di luar sandbox. Tidak mengubah CSS/dependency/script build untuk mengatasinya.
- Pemeriksaan alternatif `npm run build -- --webpack`: exit 0, generate 61/61. Percobaan sandbox terblokir EPERM membuat direktori .next; retry dengan izin di luar sandbox berhasil.
- Belum mengukur durasi DB nyata atau memverifikasi browser akun user. Tidak ada query pengujian, migrasi, atau mutasi DB yang dijalankan dalam pekerjaan ini; build hanya generate Prisma Client dan kompilasi aplikasi.
