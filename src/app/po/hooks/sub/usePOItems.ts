import { useState, useMemo } from "react";
import { ItemPO } from "./types";

interface UsePOItemsParams {
  productData: any[];
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  showToast: (type: "success" | "error" | "info", message: string) => void;
  invalidProduct: boolean;
}

export function usePOItems({
  productData,
  setFormData,
  showToast,
  invalidProduct,
}: UsePOItemsParams) {
  const [items, setItems] = useState<ItemPO[]>([]);
  const [currentItem, setCurrentItem] = useState({
    namaProduk: "",
    pcs: "" as number | string,
    pcsKirim: "" as number | string,
    hargaPcs: "" as number | string,
    discount: "" as number | string,
  });
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState({
    pcs: "",
    pcsKirim: "",
    hargaPcs: "",
    discount: "",
  });

  const parseRupiah = (v: any) => {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number" && !isNaN(v)) return v;
    let str = String(v).trim();
    if (!str) return 0;

    if (str.includes(",")) {
      str = str.replace(/\./g, "").replace(",", ".");
      return Math.max(0, Number(str) || 0);
    }

    const dotParts = str.split(".");
    if (dotParts.length > 2) {
      str = str.replace(/\./g, "");
      return Math.max(0, Number(str) || 0);
    } else if (dotParts.length === 2) {
      if (dotParts[1].length === 3) {
        str = str.replace(/\./g, "");
        return Math.max(0, Number(str) || 0);
      } else {
        return Math.max(0, Number(str) || 0);
      }
    }

    return Math.max(0, Number(str) || 0);
  };

  const currentPcsNum = parseFloat(currentItem.pcs.toString()) || 0;
  const currentHargaPcsNum = parseFloat(currentItem.hargaPcs.toString()) || 0;
  const currentPcsKirimNum = parseFloat(currentItem.pcsKirim.toString()) || 0;
  const currentDiscountNum = parseRupiah(currentItem.discount);
  
  const satuanKgSelected =
    (Array.isArray(productData)
      ? productData.find((p: any) => p?.name === currentItem.namaProduk)
          ?.satuanKg
      : undefined) || 0;

  const currentHargaKg =
    satuanKgSelected > 0 ? currentHargaPcsNum / satuanKgSelected : 0;
  const currentNominal = Math.max(
    0,
    currentHargaPcsNum * currentPcsNum - currentDiscountNum,
  );
  const currentDivider = currentPcsNum || 1;
  const currentProportionalDiscount = (currentDiscountNum / currentDivider) * currentPcsKirimNum;
  const currentRpTagih = Math.max(
    0,
    currentHargaPcsNum * currentPcsKirimNum - currentProportionalDiscount,
  );
  const currentKg = currentPcsNum * (satuanKgSelected || 0);
  const currentKgKirim = currentPcsKirimNum * (satuanKgSelected || 0);

  const totalsAll = useMemo(() => {
    return items.reduce(
      (acc, it) => ({
        nominal: acc.nominal + it.nominal,
        tagihan: acc.tagihan + it.rpTagih,
      }),
      { nominal: 0, tagihan: 0 },
    );
  }, [items]);

  const getSatuanKg = (namaProduk: string) => {
    const satuan =
      (Array.isArray(productData)
        ? productData.find((p: any) => p?.name === namaProduk)?.satuanKg
        : undefined) || 0;
    const n = Number(satuan);
    return Number.isFinite(n) ? n : 0;
  };

  const computeDerived = (
    namaProduk: string,
    pcsRaw: any,
    pcsKirimRaw: any,
    hargaPcsRaw: any,
    discountRaw: any,
  ) => {
    const satuan = getSatuanKg(namaProduk);
    const pcs = Number(pcsRaw) || 0;
    const pcsKirim = Number(pcsKirimRaw) || 0;
    const hargaPcs = Number(hargaPcsRaw) || 0;
    const discount = parseRupiah(discountRaw);
    const hargaKg = satuan > 0 ? hargaPcs / satuan : 0;
    const nominal = Math.max(0, hargaPcs * pcs - discount);
    const divider = pcs || 1;
    const proportionalDiscount = (discount / divider) * pcsKirim;
    const rpTagih = Math.max(0, hargaPcs * pcsKirim - proportionalDiscount);
    const kg = pcs * satuan;
    const kgKirim = pcsKirim * satuan;
    return {
      pcs,
      pcsKirim,
      hargaPcs,
      discount,
      satuan,
      hargaKg,
      nominal,
      rpTagih,
      kg,
      kgKirim,
    };
  };

  const handleTogglePreviewItem = (id: string) => {
    setPreviewItemId((prev) => (prev === id ? null : id));
  };

  const handleStartEditItem = (item: ItemPO) => {
    setEditingItemId(item.id);
    setPreviewItemId(item.id);
    setEditItem({
      pcs: String(item.pcs ?? ""),
      pcsKirim: String(item.pcsKirim ?? ""),
      hargaPcs: String(item.hargaPcs ?? ""),
      discount: String(
        item.discount ? item.discount.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "",
      ),
    });
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditItem({ pcs: "", pcsKirim: "", hargaPcs: "", discount: "" });
  };

  const handleSaveEditItem = (item: ItemPO) => {
    if (!editItem.pcs || !editItem.hargaPcs) {
      showToast("error", "Lengkapi PCS dan Harga/Pcs");
      return;
    }
    const d = computeDerived(
      item.namaProduk,
      editItem.pcs,
      editItem.pcsKirim,
      editItem.hargaPcs,
      editItem.discount,
    );
    if (d.pcs <= 0 || d.hargaPcs <= 0) {
      showToast("error", "PCS dan Harga/Pcs harus lebih dari 0");
      return;
    }

    setItems((prev) => {
      const newItems = prev.map((it) =>
        it.id === item.id
          ? {
              ...it,
              pcs: d.pcs,
              pcsKirim: d.pcsKirim,
              hargaPcs: d.hargaPcs,
              discount: d.discount,
              kg: d.kg,
              kgKirim: d.kgKirim,
              hargaKg: d.hargaKg,
              nominal: d.nominal,
              rpTagih: d.rpTagih,
            }
          : it,
      );

      const isShipped = newItems.some((it) => (Number(it.pcsKirim) || 0) > 0);
      setFormData((f: any) => ({ ...f, status: { ...f.status, kirim: isShipped } }));

      return newItems;
    });

    setEditingItemId(null);
    setEditItem({ pcs: "", pcsKirim: "", hargaPcs: "", discount: "" });
    showToast("success", "Item berhasil diupdate");
  };

  const handleAddItem = () => {
    if (!currentItem.namaProduk || !currentItem.pcs || !currentItem.hargaPcs) {
      showToast("error", "Lengkapi data: produk, PCS, dan Harga/Pcs");
      return;
    }
    if (invalidProduct) {
      showToast("error", "Nama produk tidak ada di daftar");
      return;
    }

    const newItem: ItemPO = {
      id: crypto.randomUUID(),
      namaProduk: currentItem.namaProduk,
      pcs: currentItem.pcs,
      pcsKirim: currentItem.pcsKirim,
      hargaPcs: currentItem.hargaPcs,
      discount: currentDiscountNum,
      kg: currentKg,
      kgKirim: currentKgKirim,
      hargaKg: currentHargaKg,
      nominal: currentNominal,
      rpTagih: currentRpTagih,
    };

    setItems((prev) => {
      const nextArr = [...prev, newItem];
      const isShipped = nextArr.some((it) => (Number(it.pcsKirim) || 0) > 0);
      setFormData((f: any) => ({ ...f, status: { ...f.status, kirim: isShipped } }));
      return nextArr;
    });
    setCurrentItem({
      namaProduk: "",
      pcs: "",
      pcsKirim: "",
      hargaPcs: "",
      discount: "",
    });
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => {
      const nextArr = prev.filter((item) => item.id !== id);
      const isShipped = nextArr.some((it) => (Number(it.pcsKirim) || 0) > 0);
      setFormData((f: any) => ({ ...f, status: { ...f.status, kirim: isShipped } }));
      return nextArr;
    });
  };

  return {
    items,
    setItems,
    currentItem,
    setCurrentItem,
    previewItemId,
    setPreviewItemId,
    editingItemId,
    setEditingItemId,
    editItem,
    setEditItem,
    parseRupiah,
    currentHargaKg,
    currentKg,
    currentKgKirim,
    currentNominal,
    currentRpTagih,
    totalsAll,
    computeDerived,
    handleTogglePreviewItem,
    handleStartEditItem,
    handleCancelEditItem,
    handleSaveEditItem,
    handleAddItem,
    handleDeleteItem,
  };
}
