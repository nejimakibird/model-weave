---
type: message
id: MSGSET-INVENTORY
name: Inventory Messages
kind: business_area
tags:
  - Message
  - WMS
---

# Inventory Messages

## Summary

Messages used by inventory search and inventory allocation.

## Messages

| message_id | text | severity | timing | audience | active | notes |
|---|---|---|---|---|---|---|
| INV-INFO-001 | No inventory rows matched the search condition. | info | search_result | operator | Y | No result |
| INV-ERR-001 | Shipper ID is required. | error | validation | operator | Y | Required input |
| INV-ERR-002 | Inventory status is invalid. | error | validation | operator | Y | CodeSet mismatch |
| INV-WARN-001 | Available inventory is below the requested quantity. | warning | allocation | operator | Y | Shortage warning |

## Notes

- Public sample message set.
