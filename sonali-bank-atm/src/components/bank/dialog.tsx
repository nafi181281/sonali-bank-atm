import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, HelpCircle, Info, TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/bank";

type DialogTone = Tone | "question";

interface DialogOptions {
  title: string;
  message: ReactNode;
  tone?: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogState extends DialogOptions {
  kind: "alert" | "confirm";
}

interface DialogApi {
  alert: (o: DialogOptions) => Promise<void>;
  confirm: (o: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogApi | null>(null);

const toneStyles: Record<DialogTone, { icon: typeof Info; box: string }> = {
  info: { icon: Info, box: "bg-accent text-accent-foreground" },
  question: { icon: HelpCircle, box: "bg-accent text-accent-foreground" },
  success: { icon: CheckCircle2, box: "bg-success/10 text-success" },
  warning: { icon: TriangleAlert, box: "bg-warning/15 text-warning-foreground" },
  error: { icon: AlertCircle, box: "bg-destructive/10 text-destructive" },
};

/** Replaces Win32 MessageBox with promise-based modals. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const open = useCallback((d: DialogState) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setDialog(d);
    });
  }, []);

  const settle = (value: boolean) => {
    const r = resolver.current;
    resolver.current = null;
    setDialog(null);
    r?.(value);
  };

  const api: DialogApi = {
    alert: async (o) => {
      await open({ ...o, kind: "alert" });
    },
    confirm: (o) => open({ ...o, kind: "confirm" }),
  };

  const tone = toneStyles[dialog?.tone ?? "info"];
  const Icon = tone.icon;

  return (
    <DialogContext.Provider value={api}>
      {children}
      <AlertDialog open={!!dialog} onOpenChange={(o) => !o && settle(false)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl bg-card p-6">
          {dialog && (
            <>
              <AlertDialogHeader className="items-start gap-3 text-left">
                <span className={cn("grid size-10 place-items-center rounded-xl", tone.box)}>
                  <Icon className="size-5" />
                </span>
                <AlertDialogTitle className="text-lg font-bold tracking-tight">
                  {dialog.title}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="w-full text-[15px] leading-relaxed text-muted-foreground">
                    {dialog.message}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-2 gap-2 sm:space-x-0">
                {dialog.kind === "confirm" && (
                  <AlertDialogCancel
                    className="mt-0 h-11 rounded-xl px-5"
                    onClick={() => settle(false)}
                  >
                    {dialog.cancelLabel ?? "No"}
                  </AlertDialogCancel>
                )}
                <AlertDialogAction className="h-11 rounded-xl px-6" onClick={() => settle(true)}>
                  {dialog.confirmLabel ?? (dialog.kind === "confirm" ? "Yes" : "OK")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside DialogProvider");
  return ctx;
}
