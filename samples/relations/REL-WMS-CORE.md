---
schema: model_relations_v1
id: REL-WMS-CORE
name: WMS Core Relations
title: WMS Core Relations
tags:
  - Relations
  - WMS
  - Sample
---

# WMS Core Relations

## Summary

Minimal schema-driven relations sample for the WMS sample models.

## Relations

- id: REL-WMS-SERVICE-USES-REPOSITORY, from: CLS-WMS-INVENTORY-SERVICE, to: IF-WMS-INVENTORY-REPOSITORY, kind: dependency, label: uses
- id: REL-WMS-SERVICE-APPLIES-POLICY, from: CLS-WMS-INVENTORY-SERVICE, to: CLS-WMS-ALLOCATION-POLICY, kind: dependency, label: applies
- id: REL-WMS-INVENTORY-REFERENCES-ITEM, from: ENT-INVENTORY, to: ENT-ITEM, kind: reference, label: item

## Source Links

| path | notes |
|---|---|
| src/wms/inventory/InventoryService.ts | Example service relationship source |

## Notes

- Relations files are schema-driven by `schema: model_relations_v1`.
- This sample intentionally does not declare a frontmatter `type` key.
