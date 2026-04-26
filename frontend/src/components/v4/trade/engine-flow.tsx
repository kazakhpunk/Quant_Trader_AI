"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ConfigureStep } from "./configure-step";
import { PreviewStep } from "./preview-step";
import { ResultStep } from "./result-step";
import {
  DEFAULT_CAPS, EngineFormState, EnginePreview, EngineExecuteResult,
  previewEngine, executeEngine,
} from "@/lib/api/engine";
import { getApiUrl } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initial: EngineFormState = {
  amount: 100,
  isLiveTrading: false,
  isSentimentEnabled: true,
  direction: "long",
  skipHeld: true,
  caps: DEFAULT_CAPS,
};

type Stage = "configure" | "preview" | "result";

export function EngineFlow() {
  const { user } = useUser();
  const [stage, setStage] = useState<Stage>("configure");
  const [state, setState] = useState<EngineFormState>(initial);
  const [preview, setPreview] = useState<EnginePreview | null>(null);
  const [result, setResult] = useState<EngineExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cash, setCash] = useState<number | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("alpaca_access_token") : null;
    if (!token) return;
    fetch(`${getApiUrl()}/api/v4/dashboard-data`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isLive: state.isLiveTrading }),
    })
      .then((r) => r.json())
      .then((d) => setCash(Number(d?.account?.cash) || 0))
      .catch(() => {});
  }, [state.isLiveTrading]);

  const email = user?.primaryEmailAddress?.emailAddress;

  const onPreview = async () => {
    if (!email) return;
    setLoading(true); setError(null);
    try {
      const r = await previewEngine(state, email);
      setPreview(r.preview);
      setStage("preview");
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const onPlace = async () => {
    if (!email) return;
    setLoading(true); setError(null);
    try {
      const r = await executeEngine(state, email);
      setResult(r);
      setStage("result");
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <>
      {error && (
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <Alert>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {stage === "configure" && (
        <ConfigureStep
          state={state} onChange={setState}
          onPreview={onPreview}
          availableCash={cash}
          loading={loading}
        />
      )}
      {stage === "preview" && preview && (
        <PreviewStep
          preview={preview}
          stopPct={state.caps.perPositionStopLossPct}
          tpPct={state.caps.perPositionTakeProfitPct}
          onAdjust={() => setStage("configure")}
          onPlace={onPlace}
          onRetry={onPreview}
          loading={loading}
        />
      )}
      {stage === "result" && result && (
        <ResultStep
          result={result}
          email={email ?? ""}
          isLiveTrading={state.isLiveTrading}
          onAnother={() => { setResult(null); setPreview(null); setStage("configure"); }}
        />
      )}
    </>
  );
}
