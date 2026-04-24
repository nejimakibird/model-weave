---
type: data_object
id: DATA-STOCK-CHECK-RESULT
name: 在庫確認結果
kind: response
tags:
  - Data
  - DFD
---

# 在庫確認結果

## Summary

在庫確認プロセスから注文受付へ返される在庫確認結果。

## Fields

| name | type | required | ref | notes |
|---|---|---|---|---|
| order_id | string | Y | [[er/t_order]] | 対象注文 |
| stock_status | string | Y |  | 在庫可否 |
| shortage_reason | string | N |  | 在庫不足時の理由 |

## Notes

- 在庫不足時は差し戻しや再入力の判断に使う。
