// Ritel pakai API Next.js (same-origin) supaya jalan tanpa perlu nyalain Express terpisah
const RITEL_API = "/api/ritel";
const PRODUCT_API = "/api/product";
const PO_API = "/api/po";

export const saveRitel = async (payload: any, signal?: AbortSignal) => {
  try {
    const response = await fetch(RITEL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let msg = "Gagal menyimpan data ke server";
      try {
        const errorData = await response.json();
        msg = errorData?.error || msg;
      } catch {
        msg = response.statusText || msg;
      }
      throw new Error(msg);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    if (error instanceof Error) throw error;
    throw new Error("Koneksi gagal. Pastikan aplikasi dan database siap.");
  }
};

export const saveUnitProduksi = async (payload: {
  regional: string;
  siteArea: string;
  alamat?: string;
}) => {
  const response = await fetch("/api/unit-produksi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Gagal menyimpan data unit produksi");
  }

  return response.json();
};

export const saveProduct = async (name: string, satuanKg?: number) => {
  const payload = typeof satuanKg === "number" ? { name, satuanKg } : { name };

  let lastErr: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(PRODUCT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        let msg = "Gagal menyimpan produk";
        try {
          const err = await response.json();
          msg = err?.error || msg;
        } catch {
          msg = response.statusText || msg;
        }
        // Retry hanya jika 5xx
        if (response.status >= 500 && response.status < 600) {
          throw new Error(msg);
        }
        throw new Error(msg);
      }
      return await response.json();
    } catch (err) {
      lastErr = err;
      // Retry untuk network error/abort/5xx
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
    }
  }
  if (lastErr instanceof Error) throw lastErr;
  throw new Error("Gagal menyimpan produk (koneksi server)");
};

export const savePurchaseOrder = async (payload: any) => {
  const response = await fetch(PO_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let msg = "Gagal menyimpan PO";
    try {
      const err = await response.json();
      msg = err?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return response.json();
};
