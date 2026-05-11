import { NavLink } from "react-router-dom";
import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Stethoscope,
  TrendingUp,
  Brain,
  Activity,
  Scale,
  Leaf,
  BookOpen,
  Flower2,
  Settings,
  Cpu,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  FileText,
  User,
  UserPlus,
  Clock,
} from "lucide-react";
import { cn } from "../../utils/cn";

type NavIcon = ComponentType<{ className?: string }>;

type NavItemModel = {
  to: string;
  label: string;
  icon: NavIcon;
  dataTour?: string;
};

const primaryNav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, dataTour: "nav-dashboard" },
  { to: "/app/patient-analysis", label: "Patient Analysis", icon: Stethoscope, dataTour: "nav-patient-analysis" },
  { to: "/app/patients/new", label: "New Patient", icon: UserPlus, dataTour: "nav-new-patient" },
  { to: "/app/prediction-results", label: "Clinical Predictions", icon: TrendingUp },
  { to: "/app/patient-report", label: "Patient Report", icon: FileText },
];

const aiModules = [
  { to: "/app/prakriti", label: "Prakriti Prediction", icon: Brain },
  { to: "/app/disease-prediction", label: "Disease Prediction", icon: Activity },
  { to: "/app/dosha-analysis", label: "Dosha Analysis", icon: Scale },
  { to: "/app/herbal-recommendations", label: "Herbal Recommendations", icon: Leaf },
];

const knowledge = [
  { to: "/app/knowledge-assistant", label: "Ayurvedic Knowledge Assistant", icon: BookOpen, dataTour: "nav-knowledge-assistant" },
  { to: "/app/plant-library", label: "Medicinal Plant Library", icon: Flower2 },
];

const account = [
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/history", label: "History", icon: Clock, dataTour: "nav-history" },
];

const settings = [
  { to: "/app/settings", label: "System Settings", icon: Settings, dataTour: "nav-settings" },
  { to: "/app/model-status", label: "Model Status", icon: Cpu },
];

function NavItem({ to, label, icon: Icon, dataTour }: NavItemModel) {
  return (
    <NavLink
      to={to}
      data-tour={dataTour}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-herbal-forest/10 text-herbal-forest dark:bg-sage-400/20 dark:text-sage-300"
            : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
      <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
    </NavLink>
  );
}

function Section({ title, items }: { title: string; items: NavItemModel[] }) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {title}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar({
  open,
  onToggle,
  className = "",
}: {
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 transition-[width] duration-200",
        open ? "w-64" : "w-[4.5rem]",
        className
      )}
      data-tour="sidebar"
    >
      <div className="flex h-14 items-center justify-between border-b border-stone-200 px-3 dark:border-stone-700">
        {open && (
          <span className="text-lg font-semibold text-herbal-forest dark:text-sage-300">
            AyurVision AI
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          {open ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {open ? (
          <>
            <Section title="Primary" items={primaryNav} />
            <Section title="AI Modules" items={aiModules} />
            <Section title="Knowledge" items={knowledge} />
            <Section title="Account" items={account} />
            <Section title="Settings" items={settings} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {[...primaryNav, ...aiModules, ...knowledge, ...account, ...settings].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-tour={item.dataTour}
                className={({ isActive }) =>
                  cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    isActive ? "bg-herbal-forest/10 text-herbal-forest" : "text-stone-500 hover:bg-stone-100"
                  )
                }
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
