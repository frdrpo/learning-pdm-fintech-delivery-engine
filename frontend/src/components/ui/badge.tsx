import type { ReactNode } from "react";

export type BadgeTone =
  | "green"
  | "amber"
  | "rose"
  | "cyan"
  | "violet"
  | "neutral";

export type BadgeSize = "sm" | "md";

export type BadgeFont = "medium" | "normal";

const TONE_CLASS: Record<BadgeTone, string> = {
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  violet: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  neutral: "border-white/15 text-slate-400",
};

const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: "px-2.5 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
};

const FONT_CLASS: Record<BadgeFont, string> = {
  medium: "font-medium",
  normal: "font-normal",
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  font?: BadgeFont;
  label?: string;
};

export function Badge({
  children,
  tone = "neutral",
  size = "sm",
  font = "medium",
  label,
}: BadgeProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`rounded-full border ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} ${FONT_CLASS[font]}`}
    >
      {children}
    </span>
  );
}