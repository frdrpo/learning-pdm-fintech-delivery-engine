import type { ReactNode } from "react";

export function SiteFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="border-t border-white/10 py-10 text-center text-sm text-slate-500">
      {children}
    </footer>
  );
}