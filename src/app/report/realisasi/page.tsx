"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus,
  Download,
  Calendar,
  Edit2,
  Trash2,
  Loader2,
  Eye,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
} from "lucide-react";
import Swal from "sweetalert2";
import RealisasiSlide from "./components/RealisasiSlide";
import RealisasiFormSplit from "./components/RealisasiFormSplit";
import { FormRowItem, OptionRitel } from "./components/RealisasiFormModal";
import { generateRealisasiPdf } from "@/lib/generateRealisasiPdf";
import { getMe } from "@/lib/me";
import DateInputHybrid from "@/components/DateInputHybrid";

// Helper: Normalize any date input or ISO string to YYYY-MM-DD
const formatDateToYYYYMMDD = (d: any): string => {
  if (!d) return "";
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    if (d.includes("T")) {
      const part = d.split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
    }
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function RealisasiPemenuhanPage() {
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");

  // Split View state
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states (synced live with preview)
  const [tanggal, setTanggal] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [judul, setJudul] = useState("PROGRES PEMENUHAN RITEL MODERN");
  const [subjudul, setSubjudul] = useState("");
  const [sumberCatatan, setSumberCatatan] = useState("");
  const [daftarRegional, setDaftarRegional] = useState("");
  const [items, setItems] = useState<FormRowItem[]>([]);

  // Retailer options for dropdown
  const [ritelOptions, setRitelOptions] = useState<OptionRitel[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const slideRef = useRef<HTMLDivElement>(null);

  // 1. Check Auth Role
  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        if (me?.authenticated) {
          setRole(me.role || null);
        } else {
          setRole(null);
        }
      } catch {
        setRole(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // 2. Fetch Retailer Options
  useEffect(() => {
    if (role !== "pusat") return;
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await fetch("/api/realisasi/ritel-options");
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setRitelOptions(json.data);
        }
      } catch (err) {
        console.error("Failed to load ritel options:", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [role]);

  // 3. Earliest report date ever created by user (disables all dates prior to this)
  const minDateStr = useMemo(() => {
    if (!records || records.length === 0) return undefined;
    const dateStrings = records
      .map((r) => formatDateToYYYYMMDD(r.tanggal))
      .filter((d): d is string => Boolean(d))
      .sort();
    return dateStrings[0];
  }, [records]);

  // Matching records for the selected date
  const matchingDateRecords = useMemo(() => {
    if (!selectedDateStr || !records || records.length === 0) return [];
    return records.filter(
      (r) => formatDateToYYYYMMDD(r.tanggal) === selectedDateStr
    );
  }, [records, selectedDateStr]);

  // Dates that already have a report (excluding currently edited record)
  const existingReportDates = useMemo(() => {
    return records
      .filter((r) => r.id !== editingId)
      .map((r) => formatDateToYYYYMMDD(r.tanggal));
  }, [records, editingId]);

  // Handle user changing date via input date
  const handleDateChange = (newDate: string) => {
    if (minDateStr && newDate && newDate < minDateStr) {
      newDate = minDateStr;
    }
    setSelectedDateStr(newDate);
    const matches = records.filter(
      (r) => formatDateToYYYYMMDD(r.tanggal) === newDate
    );
    if (matches.length > 0) {
      setSelectedRecord(matches[0]);
    } else {
      setSelectedRecord(null);
    }
  };

  // 4. Fetch Records List
  const fetchRecords = async (keepSelectedId?: string) => {
    setLoadingRecords(true);
    try {
      const res = await fetch("/api/realisasi");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setRecords(json.data);
        if (keepSelectedId) {
          const found = json.data.find((r: any) => r.id === keepSelectedId);
          if (found) {
            setSelectedRecord(found);
            setSelectedDateStr(formatDateToYYYYMMDD(found.tanggal));
          }
        } else if (selectedDateStr) {
          const matching = json.data.filter(
            (r: any) => formatDateToYYYYMMDD(r.tanggal) === selectedDateStr
          );
          if (matching.length > 0) {
            const stillSelected = matching.find(
              (r: any) => r.id === selectedRecord?.id
            );
            setSelectedRecord(stillSelected || matching[0]);
          } else {
            setSelectedRecord(null);
          }
        } else if (json.data.length > 0) {
          setSelectedRecord(json.data[0]);
          setSelectedDateStr(formatDateToYYYYMMDD(json.data[0].tanggal));
        } else {
          setSelectedDateStr(new Date().toISOString().split("T")[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load realisasi records:", err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (role === "pusat") {
      fetchRecords();
    }
  }, [role]);

  // 5. Open Create Split Form
  const handleOpenCreate = (dateToUse?: string) => {
    setEditingId(null);
    setTanggal(
      typeof dateToUse === "string" && dateToUse
        ? dateToUse
        : selectedDateStr || new Date().toISOString().split("T")[0]
    );
    setJudul("PROGRES PEMENUHAN RITEL MODERN");
    setSubjudul("");
    setSumberCatatan("");
    setDaftarRegional("");
    // Default 1 empty row
    setItems([
      {
        ritelId: null,
        companyName: "",
        provinsi: "Jabodetabek",
        namaRitel: "",
        logoUrl: null,
        volumeKg: 0,
        urutan: 0,
      },
    ]);
    setIsSplitOpen(true);
  };

  // 5. Open Edit Split Form
  const handleOpenEdit = (rec: any) => {
    setEditingId(rec.id);
    const dt = new Date(rec.tanggal);
    setTanggal(
      !isNaN(dt.getTime())
        ? dt.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setJudul(rec.judul || "PROGRES PEMENUHAN RITEL MODERN");
    setSubjudul(rec.subjudul || "");
    setSumberCatatan(rec.sumberCatatan || "");
    setDaftarRegional(rec.daftarRegional || "");

    if (Array.isArray(rec.items) && rec.items.length > 0) {
      setItems(
        rec.items.map((it: any, idx: number) => ({
          ritelId: it.ritelId || null,
          companyName: it.companyName || "",
          provinsi: it.provinsi || "Jabodetabek",
          namaRitel: it.namaRitel || "",
          logoUrl: it.logoUrl || null,
          volumeKg: Number(it.volumeKg || 0),
          urutan: typeof it.urutan === "number" ? it.urutan : idx,
        }))
      );
    } else {
      setItems([]);
    }
    setIsSplitOpen(true);
  };

  // 6. Save Split Form
  const handleSaveForm = async () => {
    if (!tanggal) {
      Swal.fire("Perhatian", "Tanggal realisasi wajib diisi!", "warning");
      return;
    }

    // Rule: Dalam 1 hari hanya diperbolehkan 1 laporan
    const existingOnDate = records.find(
      (r) => formatDateToYYYYMMDD(r.tanggal) === tanggal && r.id !== editingId
    );
    if (existingOnDate) {
      const tglFormatted = new Date(tanggal + "T00:00:00").toLocaleDateString(
        "id-ID",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );
      Swal.fire({
        title: "Tanggal Sudah Ada Laporan",
        text: `Dalam 1 hari hanya diperbolehkan membuat 1 laporan. Laporan untuk tanggal ${tglFormatted} sudah ada. Silakan gunakan fitur 'Edit Data' jika ingin mengubah rekapan ini.`,
        icon: "warning",
      });
      return;
    }

    const validItems = items.filter((it) => it.namaRitel && it.namaRitel.trim());
    if (validItems.length === 0) {
      Swal.fire("Perhatian", "Minimal 1 data ritel wajib diisi!", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId || undefined,
        tanggal,
        judul,
        subjudul: subjudul || undefined,
        sumberCatatan: sumberCatatan || undefined,
        daftarRegional: daftarRegional ? daftarRegional.trim() : undefined,
        items: validItems,
      };

      const res = await fetch("/api/realisasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan rekapan");

      Swal.fire({
        title: "Berhasil!",
        text: "Rekapan Realisasi Pemenuhan berhasil disimpan.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setIsSplitOpen(false);
      await fetchRecords(json.data?.id);
    } catch (err: any) {
      Swal.fire("Gagal Menyimpan", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // 7. Delete Record
  const handleDeleteRecord = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Hapus Rekapan?",
      text: "Data rekapan laporan ini akan dihapus permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/realisasi?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus");

      Swal.fire("Terhapus!", "Rekapan berhasil dihapus.", "success");
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
      fetchRecords();
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    }
  };

  // 8. Export PDF
  const handleExportPdf = async () => {
    if (!slideRef.current) {
      Swal.fire("Perhatian", "Tidak ada slide yang aktif untuk di-export.", "warning");
      return;
    }

    setExportingPdf(true);
    try {
      const activeData = isSplitOpen
        ? { tanggal, judul, subjudul, sumberCatatan, daftarRegional, items }
        : selectedRecord || fallbackSampleData;

      const dateStr = activeData.tanggal
        ? new Date(activeData.tanggal).toISOString().split("T")[0]
        : "laporan";
      const fileName = `Realisasi_Pemenuhan_${dateStr}.pdf`;

      await generateRealisasiPdf({
        element: slideRef.current,
        fileName,
      });

      Swal.fire({
        title: "Export Berhasil!",
        text: `File ${fileName} berhasil diunduh.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Export PDF error:", err);
      Swal.fire("Gagal Export PDF", err.message || "Terjadi kesalahan saat generate PDF.", "error");
    } finally {
      setExportingPdf(false);
    }
  };

  // Fallback sample data if no records exist in DB
  const fallbackSampleData = {
    tanggal: new Date("2026-09-07"),
    judul: "PROGRES PEMENUHAN RITEL MODERN",
    subjudul: "REALISASI PELAYANAN 7 SEPTEMBER 2026",
    sumberCatatan: "Sumber: Realisasi Pelayanan UB Industri, Senin 7 September 2026.",
    items: [
      { namaRitel: "HYPERMART", volumeKg: 10000, provinsi: "JABODETABEK" },
      { namaRitel: "THE FOODHALL", volumeKg: 6000, provinsi: "JABODETABEK" },
      { namaRitel: "BORMA", volumeKg: 15000, provinsi: "JAWA BARAT" },
      { namaRitel: "YOGYA SWALAYAN", volumeKg: 10000, provinsi: "JAWA BARAT" },
      { namaRitel: "ANEKA JAYA", volumeKg: 1700, provinsi: "JAWA TENGAH" },
      { namaRitel: "LARIS", volumeKg: 6000, provinsi: "JAWA TENGAH" },
      { namaRitel: "GOORI", volumeKg: 2300, provinsi: "JAWA TENGAH" },
      { namaRitel: "ADA SWALAYAN", volumeKg: 13600, provinsi: "JAWA TENGAH" },
      { namaRitel: "ALFAMIDI", volumeKg: 19850, provinsi: "JAWA TIMUR" },
      { namaRitel: "INDOMARET", volumeKg: 29590, provinsi: "JAWA TENGAH" },
      { namaRitel: "SATUSAMA", volumeKg: 800, provinsi: "SULAWESI SELATAN" },
      { namaRitel: "MISI SWALAYAN", volumeKg: 1125, provinsi: "SULAWESI SELATAN" },
    ],
  };

  // Auth Guard
  if (!authLoading && role !== "pusat") {
    return (
      <div className="p-8 max-w-4xl mx-auto mt-12">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-5 rounded-2xl text-center shadow-sm">
          <h2 className="text-lg font-bold">Akses Terbatas</h2>
          <p className="text-sm mt-1">
            Halaman <strong>Realisasi Pemenuhan</strong> hanya dapat diakses oleh user dengan role <strong>Pusat</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Active data for slide rendering
  const activeSlideData = isSplitOpen
    ? {
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        judul,
        subjudul,
        sumberCatatan,
        daftarRegional,
        items,
      }
    : selectedRecord || fallbackSampleData;

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-[1920px] mx-auto space-y-5">
      {/* ── Top Header Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Realisasi Pemenuhan
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              16:9 Executive Slide
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Laporan infografis pemenuhan ritel modern & export PDF 1 slide lanskap
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isSplitOpen ? (
            <>
              <button
                type="button"
                onClick={() => handleOpenCreate()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B2A59] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Plus size={15} />
                Buat Rekapan Baru
              </button>

              {selectedRecord && (
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedRecord)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                >
                  <Edit2 size={13} />
                  Edit Data
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsSplitOpen(false)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
            >
              <X size={14} />
              Tutup Split Input
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {exportingPdf ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Exporting PDF...
              </>
            ) : (
              <>
                <Download size={14} />
                Export PDF (1 Slide)
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Date Selector Input (When NOT in Split View) ───────────────────── */}
      {!isSplitOpen && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="pilih-tanggal-rekapan"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar size={14} className="text-[#0B2A59] dark:text-blue-400" />
                Pilih Tanggal:
              </label>
              <DateInputHybrid
                value={selectedDateStr}
                onChange={(newDate) => handleDateChange(newDate)}
                minDate={minDateStr}
                placeholder="Pilih tanggal..."
                className="w-36 sm:w-40"
                inputClassName="py-1 px-2.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            {/* Status indicator / info badge */}
            {selectedRecord ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {selectedRecord.items?.length || 0} Mitra Ritel Dilayani
                </span>

                {/* If multiple records exist on the same date, show switcher */}
                {matchingDateRecords.length > 1 && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 px-1.5 font-medium">Versi:</span>
                    {matchingDateRecords.map((rec, idx) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setSelectedRecord(rec)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          selectedRecord.id === rec.id
                            ? "bg-[#0B2A59] text-white shadow-2xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                        }`}
                      >
                        #{idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : records.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Belum ada rekapan pada tanggal ini
              </span>
            ) : null}
          </div>

          {/* Quick Action Button for selected date */}
          {!selectedRecord && records.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenCreate(selectedDateStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2A59] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={13} />
              Buat Rekapan Tanggal Ini
            </button>
          )}
        </div>
      )}

      {/* ── MAIN CONTENT AREA (Full View or Split View) ───────────────────── */}
      {isSplitOpen ? (
        /* ── SPLIT VIEW MODE: Form Input on Left, Live Slide on Right ── */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left Column: Form Split Input (5 cols on xl) */}
          <div className="xl:col-span-5 2xl:col-span-4 sticky top-4">
            <RealisasiFormSplit
              tanggal={tanggal}
              setTanggal={setTanggal}
              judul={judul}
              setJudul={setJudul}
              subjudul={subjudul}
              setSubjudul={setSubjudul}
              sumberCatatan={sumberCatatan}
              setSumberCatatan={setSumberCatatan}
              daftarRegional={daftarRegional}
              setDaftarRegional={setDaftarRegional}
              items={items}
              setItems={setItems}
              ritelOptions={ritelOptions}
              loadingOptions={loadingOptions}
              saving={saving}
              onSave={handleSaveForm}
              onCancel={() => setIsSplitOpen(false)}
              isEditMode={Boolean(editingId)}
              existingReportDates={existingReportDates}
            />
          </div>

          {/* Right Column: Live Interactive Slide Preview (7 cols on xl) */}
          <div className="xl:col-span-7 2xl:col-span-8 space-y-2 overflow-x-auto">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Preview (16:9 Slide)
              </span>
              <span className="text-[11px] text-slate-400">
                Slide otomatis memperbarui tampilan saat form di kiri diisi
              </span>
            </div>

            <div className="w-full">
              <RealisasiSlide data={activeSlideData} slideRef={slideRef} />
            </div>
          </div>
        </div>
      ) : !selectedRecord && records.length > 0 ? (
        /* ── EMPTY STATE FOR SELECTED DATE ── */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-xl mx-auto my-12 shadow-xs space-y-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-[#0B2A59] dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Calendar size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Belum Ada Rekapan Pada{" "}
              {selectedDateStr
                ? new Date(selectedDateStr + "T00:00:00").toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Tanggal Ini"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Tidak ada data realisasi pemenuhan ritel modern yang tercatat untuk tanggal ini.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCreate(selectedDateStr)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B2A59] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            Buat Rekapan Untuk Tanggal Ini
          </button>
        </div>
      ) : (
        /* ── FULL VIEW MODE: Clean Centered 16:9 Slide ── */
        <div className="space-y-4">
          {selectedRecord && (
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Menampilkan Data:{" "}
                <strong className="font-bold">
                  {new Date(selectedRecord.tanggal).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(selectedRecord)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <Edit2 size={12} />
                  Edit Data
                </button>

                <button
                  onClick={() => handleDeleteRecord(selectedRecord.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-semibold rounded-lg hover:bg-rose-100 transition-colors shadow-2xs"
                >
                  <Trash2 size={12} />
                  Hapus
                </button>
              </div>
            </div>
          )}

          {/* Centered Slide */}
          <div className="w-full flex justify-center overflow-x-auto py-2">
            <div className="w-full max-w-[1280px]">
              <RealisasiSlide data={activeSlideData} slideRef={slideRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
