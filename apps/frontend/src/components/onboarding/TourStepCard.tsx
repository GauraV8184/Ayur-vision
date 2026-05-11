import Button from "../ui/Button";

export function TourStepCard({
  stepTitle,
  stepBody,
  stepIndex,
  totalSteps,
  canGoBack,
  onBack,
  onNext,
  onSkip,
  onFinish,
  isLast,
}: {
  stepTitle: string;
  stepBody: string;
  stepIndex: number;
  totalSteps: number;
  canGoBack: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
  isLast: boolean;
}) {
  return (
    <div className="w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Step {stepIndex + 1} of {totalSteps}
          </p>
          <h3 className="mt-1 text-base font-semibold text-stone-900 dark:text-stone-100">
            {stepTitle}
          </h3>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          Skip
        </button>
      </div>

      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{stepBody}</p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={onBack} disabled={!canGoBack}>
          Back
        </Button>
        {isLast ? (
          <Button type="button" onClick={onFinish}>
            Finish
          </Button>
        ) : (
          <Button type="button" onClick={onNext}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

