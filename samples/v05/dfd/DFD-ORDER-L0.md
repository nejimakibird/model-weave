---
type: dfd_diagram
id: DFD-ORDER-L0
name: 注文 DFD
level: 0
tags:
  - DFD
  - Diagram
---

# 注文 DFD

## Summary

注文受付、在庫確認、注文調整の流れを含む DFD 最小サンプルです。

## Objects

| ref | notes |
|---|---|
| [[DFD-EXT-CUSTOMER]] | 外部エンティティ |
| [[DFD-PROC-ORDER-RECEIVE]] | 受付プロセス |
| [[DFD-PROC-STOCK-CHECK]] | 在庫確認プロセス |
| [[DFD-PROC-ORDER-ADJUST]] | 差し戻しプロセス |
| [[DFD-STORE-ORDER]] | 注文保存 |
| [[DFD-STORE-STOCK]] | 在庫参照 |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-ORDER-IN | [[DFD-EXT-CUSTOMER]] | [[DFD-PROC-ORDER-RECEIVE]] | 注文情報 | 開始入力 |
| FLOW-STOCK-CHECK | [[DFD-PROC-ORDER-RECEIVE]] | [[DFD-PROC-STOCK-CHECK]] | [[data/DATA-ORDER-CONTENT|注文内容]] | 在庫確認依頼 |
| FLOW-STOCK-READ | [[DFD-STORE-STOCK]] | [[DFD-PROC-STOCK-CHECK]] | [[data/DATA-STOCK-INFO|在庫情報]] | 参照 |
| FLOW-ORDER-SAVE | [[DFD-PROC-ORDER-RECEIVE]] | [[DFD-STORE-ORDER]] | 注文データ | 保存 |
| FLOW-ORDER-OK | [[DFD-PROC-STOCK-CHECK]] | [[DFD-EXT-CUSTOMER]] | 注文結果 | 正常応答 |
| FLOW-ORDER-ADJUST | [[DFD-PROC-STOCK-CHECK]] | [[DFD-PROC-ORDER-ADJUST]] | 調整依頼 | 分岐 |
| FLOW-ORDER-REINPUT | [[DFD-PROC-ORDER-ADJUST]] | [[DFD-PROC-ORDER-RECEIVE]] | [[data/DATA-STOCK-CHECK-RESULT|在庫確認結果]] | 差し戻しループ |
| FLOW-ORDER-NOTICE | [[DFD-PROC-ORDER-ADJUST]] | [[DFD-EXT-CUSTOMER]] | 調整結果 | 合流前通知 |

## Notes

- 直列 flow、分岐、合流、差し戻しループを含む DFD 最小サンプルです。
