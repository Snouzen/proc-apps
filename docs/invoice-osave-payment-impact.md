# Faktur O! Save: rekening pembayaran

## Aturan dan dampak existing

- Generator bersama `src/lib/generateInvoice.ts` menampilkan rekening hanya jika company master `RitelModern.namaPt` sama dengan `O! SAVE GROUP`, setelah normalisasi kapital/spasi. Pencocokan eksak, bukan contains. Identitas company lain tidak diubah.
- Berlaku pada semua inisial, role yang sudah berwenang, unit produksi, tanggal PO, serta status jadwal. Nama inisial tidak ditambahkan ke dokumen. Syarat membuka/membuat faktur tetap existing.
- Di bawah Diterima oleh ditambahkan: Bank BRI; No. Rekening 180501000026304; Atas Nama MANAJEMEN UB INDUSTRI PERUM BULOG.
- Preview dan download memakai template sama sehingga cetak ulang PO lama juga mendapat rekening. File PDF yang sudah tersimpan di perangkat user tidak berubah.
- Khusus O! Save dengan tabel panjang, seluruh blok ringkasan/rekening/tanda tangan/footer berpindah ke halaman baru jika sisa halaman tidak cukup. Dapat menambah satu halaman; informasi tidak terpotong. Company lain mempertahankan pagination existing.
- Nominal, diskon, pajak, nomor faktur, permission, proses Schedule, schema dan database tidak diubah. Nomor rekening disimpan sebagai literal string. Penggantian rekening memerlukan edit kode/deploy; rename company master perlu diperiksa kembali terhadap aturan match.

## Verifikasi

- `node scripts/test-invoice-payment-account.cjs`: 6 kelompok skenario lolos dengan jsPDF dan autoTable aktual (role/inisial/unit/tanggal, company lain dan near-match, parity preview/download, nominal existing, posisi rekening/footer, 7/10/15/20/35 item).
- Contoh memakai data sintetis, bukan PO user: `output/pdf/contoh-faktur-osave.pdf`, `contoh-faktur-osave-multiproduk.pdf`, `contoh-faktur-company-lain.pdf`.
- Sampel menggunakan logo lokal agar tes tidak memanggil Storage prod. Kode logo runtime existing tidak diubah.
- PDF dirender dengan Poppler lalu diperiksa visual: rekening terbaca, tidak menimpa tanda tangan/footer; multi-produk dengan ringkasan halaman berikutnya dan company pembanding tanpa rekening.
- Typecheck dan lint terarah exit 0. Verifikasi browser dengan PO asli, akses logo runtime dan role user belum dijalankan.
- Build `npm run build -- --webpack` exit 0, generate 61/61. Percobaan sandbox gagal EPERM membuat direktori .next; retry di luar sandbox berhasil. Script build/dependency tidak diubah. Build standar Turbopack tidak diuji ulang pada pekerjaan ini.

## Checklist dev sebelum deploy

- [ ] Preview O! Save pada beberapa inisial/unit: rekening tepat, inisial tidak ditambahkan.
- [ ] Preview ulang PO lama dan PO baru O! Save: aturan sama.
- [ ] Download dan preview PO yang sama: rekening/nominal identik (waktu cetak dapat berbeda).
- [ ] Company lain tidak mendapat rekening.
- [ ] PO dengan banyak item: cek semua halaman, termasuk ringkasan, rekening dan footer.
- [ ] Pusat/RM/sitearea: hanya PO yang memang berhak diakses; tidak ada perubahan permission.

Tidak ada koneksi atau mutasi database dalam pengujian ini. Belum deploy.
