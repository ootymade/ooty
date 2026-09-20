import { useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js'

// Subscribes to Postgres changes on the given tables and calls `onChange`
// (debounced) whenever any of them change on the shared backend — this is
// what makes "all 5 phones see the same data live" work, without pulling in
// a full client-side cache/state-management library. `tables` should be a
// stable array (defined outside the component, or the same literal each
// render) — it's only read once, on mount.
export function useRealtimeRefresh(tables, onChange) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!tables?.length) return undefined
    let timer = null
    const debouncedRefresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => onChangeRef.current(), 400)
    }

    const channel = supabase.channel(`realtime:${tables.join(',')}:${Math.random().toString(36).slice(2)}`)
    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, debouncedRefresh)
    })
    channel.subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
