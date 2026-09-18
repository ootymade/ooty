import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSuppliers, listProductsBySupplier } from '../../db/storage.js'
import { PageHeader, Input, Button, EmptyState } from '../../components/ui.jsx'
import { SearchIcon, PlusIcon, TruckIcon } from '../../components/icons.jsx'

export default function SupplierList() {
  const [search, setSearch] = useState('')
  const [suppliers, setSuppliers] = useState(null)
  const [counts, setCounts] = useState({})

  useEffect(() => {
    listSuppliers({ search }).then(async (items) => {
      setSuppliers(items)
      const entries = await Promise.all(
        items.map(async (s) => [s.id, (await listProductsBySupplier(s.id)).length]),
      )
      setCounts(Object.fromEntries(entries))
    })
  }, [search])

  return (
    <div>
      <PageHeader
        title="Suppliers"
        right={
          <Link to="/suppliers/new">
            <Button size="sm" className="!px-3">
              <PlusIcon className="h-4 w-4" /> Add
            </Button>
          </Link>
        }
      />

      <div className="px-4 pt-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers" className="pl-10" />
        </div>
      </div>

      <div className="px-4 pt-3 pb-4">
        {suppliers === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={<TruckIcon className="h-10 w-10" />}
            title="No suppliers yet"
            subtitle="Add a supplier to link products and create purchase orders"
            action={
              <Link to="/suppliers/new">
                <Button>Add supplier</Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            {suppliers.map((s) => (
              <li key={s.id}>
                <Link to={`/suppliers/${s.id}`} className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className="truncate text-xs text-slate-400">{s.phone || s.email || 'No contact info'}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{counts[s.id] ?? 0} products</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
