import { getApiUrl } from "@/lib/utils";

export interface EngineCaps {
  maxPositionPct: number;
  maxPositions: number;
  perPositionStopLossPct: number;
  perPositionTakeProfitPct: number;
  maxDrawdownPct: number;
}
export const DEFAULT_CAPS: EngineCaps = {
  maxPositionPct: 20, maxPositions: 10,
  perPositionStopLossPct: 3, perPositionTakeProfitPct: 5,
  maxDrawdownPct: 10,
};

export interface EngineFormState {
  amount: number;
  isLiveTrading: boolean;
  isSentimentEnabled: boolean;
  direction: "long" | "short" | "both";
  skipHeld: boolean;
  caps: EngineCaps;
}

export interface EnginePreviewRow {
  ticker: string; side: "buy" | "sell"; composite: number;
  topSignals: string[]; allocation: number; qty: number; price: number;
}
export interface EngineDiagnostics {
  totalCandidates: number;
  afterDirection: number;
  afterSentiment: number;
  afterSkipHeld: number;
  afterCap: number;
}
export interface EnginePreview {
  rows: EnginePreviewRow[];
  totalAllocated: number;
  totalRequested: number;
  cashBuffer: number;
  capBindingBuffer: number;
  caps: EngineCaps;
  diagnostics: EngineDiagnostics;
}
export interface EngineExecuteResult {
  preview: EnginePreview;
  results: { ticker: string; ok: boolean; orderId?: string; status?: string; error?: string }[];
}

async function call(state: EngineFormState, email: string, dryRun: boolean) {
  const res = await fetch(`${getApiUrl()}/api/v1/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...state, email, dryRun }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const previewEngine = (s: EngineFormState, email: string) =>
  call(s, email, true) as Promise<EngineExecuteResult>;
export const executeEngine = (s: EngineFormState, email: string) =>
  call(s, email, false) as Promise<EngineExecuteResult>;
