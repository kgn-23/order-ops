# Order Management & Caller Operations System

## Phase 1: Core System (Tracking + Operations)

### 1. User Roles

* Admin
* Manager
* Caller

### 2. Order Management

* Bulk order upload via CSV/Excel
* Order creation using uploaded data (with tracking number)
* Centralized order database
* Order detail view:

  * Customer information
  * Address
  * Tracking number

### 3. Order Assignment

* Admin can assign orders to callers
* Managers can view all assigned orders
* Orders can be reassigned when required

### 4. Order Tracking Integration

* Integration with India Post tracking system
* Fetch and store tracking status in database
* Supported order status stages:

  * Booked
  * In Transit
  * Delivered
  * RTO (Return to Origin)
  * Other carrier-provided statuses
* Maintain status history timeline for each order

### 5. Caller Operations

* Caller dashboard with assigned orders (visibility restricted to orders created by the caller)
* Call logging system:

  * Add notes per call
  * Call outcome tagging
  * Timestamped activity logs
* Customer interaction insights:

  * View if an order already exists for the customer
  * View total number of orders created for the same customer (duplicate prevention)
  * If no order exists, view:

    * Which agents previously interacted with the customer
    * Remarks added by those agents
* Follow-up tracking system:

  * Track ongoing conversations and remarks for each order
  * Access full follow-up history until order is Delivered or marked as RTO

### 6. Reporting & Monitoring

Admin dashboard includes:

* Caller performance tracking
* Order status distribution
* Follow-up activity monitoring
* Visibility into caller-order assignments
* Tracking follow-up consistency based on order status
* Agent productivity metrics:

  * Number of calls handled per day
  * Order conversion ratio (calls to successful orders)
* Agent delivery performance:

  * Total orders shipped
  * Orders delivered successfully
  * Orders marked as RTO
  * Delivery success rate
    Admin dashboard includes:
* Caller performance tracking
* Order status distribution
* Follow-up activity monitoring
* Visibility into caller-order assignments
* Tracking follow-up consistency based on order status

### 7. Address Verification (LLM-Based)

* Address validation using LLM API
* Suggestions for incomplete or incorrect addresses
* Standardized address formatting

### 8. Activity Logs

Track all key actions:

* Order assignments
* Status updates
* Call logs

### 9. Limitations (Phase 1)

* No order booking or label generation
* No Shopify integration
* Tracking depends on India Post API availability
* Address verification is assistive and not guaranteed to be accurate

---

## Phase 2: Shipping, Automation & Integrations

### 1. Order Booking System

* Create and book orders directly from the system
* Generate tracking numbers
* Store booked order details in database

### 2. Label Generation

* Bulk label generation
* Printable shipping labels (PDF format)
* Batch processing support

### 3. India Post Integration (Advanced)

* Connect booking system with India Post (subject to API access)
* Sync generated tracking numbers with orders

### 4. Shopify Integration

* Integration with Shopify via webhooks
* Automatically fetch new orders from Shopify store
* Auto-create orders in system

### 5. Auto Assignment System

* Automatically assign incoming orders to callers
* Assignment logic:

  * Round-robin
  * Rule-based assignment

### 6. System Integration

* Full integration of Phase 2 features with Phase 1
* Unified dashboard for booking, tracking, and operations

### 7. Limitations (Phase 2)

* India Post booking APIs may have restrictions or limited availability
* Shopify integration depends on store configuration and webhook permissions
