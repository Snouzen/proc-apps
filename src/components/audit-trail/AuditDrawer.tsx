"use client";

import React, { useEffect, useState } from "react";
import { X, Clock, User, Activity, ArrowRight } from "lucide-react";

type AuditLog = {
  id: string;
  entityId: string;
  entity: string;
  action: string;
  oldData: any;
  newData: any;
  userName: string | null;
  createdAt: string;
};

export default function AuditDrawer({
  open,
  onClose,
  poId,
}: {
  open: boolean;
  onClose: () => void;
  poId: string;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && poId) {
      setLoading(true);
      setError(null);
      fetch(`/api/po/${poId}/audit-logs`)
        .then((res) => res.json())
        .then((res) => {
          if (res.error) throw new Error(res.error);
          setLogs(res.data || []);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [open, poId]);

  if (!open) return null;

  const renderChanges = (log: AuditLog) => {
    if (log.action === "DELETE") {
      return (
        <div className="text-xs text-red-500 mt-2">
          Data dihapus. Data sebelumnya: {JSON.stringify(log.oldData)}
        </div>
      );
    }

    if (!log.oldData || !log.newData) return null;

    const changes: { key: string; oldVal: any; newVal: any }[] = [];
    Object.keys(log.newData).forEach((key) => {
      // Avoid comparing complex objects directly, just simple primitive comparisons for UI
      if (
        log.oldData[key] !== log.newData[key] &&
        key !== "updatedAt"
      ) {
        changes.push({
          key,
          oldVal: log.oldData[key],
          newVal: log.newData[key],
        });
      }
    });

    if (changes.length === 0) return <div className="text-[10px] text-slate-400 mt-1 italic">Tidak ada perubahan field (hanya updatedAt).</div>;

    const formatValue = (val: any) => {
      if (val === null || val === undefined) return "null";
      if (typeof val === "object") {
        if (val.$date) return new Date(val.$date).toLocaleString("id-ID");
        // Check if it's a date string ISO 8601
        return JSON.stringify(val);
      }
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return new Date(val).toLocaleString("id-ID");
      }
      return String(val);
    };

    return (
      <div className="mt-2 space-y-1 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800 p-2">
        {changes.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-slate-600 dark:text-slate-300 w-24 truncate" title={c.key}>
              {c.key}
            </span>
            <span className="text-red-500 line-through bg-red-50 dark:bg-red-900/20 px-1 rounded truncate max-w-[100px]" title={formatValue(c.oldVal)}>
              {formatValue(c.oldVal) || "-"}
            </span>
            <ArrowRight size={10} className="text-slate-400" />
            <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded font-medium truncate max-w-[100px]" title={formatValue(c.newVal)}>
              {formatValue(c.newVal) || "-"}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9998] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[400px] max-w-full bg-slate-50 dark:bg-slate-950 shadow-2xl z-[9999] border-l border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Activity size={18} />
            <h2 className="font-bold text-sm">Riwayat Perubahan (Audit)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-sm text-center py-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm flex flex-col items-center gap-2">
              <Clock size={24} className="opacity-50" />
              <p>Belum ada riwayat perubahan.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6">
              {logs.map((log) => {
                const date = new Date(log.createdAt);
                return (
                  <div key={log.id} className="relative pl-6">
                    {/* Timeline dot */}
                    <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white dark:bg-slate-950 border-2 border-indigo-500 shadow-sm" />
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                          <User size={12} className="text-slate-400" />
                          {log.userName || "System"}
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          {date.toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })} {date.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-500 font-medium">
                        {log.action} <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{log.entity}</span>
                      </div>

                      {renderChanges(log)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
