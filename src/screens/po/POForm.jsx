import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createPurchaseOrder, listSuppliers, listProducts, listProductsBySupplier } from '../../db/storage.js'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, Field, Select, Input, Textarea, Button, Card, Spinner } from '../../components/ui.jsx'
import { PlusIcon, TrashIcon } from '../../components/icons.jsx'

export default function POForm() {
  const navigate = useNavigate()
  const { push } = useToast()
  const [searchParams] = useSearchParams()

  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState(searchParams.get('supplierId') || '')
  const [availableProducts, setAvailableProducts] = useState([])
  const [lines, setLines] = useState([{ productId: '', qtyOrdered: '', unitCost: '' }])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listSuppliers().then(setSuppliers)
  }, [])

  useEffect(() => {
    if (!supplierId) {
      listProducts().then(setAvailableProducts)
      return
    }
    listProductsBySupplier(supplierId).then((items) => {
      setAvailableProducts(items)
    })
  }, [supplierId])

  const updateLine = (idx, patch) => {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const addLine = () => setLines((ls) => [...ls, { productId: '', qtyOrdered: '', unitCost: '' }])
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx))

  const onProductPick = (idx, productId) => {
    const product = availableProducts.find((p) => p.id === productId)
    updateLine(idx, { productId, unitCost: product?.unitCost || '' })
  }

  const total = lines.reduce((s, l) => s + (Number(l.qtyOrdered) || 0) * (Number(l.unitCost) || 0), 0)

  const submit = async (e) => {
    e.preventDefault()
    const validLines = lines.filter((l) => l.productId && Number(l.qtyOrdered) > 0)
    if (!supplierId) {
      push('Choose a supplier', { tone: 'error' })
      return
    }
    if (!validLines.length) {
      push('Add at least one product with a quantity', { tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const po = await createPurchaseOrder({ supplierId, items: validLines, note })
      push('Purchase order created', { tone: 'success' })
      navigate(`/purchase-orders/${po.id}`)
    } catch (err) {
      push(err.message, { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="New purchase order" back />

      <form onSubmit={submit} className="space-y-4 px-4 py-4">
        <Field label="Supplier">
          <Select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value)
              setLines([{ productId: '', qtyOrdered: '', unitCost: '' }])
            }}
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-500">Products</p>
          <div className="space-y-3">
            {lines.map((line, idx) => (
              <Card key={idx} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Select value={line.productId} onChange={(e) => onProductPick(idx, e.target.value)} className="flex-1">
                    <option value="">Select product</option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </Select>
                  {lines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                      <TrashIcon className="h-4.5 w-4.5 text-danger-600" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Quantity"
                    value={line.qtyOrdered}
                    onChange={(e) => updateLine(idx, { qtyOrdered: e.target.value })}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit cost (₹)"
                    value={line.unitCost}
                    onChange={(e) => updateLine(idx, { unitCost: e.target.value })}
                  />
                </div>
              </Card>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addLine}>
            <PlusIcon className="h-4 w-4" /> Add another product
          </Button>
        </div>

        <Field label="Note (optional)">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Delivery instructions, terms..." />
        </Field>

        <Card className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Expected total</span>
          <span className="text-lg font-bold text-slate-900">₹{total.toFixed(2)}</span>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : 'Create purchase order'}
        </Button>
      </form>
    </div>
  )
}
