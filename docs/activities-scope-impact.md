# Scope Aktivitas Terakhir

## Perubahan dan dampak existing

- GET `/api/activities` sebelumnya mengambil 15 CREATE global tanpa pemeriksaan wilayah. Sekarang RM/sitearea memerlukan kepemilikan record saat ini. Role pelaku aktivitas tidak menentukan akses: aktivitas oleh pusat tetap boleh terlihat jika record-nya berada dalam wilayah akun pembaca.
- Pusat tetap maksimal 15 aktivitas bisnis global. Magang mempertahankan akses baca global existing (tidak diubah pada pekerjaan ini). Role tidak dikenal mendapat feed kosong. Scope RM/sitearea kosong pada akun DB tidak memakai fallback token lama.
- PO memakai `checkPOOwnership`: regional unit menjadi otoritas, regional PO digunakan saat unit belum dialokasikan; sitearea menggunakan kecocokan eksak nama/ID unit, termasuk beberapa area.
- Retur memakai `checkReturOwnership` atas LokasiBarang/PembebananReturn. Record tanpa unit yang bisa diverifikasi, sudah dihapus, serta bulk lama dengan entityId batch tanpa ID record disembunyikan dari RM/sitearea. Log bulk lama hanya memiliki count dan ritelIds; identitas ritel/pelaku bukan bukti scope lokasi. Tidak menebak record berdasarkan company/timestamp.
- Rekon memakai validator akses existing `checkReconcileAccess`, termasuk seluruh invoice/retur dan pembuat draft kosong. Aturan validator tidak diubah.
- CreditLimitBatch hanya muncul ke RM/sitearea bila semua anggota batch saat ini berwenang, tidak kosong, dan maksimal 50 PO. Batch campuran disembunyikan sebagai satu aktivitas agar tidak mengungkap ringkasan global. Ini tidak mengubah daftar/request/approval pada modul Credit Limit. Tidak memotong anggota lalu menganggap sisa batch aman.
- Payload RM/sitearea hanya berisi field yang dipakai widget: id, entity, entityId, action, userName, userRole, createdAt, refNumber dan newData=null. Snapshot newData/oldData tidak dimuat dari audit untuk scoped feed, mencegah bocornya referensi historis atau jumlah massal lintas wilayah.
- Maksimal 15 item diisi dari scan terbatas 3 x 50 kandidat CREATE bisnis terbaru. Jika 150 kandidat habis sebelum terkumpul 15, respons scopeScanLimited=true dan widget memberi catatan riwayat lebih lama tidak dimuat. Hasil kosong tidak berarti tidak ada aktivitas sama sekali sepanjang sejarah. Urutan createdAt DESC + id DESC stabil.
- Dampak performa: pemeriksaan ownership menambah pembacaan relasi; ID PO/retur/rekon/batch dibaca berkelompok per 50 kandidat. Validator Rekon masih dapat membaca relasi tambahan per record. Belum diukur menggunakan DB nyata; pengukuran API feed di dev diperlukan. Interval polling existing tidak diubah.
- Respons private, no-store; kegagalan backend mengembalikan 503 dengan pesan generik/code, tanpa SQL/stack. Tidak ada query parameter untuk memperluas scope, fallback snapshot, atau izin berdasarkan userRole pembuat.
- Tidak mengubah schema, audit historis, transaksi PO/Retur/Rekon/Credit Limit, atau permission matrix. Popup, Lihat Detail, dan link 404 tetap pekerjaan berikutnya, belum dikerjakan.

## Verifikasi dan checklist dev

- `scripts/test-activities-scope.cjs`: helper PO/retur aktual, DB mock; tes pusat, RM, sitearea multi-area, scope hilang, metadata historis, bulk, deleted, batch campuran/oversize, delegasi validator Rekon, cursor refill/limit dan error API.
- `scripts/test-home-loading.cjs`: regresi loading/deadline dan polling visibility tetap lolos.
- [ ] Pusat: aktivitas bisnis global tetap terlihat.
- [ ] RM: aktivitas record regional lain hilang; aktivitas PO regional sendiri yang diinput pusat tetap terlihat.
- [ ] Sitearea: hanya PO/retur yang unitnya berada dalam wewenang akun; beberapa area sesuai konfigurasi.
- [ ] API langsung: metadata record luar scope tidak berada pada JSON (bukan sekadar tersembunyi di UI).
- [ ] Credit batch campuran dan bulk retur lama tidak muncul pada scoped feed; detail modul utama tetap mengikuti existing.
- [ ] Rekon yang berisi invoice/retur luar scope tidak muncul; draft kosong hanya sesuai validator existing.
- [ ] Catat durasi `/api/activities` pada beberapa akun, termasuk akun tanpa aktivitas dalam 150 kandidat terbaru.
- [ ] Tidak ada regresi pada statistik/drilldown PO Home.

Pengujian otomatis tidak mengakses DB. Verifikasi data nyata dan durasi query di dev belum dilakukan. DB prod tidak diakses dan tidak ada migrasi/deploy.

Hasil implementasi: 10/10 tes scope (termasuk validator Rekon aktual) dan 11/11 regresi Home lolos; lint terarah, `tsc --noEmit`, `git diff --check` exit 0. Build `npm run build -- --webpack` exit 0, generate 61/61. Build standar Turbopack tidak diuji ulang pada tahap ini; tidak mengubah script atau dependency.
