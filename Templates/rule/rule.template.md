---
type: rule
id: RULE-SAMPLE
name: Sample Rule
kind: validation
tags:
  - Rule
---

# Sample Rule

## Summary

Describe the rule purpose and usage.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-SAMPLE | [[DATA-SAMPLE]].sample_id | [[SCR-SAMPLE]].sample_input | Y | Example input |

## References

| ref | usage | notes |
|---|---|---|
| [[CODE-SAMPLE]] | allowed_values | Example reference |

## Conditions

Prose Conditions are human-readable.
Table Conditions are analyzer-readable.
`condition` may contain `[[CODE-ID]].value`.
`ref + value` may also express a codeset value reference.

| id | condition | ref | value | notes |
|---|---|---|---|---|
| CND-001 | [[CODE-INVENTORY-STATUS]].available | [[CODE-INVENTORY-STATUS]] | available | 良品利用可の在庫のみ対象 |

## Messages

| condition | message | severity | notes |
|---|---|---|---|
| sample_id is empty | [[MSGSET-SAMPLE]].SAMPLE-ERR-001 | error | Required input |

## Notes

- Conditions are written in natural language.
