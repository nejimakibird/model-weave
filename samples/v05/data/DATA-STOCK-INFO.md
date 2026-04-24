---
type: data_object
id: DATA-STOCK-INFO
name: 在庫情報
kind: payload
tags:
  - Data
  - DFD
---

# 在庫情報

## Summary

在庫データストアから在庫確認へ返される在庫情報。

## Fields

| name | type | required | ref | notes |
|---|---|---|---|---|
| product_id | string | Y | [[er/m_product]] | 商品ID |
| available_quantity | number | Y |  | 利用可能在庫数 |
| reserved_quantity | number | N |  | 引当済在庫数 |

## Notes

- 在庫確認では available_quantity を主に参照する。
