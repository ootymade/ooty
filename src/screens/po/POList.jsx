import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listPurchaseOrders, listSuppliers } from '../../db/storage.js'
import { PageHeader, Badge, Button, EmptyState, Card } from '../../components/ui.jsx'
import { PlusIcon, ClipboardIcon } from '../../components/icons.jsx'

const STATUS_TONE = {
  draft: 'slate',
  ordered: 'brand',
  partially_received: 'warn',
  received: 'ok',
}
const STATUS_LABEL = {
  draft: 'Draft',
  ordered: 'Ordered',
  partially_received: 'Partially received',
  received: 'Received',
}
const TABS = ['all', 'draft', 'ordered', 'partially_received', 'received']

export default function POList() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'all'
  const [orders, setOrders] = useState(null)
  const [suppliers, setSuppliers] = useState({})

  useEffect(() => {
    listSuppliers().then((items) => {
      const map = {}
      items.forEach((s) => (map[s.id] = s))
      setSuppliers(map)
    })
  }, [])

  useEffect(() => {
    listPurchaseOrders({ status: status === 'all' ? '' : status }).then(setOrders)
  }, [status])

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        right={
          <Link to="/purchase-orders/new">
            <Button size="sm" className="!px-3">
              <PlusIcon className="h-4 w-4" /> New
            </Button>
          </Link>
        }
      />

      <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setParams(t === 'all' ? {} : { status: t }, { replace: true })}
            className={`tap shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              status === t ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
            }`}
          >
            {t === 'all' ? 'All' : STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="px-4 pt-2 pb-4">
        {orders === null ? (
          <div className="space-y-2 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardIcon className="h-10 w-10" />}
            title="No purchase orders"
            subtitle="Create one to order stock from a supplier"
            action={
              <Link to="/purchase-orders/new">
                <Button>New purchase order</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {orders.map((po) => {
              const itemCount = po.items.length
              const totalCost = po.items.reduce((s, i) => s + i.qtyOrdered * i.unitCost, 0)
              return (
                <Link key={po.id} to={`/purchase-orders/${po.id}`}>
                  <Card className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {suppliers[po.supplierId]?.name || 'Unknown supplier'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {itemCount} item{itemCount === 1 ? '' : 's'} · ₹{totalCost.toFixed(0)}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[po.status]}>{STATUS_LABEL[po.status]}</Badge>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
