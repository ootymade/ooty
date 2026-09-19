import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboardStats, getMeta, listProducts } from '../db/storage.js'
import { useTeamMember } from '../context/TeamMemberContext.jsx'
import { Card, Badge, Button, EmptyState } from '../components/ui.jsx'
import {
  AlertIcon,
  ScanIcon,
  PlusIcon,
  ClipboardIcon,
  BoxIcon,
  TruckIcon,
  SyncIcon,
} from '../components/icons.jsx'

function formatMoney(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
}

function timeAgo(iso) {
  if (!iso) return 'never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

const REASON_LABEL = {
  received: 'Received',
  sold: 'Sold',
  damaged: 'Damaged',
  adjustment: 'Adjusted',
}

export default function Dashboard() {
  const { member, clearMember } = useTeamMember()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [sync, setSync] = useState({ lastExport: null, lastImport: null })
  const [productNames, setProductNames] = useState({})

  const load = useCallback(async () => {
    const [s, lastExport, lastImport] = await Promise.all([
      getDashboardStats(),
      getMeta('lastExport'),
      getMeta('lastImport'),
    ])
    setStats(s)
    setSync({ lastExport, lastImport })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Resolve product names for the activity feed (cheap: <=50 products)
  useEffect(() => {
    if (!stats?.recentActivity?.length) return
    listProducts().then((all) => {
      const map = {}
      all.forEach((p) => (map[p.id] = p))
      setProductNames(map)
    })
  }, [stats])

  if (!stats) {
    return (
      <div className="p-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <div className="safe-top bg-brand-900 px-4 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-100">Hi, {member?.name}</p>
            <h1 className="text-xl font-bold">Inventory Overview</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/data-sync"
              className="tap flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
              aria-label="Export / Import data"
            >
              <SyncIcon className="h-5 w-5" />
            </Link>
            <button
              onClick={() => {
                if (confirm('Switch user on this phone?')) clearMember()
              }}
              className="tap flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold"
              aria-label="Switch user"
            >
              {member?.name?.[0]?.toUpperCase()}
            </button>
          </div>
        </div>

        {stats.lowStockCount > 0 && (
          <Link
            to="/products?filter=low-stock"
            className="mt-4 flex items-center gap-2 rounded-xl bg-warn-500/20 px-3.5 py-3 text-sm font-medium text-warn-500"
          >
            <AlertIcon className="h-5 w-5 shrink-0" />
            <span className="text-white">
              {stats.lowStockCount} item{stats.lowStockCount === 1 ? '' : 's'} low on stock
            </span>
          </Link>
        )}
      </div>

      <div className="-mt-4 grid grid-cols-2 gap-3 px-4">
        <Card className="!p-4">
          <p className="text-xs font-medium text-slate-400">Total products</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalProducts}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-medium text-slate-400">Stock value</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(stats.totalStockValue)}</p>
        </Card>
        <Link to="/products?filter=low-stock">
          <Card className="!p-4">
            <p className="text-xs font-medium text-slate-400">Low stock</p>
            <p className={`mt-1 text-2xl font-bold ${stats.lowStockCount ? 'text-danger-600' : 'text-slate-900'}`}>
              {stats.lowStockCount}
            </p>
          </Card>
        </Link>
        <Link to="/data-sync">
          <Card className="!p-4">
            <p className="text-xs font-medium text-slate-400">Last synced</p>
            <p className="mt-1 truncate text-sm font-bold text-slate-900">
              {timeAgo(sync.lastExport > sync.lastImport ? sync.lastExport : sync.lastImport)}
            </p>
          </Card>
        </Link>
      </div>

      <div className="mt-5 px-4">
        <p className="mb-2 text-sm font-semibold text-slate-500">Quick actions</p>
        <div className="grid grid-cols-3 gap-3">
          <Button variant="secondary" className="!flex-col !gap-1.5 !py-4" onClick={() => navigate('/scan')}>
            <ScanIcon className="h-6 w-6" />
            <span className="text-xs">Scan</span>
          </Button>
          <Button variant="secondary" className="!flex-col !gap-1.5 !py-4" onClick={() => navigate('/stock-move')}>
            <PlusIcon className="h-6 w-6" />
            <span className="text-xs">Add Stock</span>
          </Button>
          <Button
            variant="secondary"
            className="!flex-col !gap-1.5 !py-4"
            onClick={() => navigate('/purchase-orders/new')}
          >
            <ClipboardIcon className="h-6 w-6" />
            <span className="text-xs">New PO</span>
          </Button>
        </div>
      </div>

      {stats.lowStockCount > 0 && (
        <div className="mt-5 px-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Low stock</p>
            <Link to="/products?filter=low-stock" className="text-xs font-semibold text-brand-600">
              See all
            </Link>
          </div>
          <Card className="divide-y divide-slate-100 !p-0">
            {stats.lowStockProducts.slice(0, 4).map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.sku}</p>
                </div>
                <Badge tone="danger">
                  {p.quantity} {p.unit} left
                </Badge>
              </Link>
            ))}
          </Card>
        </div>
      )}

      <div className="mt-5 px-4">
        <p className="mb-2 text-sm font-semibold text-slate-500">Recent activity</p>
        {stats.recentActivity.length === 0 ? (
          <EmptyState
            icon={<BoxIcon className="h-10 w-10" />}
            title="No activity yet"
            subtitle="Stock movements will show up here"
          />
        ) : (
          <Card className="divide-y divide-slate-100 !p-0">
            {stats.recentActivity.map((m) => {
              const product = productNames[m.productId]
              return (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {product?.name || 'Unknown product'}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {REASON_LABEL[m.reason] || m.reason} · {m.memberName || 'Unknown'} · {timeAgo(m.timestamp)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${m.quantity < 0 ? 'text-danger-600' : 'text-ok-600'}`}>
                    {m.quantity > 0 ? '+' : ''}
                    {m.quantity}
                  </span>
                </div>
              )
            })}
          </Card>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 px-4 text-xs text-slate-400">
        <Link to="/suppliers" className="flex items-center gap-1">
          <TruckIcon className="h-4 w-4" /> Suppliers
        </Link>
        <span>·</span>
        <Link to="/data-sync">Export / Import data</Link>
      </div>
    </div>
  )
}
