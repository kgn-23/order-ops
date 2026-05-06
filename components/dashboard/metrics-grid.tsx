import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Metric = {
  label: string;
  value: string | number;
};

export function MetricsGrid({ items }: { items: Metric[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
