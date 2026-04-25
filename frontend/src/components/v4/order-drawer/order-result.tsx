"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function OrderResult({
  ok, orderId, status, error, onClose, onAnother,
}: {
  ok: boolean;
  orderId?: string;
  status?: string;
  error?: string;
  onClose: () => void;
  onAnother: () => void;
}) {
  return (
    <div className="text-center">
      <p className={`text-xs uppercase tracking-widest ${ok ? "text-emerald-600" : "text-rose-600"}`}>
        {ok ? "Order placed" : "Order failed"}
      </p>
      <h3 className="mt-3 text-xl font-semibold">
        {ok ? `Status: ${status}` : error}
      </h3>
      {orderId && <p className="mt-1 font-mono text-xs text-muted-foreground">{orderId}</p>}
      <div className="mt-8 flex flex-col gap-3">
        <Link href="/dashboard"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={onClose}>
          View on dashboard →
        </Link>
        <Button variant="outline" onClick={onAnother}>Place another order</Button>
      </div>
    </div>
  );
}
