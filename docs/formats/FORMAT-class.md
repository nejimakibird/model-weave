# FORMAT-class

Japanese Version: [日本語版](../ja/formats/FORMAT-class.md)

## What this is for

`class` defines one class-like model object in Model Weave.

Use this format when you want to describe one of the following:

* class
* interface
* abstract class
* service
* repository interface
* component
* domain object
* DTO / value object

A `class` file stores the object's basic information, attributes, methods, outbound relations, notes, and optional source links.

Use `class_diagram` when you want to create an overview diagram that groups multiple `class` files.

## Minimal example

```markdown
---
type: class
id: CLS-ORDER-SERVICE
name: OrderService
kind: class
package: order
---

# OrderService

## Summary

Application service for order operations.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| repository | OrderRepository | private | N | Repository dependency |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| createOrder | request: CreateOrderRequest | Order | public | N | Creates a new order |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-SERVICE-USES-REPOSITORY | IF-ORDER-REPOSITORY | dependency | uses |  |  |  |
```

## Full example

```markdown
---
type: class
id: CLS-ORDER-SERVICE
name: OrderService
kind: class
package: order
stereotype: service
tags:
  - Class
---

# OrderService

## Summary

Application service that coordinates order creation and inventory allocation.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| repository | OrderRepository | private | N | Persists orders |
| allocationPolicy | AllocationPolicy | private | N | Checks stock allocation |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| createOrder | request: CreateOrderRequest | Order | public | N | Creates a new order |
| cancelOrder | orderId: string | void | public | N | Cancels an order |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-SERVICE-USES-REPOSITORY | IF-ORDER-REPOSITORY | dependency | uses |  |  |  |
| REL-ORDER-SERVICE-USES-POLICY | CLS-ALLOCATION-POLICY | dependency | checks |  |  |  |

## Source Links

| path | notes |
|---|---|
| src/order/OrderService.ts | Implementation source |

## Notes

- Use `class_diagram` for a diagram that includes this class and related classes.
```

## Frontmatter

Required fields:

| field  | required | notes                                  |
| ------ | -------- | -------------------------------------- |
| `type` | yes      | Must be `class`.                       |
| `id`   | yes      | Unique model ID.                       |
| `name` | yes      | Display name of the class-like object. |

Optional fields:

| field         | notes                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `kind`        | Class-like kind, such as `class`, `interface`, `abstract`, `service`, `repository`, or `component`. |
| `package`     | Logical package, module, namespace, or layer.                                                       |
| `stereotype`  | Optional UML-like or project-specific stereotype.                                                   |
| `render_mode` | Optional. Supported values are `custom`, `mermaid`, and `mermaid-detail`.                           |
| `tags`        | Obsidian / Markdown tags.                                                                           |

Example:

```yaml
---
type: class
id: CLS-ORDER-SERVICE
name: OrderService
kind: class
package: order
stereotype: service
tags:
  - Class
---
```

## Render mode

`class` supports renderer switching.

Allowed values:

* `custom`
* `mermaid`
* `mermaid-detail`

Interpretation:

| value            | meaning                                      |
| ---------------- | -------------------------------------------- |
| `custom`         | Detailed review view.                        |
| `mermaid`        | Compact relationship overview view.          |
| `mermaid-detail` | Mermaid class diagram with class body detail. |

If `render_mode` is omitted, the format-specific default render mode from settings is used.

Deprecated or unsupported values such as `auto` should produce a warning and fall back to the format-specific default.

Mermaid overview mode should keep node content minimal. Use Custom mode for detailed review, or Mermaid Detail for export-friendly class bodies.

Toolbar selection is temporary and does not rewrite Markdown or frontmatter.

## Sections

Recommended structure:

```text
# <Class Name>

## Summary

## Attributes

## Methods

## Relations

## Source Links

## Notes
```

### Summary

Use `## Summary` to describe the class responsibility, role, and design notes.

This section is free text.

### Attributes

Use `## Attributes` to define fields or properties owned by the class.

Expected header:

```markdown
| name | type | visibility | static | notes |
|---|---|---|---|---|
```

Columns:

| column       | meaning                                                            |
| ------------ | ------------------------------------------------------------------ |
| `name`       | Attribute / field name.                                            |
| `type`       | Type name. Prefer simple readable names.                           |
| `visibility` | Visibility such as `public`, `private`, `protected`, or `package`. |
| `static`     | Use `Y` or `N`.                                                    |
| `notes`      | Optional explanation.                                              |

Example:

```markdown
## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| id | string | private | N | Identifier |
| status | OrderStatus | private | N | Current order status |
| items | OrderItem | private | N | Multiple values |
```

### Methods

Use `## Methods` to define class operations.

Expected header:

```markdown
| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
```

Columns:

| column       | meaning                                                            |
| ------------ | ------------------------------------------------------------------ |
| `name`       | Method name.                                                       |
| `parameters` | Parameter list as readable text.                                   |
| `returns`    | Return type or result name.                                        |
| `visibility` | Visibility such as `public`, `private`, `protected`, or `package`. |
| `static`     | Use `Y` or `N`.                                                    |
| `notes`      | Optional explanation.                                              |

Example:

```markdown
## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| addItem | item: OrderItem | void | public | N | Adds an order line |
| getTotal |  | Money | public | N | Calculates total amount |
```

### Relations

Use `## Relations` to define outbound relations from the current class.

In the current canonical form, `class` relations do not use a `from` column. The source is implicitly the current file's `frontmatter.id`.

Expected header:

```markdown
| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
```

Columns:

| column              | meaning                                          |
| ------------------- | ------------------------------------------------ |
| `id`                | Relation ID.                                     |
| `to`                | Target class-like object ID or Wikilink.         |
| `kind`              | Relation kind.                                   |
| `label`             | Optional relation label.                         |
| `from_multiplicity` | Optional multiplicity on the current class side. |
| `to_multiplicity`   | Optional multiplicity on the target side.        |
| `notes`             | Optional explanation.                            |

Typical `kind` values:

* `association`
* `dependency`
* `inheritance`
* `implementation`
* `aggregation`
* `composition`

Example:

```markdown
## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-SERVICE-USES-REPOSITORY | IF-ORDER-REPOSITORY | dependency | uses |  |  |  |
| REL-ORDER-HAS-ITEM | CLS-ORDER-ITEM | aggregation | has | 1 | 0..* |  |
```

### Source Links

`## Source Links` is optional.

Use it to connect the class model to implementation files, tests, configuration, or other local references.

Expected header:

```markdown
| path | notes |
|---|---|
```

Example:

```markdown
## Source Links

| path | notes |
|---|---|
| src/order/OrderService.ts | Implementation source |
| test/order/OrderService.test.ts | Unit tests |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Compatibility

Older `class` files may contain a `from` column in `## Relations`.

Compatibility policy:

* No `from` column: current canonical form.
* `from` column exists: legacy compatible form.
* `from` equals the current file ID: acceptable compatibility case.
* `from` differs from the current file ID: should be treated as suspicious and may produce a warning.

New templates, samples, and AI-generated files should use the current form without `from`.

Use `class_diagram` when you need diagram-level relations with explicit `from` and `to`.

## Tables

### Attributes table

```markdown
| name | type | visibility | static | notes |
|---|---|---|---|---|
```

### Methods table

```markdown
| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
```

### Relations table

```markdown
| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Common mistakes

### Adding a `from` column to new class relations

Avoid this in new files:

```markdown
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
```

Use the current canonical form:

```markdown
| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
```

### Defining diagram-wide relations in a class file

A `class` file should define outbound relations from itself.

If you want to define relations among multiple classes in one overview, use `class_diagram`.

### Adding unsupported columns

Do not add columns such as `description`, `ref`, `source`, or `target` unless the FORMAT explicitly defines them for the section.

Use `notes` or optional sections instead.

### Using unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid:

```text
string | null
```

Prefer:

```text
string
```

Then explain optionality in `notes` or another supported column.

### Overusing complex type expressions

Avoid complex type expressions in table cells when simple type names are enough.

Risky examples:

* `string[]`
* `Array<string>`
* `Optional<string>`
* `string | null`

Prefer readable type names and explain multiplicity or optionality in `notes`.

## AI generation notes

When generating `class` files with AI:

* Use `type: class`.
* One file should define one class-like object.
* Preserve exact table headers.
* Do not add unsupported columns.
* Use simple IDs.
* Keep `## Relations` outbound from the current class.
* Do not add a `from` column to new `class` relation tables.
* Use `class_diagram` for diagram-level relations.
* Prefer simple readable type names.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` when the model is based on implementation files.

If AI reads source code and creates a class model, verify the result against the source file. Source Links are useful for this review.

## Related samples

* [Inventory service class](../../samples/class/CLS-WMS-INVENTORY-SERVICE.md)
* [Inventory repository interface](../../samples/class/IF-WMS-INVENTORY-REPOSITORY.md)
* [Allocation policy class](../../samples/class/CLS-WMS-ALLOCATION-POLICY.md)
* [Class samples index](../../samples/class/README.md)

## Related formats

* [class_diagram](FORMAT-class_diagram.md)
* [Common sections](FORMAT-common-sections.md)
