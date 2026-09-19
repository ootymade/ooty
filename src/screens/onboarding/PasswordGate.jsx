import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { Button, Field, Input } from '../../components/ui.jsx'
import { BoxIcon } from '../../components/icons.jsx'

export default function PasswordGate() {
  const { signIn } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <BoxIcon className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Ooty Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the team password to continue</p>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <Field label="Password" error={error}>
          <Input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Checking…' : 'Unlock'}
        </Button>
        <p className="text-center text-xs text-slate-400">
          You'll only need to do this once on this phone.
        </p>
      </form>
    </div>
  )
}
