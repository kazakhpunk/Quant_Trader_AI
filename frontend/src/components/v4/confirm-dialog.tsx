"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export type ConfirmIntent = "destructive" | "neutral";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: ConfirmIntent;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  intent = "destructive",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onCancel(); }}>
      <DialogContent className="max-w-md overflow-hidden border-border/60 p-0 sm:rounded-xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* Header — masthead-ish, matches the editorial dialogs across the app */}
        <div
          className={cn(
            "relative px-6 pt-6 pb-5",
            intent === "destructive"
              ? "bg-gradient-to-br from-rose-500/10 via-background to-background"
              : "bg-gradient-to-br from-muted/50 via-background to-background"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                intent === "destructive"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : "bg-muted text-foreground"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {intent === "destructive" ? "Confirm action · destructive" : "Confirm action"}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {description}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/15 px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="h-8"
          >
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={cn(
              "h-8",
              intent === "destructive" &&
                "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Small hook to wire ConfirmDialog into imperative handlers. Usage:
 *
 *    const { confirm, dialog } = useConfirm();
 *    <ManagePanel ...>
 *    {dialog}
 *
 *    const ok = await confirm({ title, description, ... });
 *    if (!ok) return;
 *    await actuallyDoThing();
 */
export function useConfirm() {
  const [state, setState] = useState<
    | (Omit<ConfirmDialogProps, "open" | "onConfirm" | "onCancel" | "loading"> & {
        resolve: (ok: boolean) => void;
      })
    | null
  >(null);
  const [loading, setLoading] = useState(false);

  const confirm = (
    opts: Omit<ConfirmDialogProps, "open" | "onConfirm" | "onCancel" | "loading">
  ): Promise<boolean> =>
    new Promise((resolve) => setState({ ...opts, resolve }));

  // Esc / outside click closes (handled by Dialog's onOpenChange)
  useEffect(() => {
    if (!state) setLoading(false);
  }, [state]);

  const dialog = state ? (
    <ConfirmDialog
      {...state}
      open
      loading={loading}
      onConfirm={async () => {
        setLoading(true);
        state.resolve(true);
        // Caller controls timing of close — we leave it open so the user
        // sees "Working…" until they re-render with a new `confirm` or
        // setState(null) when their work is done.
      }}
      onCancel={() => {
        state.resolve(false);
        setState(null);
      }}
    />
  ) : null;

  // Helper to dismiss the dialog after the caller's async work finishes.
  const close = () => setState(null);

  return { confirm, dialog, close };
}
