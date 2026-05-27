import { HTMLAttributes, ReactNode } from "react";

import { clsx } from "@/lib/utils";

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={clsx("rounded-lg border border-slate-200 bg-white p-5 shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}
