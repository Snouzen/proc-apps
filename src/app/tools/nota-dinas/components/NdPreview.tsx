import React from "react";
import { NdFormData } from "@/lib/generateNdWord";

interface NdPreviewProps {
  formData: NdFormData;
}

export default function NdPreview({ formData }: NdPreviewProps) {
  const highlight = (val: string, placeholder: string, normal?: boolean) => {
    if (!val)
      return (
        <span className="text-rose-400 italic text-[10px] break-words [overflow-wrap:anywhere]">
          [{placeholder}]
        </span>
      );
    if (normal) return <span className="break-words [overflow-wrap:anywhere]">{val}</span>;
    return <span className="text-blue-700 dark:text-blue-400 font-semibold break-words [overflow-wrap:anywhere]">{val}</span>;
  };

  return (
    <div
      className="bg-white shadow-2xl rounded-lg w-full max-w-[680px] mx-auto min-w-0"
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "12px",
        lineHeight: "1.6",
        color: "#1a1a1a",
        aspectRatio: "1/1.414",
        padding: "clamp(16px, 3.5vw, 48px) clamp(12px, 3.5vw, 56px)",
        position: "relative",
      }}
    >
      {/* Kop Surat */}
      <div className="text-center mb-4">
        <div
          className="font-bold text-base sm:text-lg tracking-[2px]"
        >
          NOTA DINAS
        </div>
      </div>

      {/* Header Fields */}
      <div className="mb-4 text-xs pl-0 sm:pl-[24%] md:pl-[28%] transition-all">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="align-top whitespace-nowrap" style={{ width: "85px", padding: "1px 0" }}>
                Nomor
              </td>
              <td className="align-top" style={{ width: "14px", padding: "1px 0" }}>
                :
              </td>
              <td className="align-top break-words [overflow-wrap:anywhere]" style={{ padding: "1px 0" }}>
                {highlight(formData.nomor_surat, "Nomor Surat", true)}
              </td>
            </tr>
            <tr>
              <td className="align-top whitespace-nowrap" style={{ padding: "1px 0" }}>
                Kepada Yth
              </td>
              <td className="align-top" style={{ padding: "1px 0" }}>:</td>
              <td className="align-top break-words [overflow-wrap:anywhere]" style={{ padding: "1px 0" }}>
                Direktur Pemasaran
              </td>
            </tr>
            <tr>
              <td className="align-top whitespace-nowrap" style={{ padding: "1px 0" }}>Dari</td>
              <td className="align-top" style={{ padding: "1px 0" }}>:</td>
              <td className="align-top break-words [overflow-wrap:anywhere]" style={{ padding: "1px 0" }}>
                GM UB Industri
              </td>
            </tr>
            <tr>
              <td className="align-top whitespace-nowrap" style={{ padding: "1px 0" }}>
                Perihal
              </td>
              <td className="align-top" style={{ padding: "1px 0" }}>:</td>
              <td className="align-top break-words [overflow-wrap:anywhere]" style={{ padding: "1px 0" }}>
                {highlight(formData.det_perihal, "Perihal", true)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className="mb-4 mt-2 w-full"
        style={{
          borderTop: "3px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          height: "6px",
          boxSizing: "border-box",
        }}
      />

      {/* Body */}
      <div style={{ fontSize: "12px", textAlign: "justify" }}>
        <p className="mb-2">
          Sehubungan dengan adanya transaksi penjualan Tunda Bayar dengan Ritel
          Modern di UB Industri, bersama ini kami sampaikan hal-hal sebagai
          berikut:
        </p>

        <ol className="list-decimal pl-5 space-y-2 mb-3">
          <li>
            Seluruh transaksi penjualan dengan Ritel Modern sebagaimana <em>business
            as usual</em> di lingkungan tersebut, dilakukan menggunakan mekanisme
            Tunda Bayar dengan <em>Term of Payment</em> (TOP) maksimal 30 hari kalender
            atau lebih lanjut diatur dalam PJB, dimana hal tersebut juga berlaku bagi Perusahaan lain
            yang menjadi supplier Ritel Modern.
          </li>
          <li>
            Sebagaimana Peraturan Direksi (PD) nomor PD-13/DB100/03/2025 tanggal
            7 Maret 2025 tentang Penjualan Komoditas Komersial tertuang bahwa:
            <div className="mt-2 ml-2 space-y-2">
              <p>
                <strong>Pasal 11 ayat (1)</strong> : Tunda Bayar dapat diberikan kepada saluran penjualan
                Distributor yang dilakukan secara kontrak terpusat, Unit Bisnis Perusahaan, Mitra
                Penjualan Ekspor, <strong>jaringan ritel</strong>, dan Penjualan Langsung selain Pasar Rakyat
                dan perorangan.
              </p>
              <p>
                <strong>Pasal 11 ayat (14)</strong> : Perusahaan dapat melayani transaksi penjualan kepada
                pembeli yang masih memiliki tunggakan pembayaran (hutang penjualan) dengan
                persetujuan Kantor Pusat dengan ketentuan sebagai berikut:
              </p>
              <ol className="list-[lower-alpha] pl-5 space-y-1">
                <li>
                  Merupakan transaksi kontrak terpusat dimana pelayanan penjualannya
                  dilakukan di Kanwil/Kanca;
                </li>
                <li>
                  Transaksi dengan saluran penjualan <strong>ritel modern</strong>/horeka, Kementerian,
                  Lembaga, BUMN/BUMD, Satuan kerja perangkat daerah/instansi lainnya, Unit
                  Bisnis Perusahaan dan Mitra Penjualan Ekspor yang memiliki ketentuan <em>term
                  of payment</em> (TOP) dan diatur dalam PJB/Kontrak/trading term.
                </li>
              </ol>
            </div>
          </li>
          <li>
            Per tanggal{" "}
            {highlight(formData.tgl_input, "Tanggal")} realisasi
            penjualan UB Industri sebesar{" "}
            {highlight(formData.nominal_teks_1, "Nominal Realisasi")},
            kontribusi penjualan Ritel Modern sebesar{" "}
            {highlight(formData.nominal_teks, "Nominal Ritel Modern")}{" "}
            {highlight(formData.percentage, "Persentase")} atau setara{" "}
            {highlight(formData.qty, "Qty Ton")} Ton Beras Premium.
          </li>
          <li>
            Posisi Piutang ke eksternal (non Perum BULOG) per tanggal{" "}
            {highlight(formData.tgl_input, "Tanggal")} adalah sebesar{" "}
            {highlight(formData.nominal_teks_2, "Piutang Eksternal")}, jumlah
            piutang kurang dari 30 Hari sebesar{" "}
            {highlight(formData.nominal_teks_3, "Piutang < 30hr")} dan jumlah
            piutang lebih dari 30 Hari sebesar{" "}
            {highlight(formData.nominal_teks_4, "Piutang > 30hr")}. Terdapat
            pembayaran yang belum dilakukan <em>bank reconcile</em> sebesar{" "}
            {highlight(formData.nominal_teks_5, "Belum Rekon")}, maka saldo
            piutang bersih adalah sebesar{" "}
            {highlight(formData.nominal_teks_6, "Saldo Bersih")}. Rincian piutang sebagai
            berikut (dalam jutaan rupiah):
            <div className="my-3 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse border border-slate-800 text-[9px] text-center" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr className="bg-[#daeef3]">
                    <th colSpan={4} className="border border-slate-800 p-1 font-semibold">AGED RECEIVABLE EKSTERN</th>
                    <th className="border border-slate-800 p-1 font-semibold">CASH IN (Rp)</th>
                    <th className="border border-slate-800 p-1 font-semibold">NET PIUTANG (INC UNRECONCILE)</th>
                    <th className="border border-slate-800 p-1 font-semibold">Sales</th>
                    <th rowSpan={2} className="border border-slate-800 p-1 font-semibold w-[60px]">%AR vs<br/>SALES</th>
                  </tr>
                  <tr className="bg-[#daeef3]">
                    <th className="border border-slate-800 p-1 font-semibold">TANGGAL</th>
                    <th className="border border-slate-800 p-1 font-semibold w-[70px]">1 - 30 HARI (Rp)</th>
                    <th className="border border-slate-800 p-1 font-semibold w-[70px]">&gt;30 Hari (Rp)</th>
                    <th className="border border-slate-800 p-1 font-semibold w-[70px]">Total (Rp)</th>
                    <th className="border border-slate-800 p-1 font-semibold">Outstanding Payment<br/>(UNRECONCILE)</th>
                    <th className="border border-slate-800 p-1 font-semibold">Rp</th>
                    <th className="border border-slate-800 p-1 font-semibold">Rp</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.list_piutang.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-slate-800 p-1 text-left whitespace-nowrap">{highlight(row.tgl_input, "Tgl/Info", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_1_30, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_2_30, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.total, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_cash_in, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_net_piutang, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_sales, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_ars, "-", true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Kondisi Piutang lebih dari 30 Hari dikarenakan beberapa hal yaitu
              adanya proses rekonsiliasi uang masuk, adanya kekurangan kelengkapan
              dokumen seperti Faktur Pajak (sentralisasi Kantor Pusat), Manajemen Retur, Invoice, Surat Jalan
              dan Kwitansi sehingga mengakibatkan keterlambatan penagihan.
            </p>
          </li>
          <li>
            Adapun proses penagihan dan koordinasi terus dilakukan agar proses
            pembayaran segera terealisasi.
          </li>
          <li>
            Melanjutkan <em>Purchase Order</em> dari Ritel Modern, terdapat pesanan yang
            memerlukan persetujuan pembukaan <em>Credit Limit</em> pada ERP BULOG diantaranya:
            <div className="mt-2 text-slate-400 italic text-[10px]">
              [Data Batch Credit Limit - akan diintegrasikan]
            </div>
          </li>
        </ol>

        <p className="mb-2">
          Sehubungan dengan hal tersebut di atas, kami mohon persetujuan Bapak
          untuk pembukaan credit limit PO tersebut pada ERP BULOG.
        </p>
        <p className="mb-4">
          Demikian disampaikan, atas persetujuan Bapak kami ucapkan terima kasih.
        </p>
      </div>

      {/* Footer - Signature */}
      <div className="mt-6" style={{ fontSize: "12px" }}>
        <div className="text-right">
          <p className="mb-8">Jakarta, &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {formData.tgl_input ? formData.tgl_input.split(" ")[1] : ""} 2026</p>
          <p className="font-bold">FRIMA AGUNG NITIPRAJA</p>
          <p>GM UB Industri</p>
        </div>
      </div>

      {/* Tembusan */}
      <div className="mt-4" style={{ fontSize: "12px" }}>
        <p className="font-bold mb-1">Tembusan Yth:</p>
        <ol className="list-decimal pl-4 text-slate-600">
          <li>Ka SPI Wilayah Kanpus</li>
          <li>Kadiv Penjualan Pasar Umum</li>
          <li>Kadiv TI</li>
        </ol>
      </div>
    </div>
  );
}
