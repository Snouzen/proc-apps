"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Upload,
  Pencil,
  Trash2,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import PODetailModal from "@/components/po-detail-modal";
import { LoaderThree } from "@/components/ui/loader";
import { getMe } from "@/lib/me";
import BulkUploadModal from "@/components/bulk-upload-modal";

type GroupedPO = {
  company: string;
  pos: any[];
};

export default function TestingPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupedPO[]>([]);
  const [openCompanies, setOpenCompanies] = useState<Record<string, boolean>>(
    {},
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [inisialPage, setInisialPage] = useState<Record<string, number>>({});
  const [activeInisial, setActiveInisial] = useState<
    Record<string, string | null>
  >({});
  const [poPage, setPoPage] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const me = await getMe();
      let url = "/api/po";
      if (me?.role === "rm" && me?.regional) {
        url += `?regional=${encodeURIComponent(me.regional)}`;
      }
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      const byCompany: Record<string, any[]> = {};
      for (const po of json) {
        const company = po?.RitelModern?.namaPt || "Unknown";
        if (!byCompany[company]) byCompany[company] = [];
        byCompany[company].push(po);
      }
      const g: GroupedPO[] = Object.entries(byCompany)
        .map(([k, v]) => ({ company: k, pos: v }))
        .sort((a, b) => a.company.localeCompare(b.company));
      setGroups(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePOCreated = () => {
    fetchData(); // Reload
  };

  const handleDelete = async (noPo: string) => {
    setDeleting(true);
    try {
      await fetch("/api/po", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPo }),
      });
      fetchData();
      setConfirmDelete(null);
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus PO");
    } finally {
      setDeleting(false);
    }
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = useMemo(
    () => groups.slice(indexOfFirst, indexOfLast),
    [groups, indexOfFirst, indexOfLast],
  );
  const totalPages = Math.max(1, Math.ceil(groups.length / itemsPerPage));

  const toggleCompany = (name: string) =>
    setOpenCompanies((prev) => ({ ...prev, [name]: !prev[name] }));

  const openModal = (po: any) => {
    const productNames = po.Items?.map((i: any) => i.Product?.name) || [];
    const productDisplay =
      productNames.length > 0
        ? productNames.length > 1
          ? `${productNames[0]} (+${productNames.length - 1} lainnya)`
          : productNames[0]
        : "-";
    const totalTagih =
      po.Items?.reduce(
        (acc: number, curr: any) => acc + (curr?.rpTagih || 0),
        0,
      ) || 0;
    setSelectedPO({
      ...po,
      company: po?.RitelModern?.namaPt || "Unknown",
      productName: productDisplay,
      regional: po?.regional || po?.UnitProduksi?.namaRegional || null,
      siteArea: po?.UnitProduksi?.siteArea || "Unknown",
      Items: po?.Items || [],
      rpTagih: totalTagih,
      status: {
        kirim: !!po.statusKirim,
        sdif: !!po.statusSdif,
        po: !!po.statusPo,
        fp: !!po.statusFp,
        kwi: !!po.statusKwi,
        inv: !!po.statusInv,
        tagih: !!po.statusTagih,
        bayar: !!po.statusBayar,
      },
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Company</h1>
          <p className="text-sm text-slate-500">
            Monitoring daftar PO per company
          </p>
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

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 sm:p-4">
        {loading ? (
          <div className="py-16">
            <LoaderThree label="Loading PO" />
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-sm text-slate-500 px-2 py-6">Tidak ada data</div>
        ) : (
          <>
            <ul className="space-y-3">
              {currentItems.map((g) => {
                const open = !!openCompanies[g.company];
                return (
                  <li
                    key={g.company}
                    className="rounded-2xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCompany(g.company)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-sm font-bold tracking-wide text-left">
                        {g.company}
                      </span>
                      {open ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>
                    {open && (
                      <div className="p-3 bg-white">
                        {g.pos.length === 0 ? (
                          <div className="text-sm text-slate-500">
                            Belum ada PO
                          </div>
                        ) : (
                          <>
                            {(() => {
                              // Group POs by inisial
                              const groupsByInisial: Record<string, any[]> = {};
                              g.pos.forEach((po: any) => {
                                const alias =
                                  (po?.RitelModern?.inisial as string) || "—";
                                if (!groupsByInisial[alias]) {
                                  groupsByInisial[alias] = [];
                                }
                                groupsByInisial[alias].push(po);
                              });
                              const aliases = Object.keys(groupsByInisial).sort(
                                (a, b) => a.localeCompare(b),
                              );
                              const perPage = 5;
                              const ip = inisialPage[g.company] || 1;
                              const start = (ip - 1) * perPage;
                              const pageAliases = aliases.slice(
                                start,
                                start + perPage,
                              );
                              const totalPages = Math.max(
                                1,
                                Math.ceil(aliases.length / perPage),
                              );
                              const selectedAlias =
                                activeInisial[g.company] || null;

                              return (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {pageAliases.map((alias) => (
                                      <button
                                        key={alias}
                                        onClick={() =>
                                          setActiveInisial((prev) => ({
                                            ...prev,
                                            [g.company]:
                                              prev[g.company] === alias
                                                ? null
                                                : alias,
                                          }))
                                        }
                                        className={`text-left rounded-xl border p-3 hover:shadow transition-all ${
                                          selectedAlias === alias
                                            ? "border-amber-300 bg-amber-50/50"
                                            : "border-slate-200 bg-white"
                                        }`}
                                        title="Pilih inisial untuk lihat daftar PO"
                                      >
                                        <div className="text-xs font-black tracking-widest text-slate-600 uppercase">
                                          {alias}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                          {groupsByInisial[alias].length} PO
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                  {aliases.length > perPage && (
                                    <div className="flex items-center justify-between mt-3">
                                      <p className="text-xs text-slate-500">
                                        Showing {start + 1}-
                                        {Math.min(
                                          start + perPage,
                                          aliases.length,
                                        )}{" "}
                                        of {aliases.length} inisial
                                      </p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() =>
                                            setInisialPage((prev) => ({
                                              ...prev,
                                              [g.company]: Math.max(ip - 1, 1),
                                            }))
                                          }
                                          disabled={ip === 1}
                                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                        >
                                          Previous
                                        </button>
                                        <button
                                          onClick={() =>
                                            setInisialPage((prev) => ({
                                              ...prev,
                                              [g.company]: Math.min(
                                                ip + 1,
                                                totalPages,
                                              ),
                                            }))
                                          }
                                          disabled={ip === totalPages}
                                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                        >
                                          Next
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {selectedAlias && (
                                    <div className="mt-3 border-t border-slate-100 pt-3">
                                      <div className="text-xs font-bold text-slate-600 mb-2">
                                        Daftar PO untuk inisial: {selectedAlias}
                                      </div>
                                      {(() => {
                                        const key = `${g.company}|${selectedAlias}`;
                                        const pp = poPage[key] || 1;
                                        const perPo = 15;
                                        const list =
                                          groupsByInisial[selectedAlias];
                                        const totalPoPages = Math.max(
                                          1,
                                          Math.ceil(list.length / perPo),
                                        );
                                        const startPo = (pp - 1) * perPo;
                                        const slice = list.slice(
                                          startPo,
                                          startPo + perPo,
                                        );
                                        return (
                                          <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                              {slice.map((po: any) => {
                                                const items = Array.isArray(
                                                  po?.Items,
                                                )
                                                  ? po.Items
                                                  : [];
                                                const sum = (
                                                  arr: any[],
                                                  f: (x: any) => number,
                                                ) =>
                                                  arr.reduce(
                                                    (acc, it) =>
                                                      acc + (f(it) || 0),
                                                    0,
                                                  );
                                                const kgKirim = sum(
                                                  items,
                                                  (it) =>
                                                    Number(it?.pcsKirim) *
                                                    (Number(
                                                      it?.Product?.satuanKg,
                                                    ) || 1),
                                                );
                                                const kgPesan = sum(
                                                  items,
                                                  (it) =>
                                                    Number(it?.pcs) *
                                                    (Number(
                                                      it?.Product?.satuanKg,
                                                    ) || 1),
                                                );
                                                const totalKg =
                                                  kgKirim || kgPesan || 0;
                                                const rpTagih = sum(
                                                  items,
                                                  (it) => Number(it?.rpTagih),
                                                );
                                                const rpNominal = sum(
                                                  items,
                                                  (it) => Number(it?.nominal),
                                                );
                                                const totalRpTagih =
                                                  rpTagih || rpNominal || 0;
                                                const n = (v: number) =>
                                                  v.toLocaleString("id-ID");
                                                return (
                                                  <div
                                                    key={po.id}
                                                    className="py-2 px-3 rounded-xl border border-slate-200 flex items-center justify-between"
                                                  >
                                                    <div className="min-w-0 mr-3">
                                                      <div className="text-sm text-slate-700 font-medium truncate">
                                                        {po.noPo} —{" "}
                                                        {po.tujuanDetail || "-"}
                                                      </div>
                                                      <div className="text-sm md:text-[15px] text-slate-700 font-bold">
                                                        {n(Math.round(totalKg))}{" "}
                                                        kg / Rp{" "}
                                                        {n(totalRpTagih)}
                                                      </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                      <button
                                                        title="Extend"
                                                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                      >
                                                        <CalendarClock
                                                          size={16}
                                                        />
                                                      </button>
                                                      <Link
                                                        href={`/po?noPo=${encodeURIComponent(po.noPo)}&company=${encodeURIComponent(po?.RitelModern?.namaPt || "")}`}
                                                        title="Edit"
                                                        className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                                      >
                                                        <Pencil size={16} />
                                                      </Link>
                                                      <button
                                                        title="Delete"
                                                        onClick={() =>
                                                          setConfirmDelete(
                                                            po.noPo,
                                                          )
                                                        }
                                                        className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                                                      >
                                                        <Trash2 size={16} />
                                                      </button>
                                                      <button
                                                        title="View Detail"
                                                        onClick={() =>
                                                          openModal(po)
                                                        }
                                                        className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                                                      >
                                                        <Eye size={16} />
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                            {list.length > perPo ? (
                                              <div className="flex items-center justify-between mt-3">
                                                <p className="text-xs text-slate-500">
                                                  Showing {startPo + 1}-
                                                  {Math.min(
                                                    startPo + perPo,
                                                    list.length,
                                                  )}{" "}
                                                  of {list.length} PO
                                                </p>
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() =>
                                                      setPoPage((prev) => ({
                                                        ...prev,
                                                        [key]: Math.max(
                                                          pp - 1,
                                                          1,
                                                        ),
                                                      }))
                                                    }
                                                    disabled={pp === 1}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                                  >
                                                    Previous
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      setPoPage((prev) => ({
                                                        ...prev,
                                                        [key]: Math.min(
                                                          pp + 1,
                                                          totalPoPages,
                                                        ),
                                                      }))
                                                    }
                                                    disabled={
                                                      pp === totalPoPages
                                                    }
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                                                  >
                                                    Next
                                                  </button>
                                                </div>
                                              </div>
                                            ) : null}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {groups.length > itemsPerPage ? (
              <div className="flex items-center justify-between px-2 py-4 mt-2">
                <p className="text-sm text-slate-500">
                  Showing {indexOfFirst + 1} -{" "}
                  {Math.min(indexOfLast, groups.length)} of {groups.length}
                </p>
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
            ) : null}
          </>
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
        onSuccess={handlePOCreated}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-2">Hapus PO?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Anda yakin ingin menghapus PO <strong>{confirmDelete}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={deleting}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
