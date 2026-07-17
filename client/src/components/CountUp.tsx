import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  formatFn?: (value: number) => string;
  className?: string;
}

export function CountUp({ end, duration = 800, formatFn, className }: CountUpProps) {
  const safeEnd = Number.isFinite(end) ? end : 0;
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startRef.current === undefined) {
        startRef.current = timestamp;
      }
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(safeEnd * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(safeEnd);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== undefined) {
        cancelAnimationFrame(rafRef.current);
      }
      startRef.current = undefined;
    };
  }, [safeEnd, duration]);

  const formatted = formatFn ? formatFn(displayValue) : String(Math.round(displayValue));

  return <span className={className}>{formatted}</span>;
}
