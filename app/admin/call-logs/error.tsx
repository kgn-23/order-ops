"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminCallLogsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin call logs error:", error);
  }, [error]);

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Could not load call logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Something went wrong while fetching call logs. Please try again.</p>
        {error.digest ? <p className="font-mono text-xs">Reference: {error.digest}</p> : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => reset()}>
          Retry
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/call-logs?page=1&pageSize=50&searchKey=orderId&outcome=ALL&stage=ALL&sortBy=calledAt&sortDir=desc">
            Reset filters
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
