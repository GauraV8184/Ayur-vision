import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOnboarding } from "../../hooks/useOnboarding";
import { TourStepCard } from "./TourStepCard";

type TourStep = {
  id: string;
  selector: string;
  title: string;
  body: string;
  /**
   * Optional route to navigate to before highlighting.
   * Useful for steps that are best explained on a specific page.
   */
  route?: string;
};

type Placement = { top: number; left: number };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getRectForSelector(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = (el as HTMLElement).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

function scrollTargetIntoView(selector: string) {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return;
  try {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  } catch {
    el.scrollIntoView();
  }
}

function computeCardPlacement(target: DOMRect | null, cardSize: { w: number; h: number }): Placement {
  const pad = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!target) {
    return { top: pad, left: vw - cardSize.w - pad };
  }

  // Prefer right side, else bottom, else left, else top.
  const candidates: Placement[] = [
    { top: target.top, left: target.right + pad }, // right
    { top: target.bottom + pad, left: target.left }, // bottom
    { top: target.top, left: target.left - cardSize.w - pad }, // left
    { top: target.top - cardSize.h - pad, left: target.left }, // top
  ];

  for (const p of candidates) {
    const within =
      p.left >= pad &&
      p.top >= pad &&
      p.left + cardSize.w <= vw - pad &&
      p.top + cardSize.h <= vh - pad;
    if (within) return p;
  }

  return {
    left: clamp(target.left, pad, vw - cardSize.w - pad),
    top: clamp(target.bottom + pad, pad, vh - cardSize.h - pad),
  };
}

export default function AppTour() {
  const { open, complete, skip } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();

  const steps: TourStep[] = useMemo(
    () => [
      {
        id: "welcome",
        selector: '[data-tour="main-content"]',
        title: "Welcome to AyurVision",
        body: "A short tour to help you find the key clinical features.",
        route: "/app/dashboard",
      },
      {
        id: "sidebar",
        selector: '[data-tour="sidebar"]',
        title: "Navigation",
        body: "Use this area to move between dashboards, workflows, and tools.",
      },
      {
        id: "patient-workflow",
        selector: '[data-tour="nav-patient-analysis"]',
        title: "Patient workflows",
        body: "Start a structured patient analysis, add new patients, and review outputs.",
      },
      {
        id: "knowledge",
        selector: '[data-tour="nav-knowledge-assistant"]',
        title: "Knowledge Assistant",
        body: "Open the Knowledge Assistant for Ayurveda-related guidance and sources.",
      },
      {
        id: "history",
        selector: '[data-tour="nav-history"]',
        title: "Reports & history",
        body: "Review recent analyses, predictions, and generated reports here.",
      },
      {
        id: "profile",
        selector: '[data-tour="topbar-profile"]',
        title: "Profile & settings",
        body: "Manage your account details and preferences, and replay this tour anytime.",
      },
    ],
    []
  );

  const [idx, setIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardPlacement, setCardPlacement] = useState<Placement>({ top: 12, left: 12 });

  const active = steps[idx] ?? steps[0];
  const totalSteps = steps.length;

  const refreshRects = useCallback(() => {
    if (!open) return;
    const rect = getRectForSelector(active.selector);
    setTargetRect(rect);

    const cardEl = cardRef.current;
    const w = cardEl?.offsetWidth ?? 352;
    const h = cardEl?.offsetHeight ?? 180;
    setCardPlacement(computeCardPlacement(rect, { w, h }));
  }, [open, active.selector]);

  // When tour opens, always start from the beginning.
  useEffect(() => {
    if (!open) return;
    setIdx(0);
    // Ensure we're not showing the tour on auth routes; this component should only
    // be mounted in the authenticated layout, but keep this defensive.
  }, [open]);

  // Navigate when a step is tied to a route.
  useEffect(() => {
    if (!open) return;
    if (active.route && location.pathname !== active.route) {
      navigate(active.route, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active.id]);

  // After route change/step change, scroll into view & measure.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      scrollTargetIntoView(active.selector);
      refreshRects();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, active.selector, refreshRects, location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => refreshRects();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, refreshRects]);

  const onNext = () => setIdx((p) => Math.min(totalSteps - 1, p + 1));
  const onBack = () => setIdx((p) => Math.max(0, p - 1));

  const onFinish = () => {
    complete();
  };

  const onSkip = () => {
    skip();
  };

  if (!open) return null;

  const highlight = targetRect
    ? {
        top: Math.max(8, targetRect.top - 6),
        left: Math.max(8, targetRect.left - 6),
        width: Math.min(window.innerWidth - 16, targetRect.width + 12),
        height: Math.min(window.innerHeight - 16, targetRect.height + 12),
      }
    : null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-stone-950/55 backdrop-blur-[1px]" />

      {highlight ? (
        <div
          className="absolute rounded-xl ring-2 ring-herbal-forest/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.0)]"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            background: "transparent",
          }}
        />
      ) : null}

      <div
        ref={(el) => {
          cardRef.current = el;
        }}
        className="absolute"
        style={{ top: cardPlacement.top, left: cardPlacement.left }}
      >
        <TourStepCard
          stepTitle={active.title}
          stepBody={active.body}
          stepIndex={idx}
          totalSteps={totalSteps}
          canGoBack={idx > 0}
          onBack={onBack}
          onNext={onNext}
          onSkip={onSkip}
          onFinish={onFinish}
          isLast={idx === totalSteps - 1}
        />
      </div>
    </div>
  );
}

