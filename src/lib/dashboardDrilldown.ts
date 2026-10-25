export function openDashboardPOs(filters: Record<string, string>, title = "Detail PO") {
  window.dispatchEvent(new CustomEvent("proc-po-drilldown", { detail: { filters, title } }));
}
