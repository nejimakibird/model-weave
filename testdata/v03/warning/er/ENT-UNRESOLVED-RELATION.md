---
type: er_entity
id: ENT-UNRESOLVED-RELATION
logical_name: Unresolved Relation Source
physical_name: t_unresolved_relation
schema_name: public
dbms: PostgreSQL
tags:
  - testdata
  - warning
  - er
---

## Overview

Test-only sample for unresolved target_table warning behavior.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---|---|---|---|---|---|---|
| Source ID | source_id | bigint | 19 | 0 | true | true | false |  | Primary key |
| Missing Target ID | missing_target_id | bigint | 19 | 0 | true | false | false |  | Unresolved FK |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_unresolved_relation | primary | true | source_id | Primary key |

## Relations

### REL-TO-MISSING-TARGET
- target_table: [[ENT-NOT-FOUND]]
- kind: fk
- cardinality: N-1
- notes: Test unresolved relation target

| local_column | target_column | notes |
|---|---|---|
| missing_target_id | target_id | Should trigger unresolved target warning |

## Notes

- Test purpose only. This file is expected to raise a warning.

