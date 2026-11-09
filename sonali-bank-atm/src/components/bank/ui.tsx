import type { ComponentProps, ReactNode } from "react";
import { ChevronRight, Wifi } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/bank";

export const formatBDT = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-3xl border bg-card p-5 shadow-soft animate-in fade-in slide-in-from-bottom-2 duration-300 sm:p-8",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ScreenTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <header className="mb-6 sm:mb-8">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function Field({
  label,
  id,
  hint,
  className,
  ...props
}: { label: string; id: string; hint?: string } & ComponentProps<"input">) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <Input
        id={id}
        autoComplete="off"
        className="h-12 rounded-xl bg-card px-4 text-base md:text-base"
        {...props}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "primary" | "success" | "danger";
}) {
  return (
    <div className="rounded-2xl border bg-muted p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular sm:text-xl",
          tone === "primary" && "text-primary",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function ActionTile({
  icon,
  label,
  description,
  onClick,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl transition-colors [&_svg]:size-5",
          tone === "danger"
            ? "bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground"
            : "bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight">{label}</span>
        {description && (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">{description}</span>
        )}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}

export function DebitCard({ card, className }: { card: Card; className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[1.6/1] w-full overflow-hidden rounded-2xl bg-gradient-card p-5 text-primary-foreground shadow-card sm:p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary-foreground/10" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-primary-foreground/5" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="text-sm font-bold tracking-wide">SONALI BANK</span>
          <Wifi className="size-5 rotate-90 opacity-80" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest opacity-70">Available balance</p>
          <p className="font-mono text-xl font-semibold tabular sm:text-2xl">
            BDT {formatBDT(card.balance)}
          </p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{card.holderName}</p>
            <p className="font-mono text-sm tracking-[0.18em] opacity-90">{card.cardNumber}</p>
          </div>
          <div className="flex shrink-0 -space-x-2">
            <span className="size-6 rounded-full bg-primary-foreground/70" />
            <span className="size-6 rounded-full bg-primary-foreground/35" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LimitBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.max(0, (used / limit) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-xs tabular">
          {formatBDT(used)} <span className="text-muted-foreground">/ {limit.toFixed(0)}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-right font-mono tabular", strong ? "text-base font-bold" : "text-sm")}>
        {value}
      </span>
    </div>
  );
}
