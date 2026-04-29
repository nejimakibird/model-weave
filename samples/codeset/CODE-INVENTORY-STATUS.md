---
type: codeset
id: CODE-INVENTORY-STATUS
name: Inventory Status
kind: status
tags:
  - CodeSet
  - WMS
---

# Inventory Status

## Summary

Inventory business status used by search, allocation, and warehouse operations.

## Values

| code | label | sort_order | active | notes |
|---|---|---:|---|---|
| available | Available | 10 | Y | Can be allocated |
| allocated | Allocated | 20 | Y | Reserved for outbound |
| hold | Hold | 30 | Y | Temporarily unavailable |
| damaged | Damaged | 40 | Y | Cannot be shipped |
| shipped | Shipped | 90 | Y | Already shipped |

## Notes

- `available` is the default search condition for allocation candidates.
