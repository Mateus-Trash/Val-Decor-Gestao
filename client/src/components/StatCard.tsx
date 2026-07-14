import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/CountUp";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardTrend {
  direction: "up" | "down";
  percent: number;
}

interface StatCardProps {
  title: string;
  icon?: React.ReactNode;
  loading: boolean;
  value: number | null;
  formatFn: (v: number) => string;
  accentClassName?: string;
  valueClassName?: string;
  trend?: StatCardTrend;
  footerNote?: string;
}

/**
 * Card de estatística/KPI reutilizável, no padrão do bloco de dashboard do shadcn/ui:
 * título pequeno + valor grande animado + badge de tendência opcional + nota no rodapé.
 *
 * Importante: o `trend` só deve ser passado quando houver um dado real de comparação
 * (ex: variação percentual vs. mês anterior vindo do backend). Nunca inventar uma
 * tendência para preencher visualmente o card.
 */
export function StatCard({
  title,
  icon,
  loading,
  value,
  formatFn,
  accentClassName,
  valueClassName,
  trend,
  footerNote,
}: StatCardProps) {
  return (
    <Card className={cn("gap-2", accentClassName)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription className="text-sm font-medium text-muted-foreground">
            {title}
          </CardDescription>
          {icon}
        </div>
        <CardTitle className={cn("text-2xl font-bold tabular-nums mt-1", valueClassName)}>
          {loading || value === null ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <CountUp end={value} duration={800} formatFn={formatFn} />
          )}
        </CardTitle>
        {trend && !loading && (
          <CardAction>
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                trend.direction === "up"
                  ? "text-green-700 dark:text-green-400 border-green-200 dark:border-green-900"
                  : "text-red-700 dark:text-red-400 border-red-200 dark:border-red-900"
              )}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.percent >= 0 ? "+" : ""}
              {trend.percent.toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {footerNote && (
        <CardFooter className="text-xs text-muted-foreground">
          {footerNote}
        </CardFooter>
      )}
    </Card>
  );
}
