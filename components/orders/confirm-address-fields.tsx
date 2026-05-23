"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ConfirmAddressValues = {
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  state: string;
  postalCode: string;
};

type ConfirmAddressFieldsProps = {
  idPrefix: string;
  values: ConfirmAddressValues;
  onChange: (field: keyof ConfirmAddressValues, value: string) => void;
  disabled?: boolean;
};

export function ConfirmAddressFields({
  idPrefix,
  values,
  onChange,
  disabled,
}: ConfirmAddressFieldsProps) {
  const field = (name: keyof ConfirmAddressValues, label: string, required?: boolean) => (
    <div key={name} className="space-y-1.5 sm:col-span-2">
      <Label htmlFor={`${idPrefix}-${name}`}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={`${idPrefix}-${name}`}
        name={name}
        value={values[name]}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
        required={required}
      />
    </div>
  );

  return (
    <fieldset className="space-y-3 rounded-md border border-primary/25 bg-muted/30 p-3">
      <legend className="px-1 text-sm font-medium">Shipping address (required when outcome is Called)</legend>
      <p className="text-xs text-muted-foreground">
        Matches carrier COD columns: name, phone, address lines, city, state, pincode.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("customerName", "Receiver name", true)}
        {field("customerPhone", "Receiver mobile", true)}
        {field("addressLine1", "Address line 1 (house / street)", true)}
        {field("addressLine2", "Address line 2 (area / locality)")}
        {field("addressLine3", "Address line 3 (landmark)")}
        {field("city", "City", true)}
        {field("state", "State / UT", true)}
        {field("postalCode", "Pincode", true)}
      </div>
    </fieldset>
  );
}
