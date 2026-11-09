export interface ApprovalBatchSummary {
  id: string;
  batchCode: string;
  seqNumber: number;
  isArchived: boolean;
  isBatchOpen: boolean;
  isBatchUncloseable: boolean;
  poCount: number;
  requestedCount: number;
  approvedCount: number;
  completedCount: number;
  ndCount: number;
  totalPcs: number;
  totalPcsKirim: number;
  totalNominal: number;
}
