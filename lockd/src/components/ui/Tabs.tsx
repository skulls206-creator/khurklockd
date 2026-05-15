"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  const tabListRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  const updateIndicator = useCallback(() => {
    const container = tabListRef.current;
    if (!container) return;

    const activeEl = container.querySelector<HTMLElement>(
      `[data-tab-id="${activeTab}"]`,
    );
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator, tabs]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updateIndicator();
    });
    if (tabListRef.current) {
      resizeObserver.observe(tabListRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [updateIndicator]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIdx = tabs.findIndex((t) => t.id === activeTab);

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = (currentIdx + 1) % tabs.length;
        onChange(tabs[next].id);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (currentIdx - 1 + tabs.length) % tabs.length;
        onChange(tabs[prev].id);
      } else if (e.key === "Home") {
        e.preventDefault();
        onChange(tabs[0].id);
      } else if (e.key === "End") {
        e.preventDefault();
        onChange(tabs[tabs.length - 1].id);
      }
    },
    [activeTab, onChange, tabs],
  );

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className="relative flex border-b border-border"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            data-tab-id={tab.id}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={[
              "relative px-4 py-2.5 text-sm font-medium whitespace-nowrap",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
              isActive
                ? "text-accent"
                : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={[
                  "ml-1.5 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full text-xs font-medium",
                  isActive
                    ? "bg-accent-muted text-accent"
                    : "bg-surface-hover text-text-muted",
                ].join(" ")}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}

      {/* Active indicator bar */}
      <div
        className="absolute bottom-0 h-0.5 bg-accent rounded-full transition-all duration-200 ease-out"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

export default Tabs;
