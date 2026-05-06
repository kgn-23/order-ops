import { addFollowUpFromForm, logCallFromForm } from "@/app/actions/phase1";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type OrderOption = {
  id: string;
  customerName: string;
};

export function CallerOpsForms({ orders }: { orders: OrderOption[] }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Log Call</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={logCallFromForm} className="space-y-3">
            <select required name="orderId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.customerName}
                </option>
              ))}
            </select>
            <select required name="outcome" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
              {[
                "NO_ANSWER",
                "CALLBACK_REQUESTED",
                "CONFIRMED",
                "DELAYED",
                "CANCELLED",
                "INVALID_NUMBER",
                "OTHER",
              ].map((outcome) => (
                <option key={outcome} value={outcome}>
                  {outcome}
                </option>
              ))}
            </select>
            <Input name="notes" placeholder="Notes" />
            <Button type="submit">Add Call Log</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Follow-up</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addFollowUpFromForm} className="space-y-3">
            <select required name="orderId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.customerName}
                </option>
              ))}
            </select>
            <Input required name="notes" placeholder="Follow-up Notes" />
            <Input name="dueAt" placeholder="Due At (ISO)" />
            <Button type="submit">Save Follow-up</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
