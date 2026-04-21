import { ReactNode } from "react";

/**
 * Column definition for the DataTable component.
 * Each column describes how a single column should be rendered.
 */
export interface ColumnDef<T = any> {
  /** Unique string key, typically matching a field name in the data */
  key: string;
  /** Header label displayed in <th> */
  label: string;
  /** Text alignment — defaults to "left" */
  align?: "left" | "center" | "right";
  /** Fixed width class (e.g. "w-20", "w-48"). When omitted the column auto-sizes. */
  width?: string;
  /** If true the header text will be wrapped in `whitespace-nowrap` */
  nowrap?: boolean;
  /**
   * Custom cell renderer.
   * - When provided, the function receives the *cell value* and the full *row*.
   * - When omitted the raw value is printed as-is (toString).
   */
  render?: (value: any, row: T, index: number) => ReactNode;
  /**
   * If true, this column will be hidden from the table. Useful for
   * conditional column-visibility toggles without removing the definition.
   */
  hidden?: boolean;
}

/**
 * Props accepted by the DataTable component.
 */
export interface DataTableProps<T = any> {
  // ── Data ─────────────────────────────────────────────
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Data rows to render on the *current page* */
  data: T[];
  /** Unique key extractor for each row (defaults to `(row, idx) => idx`) */
  rowKey?: (row: T, index: number) => string | number;

  // ── Pagination ───────────────────────────────────────
  /** Total record count from the server (for pagination display) */
  total?: number;
  /** Current page (1-indexed) */
  page?: number;
  /** Rows per page */
  rowsPerPage?: number;
  /** Rows-per-page options shown in the selector. Defaults to [10, 15, 25, 50]. */
  rowsPerPageOptions?: number[];
  /** Called when user changes page */
  onPageChange?: (page: number) => void;
  /** Called when user changes rows-per-page */
  onRowsPerPageChange?: (rpp: number) => void;
  /** Hide the pagination footer entirely */
  hidePagination?: boolean;

  // ── Loading & empty ──────────────────────────────────
  /** When true, skeleton rows are shown instead of data */
  loading?: boolean;
  /** Number of skeleton rows to show (default: 8) */
  skeletonRows?: number;
  /** When true, applies a "fetching next page" overlay (opacity + pointer-events) */
  isFetchingPage?: boolean;
  /** Custom empty state node */
  emptyState?: ReactNode;
  /** Custom empty message text (used when emptyState is not provided) */
  emptyMessage?: string;

  // ── Interaction ──────────────────────────────────────
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Extra className applied to <tr> for each row */
  rowClassName?: (row: T, index: number) => string;

  // ── Expandable Rows ──────────────────────────────────
  /** Set of row keys that are currently expanded */
  expandedKeys?: Set<string>;
  /** Called when user toggles expansion on a row */
  onToggleExpand?: (key: string) => void;
  /** Render function for the expanded content row. Return null to skip rendering. */
  renderExpandedRow?: (row: T, index: number) => ReactNode;

  // ── Features ─────────────────────────────────────────
  /** Show automatic row numbering as the first column */
  rowNumber?: boolean;
  /** Make the first visible column sticky (for horizontal scroll) */
  stickyFirstCol?: boolean;
  /** Make the last visible column sticky on the right */
  stickyLastCol?: boolean;

  // ── Styling ──────────────────────────────────────────
  /** Outer wrapper className override */
  className?: string;
  /** Pick a visual variant that matches the page context */
  variant?: "default" | "rounded";
  /** Maximum height for the scrollable table area (e.g. "70vh") */
  maxHeight?: string;
}
