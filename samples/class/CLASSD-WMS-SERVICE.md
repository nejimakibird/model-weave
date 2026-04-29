---
type: class_diagram
id: CLASSD-WMS-SERVICE
name: WMS Service Class Overview
render_mode: auto
tags:
  - Class
  - Diagram
  - WMS
---

# WMS Service Class Overview

## Summary

Shows the main service, repository interface, and allocation policy around inventory handling.

## Objects

| ref | notes |
|---|---|
| [[CLS-WMS-INVENTORY-SERVICE]] | Main application service |
| [[IF-WMS-INVENTORY-REPOSITORY]] | Repository interface |
| [[CLS-WMS-ALLOCATION-POLICY]] | Allocation rule object |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-DIAGRAM-SERVICE-REPOSITORY | [[CLS-WMS-INVENTORY-SERVICE]] | [[IF-WMS-INVENTORY-REPOSITORY]] | dependency | uses |  |  |  |
| REL-DIAGRAM-SERVICE-POLICY | [[CLS-WMS-INVENTORY-SERVICE]] | [[CLS-WMS-ALLOCATION-POLICY]] | dependency | applies |  |  |  |

## Notes

- Auto resolves to Custom for detailed review.
- Mermaid mode is a reduced relationship overview.
