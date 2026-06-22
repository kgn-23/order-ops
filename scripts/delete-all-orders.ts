/**
 * Deletes all orders and related operational data (assignments, call logs, etc.).
 * Customers and users are kept unless --with-customers is passed.
 *
 * Usage:
 *   pnpm db:delete-orders -- --confirm
 *   pnpm db:delete-orders -- --confirm --with-customers
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const args = process.argv.slice(2);
const confirmed = args.includes("--confirm");
const withCustomers = args.includes("--with-customers");

if (!confirmed) {
  console.error(
    "Refusing to run without --confirm.\n" +
      "  pnpm db:delete-orders -- --confirm\n" +
      "  pnpm db:delete-orders -- --confirm --with-customers",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const orderCount = await prisma.order.count();
  console.log(`Found ${orderCount} order(s). Deleting related data…`);

  const counts = await prisma.$transaction(async (tx) => {
    const commerce = await tx.orderCommerceStatusEvent.deleteMany();
    const calls = await tx.callLog.deleteMany();
    const followUps = await tx.followUp.deleteMany();
    const addressChecks = await tx.addressValidationResult.deleteMany();
    const assignments = await tx.orderAssignment.deleteMany();
    const lineItems = await tx.orderLineItem.deleteMany();
    const statusEvents = await tx.orderStatusEvent.deleteMany();
    const activity = await tx.activityLog.deleteMany({ where: { orderId: { not: null } } });
    const orders = await tx.order.deleteMany();
    const exportBatches = await tx.codExportBatch.deleteMany();
    const customers = withCustomers ? await tx.customer.deleteMany() : { count: 0 };

    return {
      commerce: commerce.count,
      calls: calls.count,
      followUps: followUps.count,
      addressChecks: addressChecks.count,
      assignments: assignments.count,
      lineItems: lineItems.count,
      statusEvents: statusEvents.count,
      activity: activity.count,
      orders: orders.count,
      exportBatches: exportBatches.count,
      customers: customers.count,
    };
  });

  console.log("Deleted:");
  console.log(`  orders:                    ${counts.orders}`);
  console.log(`  order assignments:         ${counts.assignments}`);
  console.log(`  call logs:                 ${counts.calls}`);
  console.log(`  follow-ups:                ${counts.followUps}`);
  console.log(`  status events:             ${counts.statusEvents}`);
  console.log(`  commerce status events:    ${counts.commerce}`);
  console.log(`  line items:                ${counts.lineItems}`);
  console.log(`  address validations:       ${counts.addressChecks}`);
  console.log(`  order activity logs:       ${counts.activity}`);
  console.log(`  COD export batches:        ${counts.exportBatches}`);
  if (withCustomers) {
    console.log(`  customers:               ${counts.customers}`);
  }
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error("Delete failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
