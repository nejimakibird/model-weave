---
type: er_entity
id: ENT-SAMPLE
logical_name: Sample Entity
physical_name: t_sample
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
---

# Sample Entity / t_sample

## Overview

- purpose: Describe the table purpose.
- notes: Add relevant design notes.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Sample ID | sample_id | varchar | 30 |  | Y | Y | N |  | Primary key |
| Sample Name | sample_name | varchar | 100 |  | Y | N | N |  |  |
| Created At | created_at | timestamp |  |  | Y | N | N | CURRENT_TIMESTAMP |  |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_sample | PRIMARY | Y | sample_id | Primary key |

## Relations

### REL-SAMPLE-TO-OTHER
- target_table: [[ENT-OTHER]]
- kind: fk
- cardinality: N-1
- notes: Replace or remove this example relation.

| local_column | target_column | notes |
|---|---|---|
| other_id | other_id | Foreign key |

## Notes

- Keep only relations outbound from this entity.
- Remove the example relation if it is not needed.
