import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export default function Tooltip({
  children,
  content,
}: {
  children: ReactNode;
  content: ReactNode;
}) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className={cn(
            "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg",
            "bg-stone-800 px-3 py-2 text-xs font-medium text-white shadow-lg",
            "whitespace-nowrap dark:bg-stone-200 dark:text-stone-900"
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
