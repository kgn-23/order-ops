"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { addressValidationSchema } from "@/lib/validators/contracts";
import { logActivity } from "@/lib/orders/actions/shared";

export async function validateAddress(input: unknown) {
  const session = await requireRole(["CALLER", "MANAGER", "ADMIN"]);
  const payload = addressValidationSchema.parse(input);
  const order = await db.order.findUniqueOrThrow({
    where: { id: payload.orderId },
    select: {
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
    },
  });

  const originalAddress = [
    order.addressLine1,
    order.addressLine2,
    order.city,
    order.state,
    order.postalCode,
    order.country,
  ]
    .filter(Boolean)
    .join(", ");

  const result = await db.addressValidationResult.create({
    data: {
      orderId: payload.orderId,
      originalAddress,
      suggestedAddress: payload.suggestedAddress,
      confidence: payload.confidence,
      remarks: payload.remarks,
      validatedBy: "LLM_ASSIST",
    },
  });

  await logActivity({
    actorUserId: session.userId,
    orderId: payload.orderId,
    entityType: "AddressValidationResult",
    entityId: result.id,
    action: "ADDRESS_VALIDATED",
    details: { confidence: payload.confidence },
  });

  revalidatePath("/");
}

export async function validateAddressFromForm(formData: FormData) {
  const confidenceValue = String(formData.get("confidence") ?? "");

  await validateAddress({
    orderId: String(formData.get("orderId") ?? ""),
    suggestedAddress: String(formData.get("suggestedAddress") ?? "") || undefined,
    confidence: confidenceValue ? Number(confidenceValue) : undefined,
    remarks: String(formData.get("remarks") ?? "") || undefined,
  });
}
