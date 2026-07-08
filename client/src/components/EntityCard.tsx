import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export interface EntityField {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface EntityCardProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  fields: EntityField[];
  actions?: ReactNode;
  children?: ReactNode;
}

export default function EntityCard({
  title,
  subtitle,
  badge,
  fields,
  actions,
  children,
}: EntityCardProps) {
  return (
    <Card className="border-l-4 border-l-primary/60 p-3 transition-colors duration-200 hover:bg-muted/50">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-base truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Fields grid */}
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {fields.map((field, idx) => {
            const Icon = field.icon;
            return (
              <div key={idx} className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </span>
                </div>
                <p className="text-sm font-medium">{field.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Extra content */}
      {children && (
        <div className="mt-3">{children}</div>
      )}

      {/* Actions */}
      {actions && (
        <div className="border-t mt-3 pt-2 flex justify-end">{actions}</div>
      )}
    </Card>
  );
}
