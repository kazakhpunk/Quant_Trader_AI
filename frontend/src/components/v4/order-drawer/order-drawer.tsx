"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useOrderDrawer } from "@/lib/order-drawer-store";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { OrderForm, OrderFormValues } from "./order-form";
import { OrderReview } from "./order-review";
import { OrderResult } from "./order-result";
import { placeOrder, PlaceOrderResult } from "@/lib/api/orders";

type Mode = "form" | "review" | "result";

export function OrderDrawer() {
  const { isOpen, symbol, close } = useOrderDrawer();
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>("form");
  const [values, setValues] = useState<OrderFormValues | null>(null);
  const [refPrice, setRefPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlaceOrderResult | null>(null);

  const reset = () => { setMode("form"); setValues(null); setResult(null); };

  const onConfirm = async () => {
    if (!values || !user) return;
    setLoading(true);
    const email = user.primaryEmailAddress?.emailAddress!;
    const r = await placeOrder({ ...values, email });
    setResult(r);
    setMode("result");
    setLoading(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => { if (!o) { close(); reset(); } }}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        {symbol && (
          <>
            <SheetHeader>
              <SheetTitle>{symbol}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {mode === "form" && (
                <OrderForm
                  symbol={symbol}
                  onReview={(v, p) => { setValues(v); setRefPrice(p); setMode("review"); }}
                />
              )}
              {mode === "review" && values && (
                <OrderReview
                  values={values}
                  referencePrice={refPrice}
                  onBack={() => setMode("form")}
                  onConfirm={onConfirm}
                  loading={loading}
                />
              )}
              {mode === "result" && result && (
                <OrderResult
                  ok={result.ok}
                  orderId={result.orderId}
                  status={result.status}
                  error={result.error}
                  onClose={() => { close(); reset(); }}
                  onAnother={reset}
                />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
