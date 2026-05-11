import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  BookOpen,
  Flower2,
  Settings,
  Search,
} from "lucide-react";
import { cn } from "../../utils/cn";

const commands = [
  { id: "dashboard", label: "Go to Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
  { id: "patient", label: "New Patient Analysis", path: "/app/patient-analysis", icon: Stethoscope },
  { id: "knowledge", label: "Knowledge Assistant", path: "/app/knowledge-assistant", icon: BookOpen },
  { id: "library", label: "Plant Library", path: "/app/plant-library", icon: Flower2 },
  { id: "settings", label: "Settings", path: "/app/settings", icon: Settings },
];

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => (s + 1) % Math.max(1, filtered.length));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => (s - 1 + filtered.length) % Math.max(1, filtered.length));
      }
      if (e.key === "Enter" && filtered[selected]) {
        e.preventDefault();
        navigate(filtered[selected].path);
        onClose();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [open, onClose, selected, filtered, navigate]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900"
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center border-b border-stone-200 px-4 dark:border-stone-700">
          <Search className="h-5 w-5 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 border-0 bg-transparent px-3 py-3 text-base outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500"
            autoFocus
          />
          <kbd className="rounded bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800">ESC</kbd>
        </div>
        <ul className="max-h-72 overflow-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-stone-500">No results.</li>
          ) : (
            filtered.map((cmd, i) => (
              <li key={cmd.id}>
                <button
                  type="button"
                  onClick={() => {
                    navigate(cmd.path);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm",
                    i === selected
                      ? "bg-herbal-forest/10 text-herbal-forest dark:bg-sage-500/20 dark:text-sage-300"
                      : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  )}
                >
                  <cmd.icon className="h-4 w-4 shrink-0" />
                  {cmd.label}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}
