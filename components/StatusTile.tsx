import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StatusKey } from "@/lib/orders";

const ACCENT: Record<StatusKey, string> = {
  new: "border-l-blue-500",
  hold: "border-l-amber-500",
  inProgress: "border-l-indigo-500",
  completed: "border-l-green-600",
};

interface StatusTileProps {
  label: string;
  count: number;
  status: StatusKey;
}

export function StatusTile({ label, count, status }: StatusTileProps) {
  return (
    <Card className={cn("border-l-4", ACCENT[status])}>
      <CardContent className="flex flex-col gap-3 p-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="text-5xl font-bold leading-none tabular-nums sm:text-6xl lg:text-7xl">
          {count.toLocaleString()}
        </span>
      </CardContent>
    </Card>
  );
}

export function StatusTileSkeleton() {
  return (
    <Card className="border-l-4 border-l-border">
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-16 w-28 animate-pulse rounded bg-muted lg:h-20" />
      </CardContent>
    </Card>
  );
}
