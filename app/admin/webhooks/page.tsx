import { getWebhookInboxEvents } from "@/app/server/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EventRow = {
  id: string;
  endpoint: string;
  method: string;
  payload: unknown;
  rawBody: string | null;
  receivedAt: Date;
};

function renderPayload(payload: unknown, rawBody: string | null) {
  if (payload !== null && payload !== undefined) {
    return JSON.stringify(payload, null, 2);
  }
  return rawBody ?? "";
}

function EndpointTable({ rows }: { rows: EventRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Received At</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Payload</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              No webhook payloads received yet.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="align-top whitespace-nowrap">
                {row.receivedAt.toLocaleString()}
              </TableCell>
              <TableCell className="align-top">{row.method}</TableCell>
              <TableCell>
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap break-all">
                  {renderPayload(row.payload, row.rawBody)}
                </pre>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export default async function AdminWebhooksPage() {
  const events = await getWebhookInboxEvents(200);
  const booking = events.filter((e) => e.endpoint === "booking");
  const nonBooking = events.filter((e) => e.endpoint === "non-booking");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook inbox</CardTitle>
        <CardDescription>
          Captures incoming payloads from <code>/api/webhook/booking</code> and <code>/api/webhook/non-booking</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="booking">
          <TabsList>
            <TabsTrigger value="booking">Booking ({booking.length})</TabsTrigger>
            <TabsTrigger value="non-booking">Non-booking ({nonBooking.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="booking" className="mt-4">
            <EndpointTable rows={booking} />
          </TabsContent>
          <TabsContent value="non-booking" className="mt-4">
            <EndpointTable rows={nonBooking} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
