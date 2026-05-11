import { useLocation } from "react-router-dom";

export default function PlaceholderPage() {
  const location = useLocation();
  const name = location.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "Page";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold capitalize text-stone-900 dark:text-stone-100">
        {name}
      </h1>
      <p className="text-stone-500 dark:text-stone-400">
        This module will be connected to AI models. Use the sidebar to go to Patient Analysis or
        Prediction Results for the full workflow.
      </p>
    </div>
  );
}
