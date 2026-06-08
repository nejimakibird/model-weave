---
type: color_scheme
id: COLOR-SCHEME-DEFAULT
name: DefaultColorScheme
tags:
  - ModelWeave
  - ColorScheme
---

# DefaultColorScheme

## Summary

Model Weave のサンプル図で使う既定 Color Scheme です。

Model Weave 設定で `defaultColorSchemeRef` に `[[COLOR-SCHEME-DEFAULT]]` を設定すると、Domains、Domain Diagram、DFD、app_process Business Flow の配色確認に使えます。

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
|  | default | #f5f5f5 | #9e9e9e | #111111 | 全体 fallback |
|  | business | #4f81bd | #2f5597 | #ffffff | 業務 / 組織 |
|  | application | #9bbb59 | #6f8a3f | #000000 | アプリケーション / システム |
|  | model | #8faadc | #5b7dbb | #000000 | モデル / 設計定義 |
|  | renderer | #70ad47 | #507e32 | #000000 | レンダラー / プレビュー |
|  | integration | #f4b183 | #c55a11 | #000000 | 連携 / パイプライン |
|  | export | #ffd966 | #bf9000 | #000000 | export / 出力 |
|  | ui | #76a5af | #45818e | #000000 | ユーザーインターフェース |
|  | data | #A88CCF | #7E57A6 | #000000 | データ / datastore |
|  | operations | #7f7f7f | #595959 | #ffffff | 運用 / 作業 |
|  | external | #bfbfbf | #7f7f7f | #000000 | 外部アクター / 外部システム |
| domain | default | #f5f5f5 | #9e9e9e | #111111 | Domain fallback |
| domain | business | #4f81bd | #2f5597 | #ffffff | 業務 / 組織 Domain |
| domain | application | #9bbb59 | #6f8a3f | #000000 | アプリケーション Domain |
| domain | model | #8faadc | #5b7dbb | #000000 | モデル / 設計定義 Domain |
| domain | renderer | #70ad47 | #507e32 | #000000 | レンダラー / プレビュー Domain |
| domain | integration | #f4b183 | #c55a11 | #000000 | 連携 / パイプライン Domain |
| domain | export | #ffd966 | #bf9000 | #000000 | export Domain |
| domain | ui | #76a5af | #45818e | #000000 | UI Domain |
| domain | data | #A88CCF | #7E57A6 | #000000 | データ / 内部モデル Domain |
| domain | operations | #7f7f7f | #595959 | #ffffff | 運用 Domain |
| domain | external | #bfbfbf | #7f7f7f | #000000 | 外部アクター / 外部システム Domain |
| dfd | default | #f5f5f5 | #9e9e9e | #111111 | DFD fallback |
| dfd | process | #9bbb59 | #6f8a3f | #000000 | DFD process |
| dfd | datastore | #8064a2 | #60497a | #ffffff | DFD datastore |
| dfd | external | #bfbfbf | #7f7f7f | #000000 | DFD external |
| dfd | other | #f4b183 | #c55a11 | #000000 | DFD other |
| app_process | default | #f5f5f5 | #9e9e9e | #111111 | Business Flow fallback |
| app_process | start | #4f81bd | #2f5597 | #ffffff | 開始 step |
| app_process | process | #9bbb59 | #6f8a3f | #000000 | 処理 step |
| app_process | decision | #f4b183 | #c55a11 | #000000 | 分岐 step |
| app_process | end | #bfbfbf | #7f7f7f | #000000 | 終了 step |
