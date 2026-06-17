import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

export const formatRupiahDisplay = (val: number | string) => {
  const num = typeof val === "string" ? parseInt(val.replace(/[^0-9]/g, "")) || 0 : val;
  return new Intl.NumberFormat("id-ID").format(num);
};

export function useNewRetur() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ritelId = searchParams.get("ritelId");

  const [loading, setLoading] = useState(false);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [retailerName, setRetailerName] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [formData, setFormData] = useState<any>({
    rtvCn: "",
    tanggalRtv: new Date().toISOString(),
    maxPickup: new Date().toISOString(),
    kodeToko: "",
    namaCompany: "",
    inisial: "",
    link: "",
    statusBarang: "Belum Diambil",
    refKetStatus: "",
    lokasiBarangId: "",
    pembebananReturnId: "",
    invoiceRekon: "",
    referensiPembayaran: "",
    tanggalPembayaran: null,
    remarks: "",
    sdiReturn: "",
  });

  const [items, setItems] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState({
    produk: "",
    qtyReturn: 0,
    nominal: 0,
    rpKg: 0,
  });

  const [tujuanFilter, setTujuanFilter] = useState("");
  const [inisialFilter, setInisialFilter] = useState("");
  const [produkFilter, setProdukFilter] = useState("");
  const [lokasiFilter, setLokasiFilter] = useState("");
  const [pembebananFilter, setPembebananFilter] = useState("");
  const [units, setUnits] = useState<any[]>([]);
  const [isTujuanOpen, setIsTujuanOpen] = useState(false);
  const [isInisialOpen, setIsInisialOpen] = useState(false);
  const [isProdukOpen, setIsProdukOpen] = useState(false);
  const [isLokasiOpen, setIsLokasiOpen] = useState(false);
  const [isPembebananOpen, setIsPembebananOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [activeStatusIndex, setActiveStatusIndex] = useState(-1);
  const STATUS_OPTIONS = ["Belum Diambil", "Sudah Diambil", "Dimusnahkan"];

  const PRIORITY_PRODUCTS = useMemo(
    () => ["PUNOKAWAN 5 KG", "BEFOOD SETRA RAMOS 5 KG"],
    []
  );

  useEffect(() => {
    if (!ritelId) {
      router.replace("/retur");
      return;
    }
    Promise.all([
      fetch("/api/ritel").then((res) => res.json()),
      fetch("/api/product").then((res) => res.json()),
      fetch("/api/unit-produksi").then((res) => res.json()),
    ]).then(([ritelJson, productJson, unitJson]) => {
      const rList = Array.isArray(ritelJson) ? ritelJson : ritelJson?.data || [];
      const pList = Array.isArray(productJson) ? productJson : productJson?.data || [];
      const uList = Array.isArray(unitJson) ? unitJson : unitJson?.data || [];
      setRetailers(rList);
      setProducts(pList);
      setUnits(uList);
      const rCurrent = rList.find((r: any) => r.id === ritelId);
      if (rCurrent) setRetailerName(rCurrent.namaPt);
      else setRetailerName("Ritel Tidak Terdeteksi");
    });
  }, [ritelId, router]);

  const masterInisialList = useMemo(() => {
    if (!ritelId || retailers.length === 0) return [];
    const r = retailers.find((x) => x.id === ritelId);
    if (!r) return [];
    
    const targetPt = r.namaPt.trim().toLowerCase();

    return Array.from(
      new Set(
        retailers
          .filter((x) => x.namaPt.trim().toLowerCase() === targetPt && x.inisial)
          .map((x) => x.inisial?.trim())
      )
    ).filter(Boolean) as string[];
  }, [ritelId, retailers]);

  const masterTujuanList = useMemo(() => {
    if (!ritelId || retailers.length === 0) return [];
    const r = retailers.find((x) => x.id === ritelId);
    if (!r) return [];

    const targetPt = r.namaPt.trim().toLowerCase();

    return Array.from(
      new Set(
        retailers
          .filter((x) => {
             const matchPt = x.namaPt.trim().toLowerCase() === targetPt;
             const matchInisial = formData.inisial 
               ? x.inisial?.trim().toLowerCase() === formData.inisial.trim().toLowerCase() 
               : true;
             return matchPt && matchInisial && x.tujuan;
          })
          .map((x) => x.tujuan)
      )
    );
  }, [ritelId, retailers, formData.inisial]);

  const filteredInisial = useMemo(
    () => masterInisialList.filter((ini) => ini.toLowerCase().includes(inisialFilter.toLowerCase())),
    [masterInisialList, inisialFilter]
  );

  const filteredTujuan = useMemo(
    () => masterTujuanList.filter((tj) => tj.toLowerCase().includes(tujuanFilter.toLowerCase())),
    [masterTujuanList, tujuanFilter]
  );

  const filteredLokasi = useMemo(
    () => units.filter((u) => u.siteArea.toLowerCase().includes(lokasiFilter.toLowerCase())),
    [units, lokasiFilter]
  );

  const filteredPembebanan = useMemo(
    () => units.filter((u) => u.siteArea.toLowerCase().includes(pembebananFilter.toLowerCase())),
    [units, pembebananFilter]
  );

  const filteredProducts = useMemo(() => {
    const rawFiltered = products.filter((p) => p.name.toLowerCase().includes(produkFilter.toLowerCase()));

    return rawFiltered.sort((a, b) => {
      const isAPriority = PRIORITY_PRODUCTS.includes(a.name.toUpperCase());
      const isBPriority = PRIORITY_PRODUCTS.includes(b.name.toUpperCase());

      if (isAPriority && !isBPriority) return -1;
      if (!isAPriority && isBPriority) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [products, produkFilter, PRIORITY_PRODUCTS]);

  useEffect(() => {
    const nominal = currentItem.nominal || 0;
    const qty = currentItem.qtyReturn || 0;
    const result = qty > 0 ? Math.round(nominal / qty) : 0;
    setCurrentItem((prev: any) => ({ ...prev, rpKg: result }));
  }, [currentItem.nominal, currentItem.qtyReturn]);

  const addItem = () => {
    if (!currentItem.produk) {
      Swal.fire({
        icon: "warning",
        title: "Produk Kosong",
        text: "Silakan pilih produk terlebih dahulu",
        background: "#fff",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }
    setItems([...items, { ...currentItem }]);
    setCurrentItem({ produk: "", qtyReturn: 0, nominal: 0, rpKg: 0 });
    setProdukFilter("");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Daftar Kosong",
        text: "Minimal tambahkan satu barang ke daftar",
        background: "#fff",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    setLoading(true);
    try {
      const records = items.map((item) => ({ ...formData, ...item, ritelId }));

      const res = await fetch("/api/retur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(records),
      });

      if (res.ok) {
        const result = await res.json();
        const savedCount = result.count ?? items.length;
        
        if (savedCount === 0) {
          Swal.fire({
            icon: "warning",
            title: "Data Sudah Ada",
            text: "Semua data retur yang diinput sudah pernah ada sebelumnya (duplikat RTV + Produk). Tidak ada data baru yang disimpan.",
            confirmButtonColor: "#4f46e5",
          });
        } else if (savedCount < items.length) {
          Swal.fire({
            icon: "info",
            title: "Sebagian Berhasil",
            text: `${savedCount} dari ${items.length} data retur berhasil disimpan. ${items.length - savedCount} data lainnya sudah ada sebelumnya (duplikat).`,
            confirmButtonColor: "#4f46e5",
          });
          setTimeout(() => router.push(`/retur?ritelId=${ritelId}`), 2000);
        } else {
          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: `${savedCount} Data retur berhasil disimpan`,
            timer: 2000,
            showConfirmButton: false,
          });
          setTimeout(() => router.push(`/retur?ritelId=${ritelId}`), 2000);
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan data");
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Simpan",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    router,
    loading,
    isMounted,
    retailerName,
    formData,
    setFormData,
    items,
    currentItem,
    setCurrentItem,
    setTujuanFilter,
    setInisialFilter,
    setProdukFilter,
    setLokasiFilter,
    setPembebananFilter,
    units,
    isTujuanOpen,
    setIsTujuanOpen,
    isInisialOpen,
    setIsInisialOpen,
    isProdukOpen,
    setIsProdukOpen,
    isLokasiOpen,
    setIsLokasiOpen,
    isPembebananOpen,
    setIsPembebananOpen,
    isStatusOpen,
    setIsStatusOpen,
    activeStatusIndex,
    setActiveStatusIndex,
    STATUS_OPTIONS,
    filteredInisial,
    filteredTujuan,
    filteredLokasi,
    filteredPembebanan,
    filteredProducts,
    addItem,
    removeItem,
    handleSubmit,
  };
}
