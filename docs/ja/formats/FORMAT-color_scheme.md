# FORMAT-color_scheme

English Version: [English](../../formats/FORMAT-color_scheme.md)

## 何に使うフォーマットか

`color_scheme` は、Model Weave diagrams で使う再利用可能な color dictionary を定義するフォーマットです。

色は `target` と `kind` の組み合わせで選択されます。Color Scheme file は plugin settings の `defaultColorSchemeRef` で指定できます。

## 最小例

```markdown
---
type: color_scheme
id: COLOR-SCHEME-DEFAULT
name: DefaultColorScheme
---

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
|  | default | #f5f5f5 | #9e9e9e | #111111 | Global fallback |
|  | application | #9bbb59 | #6f8a3f | #000000 | Global application color |
| domain | model | #A88CCF | #7E57A6 | #000000 | Domain model color |
| dfd | process | #9bbb59 | #6f8a3f | #000000 | DFD process |
| dfd | datastore | #8064a2 | #60497a | #ffffff | DFD datastore |
| app_process | decision | #f4b183 | #c55a11 | #000000 | Business Flow decision |
```

## Colors

期待されるヘッダー:

```markdown
| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
```

列の意味:

| column | required | notes |
|---|---|---|
| `target` | no | free-form の diagram target です。空の target は global kind color を意味します。 |
| `kind` | yes | free-form の kind key です。 |
| `fill` | no | node / subgraph の fill color です。 |
| `stroke` | no | border / stroke color です。 |
| `text` | no | text color です。 |
| `notes` | no | 人間向けの説明です。 |

対応する color values:

* `#RGB`
* `#RRGGBB`

不正な color values は diagnostics の対象です。

同じファイル内で `target + kind` が重複すると diagnostics が出ます。空の `target` も実際の duplicate key として扱われるため、同じ `kind` の empty-target rows を2つ書くと conflict します。

## Resolution order

Color resolution は次の順序で行われます。

1. configured `target + kind`
2. configured empty target + `kind`
3. built-in `target + kind`
4. configured empty target + `default`
5. built-in default

target-specific rows は、同じ `kind` の global rows より優先されます。

## defaultColorSchemeRef

`defaultColorSchemeRef` には、`type: color_scheme` file への vault ref/path を指定できます。

例:

```text
[[COLOR-SCHEME-DEFAULT]]
```

ref が解決できない場合、または対象ファイルが `type: color_scheme` ではない場合、Model Weave は built-in defaults に fallback し、warning を表示します。

## Current application targets

現在 Color Scheme が適用される対象:

| view | target / kind |
|---|---|
| `domains` Area / Tree | `target=domain`, `kind=<Domain.kind>` |
| `domain_diagram` Area / Tree | `target=domain`, `kind=<Domain.kind>` |
| `dfd_diagram` objects | `target=dfd`, `kind=<Objects.kind>` |
| `dfd_diagram` Domain subgraphs | `target=domain`, `kind=<Domain.kind>` |
| `app_process` Business Flow | `target=app_process`, `kind=<Steps.kind>` |

現在 Color Scheme が適用されない対象:

* Mindmap
* Class
* ER
* Screen

## Applied Color Scheme

対応する previews では Applied Color Scheme section が表示される場合があります。

この section は、現在の view に対して有効な rows を kind dictionary として表示し、どの色が使われるかを確認できるようにします。

PNG export は、現在の view が colorized rendering に対応している場合、描画された色を保持します。

## AI生成時の注意

* HEX colors は有効な値にしてください。
* global defaults には空の `target` を使ってください。
* 同じ `kind` でも view ごとに変えたい場合は target-specific rows を使ってください。
* 同じ `target + kind` pair を2回以上定義しないでください。
