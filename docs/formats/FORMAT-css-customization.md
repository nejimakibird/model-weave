# CSS Customization

Model Weave exposes scoped CSS classes for preview customization. These classes are intended for Obsidian CSS snippets and let users adjust generated preview styling without changing the Markdown source format.

## Scope

CSS customization is visual only.

- It does not change Model Weave Markdown syntax.
- It does not change parsing behavior.
- It does not change diagnostics or model validation.
- It does not change generated model data.

Use CSS snippets for presentation details such as color, spacing, borders, and table readability.

## Common Detail and Table Classes

Lower detail areas share common Model Weave styling by default across text-based previews such as Screen, CodeSet, Data Object, Rule, Mapping, Source Links, diagnostics, and object context details. Use these classes when you want a consistent table/detail style across formats.

| Class | Purpose |
|---|---|
| `.model-weave-summary-details` | Common lower detail root for summary/text preview content. |
| `.model-weave-detail-card` | Common metadata/overview card. |
| `.model-weave-detail-card-row` | Row inside a metadata/overview card. |
| `.model-weave-detail-card-label` | Label cell inside a metadata/overview card row. |
| `.model-weave-detail-card-value` | Value cell inside a metadata/overview card row. |
| `.model-weave-preview-section` | Preview section block. |
| `.model-weave-preview-section-title` | Preview section heading. |
| `.model-weave-table-wrap` | Scroll wrapper around generated tables. |
| `.model-weave-data-table` | Generated data table. |

Specific classes such as `.model-weave-source-links-table` and `.model-weave-object-context-table` are kept for backward compatibility and targeted overrides. Use the common selectors for default lower detail/table customization. Screen-specific classes are reserved for the upper Screen chart/card area.

## Screen Chart and Card Classes

Screen-specific classes are for the upper Screen chart/card area and Screen-only overrides. The complete internal DOM structure is not guaranteed, so snippets should prefer these classes over deep DOM selectors.

| Class | Purpose |
|---|---|
| `.model-weave-screen-preview` | Existing Screen preview root and chart customization scope. Kept for compatibility with current snippets. |
| `.model-weave-screen-chart` | Upper Screen chart and Screen card area. |
| `.model-weave-screen-card` | Screen card box in the upper chart, including source and resolved target Screen cards. |
| `.model-weave-screen-card-header` | Header area inside an upper Screen card. |
| `.model-weave-screen-card-title` | Title text inside an upper Screen card. |
| `.model-weave-screen-card-body` | Body area inside an upper Screen card. |
| `.model-weave-screen-card-section` | Section block inside an upper source Screen card. |
| `.model-weave-screen-transition-label` | Transition action label in the upper Screen chart. |

## Example Snippet

Add a CSS snippet in Obsidian and enable it from Settings > Appearance > CSS snippets.

```css
/* Upper Screen chart cards */
.model-weave-screen-chart .model-weave-screen-card {
  border-color: black;
}

.model-weave-screen-chart .model-weave-screen-card-header {
  background: var(--color-orange);
  color: var(--text-on-accent);
}

/* Lower detail tables across Model Weave text previews */
.model-weave-summary-details .model-weave-data-table th {
  background: var(--background-secondary-alt);
  color: var(--text-normal);
  padding: 6px 8px;
}

.model-weave-summary-details .model-weave-data-table td {
  padding: 6px 8px;
  border-color: var(--background-modifier-border);
}

.model-weave-summary-details .model-weave-data-table tbody tr:nth-child(even) {
  background: var(--background-secondary);
}
```

## Best Practices

- Keep selectors scoped to Model Weave classes.
- Avoid broad selectors such as `table`, `th`, or `td` without a Model Weave scope.
- Prefer `.model-weave-summary-details .model-weave-data-table` for shared lower preview table styling.
- Prefer `.model-weave-screen-chart` and `.model-weave-screen-card` for the upper Screen chart/card area.
- Avoid `!important` unless it is absolutely necessary for a local theme conflict.
- Use Obsidian CSS variables such as `--background-secondary`, `--text-normal`, and `--background-modifier-border` for theme compatibility.
