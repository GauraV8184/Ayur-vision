import { Loader2 } from "lucide-react";

interface AILoadingStateProps {
  message?: string;
}

export default function AILoadingState({ message = "Analyzing..." }: AILoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-stone-200 bg-white py-12 dark:border-stone-700 dark:bg-stone-800/50">
      <Loader2 className="h-10 w-10 animate-spin text-herbal-forest dark:text-sage-400" />
      <p className="text-sm font-medium text-stone-600 dark:text-stone-400">{message}</p>
      <p className="text-xs text-stone-500 dark:text-stone-500">AI models are processing your request.</p>
    </div>
  );
}
