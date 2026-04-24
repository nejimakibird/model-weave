---
type: data_object
id: DATA-ORDER-CONTENT
name: 注文内容
kind: message
tags:
  - Data
  - DFD
---

# 注文内容

## Summary

注文受付から在庫確認へ渡される注文内容データ。

## Fields

| name | type | required | ref | notes |
|---|---|---|---|---|
| order_id | string | Y | [[er/t_order]] | 注文ID |
| customer_id | string | Y | [[er/m_customer]] | 顧客ID |
| product_id | string | Y | [[er/m_product]] | 商品ID |
| quantity | number | Y |  | 数量 |

## Notes

- 在庫確認では product_id と quantity を主に利用する。
