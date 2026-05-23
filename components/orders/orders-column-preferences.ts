/** Optional desktop / mobile fields — hidden until enabled via Columns sheet. */

export type OrdersOptionalColumns = {
  tracking: boolean;
  product: boolean;
  status: boolean;
};

export const DEFAULT_ORDERS_OPTIONAL_COLUMNS: OrdersOptionalColumns = {
  tracking: false,
  product: false,
  status: false,
};

export type OrdersColumnsPersistShape = {
  standard: OrdersOptionalColumns;
  commerce: OrdersOptionalColumns;
};

const ADMIN_STORAGE_KEY = "kgn-order-ops:admin-orders-table-cols:v1";

export function loadAdminOrdersColumnsPersistShape(): OrdersColumnsPersistShape {
  if (typeof window === "undefined") {
    return {
      standard: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS },
      commerce: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS },
    };
  }
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) {
      return {
        standard: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS },
        commerce: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS },
      };
    }
    const parsed = JSON.parse(raw) as Partial<OrdersColumnsPersistShape>;
    return {
      standard: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS, ...parsed.standard },
      commerce: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS, ...parsed.commerce },
    };
  } catch {
    return {
      standard: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS },
      commerce: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS },
    };
  }
}

export function saveAdminOrdersColumnsPersistShape(shape: OrdersColumnsPersistShape): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(shape));
  } catch {
    /* ignore quota */
  }
}
