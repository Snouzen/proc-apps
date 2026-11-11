export function openDashboardPOs(filters: Record<string, string>, title = "Detail PO", activity?: { id: string; recordId: string }) {
  window.dispatchEvent(new CustomEvent("proc-po-drilldown", { detail: { filters, title, activity } }));
}
