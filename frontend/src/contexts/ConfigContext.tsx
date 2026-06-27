import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import api from '../lib/api'
import { isAuthenticated } from '../lib/auth'

interface Config {
  logo_base64: string | null
  logo_ministerio_base64: string | null
  nome_paroquia: string
}

interface ConfigCtx {
  config: Config | null
  refreshConfig: () => Promise<void>
}

const ConfigContext = createContext<ConfigCtx>({
  config: null,
  refreshConfig: async () => {},
})

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null)

  const refreshConfig = useCallback(async () => {
    if (!isAuthenticated()) return
    try {
      const r = await api.get<Config>('/configuracoes')
      setConfig(r.data)
    } catch {}
  }, [])

  useEffect(() => {
    refreshConfig()
  }, [refreshConfig])

  return (
    <ConfigContext.Provider value={{ config, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfig = () => useContext(ConfigContext)
