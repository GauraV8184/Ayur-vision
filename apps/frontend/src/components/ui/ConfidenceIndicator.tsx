import { cn } from "../../utils/cn";

interface ConfidenceIndicatorProps {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function ConfidenceIndicator({
  value,
  label,
  size = "md",
}: ConfidenceIndicatorProps) {
  const pct = Math.round((value ?? 0) * 100);
  const high = pct >= 70;
  const mid = pct >= 40 && pct < 70;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700",
          size === "sm" && "h-2 w-16",
          size === "md" && "h-2.5 w-24",
          size === "lg" && "h-3 w-32"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            high && "bg-emerald-500",
            mid && "bg-amber-500",
            !high && !mid && "bg-stone-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label !== undefined && (
        <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
          {label ?? `${pct}%`}
        </span>
      )}
      {label === undefined && (
        <span className="text-xs font-medium text-stone-600 dark:text-stone-400">{pct}%</span>
      )}
    </div>
  );
}
