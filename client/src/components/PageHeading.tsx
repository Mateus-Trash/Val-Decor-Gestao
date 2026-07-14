import { useEffect, useState } from "react";

interface PageHeadingProps {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}

export function PageHeading({ icon, title, children }: PageHeadingProps) {
  const [width, setWidth] = useState("0%");

  useEffect(() => {
    const timer = requestAnimationFrame(() => setWidth("100%"));
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          {icon}
          <h1 className="page-heading text-xl sm:text-2xl tracking-tight">{title}</h1>
        </div>
        <div
          className="h-0.5 bg-primary transition-all duration-700 ease-out"
          style={{ width }}
        />
      </div>
      {children}
    </div>
  );
}
