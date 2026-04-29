---
type: data_object
id: DATA-INBOUND-PLAN-FIXED
name: Inbound Plan Fixed-Length File
kind: file
data_format: fixed
encoding: Shift_JIS
line_ending: CRLF
record_length: 120
tags:
  - DataObject
  - File
  - WMS
---

# Inbound Plan Fixed-Length File

## Summary

Fixed-length inbound plan file received from the shipper system.

## Format

| key | value | notes |
|---|---|---|
| data_format | fixed | Fixed-length file |
| encoding | Shift_JIS | External system specification |
| line_ending | CRLF |  |
| record_length | 120 | One logical record |

## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
|  | 1 | record_type | Record Type | string | 1 | Y | 1-1 | fixed:I |  | Inbound plan |
|  | 2 | shipper_id | Shipper ID | string | 20 | Y | 2-21 | space_pad_right | [[../er/minimal/ENT-SHIPPER]].shipper_id |  |
|  | 3 | item_id | Item ID | string | 30 | Y | 22-51 | space_pad_right | [[../er/minimal/ENT-ITEM]].item_id |  |
|  | 4 | planned_qty | Planned Quantity | number | 10 | Y | 52-61 | zero_pad_left |  |  |
|  | 5 | planned_date | Planned Date | date | 8 | Y | 62-69 | yyyyMMdd |  |  |

## Notes

- This is a public sample layout, not a real customer format.
