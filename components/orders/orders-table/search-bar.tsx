"use client";

import { SearchIcon } from "lucide-react";

import { ExtraQueryHiddenFields, OrdersQueryHiddenFields } from "@/components/orders/orders-table/hidden-fields";
import type { OrdersQueryHiddenFieldsProps } from "@/components/orders/orders-table/shared";
import type { OrdersSearchKey } from "@/lib/orders/types";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrdersTableSearchBarProps = {
  hiddenQueryFields: OrdersQueryHiddenFieldsProps;
  extraQueryParams?: Record<string, string | undefined>;
  searchKey: OrdersSearchKey;
  onSearchKeyChange: (value: OrdersSearchKey) => void;
  searchKeyOptions: { value: OrdersSearchKey; label: string }[];
  defaultQuery: string;
};

export function OrdersTableSearchBar({
  hiddenQueryFields,
  extraQueryParams,
  searchKey,
  onSearchKeyChange,
  searchKeyOptions,
  defaultQuery,
}: OrdersTableSearchBarProps) {
  return (
    <form method="get" className="w-full min-w-0 sm:max-w-xl sm:flex-1">
      <OrdersQueryHiddenFields {...hiddenQueryFields} exclude={["searchKey", "q"]} />
      <ExtraQueryHiddenFields extraQueryParams={extraQueryParams} />
      <input type="hidden" name="searchKey" value={searchKey} />
      <InputGroup>
        <InputGroupAddon
          align="inline-start"
          className="border-r border-input px-0 py-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Select value={searchKey} onValueChange={(value) => onSearchKeyChange(value as OrdersSearchKey)}>
            <SelectTrigger
              size="sm"
              aria-label="Search field"
              className="h-8 w-[8.25rem] shrink-0 rounded-none border-0 bg-transparent pr-1 pl-2 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start" className="min-w-[8.25rem]">
              <SelectGroup>
                {searchKeyOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </InputGroupAddon>
        <InputGroupInput
          id="q"
          name="q"
          defaultValue={defaultQuery}
          placeholder="Search orders…"
          autoComplete="off"
        />
        <InputGroupAddon align="inline-end" className="pr-1">
          <InputGroupButton type="submit" size="sm" variant="secondary" className="gap-1.5 px-2.5">
            <SearchIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Search</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
