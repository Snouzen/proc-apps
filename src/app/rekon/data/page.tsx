"use client";

import { useRekonData } from "./hooks/useRekonData";
import DataRekonHeader from "./components/DataRekonHeader";
import DataRekonTable from "./components/DataRekonTable";
import DataRekonModals from "./components/DataRekonModals";

export default function DataRekonPage() {
  const hook = useRekonData();

  return (
    <>
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="max-w-full mx-auto p-6 bg-[#f8fafc] dark:bg-transparent min-h-screen font-sans">
        <DataRekonHeader hook={hook} />
        <DataRekonTable hook={hook} />
      </div>

      <DataRekonModals hook={hook} />
    </>
  );
}
