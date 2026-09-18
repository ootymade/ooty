// Data-access layer. Every screen in the app talks to storage through this
// module only — never to Dexie/IndexedDB directly. That keeps the UI layer
// storage-agnostic: swapping IndexedDB for a real backend (Supabase/Firebase)
// later means rewriting this file, not the screens.
import { db } from './db.js'

const nowIso = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

const clean = (str) => (str ?? '').toString().trim()

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function listProducts({ search = '', category = '', supplierId = '' } = {}) {
  let items = await db.products.orderBy('name').toArray()
  if (category) items = items.filter((p) => p.category === category)
  if (supplierId) items = items.filter((p) => p.supplierId === supplierId)
  if (search) {
    const q = search.toLowerCase()
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q),
    )
  }
  return items
}

export async function getProduct(id) {
  return db.products.get(id)
}

export async function getProductByCode(code) {
  const c = clean(code)
  if (!c) return undefined
  return db.products.where('sku').equalsIgnoreCase(c).first()
}

export async function listCategories() {
  const items = await db.products.toArray()
  return [...new Set(items.map((p) => p.category).filter(Boolean))].sort()
}

export async function createProduct(data, member) {
  const sku = clean(data.sku)
  if (!sku) throw new Error('SKU is required')
  const existing = await getProductByCode(sku)
  if (existing) throw new Error(`SKU "${sku}" is already in use`)
  const ts = nowIso()
  const product = {
    id: uid(),
    sku,
    name: clean(data.name),
    category: clean(data.category),
    unit: clean(data.unit) || 'pcs',
    quantity: Number(data.quantity) || 0,
    lowStockThreshold: Number(data.lowStockThreshold) || 0,
    supplierId: data.supplierId || '',
    unitCost: Number(data.unitCost) || 0,
    photo: data.photo || '',
    createdAt: ts,
    updatedAt: ts,
  }
  await db.products.add(product)
  if (product.quantity > 0) {
    await addMovement({
      productId: product.id,
      type: 'in',
      quantity: product.quantity,
      reason: 'adjustment',
      note: 'Initial stock on product creation',
      memberName: member?.name,
      memberRole: member?.role,
    })
  }
  return product
}

export async function updateProduct(id, data) {
  const existing = await db.products.get(id)
  if (!existing) throw new Error('Product not found')
  if (data.sku && clean(data.sku) !== existing.sku) {
    const dupe = await getProductByCode(data.sku)
    if (dupe && dupe.id !== id) throw new Error(`SKU "${data.sku}" is already in use`)
  }
  const updated = {
    ...existing,
    ...data,
    sku: data.sku ? clean(data.sku) : existing.sku,
    name: data.name !== undefined ? clean(data.name) : existing.name,
    category: data.category !== undefined ? clean(data.category) : existing.category,
    quantity: existing.quantity, // quantity only changes via movements
    updatedAt: nowIso(),
  }
  await db.products.put(updated)
  return updated
}

export async function deleteProduct(id) {
  await db.transaction('rw', db.products, db.movements, async () => {
    await db.products.delete(id)
    await db.movements.where('productId').equals(id).delete()
  })
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export async function listSuppliers({ search = '' } = {}) {
  let items = await db.suppliers.orderBy('name').toArray()
  if (search) {
    const q = search.toLowerCase()
    items = items.filter((s) => s.name.toLowerCase().includes(q))
  }
  return items
}

export async function getSupplier(id) {
  return db.suppliers.get(id)
}

export async function listProductsBySupplier(supplierId) {
  return db.products.where('supplierId').equals(supplierId).toArray()
}

export async function createSupplier(data) {
  const ts = nowIso()
  const supplier = {
    id: uid(),
    name: clean(data.name),
    contactName: clean(data.contactName),
    phone: clean(data.phone),
    email: clean(data.email),
    notes: clean(data.notes),
    createdAt: ts,
    updatedAt: ts,
  }
  if (!supplier.name) throw new Error('Supplier name is required')
  await db.suppliers.add(supplier)
  return supplier
}

export async function updateSupplier(id, data) {
  const existing = await db.suppliers.get(id)
  if (!existing) throw new Error('Supplier not found')
  const updated = { ...existing, ...data, updatedAt: nowIso() }
  await db.suppliers.put(updated)
  return updated
}

export async function deleteSupplier(id) {
  const linked = await db.products.where('supplierId').equals(id).count()
  if (linked > 0) {
    throw new Error(`Cannot delete: ${linked} product(s) still linked to this supplier`)
  }
  await db.suppliers.delete(id)
}

// ---------------------------------------------------------------------------
// Movements (stock in/out log)
// ---------------------------------------------------------------------------

export async function listMovements({ productId = '', limit = 0 } = {}) {
  let items = productId
    ? await db.movements.where('productId').equals(productId).toArray()
    : await db.movements.toArray()
  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  if (limit) items = items.slice(0, limit)
  return items
}

async function addMovement(data) {
  const ts = nowIso()
  const signedQty = data.type === 'out' ? -Math.abs(data.quantity) : Math.abs(data.quantity)
  const movement = {
    id: uid(),
    productId: data.productId,
    type: data.type,
    quantity: signedQty,
    reason: data.reason || 'adjustment',
    note: clean(data.note),
    memberName: data.memberName || '',
    memberRole: data.memberRole || '',
    poId: data.poId || '',
    timestamp: ts,
    updatedAt: ts,
  }
  await db.movements.add(movement)
  return movement
}

// Adjusts a product's stock and writes a movement entry in one transaction.
// Returns { product, movement, crossedBelowThreshold }.
export async function adjustStock({ productId, type, quantity, reason, note, member }) {
  const qty = Math.abs(Number(quantity))
  if (!qty) throw new Error('Quantity must be greater than zero')
  return db.transaction('rw', db.products, db.movements, async () => {
    const product = await db.products.get(productId)
    if (!product) throw new Error('Product not found')
    const wasAbove = product.quantity > product.lowStockThreshold
    const delta = type === 'out' ? -qty : qty
    const newQty = Math.max(0, product.quantity + delta)
    const updated = { ...product, quantity: newQty, updatedAt: nowIso() }
    await db.products.put(updated)
    const movement = await addMovement({
      productId,
      type,
      quantity: qty,
      reason,
      note,
      memberName: member?.name,
      memberRole: member?.role,
    })
    const crossedBelowThreshold = wasAbove && newQty <= updated.lowStockThreshold
    return { product: updated, movement, crossedBelowThreshold }
  })
}

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------

export async function listPurchaseOrders({ status = '' } = {}) {
  let items = await db.purchaseOrders.toArray()
  if (status) items = items.filter((po) => po.status === status)
  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return items
}

export async function getPurchaseOrder(id) {
  return db.purchaseOrders.get(id)
}

export async function createPurchaseOrder({ supplierId, items, note }) {
  if (!supplierId) throw new Error('Supplier is required')
  if (!items?.length) throw new Error('Add at least one product')
  const ts = nowIso()
  const po = {
    id: uid(),
    supplierId,
    status: 'draft',
    items: items.map((it) => ({
      productId: it.productId,
      qtyOrdered: Number(it.qtyOrdered) || 0,
      qtyReceived: 0,
      unitCost: Number(it.unitCost) || 0,
    })),
    note: clean(note),
    createdAt: ts,
    updatedAt: ts,
  }
  await db.purchaseOrders.add(po)
  return po
}

export async function updatePurchaseOrderStatus(id, status) {
  const po = await db.purchaseOrders.get(id)
  if (!po) throw new Error('Purchase order not found')
  const updated = { ...po, status, updatedAt: nowIso() }
  await db.purchaseOrders.put(updated)
  return updated
}

export async function deletePurchaseOrder(id) {
  await db.purchaseOrders.delete(id)
}

// Receive some/all items of a PO. `received` is [{productId, qty}] for the
// quantities being received *in this action* (not cumulative totals).
// Increases stock for those products and logs a movement per line, then
// recomputes PO status (partially_received vs received).
export async function receivePurchaseOrder(id, received, member) {
  return db.transaction('rw', db.purchaseOrders, db.products, db.movements, async () => {
    const po = await db.purchaseOrders.get(id)
    if (!po) throw new Error('Purchase order not found')

    const items = await Promise.all(
      po.items.map(async (line) => {
        const recv = received.find((r) => r.productId === line.productId)
        const qty = Math.min(Math.max(0, Number(recv?.qty) || 0), line.qtyOrdered - line.qtyReceived)
        if (qty > 0) {
          const product = await db.products.get(line.productId)
          if (product) {
            const updated = { ...product, quantity: product.quantity + qty, updatedAt: nowIso() }
            await db.products.put(updated)
            await addMovement({
              productId: line.productId,
              type: 'in',
              quantity: qty,
              reason: 'received',
              note: `PO receipt`,
              memberName: member?.name,
              memberRole: member?.role,
              poId: po.id,
            })
          }
        }
        return { ...line, qtyReceived: line.qtyReceived + qty }
      }),
    )

    const totalOrdered = items.reduce((s, i) => s + i.qtyOrdered, 0)
    const totalReceived = items.reduce((s, i) => s + i.qtyReceived, 0)
    const status = totalReceived <= 0 ? po.status : totalReceived >= totalOrdered ? 'received' : 'partially_received'

    const updated = { ...po, items, status, updatedAt: nowIso() }
    await db.purchaseOrders.put(updated)
    return updated
  })
}

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

export async function getLowStockProducts() {
  const items = await db.products.toArray()
  return items
    .filter((p) => p.quantity <= p.lowStockThreshold)
    .sort((a, b) => a.quantity - b.quantity)
}

export async function getDashboardStats() {
  const products = await db.products.toArray()
  const totalProducts = products.length
  const totalStockValue = products.reduce((s, p) => s + p.quantity * (p.unitCost || 0), 0)
  const lowStock = products.filter((p) => p.quantity <= p.lowStockThreshold)
  const recentActivity = await listMovements({ limit: 10 })
  return {
    totalProducts,
    totalStockValue,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock,
    recentActivity,
  }
}

// ---------------------------------------------------------------------------
// Meta (sync timestamps etc.)
// ---------------------------------------------------------------------------

export async function getMeta(key) {
  const row = await db.meta.get(key)
  return row?.value
}

export async function setMeta(key, value) {
  await db.meta.put({ key, value })
}

// ---------------------------------------------------------------------------
// Export / Import (cross-device sync via JSON file)
// ---------------------------------------------------------------------------

export async function exportAll() {
  const [products, suppliers, movements, purchaseOrders] = await Promise.all([
    db.products.toArray(),
    db.suppliers.toArray(),
    db.movements.toArray(),
    db.purchaseOrders.toArray(),
  ])
  const payload = {
    schemaVersion: 1,
    exportedAt: nowIso(),
    products,
    suppliers,
    movements,
    purchaseOrders,
  }
  await setMeta('lastExport', payload.exportedAt)
  return payload
}

function byId(list) {
  return new Map(list.map((item) => [item.id, item]))
}

// Merge strategy (never destructive — designed so syncing two phones' data
// never loses either side's work):
//  - suppliers & purchaseOrders: merged by `id`; on a collision the record
//    with the newer `updatedAt` wins.
//  - products: merged by `sku` (the real-world business key — two phones
//    creating "the same" product offline will have different random ids but
//    the same SKU); on a collision, descriptive fields come from whichever
//    side has the newer `updatedAt`.
//  - movements: merged by `id`, as a set union (dedup only, never dropped).
//    Movements are the source of truth for stock, so after merging them we
//    recompute every product's `quantity` by summing its movements — this
//    makes the result independent of import order and safe to import twice.
export async function importMerge(payload) {
  if (!payload || !Array.isArray(payload.products)) {
    throw new Error('That file does not look like an inventory export')
  }

  await db.transaction('rw', db.products, db.suppliers, db.movements, db.purchaseOrders, async () => {
    // Suppliers: id-based, last-write-wins
    const currentSuppliers = byId(await db.suppliers.toArray())
    for (const incoming of payload.suppliers || []) {
      const existing = currentSuppliers.get(incoming.id)
      if (!existing || incoming.updatedAt > existing.updatedAt) {
        await db.suppliers.put(incoming)
      }
    }

    // Products: sku-based
    const currentProducts = await db.products.toArray()
    const bySku = new Map(currentProducts.map((p) => [p.sku.toLowerCase(), p]))
    for (const incoming of payload.products || []) {
      const key = incoming.sku.toLowerCase()
      const existing = bySku.get(key)
      if (!existing) {
        await db.products.add(incoming)
        bySku.set(key, incoming)
      } else if (incoming.updatedAt > existing.updatedAt) {
        // Keep the existing row's id/quantity (quantity is recomputed below),
        // but take the newer side's descriptive fields.
        const merged = { ...incoming, id: existing.id, quantity: existing.quantity }
        await db.products.put(merged)
        bySku.set(key, merged)
      }
    }

    // Movements: union by id. Incoming movements referencing a product that
    // only exists under a different local id (sku collision above) need their
    // productId remapped to the local id.
    const incomingSkuByProductId = new Map((payload.products || []).map((p) => [p.id, p.sku.toLowerCase()]))
    const existingMovementIds = new Set((await db.movements.toArray()).map((m) => m.id))
    for (const incoming of payload.movements || []) {
      if (existingMovementIds.has(incoming.id)) continue
      const sku = incomingSkuByProductId.get(incoming.productId)
      const localProduct = sku ? bySku.get(sku) : undefined
      const productId = localProduct ? localProduct.id : incoming.productId
      await db.movements.add({ ...incoming, productId })
    }

    // Recompute stock levels from the merged movement log so totals are
    // correct regardless of merge order or repeated imports.
    const allMovements = await db.movements.toArray()
    const sums = new Map()
    for (const m of allMovements) {
      sums.set(m.productId, (sums.get(m.productId) || 0) + m.quantity)
    }
    const allProducts = await db.products.toArray()
    for (const p of allProducts) {
      const qty = Math.max(0, sums.get(p.id) || 0)
      if (qty !== p.quantity) await db.products.put({ ...p, quantity: qty })
    }

    // Purchase orders: id-based, last-write-wins
    const currentPOs = byId(await db.purchaseOrders.toArray())
    for (const incoming of payload.purchaseOrders || []) {
      const existing = currentPOs.get(incoming.id)
      if (!existing || incoming.updatedAt > existing.updatedAt) {
        await db.purchaseOrders.put(incoming)
      }
    }
  })

  await setMeta('lastImport', nowIso())
}
