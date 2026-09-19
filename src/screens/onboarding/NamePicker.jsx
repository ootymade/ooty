import { useTeamMember } from '../../context/TeamMemberContext.jsx'
import { BoxIcon } from '../../components/icons.jsx'

export const TEAM_ROSTER = [
  { name: 'Moorthy', role: 'Sales Manager', function: 'Oversees and confirms overall inventory accuracy' },
  { name: 'Rajendran', role: 'Staff', function: 'Daily purchase & sales entry' },
  { name: 'Jaheer', role: 'Staff', function: 'Daily purchase & sales entry' },
  { name: 'Priya Vijayakumar', role: 'Staff', function: 'Monitors stock; daily purchase & sales' },
  { name: 'Sanjay', role: 'Staff', function: 'Monitors stock; daily purchase & sales' },
]

export default function NamePicker() {
  const { setMember } = useTeamMember()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-10">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <BoxIcon className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Ooty Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Who's using this phone?</p>
      </div>

      <div className="w-full max-w-sm space-y-2.5">
        {TEAM_ROSTER.map((person) => (
          <button
            key={person.name}
            onClick={() => setMember({ name: person.name, role: person.role })}
            className="tap flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
              {person.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{person.name}</p>
              <p className="truncate text-xs text-slate-400">
                {person.role} · {person.function}
              </p>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-6 max-w-sm text-center text-xs text-slate-400">
        This just labels stock movements you make — anyone can still add or edit stock.
      </p>
    </div>
  )
}
