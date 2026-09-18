import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createSupplier, updateSupplier, deleteSupplier, getSupplier } from '../../db/storage.js'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, Field, Input, Textarea, Button, Spinner } from '../../components/ui.jsx'
import { TrashIcon } from '../../components/icons.jsx'

export default function SupplierForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { push } = useToast()

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', notes: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isEdit) return
    getSupplier(id).then((s) => {
      if (s) setForm(s)
      setLoading(false)
    })
  }, [id, isEdit])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await updateSupplier(id, form)
        push('Supplier updated', { tone: 'success' })
        navigate(`/suppliers/${id}`)
      } else {
        const created = await createSupplier(form)
        push('Supplier added', { tone: 'success' })
        navigate(`/suppliers/${created.id}`)
      }
    } catch (err) {
      push(err.message, { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!confirm(`Delete "${form.name}"?`)) return
    try {
      await deleteSupplier(id)
      push('Supplier deleted')
      navigate('/suppliers')
    } catch (err) {
      push(err.message, { tone: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit supplier' : 'Add supplier'}
        back
        right={
          isEdit && (
            <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete supplier">
              <TrashIcon className="h-5 w-5 text-danger-600" />
            </Button>
          )
        }
      />

      <form onSubmit={submit} className="space-y-4 px-4 py-4">
        <Field label="Supplier name" error={errors.name}>
          <Input value={form.name} onChange={set('name')} placeholder="e.g. Nilgiris Wholesale" />
        </Field>
        <Field label="Contact person">
          <Input value={form.contactName} onChange={set('contactName')} placeholder="e.g. Ramesh" />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="e.g. +91 98765 43210" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set('email')} placeholder="e.g. orders@supplier.com" />
        </Field>
        <Field label="Notes">
          <Textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Payment terms, delivery days..." />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : isEdit ? 'Save changes' : 'Add supplier'}
        </Button>
      </form>
    </div>
  )
}
