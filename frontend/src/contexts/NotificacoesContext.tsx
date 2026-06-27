import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import membroApi from '../lib/membroApi'

const LS_KEY = 'membro_last_read_comunicado'

interface Comunicado { id: number; titulo: string; tipo: string; created_at: string }
interface Ctx { unreadCount: number; marcarTodosLidos: () => void; pedirPermissao: () => void }

const NotificacoesCtx = createContext<Ctx>({ unreadCount: 0, marcarTodosLidos: () => {}, pedirPermissao: () => {} })

export function NotificacoesProvider({ children }: { children: React.ReactNode }) {
  const [comunicados, setComunicados] = useState<Comunicado[]>([])
  const [lastRead, setLastRead]       = useState<string>(() => localStorage.getItem(LS_KEY) ?? new Date(0).toISOString())
  const lastSeenIdsRef                = useRef<Set<number>>(new Set())
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null)

  const unreadCount = comunicados.filter(c => new Date(c.created_at) > new Date(lastRead)).length

  function marcarTodosLidos() {
    const ts = new Date().toISOString()
    localStorage.setItem(LS_KEY, ts)
    setLastRead(ts)
  }

  function pedirPermissao() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') Notification.requestPermission()
  }

  function notificarNavegador(titulo: string, corpo: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    try { new Notification(titulo, { body: corpo, icon: '/favicon.ico' }) } catch {}
  }

  const carregar = useCallback(async () => {
    try {
      const r = await membroApi.get<Comunicado[]>('/comunicados')
      const lista: Comunicado[] = Array.isArray(r.data) ? r.data : []
      setComunicados(lista)

      const novosUrgentes = lista.filter(c => c.tipo === 'urgente' && !lastSeenIdsRef.current.has(c.id))
      if (novosUrgentes.length > 0 && lastSeenIdsRef.current.size > 0) {
        novosUrgentes.forEach(c => {
          toast('🔴 ' + c.titulo, {
            duration: 6000,
            style: { border: '2px solid #EF4444', background: '#fff1f2', color: '#7F1D1D', fontWeight: '600' },
          })
          notificarNavegador('⚠️ Comunicado urgente', c.titulo)
        })
      }
      lista.forEach(c => lastSeenIdsRef.current.add(c.id))
    } catch {}
  }, [])

  useEffect(() => {
    carregar()
    pollRef.current = setInterval(carregar, 60_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [carregar])

  return (
    <NotificacoesCtx.Provider value={{ unreadCount, marcarTodosLidos, pedirPermissao }}>
      {children}
    </NotificacoesCtx.Provider>
  )
}

export const useNotificacoes = () => useContext(NotificacoesCtx)
