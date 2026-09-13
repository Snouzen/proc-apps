# 🛡️ PANDUAN DAN ATURAN BISNIS BAKU (BUSINESS RULES) MODUL CREDIT LIMIT

> [!CRITICAL]
> **DOKUMEN INI ADALAH ATURAN BAKU (CORE INVARIANTS) MODUL CREDIT LIMIT.**
> Siapapun (Developer atau AI Agent) yang melakukan pengembangan, perbaikan bug, atau penambahan fitur pada modul Credit Limit (`/credit-limit/data`, `/credit-limit/approval`, dan `/api/po/credit-limit`), **DILARANG KERAS** mengubah, melonggarkan, atau menghapus 5 aturan baku di bawah ini tanpa persetujuan eksplisit dari tim operasional/lead developer.

---

## 📌 Latar Belakang Masalah (Root Cause Incident 2026)
Pada insiden sebelumnya, sistem lama mengalami kebocoran data di mana batch lama yang sudah disetujui Direksi (`CL-015`, `CL-019`, `CL-021`) memiliki jumlah PO di bawah 50 dan tetap `OPEN` di database. Akibatnya, query pengajuan baru mencari batch `OPEN` dengan urutan terkecil (`seqNumber: asc`), sehingga PO baru dari cabang menyusup ke dalam batch masa lalu. Seluruh aturan di bawah ini dirancang khusus untuk menjamin integritas data dan mencegah masalah tersebut terulang selamanya.

---

## 📜 6 ATURAN BISNIS BAKU (CORE RULES)

### 1. Rule 1: Maksimal 50 PO per Batch (Hard Cap)
* **Kapasitas**: Jumlah maksimal Purchase Order (PO) dalam satu batch adalah tepat **50 PO**.
* **Auto-Close**: Begitu suatu batch mencapai 50 PO saat pengajuan, batch tersebut **otomatis berstatus `CLOSED`** dari penerimaan PO baru.
* **Batch Baru**: PO ke-51 yang diajukan cabang wajib otomatis membuat batch sequence baru berikutnya (misal: `CL-041/09/2026`).

---

### 2. Rule 2: Close Batch Manual $< 50$ PO Wajib Rata `APPROVED_DIREKSI`
* **Syarat Mutlak**: Tim Pusat hanya dapat melakukan aksi *"Close Batch"* manual pada batch yang jumlahnya di bawah 50 PO jika dan hanya jika **seluruh PO di batch tersebut sudah disetujui Direksi (`APPROVED_DIREKSI`)**.
* **Proteksi Sistem**: Jika masih ada satu saja PO yang berstatus `REQUESTED` (Waiting Pusat) atau `APPROVED` (Waiting Direksi), sistem wajib menolak aksi tersebut (HTTP 400 & SweetAlert warning: *"Batch belum dapat ditutup karena masih ada PO yang belum disetujui Direksi"*).

---

### 3. Rule 3: Batch Approved Pusat / Belang Terkunci Rapat dari Pengajuan Baru (Opsi A)
* **Kunci Pintu Pengajuan**: Begitu suatu batch disetujui Pusat (baik satu PO apalagi seluruh PO berstatus `APPROVED`), batch tersebut **otomatis terkunci rapat dari penerimaan PO baru cabang**.
* **Implementasi Query Backend**:
  ```typescript
  // Query pengajuan baru HANYA boleh mengambil batch OPEN yang belum pernah disetujui Pusat maupun Direksi
  where: {
    status: "OPEN",
    PurchaseOrders: {
      none: {
        statusCreditLimit: { in: ["APPROVED", "APPROVED_DIREKSI"] }
      }
    }
  }
  ```
* **Alur PO Baru**: Jika ada cabang yang mengajukan PO baru, sistem otomatis memasukkannya ke batch sequence baru (tidak akan pernah menyusup ke batch yang sedang diproses Direksi).
* **Di Layar Approval**: Batch yang sudah di-approve Pusat tetap terbuka dan aktif dengan badge *"Waiting Direksi"* hingga Direksi menyelesaikan persetujuannya.

---

### 4. Rule 4: PO Reject Otomatis Keluar dari Batch & Kembali ke Halaman Data
* **Pelepasan Batch**: Baik ditolak oleh Pusat maupun oleh Direksi, PO yang di-reject **langsung dilepaskan dari batch-nya**:
  $$\text{creditLimitBatchId} = \text{null} \quad \& \quad \text{statusCreditLimit} = \text{"REJECTED"}$$
* **Tampilan UI**:
  * PO langsung hilang dari accordion halaman `/credit-limit/approval`.
  * PO kembali muncul di halaman `/credit-limit/data` dengan status `Rejected` (selama memenuhi Rule 6, yaitu belum memiliki invoice).
* **Pengajuan Ulang**: Ketika cabang mengajukan ulang PO tersebut di halaman Data, PO akan **mengikuti urutan batch baru yang sedang berjalan (sequence baru)**, dan tidak akan pernah kembali ke batch lama asalnya.
* **Auto-Close Batch Asal**: Jika PO yang di-reject adalah satu-satunya PO yang tersisa/menggantung sehingga seluruh sisa PO di batch asal sudah `APPROVED_DIREKSI`, batch asal otomatis berstatus `CLOSED`.

---

### 5. Rule 5: Nomor Nota Dinas (ND) Wajib Diisi Sebelum Persetujuan Direksi
* **Approval Pusat (`REQUESTED` $\rightarrow$ `APPROVED`)**: Bersifat fleksibel/opsional. Pusat dapat menyetujui PO walaupun kolom nomor ND masih kosong.
* **Approval Direksi (`APPROVED` $\rightarrow$ `APPROVED_DIREKSI`)**: Nomor ND **WAJIB terisi** (`noNd` tidak boleh `null` atau string kosong).
  * **Approve Satuan**: Jika `noNd` kosong, sistem memblokir persetujuan dan menampilkan warning untuk melengkapi nomor ND terlebih dahulu.
  * **Approve Semua Direksi**: Jika ada satu saja PO dalam batch yang belum ber-ND, sistem memblokir aksi *"Approve Semua (Direksi)"* dan meminta nomor ND dilengkapi untuk seluruh PO.

---

### 6. Rule 6: Syarat Mutlak PO Masuk Credit Limit Data (Punya Tgl Kirim & Belum Ada Invoice)
* **Wajib Memiliki Tanggal Kirim**: Hanya PO yang sudah dijadwalkan pengirimannya (`tglkirim != null`) yang berhak masuk ke halaman `/credit-limit/data`.
* **Pcs Kirim Bebas**: PO dengan `pcsKirim` yang belum memenuhi total PO tetap masuk selama tanggal kirim sudah terisi.
* **Dilarang Keras Memiliki Invoice**: PO yang **sudah memiliki nomor invoice** (`noInvoice` bukan null / string kosong / `"-"` / `"Unknown"`) **DILARANG KERAS** masuk ke halaman `/credit-limit/data`.
* **Implementasi Filter Ganda (Backend & Frontend)**:
  * Backend API (`/api/po?group=credit_data`):
    `{ tglkirim: { not: null }, OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }] }`
  * Frontend Hook (`useCreditLimitData.ts`):
    `eligible = list.filter((po) => !!po.tglkirim && isInvoiceEmpty(po.noInvoice));`
* **Konsekuensi Penolakan (Reject) PO Ber-Invoice**: Jika sebuah PO yang sudah memiliki nomor invoice sempat masuk ke batch approval lalu ditolak (*Reject*) oleh Pusat/Direksi, PO tersebut akan dilepas dari batch (`creditLimitBatchId = null`). Karena PO tersebut memiliki invoice, ia **tidak akan pernah muncul kembali di halaman `/credit-limit/data`**, sehingga otomatis lenyap sepenuhnya dari seluruh modul Credit Limit.

---

## 🔒 ATURAN IMMUTABILITAS STATUS TERMINAL (`APPROVED_DIREKSI`)

1. **PO yang sudah `APPROVED_DIREKSI` terkunci permanen**:
   * Dilarang di-reject.
   * Dilarang di-request ulang (`reRequest`).
   * Dilarang di-uncheck atau diubah centang ND-nya secara massal (`handleChecklistAllND`).
2. **Batch yang sudah selesai (Completed) dilarang dibuka kembali**:
   * Tombol `uncloseBatch` diblokir total untuk batch yang seluruh PO-nya sudah `APPROVED_DIREKSI`.

---

## 🗂️ PETA FILE TERKAIT (SOURCE FILES)

| Komponen | Path File | Tanggung Jawab Utama |
| :--- | :--- | :--- |
| **Backend PO API** | `src/app/api/po/route.ts` | Filter query `group=credit_data` untuk membatasi hanya PO ber-tglkirim dan tanpa invoice. |
| **Backend Credit API** | `src/app/api/po/credit-limit/route.ts` | Validasi transaksi pengajuan, penolakan, persetujuan Pusat/Direksi, auto-close, dan manual close. |
| **Approval Hook** | `src/hooks/useCreditLimitApproval.ts` | Manajemen state accordion approval, pre-validasi client-side, dan SweetAlert alerts. |
| **Approval UI** | `src/components/credit-limit/BatchAccordion.tsx` | Tampilan accordion, badge status (*Waiting Pusat*, *Waiting Direksi*, *Completed*), aksi tombol, dan tooltip. |
| **Data Hook** | `src/hooks/useCreditLimitData.ts` | Pengajuan PO dari cabang (`handleAjukanCreditLimit`) & filter ganda `isInvoiceEmpty`. |
| **Shared Lib** | `src/lib/credit-limit.ts` | Helper due date zone, validasi remarks, dan tipe data bersama. |

---

## ⚙️ ATURAN BAKU RUN BUILD & VERIFIKASI LINT (ZERO SIDE-EFFECT / SURGICAL FIX ONLY)

Untuk mencegah insiden di mana perbaikan kecil (typo/type error) saat build justru merusak, menghapus, atau merombak alur bisnis yang sudah stabil, seluruh proses build dan lint wajib mematuhi panduan baku berikut:

1. **Surgical Fix Only (Fokus Khusus Titik Masalah)**:
   * Jika `npm run build` atau `npm run lint` melaporkan error/typo/type mismatch, perbaikan **hanya boleh menyasar baris kode spesifik yang error**.
   * **Dilarang keras melakukan refactoring liar**: Jangan menulis ulang seluruh file, mengganti dependensi, atau mengubah struktur komponen hanya untuk menyelesaikan typo kecil.
2. **Preservasi Logika Bisnis (No Logic Deletion)**:
   * Dilarang menghapus validasi, filter data, handler state, atau field query database demi mempercepat kelulusan build.
   * Setiap perbaikan tipe (`type fix`) harus menyesuaikan tipe data dengan logika bisnis yang ada, bukan menghilangkan logikanya.
3. **Prosedur Verifikasi Bertahap**:
   * **Langkah 1**: `npm run lint` $\rightarrow$ Pastikan 0 errors.
   * **Langkah 2**: `npm run build` $\rightarrow$ Pastikan seluruh 51 halaman/API ter-generate dengan exit code 0.
   * **Langkah 3**: Review perubahan dengan `git diff` untuk memastikan tidak ada perubahan di luar scope yang tidak sengaja tersimpan.

