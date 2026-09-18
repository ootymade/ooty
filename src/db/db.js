import Dexie from 'dexie'

// Dexie/IndexedDB schema. Primary keys are app-generated UUID strings (not
// auto-increment) so records created offline on different phones keep stable,
// mergeable identities when exported/imported later.
export const db = new Dexie('ooty-inventory')

db.version(1).stores({
  products: 'id, sku, category, supplierId, name, updatedAt',
  suppliers: 'id, name, updatedAt',
  movements: 'id, productId, timestamp, poId, updatedAt',
  purchaseOrders: 'id, supplierId, status, updatedAt',
  meta: 'key',
})

export default db
