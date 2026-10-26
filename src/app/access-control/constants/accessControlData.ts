export type ActionType = "view" | "create" | "edit" | "delete" | "export" | "approve";

export interface ActionDef {
  id: string;
  name: string;
  type: ActionType;
  description: string;
}

export interface MenuDef {
  id: string;
  category:
    | "Overview & Transaksi"
    | "Perencanaan & Jadwal"
    | "Operasional & Dokumen"
    | "Keuangan & Rekon"
    | "Laporan & Analitik"
    | "Master Data";
  name: string;
  path: string;
  iconName: string;
  description: string;
  actions: ActionDef[];
}

export interface RoleDef {
  code: string;
  name: string;
  scope: string;
  badgeColor: string;
  description: string;
  modules: string[];
}

export const EXISTING_ROLES: RoleDef[] = [
  {
    code: "pusat",
    name: "Admin Pusat (Super Admin)",
    scope: "Nasional (Seluruh Wilayah)",
    badgeColor:
      "bg-blue-100 text-[#004a87] border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    description:
      "Memiliki hak akses menyeluruh ke seluruh modul aplikasi, otorisasi credit limit, manajemen data master, dan rekapitulasi data nasional.",
    modules: [
      "Purchase Order (Semua Fitur)",
      "Schedule & Rekon",
      "Master Data (Unit Produksi, Produk, Ritel)",
      "Credit Limit Approval",
      "Laporan Realisasi & Trend",
    ],
  },
  {
    code: "rm",
    name: "Regional Manager (RM)",
    scope: "Regional Scope",
    badgeColor:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    description:
      "Monitoring performa rantai pasok dan pesanan ritel di seluruh cabang dalam regional yang dinaungi.",
    modules: [
      "Purchase Order (View & Tracking Regional)",
      "Schedule Monitoring Regional",
      "Laporan Realisasi Regional",
      "Trend Pengadaan Regional",
    ],
  },
  {
    code: "sitearea",
    name: "Admin Cabang (Site Area)",
    scope: "Cabang / Site Area Scope",
    badgeColor:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    description:
      "Operasional langsung di tingkat cabang, mencakup input PO, monitoring alokasi cabang, dan pembuatan nota dinas.",
    modules: [
      "Input & Edit Purchase Order Cabang",
      "Alokasi Cabang & Expired Tracking",
      "Tools Nota Dinas",
      "Laporan Realisasi Cabang",
    ],
  },
  {
    code: "magang",
    name: "Admin Bisnis / Sales",
    scope: "Operational Scope",
    badgeColor:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    description:
      "Operasional terbatas untuk percepatan administrasi dokumen pesanan, retur barang, dan verifikasi checklist.",
    modules: [
      "Purchase Order List & Input",
      "Manajemen Retur",
      "Checklist Dokumen Penjualan",
    ],
  },
];

export const SYSTEM_MENUS: MenuDef[] = [
  // 1. Overview & Transaksi
  {
    id: "dashboard",
    category: "Overview & Transaksi",
    name: "Dashboard",
    path: "/",
    iconName: "LayoutDashboard",
    description: "Ringkasan metrik pengadaan, alur pesanan, dan status operasional",
    actions: [
      { id: "dash_view", name: "Lihat Ringkasan & Kartu Metrik", type: "view", description: "Melihat kartu ringkasan total PO, realisasi dan performa" },
      { id: "dash_filter", name: "Filter Periode & Tanggal", type: "view", description: "Menyaring analitik berdasarkan rentang tanggal" },
      { id: "dash_export", name: "Export Ringkasan Dashboard", type: "export", description: "Download rekap data analitik ringkasan" },
    ],
  },
  {
    id: "po",
    category: "Overview & Transaksi",
    name: "Purchase Order",
    path: "/purchase-order",
    iconName: "Package",
    description: "Modul pengelolaan seluruh pesanan pembelian ritel modern",
    actions: [
      { id: "po_view", name: "Lihat Daftar PO & Rincian", type: "view", description: "Melihat tabel list PO, detail produk dan status invoice" },
      { id: "po_create", name: "Tambah PO Baru (Input PO)", type: "create", description: "Menginput purchase order baru ke dalam sistem" },
      { id: "po_edit", name: "Ubah Data PO & Pcs Kirim", type: "edit", description: "Mengedit quantity kirim, tanggal kirim, atau nomor invoice" },
      { id: "po_delete", name: "Hapus Purchase Order", type: "delete", description: "Menghapus data PO dari database sistem" },
      { id: "po_export", name: "Export Data PO ke Excel", type: "export", description: "Download data tabel PO dalam format Excel/Spreadsheet" },
      { id: "po_assign", name: "Assign Driver / Plat Nomor", type: "edit", description: "Menentukan armada supir dan plat nomor pengiriman" },
      { id: "po_invoice", name: "Input & Update No Invoice/Faktur", type: "edit", description: "Memperbarui kelengkapan nomor invoice dan nomor faktur pajak" },
    ],
  },
  {
    id: "checklist_docs",
    category: "Overview & Transaksi",
    name: "Checklist Dokumen",
    path: "/checklist-docs",
    iconName: "FileCheck",
    description: "Monitoring kelengkapan berkas fisik pengiriman (PO, FP, Kwi, Inv, Tagih, Bayar)",
    actions: [
      { id: "check_view", name: "Lihat Status Checklist Dokumen", type: "view", description: "Melihat status verifikasi berkas tagihan dan pembayaran" },
      { id: "check_update", name: "Update Status Checklist (7 Dokumen)", type: "edit", description: "Mencentang kelengkapan status Sdif, PO, FP, Kwi, Inv, Tagih, Bayar" },
      { id: "check_upload", name: "Upload Bukti / Lampiran Dokumen", type: "create", description: "Mengunggah file bukti tagih atau bukti bayar invoice" },
      { id: "check_export", name: "Export Rekap Dokumen", type: "export", description: "Download rekap status kelengkapan dokumen pengiriman" },
    ],
  },

  // 2. Perencanaan & Jadwal
  {
    id: "action_plan_schedule",
    category: "Perencanaan & Jadwal",
    name: "Action Plan > Schedule",
    path: "/schedule",
    iconName: "CalendarDays",
    description: "Jadwal dan alokasi pengiriman harian per armada dan per produk",
    actions: [
      { id: "sched_view", name: "Lihat Kalender & Jadwal Pengiriman", type: "view", description: "Melihat matriks pesanan yang dijadwalkan per hari" },
      { id: "sched_edit", name: "Input Pcs Kirim per Produk", type: "edit", description: "Mengatur jumlah pcs barang yang dialokasikan kirim" },
      { id: "sched_batch", name: "Batch Save Pcs Kirim", type: "edit", description: "Menyimpan seluruh alokasi pengiriman multi-produk sekaligus" },
      { id: "sched_export", name: "Export Jadwal Pengiriman", type: "export", description: "Download jadwal rencana pengiriman cabang" },
    ],
  },
  {
    id: "action_plan_need_assign",
    category: "Perencanaan & Jadwal",
    name: "Action Plan > Need To Assign",
    path: "/need-assign",
    iconName: "ClipboardList",
    description: "Daftar PO terkonfirmasi yang belum memiliki alokasi armada supir",
    actions: [
      { id: "assign_view", name: "Lihat PO Yang Perlu Di-assign", type: "view", description: "Melihat daftar antrian PO yang belum memiliki supir" },
      { id: "assign_action", name: "Assign Vendor, Supir & Plat Nomor", type: "edit", description: "Mengalokasikan vendor logistik, nama supir dan nomor kendaraan" },
      { id: "assign_bulk", name: "Bulk Assign Banyak PO", type: "edit", description: "Mengalokasikan armada ke banyak nomor PO sekaligus" },
    ],
  },
  {
    id: "branch_calendar",
    category: "Perencanaan & Jadwal",
    name: "Branch Plan > Delivery Calendar",
    path: "/branch",
    iconName: "CalendarDays",
    description: "Kalender grid pengiriman cabang dan monitoring tanggal kirim",
    actions: [
      { id: "branch_view", name: "Lihat Kalender Pengiriman Cabang", type: "view", description: "Melihat kalender bulanan pesanan pengiriman cabang" },
      { id: "branch_detail", name: "Buka Detail PO Harian Cabang", type: "view", description: "Melihat popup rincian pesanan pada tanggal yang dipilih" },
      { id: "branch_filter", name: "Filter Wilayah Regional & Site Area", type: "view", description: "Menyaring kalender berdasarkan cabang/regional" },
    ],
  },
  {
    id: "branch_expired",
    category: "Perencanaan & Jadwal",
    name: "Branch Plan > Expired Calendar",
    path: "/branch/expired",
    iconName: "CalendarClock",
    description: "Deteksi dini dan monitoring PO yang mendekati batas expired delivery",
    actions: [
      { id: "exp_view", name: "Lihat PO Mendekati Expired", type: "view", description: "Melihat tabel alert pesanan yang hampir lewat batas waktu" },
      { id: "exp_filter", name: "Filter Ambang Batas Hari Expired", type: "view", description: "Menyaring PO berdasarkan sisa hari menuju jatuh tempo" },
    ],
  },

  // 3. Operasional & Dokumen
  {
    id: "retur",
    category: "Operasional & Dokumen",
    name: "Data Retur",
    path: "/retur",
    iconName: "Undo2",
    description: "Pencatatan barang retur dari ritel, status pemusnahan & penjemputan",
    actions: [
      { id: "retur_view", name: "Lihat Daftar Data Retur", type: "view", description: "Melihat riwayat retur, nomor RTV, dan nilai klaim retur" },
      { id: "retur_create", name: "Input Retur Baru (/retur/new)", type: "create", description: "Menambahkan pencatatan retur produk baru dari toko" },
      { id: "retur_edit", name: "Ubah Status Barang (Diambil / Dimusnahkan)", type: "edit", description: "Memperbarui tindak lanjut fisik barang retur" },
      { id: "retur_delete", name: "Hapus Data Retur", type: "delete", description: "Menghapus arsip data retur" },
      { id: "retur_export", name: "Export Rekap Retur ke Excel", type: "export", description: "Download data rekapitulasi retur" },
    ],
  },
  {
    id: "nota_dinas",
    category: "Operasional & Dokumen",
    name: "Tools > Nota Dinas",
    path: "/tools/nota-dinas",
    iconName: "ScrollText",
    description: "Generator otomatis surat nota dinas permohonan credit limit",
    actions: [
      { id: "nd_generate", name: "Isi & Generate Form Nota Dinas", type: "create", description: "Menginput nomor surat, perihal, dan rincian piutang" },
      { id: "nd_download_word", name: "Download Dokumen Word (.docx)", type: "export", description: "Download draf surat dalam format Microsoft Word" },
      { id: "nd_download_pdf", name: "Download Dokumen PDF Resmi (.pdf)", type: "export", description: "Download surat dalam format dokumen PDF" },
      { id: "nd_preview", name: "Preview Dokumen di Browser", type: "view", description: "Melihat tampilan draf surat sebelum dicetak" },
    ],
  },

  // 4. Keuangan & Rekon
  {
    id: "rekon_calc",
    category: "Keuangan & Rekon",
    name: "Rekonsiliasi > Kalkulasi",
    path: "/rekon/calc",
    iconName: "Calculator",
    description: "Kalkulator rekonsiliasi pembayaran antara invoice, RTV, dan potongan promo",
    actions: [
      { id: "rekon_calc_input", name: "Input Bank Statement & Biaya Admin", type: "create", description: "Memasukkan nominal mutasi bank dan potongan administrasi" },
      { id: "rekon_calc_process", name: "Kalkulasi Invoice vs RTV vs Promo", type: "edit", description: "Menjalankan pencocokan selisih nominal transaksi" },
      { id: "rekon_calc_save", name: "Simpan Hasil Rekonsiliasi", type: "create", description: "Menyimpan data final rekonsiliasi ke arsip sistem" },
    ],
  },
  {
    id: "rekon_data",
    category: "Keuangan & Rekon",
    name: "Rekonsiliasi > Data Rekon",
    path: "/rekon/data",
    iconName: "FileText",
    description: "Arsip dan riwayat berkas rekonsiliasi pembayaran ritel",
    actions: [
      { id: "rekon_view", name: "Lihat Riwayat & Daftar Rekonsiliasi", type: "view", description: "Melihat tabel nomor rekonsiliasi yang telah selesai" },
      { id: "rekon_detail", name: "Buka Rincian Kalkulasi & Invoices", type: "view", description: "Melihat rincian nomor invoice dan RTV yang terikat" },
      { id: "rekon_upload", name: "Upload Bukti Bayar & Rincian Pembayaran", type: "edit", description: "Mengunggah bukti transfer bank pelunasan" },
      { id: "rekon_delete", name: "Hapus Data Rekonsiliasi", type: "delete", description: "Menghapus berkas rekonsiliasi pembayaran" },
      { id: "rekon_export", name: "Export Rekap Rekonsiliasi", type: "export", description: "Download rekap hasil rekonsiliasi ke format Excel" },
    ],
  },
  {
    id: "credit_limit_approval",
    category: "Keuangan & Rekon",
    name: "Credit Limit > Approval",
    path: "/credit-limit/approval",
    iconName: "ShieldCheck",
    description: "Otorisasi pembukaan pagu kredit pesanan pembelian oleh Pusat",
    actions: [
      { id: "cl_appr_view", name: "Lihat Daftar Pengajuan Credit Limit", type: "view", description: "Melihat antrian PO yang menunggu approval pembukaan limit" },
      { id: "cl_appr_approve", name: "Setujui (Approve) Credit Limit PO", type: "approve", description: "Menyetujui pembukaan limit agar PO dapat diproses kirim" },
      { id: "cl_appr_reject", name: "Tolak / Hold Pengajuan Credit Limit", type: "approve", description: "Menolak atau menahan pesanan yang over-limit" },
      { id: "cl_batch_create", name: "Buat Batch Code Credit Limit Baru", type: "create", description: "Membuat kode batch persetujuan berkala" },
    ],
  },
  {
    id: "credit_limit_data",
    category: "Keuangan & Rekon",
    name: "Credit Limit > Data History",
    path: "/credit-limit/data",
    iconName: "FileText",
    description: "Rekapitulasi riwayat status persetujuan credit limit per cabang",
    actions: [
      { id: "cl_data_view", name: "Lihat Rekapitulasi Batch Credit Limit", type: "view", description: "Melihat arsip batch kode dan riwayat PO di dalamnya" },
      { id: "cl_data_filter", name: "Filter Batch Status & Wilayah", type: "view", description: "Menyaring data berdasarkan cabang atau status batch" },
    ],
  },

  // 5. Laporan & Analitik
  {
    id: "report_po",
    category: "Laporan & Analitik",
    name: "Report > Report PO & Trend",
    path: "/report",
    iconName: "BarChart3",
    description: "Analitik penjualan, pemenuhan PO, dan grafik tren pengadaan",
    actions: [
      { id: "rep_view", name: "Lihat Laporan Penjualan & Pemenuhan PO", type: "view", description: "Melihat rekapitulasi tonase dan nilai transaksi" },
      { id: "rep_trend", name: "Lihat Grafik Trend Pengadaan", type: "view", description: "Melihat visualisasi grafik pergerakan pesanan bulanan" },
      { id: "rep_export", name: "Export Laporan PO ke Excel", type: "export", description: "Download data laporan lengkap" },
    ],
  },
  {
    id: "report_realisasi",
    category: "Laporan & Analitik",
    name: "Report > Realisasi Pemenuhan",
    path: "/report/realisasi",
    iconName: "Presentation",
    description: "Slide presentasi eksekutif progres pemenuhan ritel nasional & multi-date",
    actions: [
      { id: "real_view", name: "Lihat Slide Dashboard Progres Pemenuhan", type: "view", description: "Melihat slide presentasi metrik tonase dan mitra ritel" },
      { id: "real_multidate", name: "Multi-Date Picker & Rekap Rapel", type: "create", description: "Membuat rekapan gabungan beberapa tanggal rapel" },
      { id: "real_input", name: "Input & Edit Realisasi Mitra Ritel", type: "edit", description: "Mengisi tonase per mitra dan provinsi pengiriman" },
      { id: "real_delete", name: "Hapus Rekap Realisasi Harian", type: "delete", description: "Menghapus rekapan tanggal tertentu" },
      { id: "real_export_pdf", name: "Export Slide Dashboard ke PDF HD", type: "export", description: "Generate file PDF high-definition dari slide dashboard" },
    ],
  },

  // 6. Master Data
  {
    id: "master_unit_produksi",
    category: "Master Data",
    name: "Master Data > Unit Produksi",
    path: "/master-data/unit-produksi",
    iconName: "FileLock",
    description: "Master data cabang, gudang unit produksi & regional",
    actions: [
      { id: "m_unit_view", name: "Lihat Data Unit Produksi", type: "view", description: "Melihat daftar cabang dan unit produksi se-Indonesia" },
      { id: "m_unit_add", name: "Tambah Unit Produksi Baru", type: "create", description: "Menambahkan lokasi cabang/unit baru" },
      { id: "m_unit_edit", name: "Edit Alamat & Manager Operasional", type: "edit", description: "Memperbarui info pimpinan dan alamat gudang" },
      { id: "m_unit_delete", name: "Hapus Unit Produksi", type: "delete", description: "Menghapus unit produksi dari sistem" },
    ],
  },
  {
    id: "master_produk",
    category: "Master Data",
    name: "Master Data > Produk",
    path: "/master-data/produk",
    iconName: "Package",
    description: "Katalog master SKU beras, gula, minyak dan komoditas pangan",
    actions: [
      { id: "m_prod_view", name: "Lihat Katalog Master Produk", type: "view", description: "Melihat daftar nama produk dan satuan berat" },
      { id: "m_prod_add", name: "Tambah Master Produk Baru", type: "create", description: "Menambahkan produk baru ke katalog" },
      { id: "m_prod_edit", name: "Ubah Nama & Satuan Berat (Kg)", type: "edit", description: "Memperbarui rincian spesifikasi produk" },
      { id: "m_prod_delete", name: "Hapus Master Produk", type: "delete", description: "Menghapus produk dari katalog master" },
    ],
  },
  {
    id: "master_ritel",
    category: "Master Data",
    name: "Master Data > Ritel Modern",
    path: "/master-data/ritel-modern",
    iconName: "ClipboardList",
    description: "Master profil perusahaan mitra ritel (Indomaret, Alfamidi, Hypermart, dll)",
    actions: [
      { id: "m_ritel_view", name: "Lihat Daftar Mitra Ritel Modern", type: "view", description: "Melihat daftar perusahaan dan inisial brand ritel" },
      { id: "m_ritel_add", name: "Tambah Mitra Ritel Baru", type: "create", description: "Mendaftarkan mitra ritel baru" },
      { id: "m_ritel_edit", name: "Ubah Data Ritel & Upload Logo", type: "edit", description: "Memperbarui alamat, inisial dan logo brand" },
      { id: "m_ritel_delete", name: "Hapus Mitra Ritel", type: "delete", description: "Menghapus mitra ritel dari sistem" },
    ],
  },
  {
    id: "master_promo",
    category: "Master Data",
    name: "Master Data > Promo",
    path: "/master-data/promo",
    iconName: "TrendingDown",
    description: "Master program fee promosi, potongan DC, rafaksi & rebate ritel",
    actions: [
      { id: "m_promo_view", name: "Lihat Daftar Program Promo", type: "view", description: "Melihat tabel nilai promo dan nomor surat kegiatan" },
      { id: "m_promo_add", name: "Tambah Program Promo Baru", type: "create", description: "Mencatat nomor kegiatan dan nilai DPP/PPN promo" },
      { id: "m_promo_edit", name: "Ubah Nilai & Periode Promo", type: "edit", description: "Memperbarui nominal atau dokumen pendukung promo" },
      { id: "m_promo_delete", name: "Hapus Data Promo", type: "delete", description: "Menghapus arsip promo" },
      { id: "m_promo_upload", name: "Upload Lampiran Dokumen Promo", type: "create", description: "Mengunggah berkas bukti kesepakatan promo" },
    ],
  },
];

export const DEFAULT_ROLE_CONFIGS: Record<
  string,
  {
    enabledMenus: string[];
    enabledActions: string[];
  }
> = {
  pusat: {
    enabledMenus: SYSTEM_MENUS.map((m) => m.id),
    enabledActions: SYSTEM_MENUS.flatMap((m) => m.actions.map((a) => a.id)),
  },
  rm: {
    enabledMenus: [
      "dashboard",
      "po",
      "action_plan_schedule",
      "action_plan_need_assign",
      "branch_calendar",
      "branch_expired",
      "rekon_calc",
      "rekon_data",
      "credit_limit_data",
      "report_po",
      "report_realisasi",
      "master_ritel",
    ],
    enabledActions: [
      "dash_view",
      "dash_filter",
      "dash_export",
      "po_view",
      "po_create",
      "po_edit",
      "po_export",
      "sched_view",
      "sched_export",
      "assign_view",
      "branch_view",
      "branch_detail",
      "branch_filter",
      "exp_view",
      "exp_filter",
      "rekon_view",
      "rekon_detail",
      "rekon_export",
      "cl_data_view",
      "cl_data_filter",
      "rep_view",
      "rep_trend",
      "rep_export",
      "real_view",
      "real_export_pdf",
      "m_ritel_view",
    ],
  },
  sitearea: {
    enabledMenus: [
      "dashboard",
      "po",
      "action_plan_schedule",
      "branch_calendar",
      "branch_expired",
      "retur",
      "nota_dinas",
      "report_realisasi",
    ],
    enabledActions: [
      "dash_view",
      "dash_filter",
      "po_view",
      "po_create",
      "po_edit",
      "po_export",
      "sched_view",
      "sched_edit",
      "sched_batch",
      "branch_view",
      "branch_detail",
      "branch_filter",
      "exp_view",
      "retur_view",
      "retur_create",
      "retur_edit",
      "retur_export",
      "nd_generate",
      "nd_download_word",
      "nd_download_pdf",
      "nd_preview",
      "real_view",
      "real_multidate",
      "real_input",
      "real_export_pdf",
    ],
  },
  magang: {
    enabledMenus: ["po", "retur", "checklist_docs"],
    enabledActions: [
      "po_view",
      "po_create",
      "po_edit",
      "retur_view",
      "retur_create",
      "retur_edit",
      "retur_delete",
      "retur_export",
      "check_view",
      "check_update",
      "check_upload",
      "check_export",
    ],
  },
};
