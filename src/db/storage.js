// Data-access layer. Every screen in the app talks to storage through this
// module only — never to Supabase directly. That's what let the app move
// from on-device IndexedDB to a shared Supabase backend without any screen
// needing to change.
import { supabase } from './supabaseClient.js'

const clean = (str) => (str ?? '').toString().trim()

// ---------------------------------------------------------------------------
// Row <-> app-object mapping (Postgres uses snake_case; the app uses camelCase)
// ---------------------------------------------------------------------------

function rowToProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category || '',
    unit: row.unit,
    quantity: Number(row.quantity),
    lowStockThreshold: Number(row.low_stock_threshold),
    supplierId: row.supplier_id || '',
    unitCost: Number(row.unit_cost),
    photo: row.photo || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToSupplier(row) {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name || '',
    phone: row.phone || '',
    email: row.email || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToMovement(row) {
  return {
    id: row.id,
    productId: row.product_id,
    type: row.type,
    quantity: Number(row.quantity),
    reason: row.reason,
    note: row.note || '',
    memberName: row.member_name || '',
    memberRole: row.member_role || '',
    poId: row.po_id || '',
    timestamp: row.timestamp,
    updatedAt: row.updated_at,
  }
}

function rowToPO(row) {
  return {
    id: row.id,
    supplierId: row.supplier_id || '',
    status: row.status,
    items: row.items || [],
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function must(error) {
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function listProducts({ search = '', category = '', supplierId = '' } = {}) {
  let query = supabase.from('products').select('*').order('name')
  if (category) query = query.eq('category', category)
  if (supplierId) query = query.eq('supplier_id', supplierId)
  const { data, error } = await query
  must(error)
  let items = data.map(rowToProduct)
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
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
  must(error)
  return data ? rowToProduct(data) : undefined
}

export async function getProductByCode(code) {
  const c = clean(code)
  if (!c) return undefined
  const { data, error } = await supabase.from('products').select('*').ilike('sku', c).maybeSingle()
  must(error)
  return data ? rowToProduct(data) : undefined
}

export async function listCategories() {
  const { data, error } = await supabase.from('products').select('category')
  must(error)
  return [...new Set(data.map((r) => r.category).filter(Boolean))].sort()
}

export async function createProduct(data, member) {
  const sku = clean(data.sku)
  if (!sku) throw new Error('SKU is required')
  const existing = await getProductByCode(sku)
  if (existing) throw new Error(`SKU "${sku}" is already in use`)

  const quantity = Number(data.quantity) || 0
  const { data: inserted, error } = await supabase
    .from('products')
    .insert({
      sku,
      name: clean(data.name),
      category: clean(data.category),
      unit: clean(data.unit) || 'pcs',
      quantity,
      low_stock_threshold: Number(data.lowStockThreshold) || 0,
      supplier_id: data.supplierId || null,
      unit_cost: Number(data.unitCost) || 0,
      photo: data.photo || '',
    })
    .select()
    .single()
  must(error)
  const product = rowToProduct(inserted)

  if (quantity > 0) {
    await supabase.from('movements').insert({
      product_id: product.id,
      type: 'in',
      quantity,
      reason: 'adjustment',
      note: 'Initial stock on product creation',
      member_name: member?.name || '',
      member_role: member?.role || '',
    })
  }
  return product
}

export async function updateProduct(id, data) {
  if (data.sku) {
    const dupe = await getProductByCode(data.sku)
    if (dupe && dupe.id !== id) throw new Error(`SKU "${data.sku}" is already in use`)
  }
  const row = {}
  if (data.sku !== undefined) row.sku = clean(data.sku)
  if (data.name !== undefined) row.name = clean(data.name)
  if (data.category !== undefined) row.category = clean(data.category)
  if (data.unit !== undefined) row.unit = data.unit
  if (data.lowStockThreshold !== undefined) row.low_stock_threshold = Number(data.lowStockThreshold) || 0
  if (data.supplierId !== undefined) row.supplier_id = data.supplierId || null
  if (data.unitCost !== undefined) row.unit_cost = Number(data.unitCost) || 0
  if (data.photo !== undefined) row.photo = data.photo
  row.updated_at = new Date().toISOString()

  const { data: updated, error } = await supabase.from('products').update(row).eq('id', id).select().single()
  must(error)
  return rowToProduct(updated)
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  must(error)
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export async function listSuppliers({ search = '' } = {}) {
  const { data, error } = await supabase.from('suppliers').select('*').order('name')
  must(error)
  let items = data.map(rowToSupplier)
  if (search) {
    const q = search.toLowerCase()
    items = items.filter((s) => s.name.toLowerCase().includes(q))
  }
  return items
}

export async function getSupplier(id) {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle()
  must(error)
  return data ? rowToSupplier(data) : undefined
}

export async function listProductsBySupplier(supplierId) {
  const { data, error } = await supabase.from('products').select('*').eq('supplier_id', supplierId).order('name')
  must(error)
  return data.map(rowToProduct)
}

export async function createSupplier(data) {
  const name = clean(data.name)
  if (!name) throw new Error('Supplier name is required')
  const { data: inserted, error } = await supabase
    .from('suppliers')
    .insert({
      name,
      contact_name: clean(data.contactName),
      phone: clean(data.phone),
      email: clean(data.email),
      notes: clean(data.notes),
    })
    .select()
    .single()
  must(error)
  return rowToSupplier(inserted)
}

export async function updateSupplier(id, data) {
  const row = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) row.name = clean(data.name)
  if (data.contactName !== undefined) row.contact_name = clean(data.contactName)
  if (data.phone !== undefined) row.phone = clean(data.phone)
  if (data.email !== undefined) row.email = clean(data.email)
  if (data.notes !== undefined) row.notes = clean(data.notes)

  const { data: updated, error } = await supabase.from('suppliers').update(row).eq('id', id).select().single()
  must(error)
  return rowToSupplier(updated)
}

export async function deleteSupplier(id) {
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', id)
  must(countError)
  if (count > 0) throw new Error(`Cannot delete: ${count} product(s) still linked to this supplier`)

  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  must(error)
}

// ---------------------------------------------------------------------------
// Movements (stock in/out log)
// ---------------------------------------------------------------------------

export async function listMovements({ productId = '', limit = 0 } = {}) {
  let query = supabase.from('movements').select('*').order('timestamp', { ascending: false })
  if (productId) query = query.eq('product_id', productId)
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  must(error)
  return data.map(rowToMovement)
}

// Adjusts a product's stock and writes a movement entry as a single atomic
// database operation (see adjust_stock in supabase/schema.sql) — this keeps
// concurrent edits from two phones at once from silently overwriting each
// other. Returns { product, crossedBelowThreshold }.
export async function adjustStock({ productId, type, quantity, reason, note, member }) {
  const qty = Math.abs(Number(quantity))
  if (!qty) throw new Error('Quantity must be greater than zero')
  const delta = type === 'out' ? -qty : qty

  const before = await getProduct(productId)
  if (!before) throw new Error('Product not found')

  const { data, error } = await supabase.rpc('adjust_stock', {
    p_product_id: productId,
    p_delta: delta,
    p_reason: reason || 'adjustment',
    p_note: clean(note),
    p_member_name: member?.name || '',
    p_member_role: member?.role || '',
  })
  must(error)
  const product = rowToProduct(data)

  const wasAbove = before.quantity > before.lowStockThreshold
  const crossedBelowThreshold = wasAbove && product.quantity <= product.lowStockThreshold
  return { product, crossedBelowThreshold }
}

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------

export async function listPurchaseOrders({ status = '' } = {}) {
  let query = supabase.from('purchase_orders').select('*').order('updated_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  must(error)
  return data.map(rowToPO)
}

export async function getPurchaseOrder(id) {
  const { data, error } = await supabase.from('purchase_orders').select('*').eq('id', id).maybeSingle()
  must(error)
  return data ? rowToPO(data) : undefined
}

export async function createPurchaseOrder({ supplierId, items, note }) {
  if (!supplierId) throw new Error('Supplier is required')
  if (!items?.length) throw new Error('Add at least one product')
  const { data: inserted, error } = await supabase
    .from('purchase_orders')
    .insert({
      supplier_id: supplierId,
      status: 'draft',
      items: items.map((it) => ({
        productId: it.productId,
        qtyOrdered: Number(it.qtyOrdered) || 0,
        qtyReceived: 0,
        unitCost: Number(it.unitCost) || 0,
      })),
      note: clean(note),
    })
    .select()
    .single()
  must(error)
  return rowToPO(inserted)
}

export async function updatePurchaseOrderStatus(id, status) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  must(error)
  return rowToPO(data)
}

export async function deletePurchaseOrder(id) {
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
  must(error)
}

// Receive some/all items of a PO, atomically (see receive_purchase_order in
// supabase/schema.sql). `received` is [{productId, qty}] for the quantities
// being received *in this action* (not cumulative totals).
export async function receivePurchaseOrder(id, received, member) {
  const { data, error } = await supabase.rpc('receive_purchase_order', {
    p_po_id: id,
    p_received: received.map((r) => ({ productId: r.productId, qty: Number(r.qty) || 0 })),
    p_member_name: member?.name || '',
    p_member_role: member?.role || '',
  })
  must(error)
  return rowToPO(data)
}

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

export async function getLowStockProducts() {
  const items = await listProducts()
  return items.filter((p) => p.quantity <= p.lowStockThreshold).sort((a, b) => a.quantity - b.quantity)
}

export async function getDashboardStats() {
  const [products, recentActivity] = await Promise.all([listProducts(), listMovements({ limit: 10 })])
  const totalProducts = products.length
  const totalStockValue = products.reduce((s, p) => s + p.quantity * (p.unitCost || 0), 0)
  const lowStock = products.filter((p) => p.quantity <= p.lowStockThreshold)
  return {
    totalProducts,
    totalStockValue,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock,
    recentActivity,
  }
}

// ---------------------------------------------------------------------------
// Export (backup) / bulk product import
// ---------------------------------------------------------------------------

// Downloads a snapshot of the live shared data — handy as a backup or for
// offline reporting. Since every phone reads the same Supabase backend now,
// this is no longer needed to sync between phones (that happens live).
export async function exportAll() {
  const [products, suppliers, movements, purchaseOrders] = await Promise.all([
    listProducts(),
    listSuppliers(),
    listMovements(),
    listPurchaseOrders(),
  ])
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    products,
    suppliers,
    movements,
    purchaseOrders,
  }
}

// Bulk-adds/updates products from a JSON file shaped like exportAll()'s
// output (a `products` array is all that's required). Matches existing
// products by SKU and updates them; new SKUs are inserted. Any product with
// a positive `quantity` gets an "Initial stock" movement logged so the
// number is backed by an audit entry, same as adding one product by hand.
export async function bulkImportProducts(payload, member) {
  if (!payload || !Array.isArray(payload.products)) {
    throw new Error('That file does not look like a product list')
  }
  let created = 0
  let updated = 0
  for (const p of payload.products) {
    const sku = clean(p.sku)
    if (!sku) continue
    const existing = await getProductByCode(sku)
    if (existing) {
      await updateProduct(existing.id, {
        name: p.name,
        category: p.category,
        unit: p.unit,
        lowStockThreshold: p.lowStockThreshold,
        supplierId: p.supplierId,
        unitCost: p.unitCost,
        photo: p.photo,
      })
      updated += 1
    } else {
      await createProduct(p, member)
      created += 1
    }
  }
  return { created, updated }
}
