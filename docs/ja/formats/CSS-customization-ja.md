# CSS カスタマイズ

Model Weave は、プレビューをカスタマイズするための scoped CSS class を公開しています。これらの class は Obsidian CSS snippets で使うことを想定しており、Markdown の source format を変更せずに、生成された preview の見た目を調整できます。

## 対象範囲

CSS カスタマイズは見た目だけを変更します。

- Model Weave の Markdown 構文は変わりません。
- parser の動作は変わりません。
- diagnostics や model validation は変わりません。
- 生成される model data は変わりません。

色、余白、border、table の読みやすさなど、表示上の調整に CSS snippets を使ってください。

## Stable Classes

以下の class 名は、可能な範囲で安定して維持する意図があります。ただし、内部 DOM 構造全体は保証対象ではありません。snippet では deep DOM selector よりも、これらの class を優先してください。

| Class | Purpose |
|---|---|
| `.model-weave-screen-preview` | 既存の Screen preview root / chart customization scope です。現在の snippet との互換性のために維持します。 |
| `.model-weave-screen-chart` | 上段の Screen chart と Screen card 領域です。 |
| `.model-weave-screen-card` | 上段 chart 内の Screen card box です。source と解決済み target Screen card を含みます。 |
| `.model-weave-screen-card-header` | 上段 Screen card 内の header 領域です。 |
| `.model-weave-screen-card-title` | 上段 Screen card 内の title text です。 |
| `.model-weave-screen-card-body` | 上段 Screen card 内の body 領域です。 |
| `.model-weave-screen-card-section` | 上段 source Screen card 内の section block です。 |
| `.model-weave-screen-transition-label` | 上段 Screen chart 内の transition action label です。 |
| `.model-weave-screen-details` | 下段の Screen detail / specification 領域です。 |
| `.model-weave-preview-section` | preview section block です。 |
| `.model-weave-preview-section-title` | preview section heading です。 |
| `.model-weave-table-wrap` | 生成 table の scroll wrapper です。 |
| `.model-weave-data-table` | 生成 data table です。 |

## Snippet 例

Obsidian で CSS snippet を追加し、Settings > Appearance > CSS snippets から有効にします。

```css
/* Upper Screen chart cards */
.model-weave-screen-chart .model-weave-screen-card {
  border-color: black;
}

.model-weave-screen-chart .model-weave-screen-card-header {
  background: var(--color-orange);
  color: var(--text-on-accent);
}

/* Lower Screen detail tables */
.model-weave-screen-details .model-weave-data-table th {
  background: var(--background-secondary-alt);
  color: var(--text-normal);
  padding: 6px 8px;
}

.model-weave-screen-details .model-weave-data-table td {
  padding: 6px 8px;
  border-color: var(--background-modifier-border);
}

.model-weave-screen-details .model-weave-data-table tbody tr:nth-child(even) {
  background: var(--background-secondary);
}
```

## Best Practices

- selector は Model Weave の class に scope してください。
- Model Weave の scope なしで `table`、`th`、`td` のような広い selector を使うことは避けてください。
- 下段の Screen preview table には `.model-weave-screen-details .model-weave-data-table` を優先してください。
- 上段の Screen chart/card 領域には `.model-weave-screen-chart` と `.model-weave-screen-card` を優先してください。
- local theme との競合でどうしても必要な場合を除き、`!important` は避けてください。
- theme compatibility のため、`--background-secondary`、`--text-normal`、`--background-modifier-border` などの Obsidian CSS variables を使ってください。

