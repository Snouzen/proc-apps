import { useState, useCallback, useEffect, useRef } from "react";
import {
  NdFormData,
  PiutangRow,
  getDefaultNdFormData,
  generateNdWord,
} from "@/lib/generateNdWord";
import { getMe } from "@/lib/me";

function getStorageKey(userEmail?: string | null): string | null {
  if (!userEmail || !userEmail.trim()) return null;
  // Bijective standard URL encoding without lossy character substitution
  return `nota_dinas_draft_${encodeURIComponent(userEmail.trim().toLowerCase())}`;
}

function loadSavedDraft(key: string): NdFormData | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return validateAndSanitizeDraft(JSON.parse(saved));
    }
  } catch (e) {
    console.error("Failed to load nota dinas draft:", e);
  }
  return null;
}

function validateAndSanitizeDraft(parsed: unknown): NdFormData | null {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  const defaults = getDefaultNdFormData();
  const result: NdFormData = { ...defaults };

  const stringKeys = Object.keys(defaults).filter((k) => k !== "list_piutang") as (keyof Omit<NdFormData, "list_piutang">)[];
  for (const key of stringKeys) {
    if (typeof p[key] === "string") {
      result[key] = p[key] as string;
    }
  }

  if (Array.isArray(p.list_piutang)) {
    const validatedRows: PiutangRow[] = [];
    for (const row of p.list_piutang) {
      if (row && typeof row === "object") {
        const r = row as Record<string, unknown>;
        validatedRows.push({
          tgl_input: typeof r.tgl_input === "string" ? r.tgl_input : "",
          tbl_1_30: typeof r.tbl_1_30 === "string" ? r.tbl_1_30 : "",
          tbl_2_30: typeof r.tbl_2_30 === "string" ? r.tbl_2_30 : "",
          total: typeof r.total === "string" ? r.total : "",
          tbl_cash_in: typeof r.tbl_cash_in === "string" ? r.tbl_cash_in : "",
          tbl_net_piutang: typeof r.tbl_net_piutang === "string" ? r.tbl_net_piutang : "",
          tbl_sales: typeof r.tbl_sales === "string" ? r.tbl_sales : "",
          tbl_ars: typeof r.tbl_ars === "string" ? r.tbl_ars : "",
        });
      }
    }
    result.list_piutang = validatedRows;
  }

  return result;
}

function isEqualDefault(data: NdFormData): boolean {
  const defaults = getDefaultNdFormData();
  return JSON.stringify(data) === JSON.stringify(defaults);
}

export function useNotaDinasForm() {
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [formData, setFormData] = useState<NdFormData>(getDefaultNdFormData());
  const isLoadedRef = useRef<boolean>(false);

  // Restore draft exclusively inside useEffect after user identity is resolved via getMe()
  useEffect(() => {
    let isCancelled = false;
    getMe().then((me) => {
      if (isCancelled) return;
      if (me?.email) {
        const key = getStorageKey(me.email);
        setStorageKey(key);
        if (key && typeof window !== "undefined") {
          const loaded = loadSavedDraft(key);
          if (loaded) {
            setFormData(loaded);
          }
        }
      }
      isLoadedRef.current = true;
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Auto-save draft only AFTER initial load is complete and storageKey is non-null
  useEffect(() => {
    if (!isLoadedRef.current || !storageKey || typeof window === "undefined") {
      return;
    }
    try {
      if (isEqualDefault(formData)) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      }
    } catch (e) {
      console.error("Failed to save nota dinas draft:", e);
    }
  }, [formData, storageKey]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Header Surat": true,
    "Realisasi Penjualan": true,
    "Posisi Piutang": true,
    "Tabel Piutang": true,
  });
  const [previewMode, setPreviewMode] = useState(true);

  const handleChange = useCallback(
    (key: keyof Omit<NdFormData, "list_piutang">, value: string) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleReset = useCallback(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error("Failed to remove nota dinas draft:", e);
      }
    }
    setFormData(getDefaultNdFormData());
  }, [storageKey]);

  const handleAddPiutangRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      list_piutang: [
        ...prev.list_piutang,
        {
          tgl_input: "",
          tbl_1_30: "",
          tbl_2_30: "",
          total: "",
          tbl_cash_in: "",
          tbl_net_piutang: "",
          tbl_sales: "",
          tbl_ars: "",
        },
      ],
    }));
  }, []);

  const handleRemovePiutangRow = useCallback((index: number) => {
    setFormData((prev) => {
      const newRows = [...prev.list_piutang];
      newRows.splice(index, 1);
      return { ...prev, list_piutang: newRows };
    });
  }, []);

  const handlePiutangChange = useCallback(
    (index: number, field: keyof PiutangRow, value: string) => {
      setFormData((prev) => {
        const newRows = [...prev.list_piutang];
        newRows[index] = { ...newRows[index], [field]: value };
        return { ...prev, list_piutang: newRows };
      });
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      await generateNdWord(formData);
    } catch (err: any) {
      alert(err?.message || "Gagal generate dokumen Word");
    } finally {
      setIsGenerating(false);
    }
  }, [formData]);

  const handleGeneratePdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      const { generateNdPdf } = await import("@/lib/generateNdPdf");
      await generateNdPdf(formData);
    } catch (err: any) {
      alert(err?.message || "Gagal generate dokumen PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [formData]);

  const toggleGroup = useCallback((group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  return {
    formData,
    setFormData,
    isGenerating,
    isGeneratingPdf,
    openGroups,
    toggleGroup,
    previewMode,
    setPreviewMode,
    handleChange,
    handleReset,
    handleAddPiutangRow,
    handleRemovePiutangRow,
    handlePiutangChange,
    handleGenerate,
    handleGeneratePdf,
  };
}
