export interface ReadMeta {
  totalRows: number;
  parsedRows: number;
  emptyRows: number[];
  missingNoPoRows: number[];
  missingCompanyRows: number[];
}

export interface ResultSummary {
  uniquePoCount: number;
  plannedPoCount: number;
  addedPoCount: number;
  replacedPoCount: number;
  skippedDuplicatePoCount: number;
  addedPOs: string[];
  skippedDuplicatePOs: string[];
  replacedPOs: string[];
  uploadedItemRows: number;
  totalItemRows: number;
  errors: string[];
  listTruncated?: boolean;
  debugSamples?: Array<{
    noPo: string;
    tglPoRawType: string;
    tglPoRaw: any;
    tglPoParsed: string | null;
    expiredRawType: string;
    expiredRaw: any;
    expiredParsed: string | null;
  }>;
}

export interface ProgressMeta {
  batchIndex: number;
  batchTotal: number;
  poDone: number;
  poTotal: number;
}

export interface HeaderKeys {
  noPo: string | null;
  company: string | null;
  inisial: string | null;
  product: string | null;
  total: string | null;
  tglPo: string | null;
  expiredTgl: string | null;
}
