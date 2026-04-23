# Model Weave: V0.4 Samples and Templates

Model Weave is an Obsidian plugin for managing text-first models, relationships, and diagrams in Markdown.

This repository uses the V0.4 modeling file formats below as the formal supported formats.

- `class`
- `class_diagram`
- `er_entity`
- `er_diagram`

Legacy formats such as `schema: diagram_v1`, `type: diagram`, and `type: er_relation` are not formal formats anymore. They are kept only under `testdata/v03/legacy` for unsupported-state checks.

## Directory Layout

- [Templates/v03](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\Templates\v03)
  - Formal copy-paste templates for V0.4 files
- [samples/v03/minimal](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal)
  - Small samples for parser and preview checks
- [samples/v03/rich](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\rich)
  - Richer samples for layout, relation density, and single-view checks
- [testdata/v03/warning](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\warning)
  - Warning and note verification files
- [testdata/v03/legacy](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\legacy)
  - Unsupported legacy files, test purpose only

## Template Usage

Use the files in `Templates/v03` as the starting point for new modeling files. The directory name is kept for compatibility with earlier sample organization, but the current content follows the V0.4 rules.

- [Templates/v03/er_entity.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\Templates\v03\er_entity.md)
- [Templates/v03/er_diagram.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\Templates\v03\er_diagram.md)
- [Templates/v03/class.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\Templates\v03\class.md)
- [Templates/v03/class_diagram.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\Templates\v03\class_diagram.md)

Guidelines:

- Keep the filename aligned with the `id` field.
- Use Markdown tables exactly as shown in the templates.
- Do not use legacy `diagram_v1` or `type: diagram` in new files.
- For `class`, use Spec04 relations: `id / to / kind / label / from_multiplicity / to_multiplicity / notes`. The `from` side is the current class file's `id`.
- For `class.Relations.to`, use the target class ID, not a wikilink.
- For `er_entity.target_table`, `er_diagram.Objects.ref`, and `class_diagram.Objects.ref`, prefer wikilinks that point to the actual file path.
- For abstract classes, use `kind: class` with `stereotype: abstract`.

## Reference Rules

- ER file references should be clickable wikilinks such as `[[samples/v03/rich/er/ENT-CUSTOMER]]`. Internally, ER relation handling uses the linked entity's `physical_name`.
- Diagram object refs should also be clickable wikilinks to the object files.
- Class single-file relations use ID-based `to` values such as `IF-ORDER-REPOSITORY`.
- Class diagram relations still use explicit `from` / `to` because they describe diagram-level edges.
- The old class relation table with an explicit `from` column is accepted only for compatibility and should not be used for new files.

## Sample Purposes

### Minimal samples

Use these to confirm that parser, single-object view, and diagram view work with the smallest valid V0.4 input.

- ER
  - [samples/v03/minimal/er/ENT-CUSTOMER.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\er\ENT-CUSTOMER.md)
  - [samples/v03/minimal/er/ENT-ORDER.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\er\ENT-ORDER.md)
  - [samples/v03/minimal/er/ERD-CUSTOMER-ORDER.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\er\ERD-CUSTOMER-ORDER.md)
- Class
  - [samples/v03/minimal/class/CLS-ORDER-SERVICE.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\class\CLS-ORDER-SERVICE.md)
  - [samples/v03/minimal/class/IF-ORDER-REPOSITORY.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\class\IF-ORDER-REPOSITORY.md)
  - [samples/v03/minimal/class/CLASSD-ORDER-SERVICE.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\class\CLASSD-ORDER-SERVICE.md)

### Rich relation samples

Use these to confirm denser relation graphs, layout stability, node summaries, and related-object lists.

- ER
  - [samples/v03/rich/er/ERD-ORDER-FLOW.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\rich\er\ERD-ORDER-FLOW.md)
- Class
  - [samples/v03/rich/class/CLASSD-ORDER-APPLICATION.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\rich\class\CLASSD-ORDER-APPLICATION.md)

### Warning samples

Use these only for testing warning and note behavior.

- Unresolved ER relation:
  - [testdata/v03/warning/er/ENT-UNRESOLVED-RELATION.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\warning\er\ENT-UNRESOLVED-RELATION.md)
- Broken class table:
  - [testdata/v03/warning/class/CLS-BROKEN-TABLE.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\warning\class\CLS-BROKEN-TABLE.md)
- Unresolved class diagram references:
  - [testdata/v03/warning/class/CLASSD-UNRESOLVED-REF.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\warning\class\CLASSD-UNRESOLVED-REF.md)
- Outside-scope ER warning behavior:
  - [testdata/v03/warning/er/ERD-OUTSIDE-SCOPE.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\warning\er\ERD-OUTSIDE-SCOPE.md)

### Unsupported samples

Use these only to confirm unsupported-state messaging.

- [testdata/v03/legacy/LEGACY-DIAGRAM-V1.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\legacy\LEGACY-DIAGRAM-V1.md)
- [testdata/v03/legacy/LEGACY-ER-RELATION.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\legacy\LEGACY-ER-RELATION.md)

## Quick Verification Guide

### ER single-object view

Open:

- [samples/v03/minimal/er/ENT-CUSTOMER.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\er\ENT-CUSTOMER.md)
- [samples/v03/rich/er/ENT-ORDER.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\rich\er\ENT-ORDER.md)

Check:

- Column and index tables
- Related graph
- Inbound and outbound relations
- Mapping summary

### ER diagram view

Open:

- [samples/v03/minimal/er/ERD-CUSTOMER-ORDER.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\er\ERD-CUSTOMER-ORDER.md)
- [samples/v03/rich/er/ERD-ORDER-FLOW.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\rich\er\ERD-ORDER-FLOW.md)

Check:

- Diagram object resolution
- Relation aggregation from `er_entity`
- Fit, zoom, pan, and click navigation

### Class single-object view

Open:

- [samples/v03/minimal/class/CLS-ORDER-SERVICE.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\class\CLS-ORDER-SERVICE.md)
- [samples/v03/rich/class/CLS-ORDER-APPLICATION-SERVICE.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\rich\class\CLS-ORDER-APPLICATION-SERVICE.md)

Check:

- Attributes, methods, and relations tables
- Related graph
- Inbound and outbound class relations

### Class diagram view

Open:

- [samples/v03/minimal/class/CLASSD-ORDER-SERVICE.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\minimal\class\CLASSD-ORDER-SERVICE.md)
- [samples/v03/rich/class/CLASSD-ORDER-APPLICATION.md](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\samples\v03\rich\class\CLASSD-ORDER-APPLICATION.md)

Check:

- Object resolution from `## Objects`
- Explicit diagram relations
- Fallback auto-collect behavior when diagram relations are empty

### Warning and unsupported checks

Open:

- Warning cases under [testdata/v03/warning](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\warning)
- Unsupported cases under [testdata/v03/legacy](C:\Users\kamim\Documents\Programing\modeling-tool-obsidian\testdata\v03\legacy)

Check:

- Warnings only for real resolution or structure issues
- Notes for fallback or scope explanations
- Unsupported state for legacy formats

## Naming Rules

- ER entity IDs: `ENT-...`
- ER diagram IDs: `ERD-...`
- Class IDs: `CLS-...`, `IF-...`, `ABS-...`
- Class diagram IDs: `CLASSD-...`

Keep the filename equal to the ID whenever possible.
