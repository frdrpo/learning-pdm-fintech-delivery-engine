import type { ReactNode } from "react";

export type CardElement = "div" | "section" | "article";

export type CardVariant =
  | "card"
  | "tile"
  | "row"
  | "notice-rose"
  | "notice-green";

const VARIANT_CLASS: Record<CardVariant, string> = {
  card: "rounded-2xl border border-white/10 bg-white/5 p-6",
  tile: "rounded-xl border border-white/10 bg-white/5 p-4",
  row: "flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-4 py-2.5",
  "notice-rose": "rounded-lg border border-rose-400/20 bg-rose-400/10 text-rose-200",
  "notice-green":
    "rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
};

const ELEMENT: Record<CardElement, CardElement> = {
  div: "div",
  section: "section",
  article: "article",
};

type CardProps = {
  children: ReactNode;
  as?: CardElement;
  variant?: CardVariant;
  className?: string;
};

export function Card({
  children,
  as = "div",
  variant = "card",
  className,
}: CardProps) {
  const Tag = ELEMENT[as];
  const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return <Tag className={classes}>{children}</Tag>;
}