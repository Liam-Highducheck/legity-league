import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMyGroups } from './queries'
import type { MyGroup } from '../lib/types'

interface GroupState {
  groups: MyGroup[]
  group: MyGroup | undefined
  setGroupId: (id: string) => void
}

const GroupContext = createContext<GroupState>({ groups: [], group: undefined, setGroupId: () => {} })
const STORAGE_KEY = 'll_group'

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const { data: groups = [] } = useMyGroups()
  const [selected, setSelected] = useState<string | null>(readStored)

  const group = useMemo(() => groups.find((g) => g.id === selected) ?? groups[0], [groups, selected])

  useEffect(() => {
    try {
      if (group) localStorage.setItem(STORAGE_KEY, group.id)
    } catch {
      /* storage unavailable */
    }
  }, [group])

  const value = useMemo(() => ({ groups, group, setGroupId: setSelected }), [groups, group])
  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
}

export function useGroup() {
  return useContext(GroupContext)
}
