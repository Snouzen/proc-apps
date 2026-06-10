"use client";

import { useState, useCallback } from "react";

export function usePODetail() {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  const handleViewRow = useCallback(async (po: any) => {
    setDetailData(po);
    setIsViewOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/po?noPo=${encodeURIComponent(po.noPo)}&includeItems=true&limit=1`,
        { cache: "no-store" },
      );
      const data = await res.json();
      const first = Array.isArray(data?.data)
        ? data.data[0]
        : Array.isArray(data)
          ? data[0]
          : null;
      if (first) {
        setDetailData(first);
      }
    } catch (err) {
      console.error("Failed to fetch detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setIsViewOpen(false);
    setDetailData(null);
  }, []);

  return {
    isViewOpen,
    loadingDetail,
    detailData,
    handleViewRow,
    closeDetail,
  };
}
