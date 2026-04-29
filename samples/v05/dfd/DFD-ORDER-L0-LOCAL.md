---
type: dfd_diagram
id: DFD-ORDER-L0-LOCAL
name: 注文 DFD ローカルオブジェクト
level: 0
tags:
  - DFD
  - Diagram
---

# 注文 DFD ローカルオブジェクト

## Summary

local object と ref object を混在させた DFD サンプルです。

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| CLIENT | 荷主システム | external |  | local external system |
| RECEIVE | 注文受付 | process | [[DFD-PROC-ORDER-RECEIVE]] | resolved dfd_object |
| STOCK | 在庫台帳 | datastore | [[DFD-STORE-STOCK]] | resolved datastore |
| WMS | 在庫管理システム | process |  | local process |
| LEGACY-CONVERT | 通信変換 | process | [[DFD-PROC-CONVERT-MISSING]] | unresolved ref sample |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-CLIENT-IN | CLIENT | RECEIVE | 受注依頼 | local id to resolved ref |
| FLOW-RECEIVE-STOCK | RECEIVE | STOCK | [[data/DATA-ORDER-CONTENT\|注文内容]] | resolved refs by Objects.id |
| FLOW-STOCK-WMS | STOCK | WMS | 在庫照会結果 | resolved ref to local id |
| FLOW-WMS-CLIENT | WMS | CLIENT | 注文結果 | local id to local id |

## Notes

- LEGACY-CONVERT は unresolved ref warning 確認用です。
- Flows.from / Flows.to は Objects.id を使っています。
