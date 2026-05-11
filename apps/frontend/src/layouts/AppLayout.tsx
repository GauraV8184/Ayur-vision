import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import CommandPalette from "../components/ui/CommandPalette";
import { useTheme } from "../hooks/useTheme";
import AppTour from "../components/onboarding/AppTour";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  useTheme();

  const toggleCommand = () => setCommandOpen((p) => !p);

  return (
    <div className="flex h-screen bg-herbal-cream dark:bg-stone-900 overflow-hidden print:overflow-visible print:h-auto">
      <Sidebar className="no-print" open={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)} />
      <div className="flex flex-1 flex-col min-w-0 print:min-w-0 print:overflow-visible">
        <TopBar className="no-print" onCommandOpen={toggleCommand} sidebarOpen={sidebarOpen} />
        <main
          className="flex-1 overflow-auto p-6 print:overflow-visible print:h-auto"
          data-tour="main-content"
        >
          <Outlet />
        </main>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <AppTour />
    </div>
  );
}
