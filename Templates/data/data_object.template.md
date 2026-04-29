---
type: data_object
id: DATA-SAMPLE
name: Sample Data Object
kind: data
data_format: object
tags:
  - DataObject
---

# Sample Data Object

## Summary

Describe the data structure, payload, form value, file, or DTO.

## Format

| key | value | notes |
|---|---|---|
| data_format | object | Replace with csv, fixed, json, etc. if needed |

## Records

| record_type | name | occurrence | notes |
|---|---|---|---|

## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
| sample_id | Sample ID | string | 30 | Y | $.sampleId |  | Identifier |
| sample_name | Sample Name | string | 100 | N | $.sampleName |  |  |

## Notes

- Use the Standard Fields table above for object, form, query, JSON, XML, DTO, request, and response values.
- For file layouts, replace `Fields` with the File Layout Fields columns below if needed:
  `record_type / no / name / label / type / length / required / position / field_format / ref / notes`.
