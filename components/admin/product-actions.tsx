import { SubmitButton } from "@/components/admin/submit-button";
import type { AdminProductSummary } from "@/lib/catalog/admin-data";

import { deleteProductAction, duplicateProductAction, setProductStatusAction } from "@/app/admin/(protected)/products/actions";

export function ProductActions({ product, compact = false }: { product: AdminProductSummary; compact?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "justify-end" : ""}`}>
      <form action={duplicateProductAction}>
        <input name="productId" type="hidden" value={product.id} />
        <SubmitButton pendingLabel="复制中…" variant="secondary">复制</SubmitButton>
      </form>
      {product.status !== "published" ? (
        <form action={setProductStatusAction}>
          <input name="productId" type="hidden" value={product.id} />
          <input name="status" type="hidden" value="published" />
          <SubmitButton pendingLabel="发布中…">发布</SubmitButton>
        </form>
      ) : (
        <form action={setProductStatusAction}>
          <input name="productId" type="hidden" value={product.id} />
          <input name="status" type="hidden" value="draft" />
          <SubmitButton confirmMessage="确认下架这个商品？下架后顾客将无法在公开查询中看到它。" pendingLabel="下架中…" variant="secondary">下架</SubmitButton>
        </form>
      )}
      {product.status !== "archived" ? (
        <form action={setProductStatusAction}>
          <input name="productId" type="hidden" value={product.id} />
          <input name="status" type="hidden" value="archived" />
          <SubmitButton confirmMessage="确认归档这个商品？历史数据会保留，商品不会被删除。" pendingLabel="归档中…" variant="danger">归档</SubmitButton>
        </form>
      ) : (
        <form action={setProductStatusAction}>
          <input name="productId" type="hidden" value={product.id} />
          <input name="status" type="hidden" value="draft" />
          <SubmitButton pendingLabel="恢复中…" variant="secondary">恢复为草稿</SubmitButton>
        </form>
      )}
      <div title={product.status === "published" ? "已发布商品请先下架再删除" : undefined}>
        <form action={deleteProductAction}>
          <input name="productId" type="hidden" value={product.id} />
          <SubmitButton
            confirmMessage={`永久删除“${product.title}”？商品内容、规格、库存和图片都会删除，且无法恢复。`}
            disabled={product.status === "published"}
            pendingLabel="删除中…"
            variant="danger"
          >
            删除
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
