# Model Weave

Model Weave は、Markdown を正本として設計を管理する Obsidian Desktop 向けのテキストファースト・モデリングプラグインです。

図、プレビュー、diagnostics、PNG export はすべて Markdown から生成される派生ビューです。設計資産そのものは Markdown に残り、差分管理、レビュー、AI 実装支援に使えることを重視しています。

## 基本方針

- Markdown が source of truth です。
- Custom renderer は詳細レビュー向けです。
- Mermaid renderer は overview / relationship / flow 可視化向けです。
- renderer の選択は表示方法を変えるだけで、Markdown 形式そのものは変えません。
- 現在は Obsidian Desktop 前提です。

## V0.7 の現在地

- `dfd_diagram` は V0.7 で Mermaid-first です。
- DFD の正式な図表示は Mermaid `flowchart LR` を前提にしています。
- 旧 DFD custom renderer は legacy 扱いで、今後の削除対象です。
- `dfd_diagram.Objects` では local object を扱えます。
- local object は `ref` なしで定義でき、diagram 内だけで有効です。
- DFD Mermaid は layout file を必要としません。

## 対応フォーマット

### Stable / primary formats

- `class`
- `class_diagram`
- `er_entity`
- `er_diagram`
- `dfd_object`
- `dfd_diagram`
- `data_object`

### Experimental / evolving formats

- `screen`
- `app_process`
- `rule`
- `codeset`
- `message`
- `mapping`

フォーマット一覧:

- [docs/formats/README.md](docs/formats/README.md)

V0.7 rendering policy:

- [docs/V0.7-rendering-policy.md](docs/V0.7-rendering-policy.md)

## render_mode

`render_mode` には次の値を使います。

- `auto`
- `custom`
- `mermaid`

`auto` は renderer そのものではなく、「その format の既定 renderer を使う」という意味です。

優先順位:

1. toolbar override
2. `frontmatter.render_mode`
3. `settings.defaultRenderMode`
4. format default

toolbar での選択は一時的な表示 override で、Markdown や frontmatter は書き換えません。

## 設定

現在の基本設定:

- `defaultRenderMode`
- `defaultZoom`
- `fontSize`
- `nodeDensity`

これらは Viewer 表示にだけ影響し、Markdown や frontmatter を更新しません。

## インストール

現時点では、まだ Obsidian Community Plugins での正式公開前提の調整中です。Community Plugin 一覧からすぐに導入できる前提では書いていません。

予定している導入経路:

- Community Plugin 承認後は、Community Plugins 経由でインストール
- それまでは手動インストールで利用

手動インストールの考え方:

1. このリポジトリを取得する
2. build して plugin 配布物を作る
3. vault の `.obsidian/plugins/model-weave/` に配置する
4. Obsidian Desktop で plugin を有効化する

## Viewer の考え方

- shared Viewer features として zoom / fit / `100%` / pan / diagnostics / upper-lower resizable layout / PNG export を持ちます
- Class / ER は Custom と Mermaid を切り替えながら、詳細レビューと overview を使い分けます
- DFD は Mermaid-first なので RenderMode selector を出しません
- table/text 中心の format では、必要な場合を除き selector を出しません

## Performance & Scale

- 非常に大きい Mermaid graph では、描画や export のパフォーマンス制約が出る場合があります
- 大きな構造は 1 ファイルに詰め込みすぎず、複数 diagram に分割する運用を推奨します

## PNG Export

- export 対象は diagram body のみです
- toolbar / diagnostics / 下段情報 / resize handle は含みません
- 背景は白固定の export-friendly な扱いを前提にしています
- current zoom/pan そのままではなく、図全体が収まる形で出力します

## DFD local object の要点

V0.7 の `dfd_diagram.Objects` 推奨列:

| id | label | kind | ref | notes |
|---|---|---|---|---|

- `id`: diagram-local object ID
- `label`: 表示名
- `kind`: `external` / `process` / `datastore` / `other`
- `ref`: 任意の `dfd_object` 参照
- `notes`: 任意

ルール:

- `ref` が空なら local object
- `ref` があれば reusable な `dfd_object` 参照
- 旧 `ref` only 形式も互換維持
- `Flows.from/to` は listed `Objects` を解決対象にします
- `Flows` から missing node を silent create しません

関連資料:

- [docs/formats/FORMAT-dfd_diagram.md](docs/formats/FORMAT-dfd_diagram.md)
- [samples/README.md](samples/README.md)

## サンプル

- [samples/README.md](samples/README.md)

代表的な確認用:

- Class:
  - [samples/class/CLASSD-WMS-SERVICE.md](samples/class/CLASSD-WMS-SERVICE.md)
  - [samples/class/CLS-WMS-INVENTORY-SERVICE.md](samples/class/CLS-WMS-INVENTORY-SERVICE.md)
- ER:
  - [samples/er/ERD-WMS-CORE.md](samples/er/ERD-WMS-CORE.md)
  - [samples/er/ENT-INVENTORY.md](samples/er/ENT-INVENTORY.md)
- DFD:
  - [samples/dfd/basic/DFD-WMS-L0.md](samples/dfd/basic/DFD-WMS-L0.md)
  - [samples/dfd/local-objects/DFD-WMS-L0-LOCAL.md](samples/dfd/local-objects/DFD-WMS-L0-LOCAL.md)

## 備考

- `testdata/` は diagnostics / compatibility 確認用です
- mobile 向け最適化は現時点では前提にしていません
- public release に向けて docs と samples を段階的に整理中です
