import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'ooty-inventory:member'
const TeamMemberContext = createContext(null)

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function TeamMemberProvider({ children }) {
  const [member, setMemberState] = useState(readStored)

  useEffect(() => {
    if (member) localStorage.setItem(STORAGE_KEY, JSON.stringify(member))
  }, [member])

  const setMember = (next) => setMemberState(next)
  const clearMember = () => {
    localStorage.removeItem(STORAGE_KEY)
    setMemberState(null)
  }

  return (
    <TeamMemberContext.Provider value={{ member, setMember, clearMember }}>
      {children}
    </TeamMemberContext.Provider>
  )
}

export function useTeamMember() {
  const ctx = useContext(TeamMemberContext)
  if (!ctx) throw new Error('useTeamMember must be used within TeamMemberProvider')
  return ctx
}
