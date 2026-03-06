"use client";

import {
  Filter,
  Plus,
  Search,
  Tag,
  Upload,
  Eye,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import PODetailModal from "@/components/po-detail-modal";
import BulkUploadModal from "@/components/bulk-upload-modal";
import { LoaderThree } from "@/components/ui/loader";

type Status = "Planned" | "Completed" | "Cancelled";
type JenisPO = "Ritmod" | "IDM/IGR" | "HPM" | "Other";

type CardPO = {
  id: string;
  company: string;
  status: Status;
  area: string;
  tujuan: string;
  produk: string;
  rpTagih: number;
  expiredDate: string;
  originalData: any; // Store full data for modal
};

export default function CompanyPage() {
  const [data, setData] = useState<CardPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | Status>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/po?includeUnknown=true", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();

      const mapped: CardPO[] = json.map((item: any) => {
        // Simple logic to determine status
        const isCompleted = item.statusBayar; // Assuming statusBayar means completed cycle
        const status: Status = isCompleted ? "Completed" : "Planned";

        // Use jenisPo from DB
        // const jenis: JenisPO = (item.jenisPo as JenisPO) || "Ritmod";

        // Helper Title Case
        const toTitleCase = (str: string) => {
          return str.replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
          );
        };

        const regionalRaw =
          item.regional || item.UnitProduksi?.namaRegional || "";
        const regionalDisplay = toTitleCase(regionalRaw);

        // Calculate total tagihan from items
        const totalTagih =
          item.Items?.reduce(
            (acc: number, curr: any) => acc + curr.rpTagih,
            0,
          ) || 0;

        // Product display: "Prod A, Prod B..." or "Prod A + 2 others"
        const productNames = item.Items?.map((i: any) => i.Product.name) || [];
        const productDisplay =
          productNames.length > 0
            ? productNames.length > 1
              ? `${productNames[0]} (+${productNames.length - 1} lainnya)`
              : productNames[0]
            : "-";

        return {
          id: item.noPo,
          company: item.RitelModern?.namaPt || "Unknown",
          status,
          area: item.UnitProduksi?.siteArea || "Unknown",
          tujuan: item.tujuanDetail || "-",
          produk: productDisplay,
          rpTagih: totalTagih,
          expiredDate: item.expiredTgl
            ? new Date(item.expiredTgl).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "-",
          originalData: {
            ...item,
            company: item.RitelModern?.namaPt || "Unknown",
            productName: productDisplay, // For header in modal
            regional: regionalDisplay,
            siteArea: item.UnitProduksi?.siteArea || "Unknown",
            // Pass Items to modal
            Items: item.Items,
            rpTagih: totalTagih, // Override with calculated total
            status: {
              kirim: item.statusKirim,
              sdif: item.statusSdif,
              po: item.statusPo,
              fp: item.statusFp,
              kwi: item.statusKwi,
              inv: item.statusInv,
              tagih: item.statusTagih,
              bayar: item.statusBayar,
            },
          },
        };
      });
      setData(mapped);
    } catch (err) {
      console.error("Error fetching POs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (poData: any) => {
    setSelectedPO(poData);
    setIsModalOpen(true);
  };

  const statusClasses = (s: Status) => {
    switch (s) {
      case "Completed":
        return {
          chipBg: "bg-emerald-100",
          chipText: "text-emerald-700",
          icon: "text-emerald-500",
        };
      case "Planned":
        return {
          chipBg: "bg-amber-100",
          chipText: "text-amber-700",
          icon: "text-amber-500",
        };
      case "Cancelled":
      default:
        return {
          chipBg: "bg-rose-100",
          chipText: "text-rose-700",
          icon: "text-rose-500",
        };
    }
  };

  const filtered = useMemo(() => {
    return data.filter((d) => {
      const byCompany = d.company
        .toLowerCase()
        .includes(filterCompany.toLowerCase());
      const byStatus = filterStatus ? d.status === filterStatus : true;
      return byCompany && byStatus;
    });
  }, [data, filterCompany, filterStatus]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">List PO</h1>
          <p className="text-sm text-slate-500 mt-1">Monitoring daftar PO</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 border-slate-200 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
          >
            <Upload size={18} />
            Bulk Upload
          </button>
          <Link
            href="/po"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            <Plus size={18} />
            Add PO
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative col-span-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={filterCompany}
              onChange={(e) => {
                setFilterCompany(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari Nama Company..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm"
            />
          </div>
          <div className="relative col-span-2">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as Status | "");
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm"
            >
              <option value="">Semua Status</option>
              <option value="Planned">Planned</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card List 2-Column */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
        {loading ? (
          <div className="py-10">
            <LoaderThree label="Loading data" />
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-sm text-slate-500 px-2 py-6">Tidak ada data</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-slate-200 hover:shadow-sm transition-all flex flex-col h-full"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {item.id} - {item.company}
                    </h3>
                    <div className="mt-0.5">
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold tracking-widest">
                        {item.originalData?.RitelModern?.inisial || "NA"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-black tracking-widest uppercase px-2 py-1 rounded ${statusClasses(item.status).chipBg} ${statusClasses(item.status).chipText}`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-[15px] md:text-base text-slate-700 font-medium text-justify leading-relaxed">
                  <div>
                    Location : {item.originalData.regional || "Unknown"} -{" "}
                    {item.area}
                  </div>
                  <div>Product : {item.produk}</div>
                  <div>Expired date : {item.expiredDate}</div>
                </div>

                {/* Separator before footer */}
                <hr className="mt-3 border-gray-200" />
                {/* Footer: Rp Tagih & action */}
                <div className="pt-3 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Rp
                    </span>
                    <span className="text-lg font-black text-slate-900 tracking-tight">
                      {item.rpTagih.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/po?noPo=${encodeURIComponent(item.id)}&company=${encodeURIComponent(item.company)}`}
                      className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 active:bg-amber-800 transition-colors flex items-center gap-2"
                      title="Edit PO"
                    >
                      <Pencil size={16} />
                      Edit
                    </Link>
                    <button
                      onClick={() => openModal(item.originalData)}
                      className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 active:bg-slate-900 transition-colors flex items-center gap-2"
                    >
                      <Eye size={16} />
                      View Detail
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Pagination */}
        {filtered.length > itemsPerPage && (
          <div className="flex items-center justify-between px-2 py-4 border-t border-slate-100 mt-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <p className="text-sm font-semibold text-slate-700">
                Total Data: {filtered.length}
              </p>
              <p className="text-xs text-slate-400">
                (Showing {indexOfFirst + 1} -{" "}
                {Math.min(indexOfLast, filtered.length)})
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <PODetailModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={selectedPO}
      />

      <BulkUploadModal
        open={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
