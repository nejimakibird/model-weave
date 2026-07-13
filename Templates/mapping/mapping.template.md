---
type: mapping
id: MAP-SAMPLE
name: Sample Mapping
kind: data_to_data
source: [[DATA-SAMPLE-SOURCE]]
target: [[DATA-SAMPLE-TARGET]]
tags:
  - Mapping
---

# Sample Mapping

## Summary

Describe the mapping purpose and scope.

## Scope

| role | ref | notes |
|---|---|---|
| source | [[DATA-SAMPLE-SOURCE]] | Source data |
| target | [[DATA-SAMPLE-TARGET]] | Target data |

## Mappings

| target_ref | source_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[DATA-SAMPLE-TARGET]].sample_id | [[DATA-SAMPLE-SOURCE]].sample_id | Direct copy |  | Y |  |
| [[DATA-SAMPLE-TARGET]].sample_name | [[DATA-SAMPLE-SOURCE]].sample_name | Direct copy |  | N |  |

## Rules

- Add mapping-wide transformation rules here.
- Move complex conditions to `rule` files.

## Notes

- One row should generally map to one `target_ref`.
