import { validateAddressFromForm } from "@/app/actions/phase1";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type OrderOption = {
  id: string;
  customerName: string;
};

export function AddressValidationForm({ orders }: { orders: OrderOption[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Address Validation (LLM Assist)</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={validateAddressFromForm} className="space-y-3">
          <select required name="orderId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.customerName}
              </option>
            ))}
          </select>
          <Input name="suggestedAddress" placeholder="Suggested Address" />
          <Input name="confidence" placeholder="Confidence 0 to 1" type="number" step="0.01" />
          <Input name="remarks" placeholder="Remarks" />
          <Button type="submit">Save Validation</Button>
        </form>
      </CardContent>
    </Card>
  );
}
