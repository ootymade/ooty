import { useState } from 'react'
import { useTeamMember } from '../../context/TeamMemberContext.jsx'
import { Button, Field, Input, Select } from '../../components/ui.jsx'
import { BoxIcon } from '../../components/icons.jsx'

const ROLES = ['Staff', 'Manager', 'Owner']

export default function NamePicker() {
  const { setMember } = useTeamMember()
  const [name, setName] = useState('')
  const [role, setRole] = useState(ROLES[0])

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setMember({ name: name.trim(), role })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <BoxIcon className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Ooty Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Who's using this phone?</p>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <Field label="Your name">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya"
            required
          />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" size="lg" className="w-full">
          Continue
        </Button>
        <p className="text-center text-xs text-slate-400">
          This just labels stock movements you make — no password needed.
        </p>
      </form>
    </div>
  )
}
