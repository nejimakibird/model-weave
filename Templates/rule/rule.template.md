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

- Sample ID is required.
- If a code value is specified, it must exist in the related CodeSet.

## Messages

| condition | message | severity | notes |
|---|---|---|---|
| sample_id is empty | [[MSGSET-SAMPLE]].SAMPLE-ERR-001 | error | Required input |

## Notes

- Conditions are written in natural language.
