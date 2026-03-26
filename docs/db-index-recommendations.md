## Index Recommendations (Supabase Postgres)

Use ini sebagai checklist untuk mempercepat query yang sering dipakai di dashboard (filter/sort/pagination). Jalankan di Supabase SQL Editor. Gunakan `CONCURRENTLY` jika environment mengizinkan.

### PurchaseOrder

```sql
create index concurrently if not exists idx_po_created_at on "PurchaseOrder" ("createdAt" desc);
create index concurrently if not exists idx_po_tgl_po on "PurchaseOrder" ("tglPo" desc);
create index concurrently if not exists idx_po_expired_tgl on "PurchaseOrder" ("expiredTgl" desc);
create index concurrently if not exists idx_po_ritel_id on "PurchaseOrder" ("ritelId");
create index concurrently if not exists idx_po_unit_produksi_id on "PurchaseOrder" ("unitProduksiId");
create index concurrently if not exists idx_po_regional on "PurchaseOrder" ("regional");
create index concurrently if not exists idx_po_no_po on "PurchaseOrder" ("noPo");
create index concurrently if not exists idx_po_no_invoice on "PurchaseOrder" ("noInvoice");
```

### PurchaseOrderItem

```sql
create index concurrently if not exists idx_poi_po_id on "PurchaseOrderItem" ("purchaseOrderId");
create index concurrently if not exists idx_poi_product_id on "PurchaseOrderItem" ("productId");
create index concurrently if not exists idx_poi_po_id_created_at on "PurchaseOrderItem" ("purchaseOrderId", "createdAt" asc);
```

### RitelModern (ritel_modern)

```sql
create index concurrently if not exists idx_rm_nama_pt on "ritel_modern" ("namaPt");
create index concurrently if not exists idx_rm_inisial on "ritel_modern" ("inisial");
```

### UnitProduksi

```sql
create index concurrently if not exists idx_up_id_regional on "UnitProduksi" ("idRegional");
create index concurrently if not exists idx_up_site_area on "UnitProduksi" ("siteArea");
create index concurrently if not exists idx_up_nama_regional on "UnitProduksi" ("namaRegional");
```

### Optional: Trigram Index (Search `contains`)

Kalau search `q` sering dipakai dan lambat, pertimbangkan trigram. Ini menambah ukuran index.

```sql
create extension if not exists pg_trgm;

create index concurrently if not exists idx_po_no_po_trgm on "PurchaseOrder" using gin ("noPo" gin_trgm_ops);
create index concurrently if not exists idx_po_no_invoice_trgm on "PurchaseOrder" using gin ("noInvoice" gin_trgm_ops);
create index concurrently if not exists idx_po_tujuan_detail_trgm on "PurchaseOrder" using gin ("tujuanDetail" gin_trgm_ops);
create index concurrently if not exists idx_rm_nama_pt_trgm on "ritel_modern" using gin ("namaPt" gin_trgm_ops);
create index concurrently if not exists idx_p_name_trgm on "Product" using gin ("name" gin_trgm_ops);
```
