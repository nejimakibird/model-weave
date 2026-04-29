# FORMAT-dfd_object

## 目的

DFD における単体要素を表現するための定義ファイル。

このファイルでは、以下のような DFD 要素を 1 つずつ定義する。

- 外部実体
- プロセス
- データストア

DFD の流れそのものは `dfd_diagram` 側で定義し、この `dfd_object` は再利用可能な部品として扱う。

---

## 基本方針

- `type: dfd_object` を持つ
- DFD の単体要素を 1 ファイル 1 オブジェクトで定義する
- 要素種別は `kind` で表す
- データフローそのものはこのファイルには持たない
- 流れの正本は `dfd_diagram` 側に置く

---

## Frontmatter

### 必須
- `type`
- `id`
- `name`
- `kind`

### 任意
- `tags`

### `kind` の想定値
- `external`
- `process`
- `datastore`

### 例
```yaml
---
type: dfd_object
id: DFD-PROC-ORDER-RECEIVE
name: 注文受付
kind: process
tags:
  - DFD
  - Process
---
```

---

## 本文構成

```text
# <object name>

## Summary

## Notes
```

---

## Summary

要素の役割や意味を自由記述で補足する。

### 例
```markdown
## Summary

受注APIまたは画面入力から注文情報を受け取り、後続処理へ渡す。
```

---

## Notes

任意の補足を書く。

### 例
```markdown
## Notes

- Level 0 では主要プロセスとして扱う
- 詳細処理は下位図で分解予定
```

---

## 完成例

```markdown
---
type: dfd_object
id: DFD-PROC-ORDER-RECEIVE
name: 注文受付
kind: process
tags:
  - DFD
  - Process
---

# 注文受付

## Summary

受注APIまたは画面入力から注文情報を受け取り、後続処理へ渡す。

## Notes

- Level 0 の主要プロセス
```
