"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminOrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin orders error:", error);
  }, [error]);

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Could not load orders</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>Something went wrong while fetching orders. Please try again.</p>
        {error.digest ? (
          <p className="font-mono text-xs">
            Reference: {error.digest}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => reset()}>
          Retry
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/orders?page=1&pageSize=50&searchKey=customerName&stage=ALL&sortBy=createdAt&sortDir=desc">
            Reset filters
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
