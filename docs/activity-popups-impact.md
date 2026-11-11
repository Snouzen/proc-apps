# Popup Aktivitas Terakhir

## Implementasi dan dampak existing

- Klik Retur/CreditLimitBatch/Reconcile di Aktivitas Terakhir sekarang membuka dialog ringkasan. Link lama `/dashboard/...` di widget dihapus sehingga tidak melakukan prefetch/navigasi 404. Klik PO tetap memakai drilldown existing; hanya ditambahkan link Lihat Detail pada record yang ID-nya sesuai aktivitas.
- GET baru `/api/activities/detail?activityId=...&recordId=...` memuat record terbaru saat popup/detail dibuka. Audit ID digunakan sebagai referensi, tidak menerima entity/role/scope dari client. Setiap request memeriksa sesi, permission baca modul serta ownership; mengetahui ID bukan hak akses.
- Lihat Detail menuju halaman baca khusus `/activities/[activityId]?recordId=...` yang menampilkan record/batch/PO yang dipilih beserta informasi tambahan. Tidak masuk ke mode edit dan tidak mengubah filter/halaman CRUD existing. Tidak menambah menu baru. Halaman ini meminta API yang sama; API memvalidasi ulang scope dan keanggotaan record dalam aktivitas/batch.
- Permission pusat mengikuti akses role existing. PO dan credit menggunakan scope PO; Retur memakai LokasiBarang/PembebananReturn; Rekon non-pusat memakai validator Rekon existing. Batch campuran di luar scope ditolak seluruhnya, termasuk saat meminta satu anggota yang boleh dibaca.
- Retur: no retur, role pembuat dari CREATE pertama, tanggal input dari createdAt record, produk, qtyReturn, status barang, lokasi barang. Qty tidak dikonversi. Schema tidak mempunyai satuan qty eksplisit; ukuran kemasan produk ditampilkan terpisah pada detail bila tersedia, tidak ditebak sebagai satuan qty.
- Credit: kode batch, waktu pembuatan batch, daftar PO dengan role/tanggal pengajuan awal dari audit UPDATE action=request/reRequest pertama. Pembuat batch bukan otomatis pengaju setiap PO. Riwayat pengajuan yang tidak tersedia ditampilkan —. Anggota batch mengikuti kondisi terbaru, bukan snapshot pada waktu aktivitas lama.
- Rekon: nomor, createdAt, bankStatement, nama ritel dan nominal tersimpan (Balance Net Due). Tidak menghitung net due baru; nilai negatif/0 tetap dipertahankan, hanya diformat untuk tampilan.
- Semua waktu ditampilkan WIB. Nilai kosong ditampilkan —. Identitas pembuat/pengaju tidak memakai pelaku edit terbaru.
- Bulk dengan recordIds lengkap dapat menampilkan daftar ringkas nomor/role/tanggal dan Lihat Detail per record, maksimal 100 identitas. Referensi tidak lengkap ditolak, tidak dipotong diam-diam. Bulk PO existing sudah memiliki log CREATE per PO dan memakai popup PO existing.
- Batas historis: bulk Retur existing hanya count/ritelIds tanpa ID tiap retur. Popup pusat menampilkan count, role dan tanggal import dengan pemberitahuan/reference bahwa rincian tidak tersedia; tidak membuat link ke record tebakan. Scoped feed tetap menyembunyikan log tersebut seperti perubahan scope sebelumnya. Alur penulisan/import Retur tidak diubah dan belum ditambah recordIds, sehingga batas ini juga berlaku bagi bulk yang masih memakai format log existing.
- Loading, deadline UI 20 detik, retry manual, AbortController dan guard pilihan memastikan respons lama tidak mengganti popup terbaru. Dialog dapat di-scroll, memakai Escape/focus trap Radix, dan fokus kembali ke tombol pemicu setelah tutup.
- Error dialog memiliki Reference (kode, requestId, proses/endpoint, HTTP, timestamp). Error internal menjadi pesan 503 generik; SQL, token dan stack tidak diteruskan. Browser/network error tidak memiliki requestId server dan memakai kode client, bukan ID server palsu.
- Tambahan beban hanya pembacaan on-demand saat klik/retry/Lihat Detail, tanpa polling detail. Feed/polling dan pemeriksaan scope yang sudah diverifikasi tetap. Tidak ada migrasi, perubahan database, kalkulasi, permission matrix, approval, proses simpan, atau deploy.

## Checklist manual dev

- [ ] Pusat: klik PO, Retur, Credit Limit, Rekon; popup tepat, tidak ada route /dashboard/... 404.
- [ ] Lihat Detail membuka record yang sama (termasuk anggota batch), hanya baca; PO existing masih bisa dibuka seperti sebelumnya.
- [ ] RM/sitearea: ringkasan dan API langsung menolak record/batch luar scope dan recordId yang bukan anggota.
- [ ] Bandingkan Net Due dengan nilai rekon tersimpan, termasuk nilai 0 dan negatif.
- [ ] Pembuat/pengaju awal tidak berubah mengikuti editor; data historis yang hilang tampil —.
- [ ] Bulk legacy menampilkan keterangan keterbatasan, bukan record atau jumlah parsial yang dianggap lengkap.
- [ ] Cepat pindah aktivitas, tutup saat loading, blokir API dan retry: tidak ada respons lama menimpa, error Reference terlihat.
- [ ] Viewport 320/390/1280px, Tab/Shift+Tab/Escape dan return focus.
- [ ] Jalur detail diperiksa setelah logout/permission berubah: API tetap memvalidasi ulang.

Pengujian otomatis memakai mock DB/network. Data asli, visual browser, fokus keyboard dan performa DB nyata belum diverifikasi langsung.

Hasil verifikasi implementasi: 11/11 tes detail/popup (termasuk stale-response dan retry client), 10/10 scope feed, 11/11 regresi Home lolos. Typecheck, lint terarah dan git diff --check exit 0. Build final `npm run build -- --webpack` exit 0, generate 62/62; script/dependency build tidak diubah. Build default Turbopack tidak diuji ulang pada tahap ini.
