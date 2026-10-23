---
name: Ajay Deals Bazaar product scope
description: The allowed product and fulfillment scope for Ajay Deals Bazaar.
---

Ajay Deals Bazaar's Free Fire account listings are always available. Every product remains purchasable with stock 100, quantity 100, `inStock: true`, and `isOutOfStock: false`; inventory must not block an order.

**Why:** the user confirmed Free Fire accounts are always available and asked for orders to be accepted even when recorded inventory is 0.

**How to apply:** normalize availability in the persisted catalog and API, keep purchase controls enabled, and do not validate inventory when creating orders.
