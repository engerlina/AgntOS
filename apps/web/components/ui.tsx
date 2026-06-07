import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import type { AgentStatus } from "@agntos/db";

import { cn } from "@/lib/utils";

type Variant = "primary" | "dark" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  dark: "btn-dark",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn("btn", variantClass[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn("btn", variantClass[variant], className)} {...props} />;
}

export function Card({
  children,
  className,
  large,
}: {
  children: ReactNode;
  className?: string;
  large?: boolean;
}) {
  return (
    <div className={cn(large ? "brutal-card-lg" : "brutal-card", "p-6", className)}>{children}</div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

const statusStyle: Record<AgentStatus, string> = {
  provisioning: "bg-lime text-ink",
  running: "bg-fern text-ink",
  paused: "bg-hair text-ink",
  stopped: "bg-paper text-ink",
  error: "bg-coral text-ink",
};

const statusDot: Record<AgentStatus, string> = {
  provisioning: "animate-pulse bg-ink",
  running: "bg-ink",
  paused: "bg-ink",
  stopped: "bg-faint",
  error: "bg-ink",
};

export function StatusChip({ status }: { status: AgentStatus }) {
  return (
    <span className={cn("chip", statusStyle[status])}>
      <span className={cn("inline-block h-2 w-2", statusDot[status])} />
      {status}
    </span>
  );
}

export function Field({
  label,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className={cn("field", className)} {...props} />
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...props
}: ComponentProps<"textarea"> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className={cn("field min-h-28 resize-y", className)} {...props} />
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}
