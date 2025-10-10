import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

export type SettingsNavItem = {
  id: string;
  label: string;
  visible?: boolean;
};

export function SettingsLayout({
  title,
  nav,
  children,
  header,
  subtitle,
}: {
  title: string;
  nav: SettingsNavItem[];
  children: React.ReactNode;
  header?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  const [, setLocation] = useLocation();
  const [active, setActive] = useState<string | null>(null);
  const [previewLight, setPreviewLight] = useState(false);

  const items = useMemo(() => nav.filter((n) => n.visible !== false), [nav]);

  // Derive active section from hash (do not default to first)
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash?.replace(/^#/, "");
      if (hash) setActive(hash);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const handleNavClick = (id: string) => {
    const base = typeof window !== "undefined" ? window.location.pathname : "/settings";
    setLocation(`${base}#${id}`);
    setActive(id);
  };

  // Only render the active section from children
  const childrenArray = React.Children.toArray(children) as React.ReactElement<{ id?: string }>[];
  const activeChild = childrenArray.find(
    (c) => React.isValidElement(c) && c.props?.id === active
  ) as React.ReactElement | undefined;

  return (
    <div className="min-h-screen page-bg">
      <div className="max-w-7xl mx-auto px-6 py-6" data-theme={previewLight ? "light" : undefined}>
        {header}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            {subtitle ? <p className="text-white/90 mt-1 text-xs md:text-sm">{subtitle}</p> : null}
          </div>
          <div className="hidden md:flex items-center gap-2 text-white/80">
            <span className="text-sm">Light preview</span>
            <Switch checked={previewLight} onCheckedChange={setPreviewLight} />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="col-span-12 md:col-span-1 md:sticky md:top-6 self-start">
            <div className="rounded-xl bg-white/10 border border-white/15 p-2 shadow-sm">
              <ScrollArea className="max-h-[70vh]">
                <nav className="flex flex-col gap-2">
                  {items.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => handleNavClick(i.id)}
                      className={`text-left px-3 py-1 rounded-md transition-colors border-l ${
                        active === i.id
                          ? "bg-white/15 text-white border-white/70"
                          : "text-white/85 hover:bg-white/10 border-transparent"
                      } text-base`}
                    >
                      {i.label}
                    </button>
                  ))}
                </nav>
              </ScrollArea>
            </div>
          </aside>
          <section className="col-span-12 md:col-span-1">
            <div className="rounded-xl bg-white/10 border border-white/15 p-3 md:p-4 backdrop-blur-md shadow-md min-h-[70vh] text-sm">
              {activeChild ?? (
                <div className="text-sm text-white/80">Select a section from the left.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
