import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Gift, Cake, Star, Users } from 'lucide-react'
import membroApi from '../../lib/membroApi'
import { parseDate } from '../../lib/dateUtils'

const GOLD   = '#fbbf24'
const INDIGO = '#431407'

interface Aniversariante {
  id: number
  nome: string
  foto_base64?: string | null
  dias_para_aniversario: number
  idade: number
  data_nascimento?: string
}

function safeDate(raw: string): Date {
  try { return parseDate(raw) } catch { return new Date() }
}

function signo(dia: number, mes: number): string {
  if ((mes === 1 && dia >= 20) || (mes === 2 && dia <= 18)) return '♒'
  if ((mes === 2 && dia >= 19) || (mes === 3 && dia <= 20)) return '♓'
  if ((mes === 3 && dia >= 21) || (mes === 4 && dia <= 19)) return '♈'
  if ((mes === 4 && dia >= 20) || (mes === 5 && dia <= 20)) return '♉'
  if ((mes === 5 && dia >= 21) || (mes === 6 && dia <= 20)) return '♊'
  if ((mes === 6 && dia >= 21) || (mes === 7 && dia <= 22)) return '♋'
  if ((mes === 7 && dia >= 23) || (mes === 8 && dia <= 22)) return '♌'
  if ((mes === 8 && dia >= 23) || (mes === 9 && dia <= 22)) return '♍'
  if ((mes === 9 && dia >= 23) || (mes === 10 && dia <= 22)) return '♎'
  if ((mes === 10 && dia >= 23) || (mes === 11 && dia <= 21)) return '♏'
  if ((mes === 11 && dia >= 22) || (mes === 12 && dia <= 21)) return '♐'
  return '♑'
}

function Avatar({ a, size = 'md', ring }: { a: Aniversariante; size?: 'sm' | 'md' | 'lg'; ring?: string }) {
  const ini = a.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const dim = size === 'lg' ? 72 : size === 'md' ? 52 : 40
  const txt = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-xs'
  return a.foto_base64 ? (
    <img src={a.foto_base64} alt=""
      className="rounded-2xl object-cover flex-shrink-0"
      style={{ width: dim, height: dim, boxShadow: ring ? `0 0 0 3px ${ring}` : '0 2px 8px rgba(0,0,0,0.1)' }} />
  ) : (
    <div className={`rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${txt}`}
      style={{ width: dim, height: dim, background: `linear-gradient(135deg, ${GOLD}, #8B6914)`, color: '#0D0B1E', boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }}>
      {ini}
    </div>
  )
}

function SectionHeader({ title, icon, color, count }: { title: string; icon: React.ReactNode; color: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-3">
      <span style={{ color }}>{icon}</span>
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
        {count}
      </span>
    </div>
  )
}

function AnivCard({ a, idx }: { a: Aniversariante; idx: number }) {
  const d       = a.dias_para_aniversario
  const dn      = a.data_nascimento
  const s       = dn ? signo(safeDate(dn).getDate(), safeDate(dn).getMonth() + 1) : ''
  const dataNasc = dn ? format(safeDate(dn), "dd 'de' MMMM", { locale: ptBR }) : null
  const isThisWeek = d > 0 && d <= 7

  return (
    <div className="card flex items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${idx * 0.035}s` }}>
      <Avatar a={a} size="md" ring={isThisWeek ? '#8B5CF6' : undefined} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 leading-tight truncate">{a.nome}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {dataNasc && (
            <span className="text-xs text-gray-400">{dataNasc} {s}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {d === 0 ? (
            <span className="font-bold text-amber-600">{a.idade} anos hoje! 🎉</span>
          ) : (
            <span className="text-gray-500">
              {a.idade + 1} anos em{' '}
              {d === 1 ? <strong className="text-purple-600">amanhã</strong> : (
                <strong style={{ color: d <= 7 ? '#8B5CF6' : GOLD }}>{d} dias</strong>
              )}
            </span>
          )}
        </p>
      </div>
      <div className="flex-shrink-0 flex flex-col items-center min-w-[40px]">
        {d === 0 ? (
          <span className="text-2xl">🎂</span>
        ) : (
          <>
            <span className="text-2xl font-black leading-none"
              style={{ color: d <= 7 ? '#8B5CF6' : GOLD }}>
              {d}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">dias</span>
            {d <= 7 && (
              <div className="mt-1 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${Math.max(10, 100 - (d / 7) * 100)}%`, background: '#8B5CF6' }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function MembroAniversariantes() {
  const [lista, setLista]     = useState<Aniversariante[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    membroApi.get<Aniversariante[]>('/aniversariantes')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }, [])

  const hoje   = lista.filter(a => a.dias_para_aniversario === 0)
  const semana = lista.filter(a => a.dias_para_aniversario > 0 && a.dias_para_aniversario <= 7)
  const mes    = lista.filter(a => a.dias_para_aniversario > 7  && a.dias_para_aniversario <= 30)
  const outros = lista.filter(a => a.dias_para_aniversario > 30)

  return (
    <>
      <style>{`
        @keyframes mpFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes confetti {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-60px) rotate(720deg); opacity: 0; }
        }
        .aniv-card { animation: mpFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .confetti-dot {
          position: absolute; width: 6px; height: 6px; border-radius: 50%;
          animation: confetti 1.2s ease-out infinite;
        }
      `}</style>

      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between aniv-card">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gift size={22} style={{ color: "GOLD" }} /> Aniversariantes
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {lista.length > 0
                ? `${lista.length} membros com aniversário registrado`
                : 'Membros do Ministério dos Acólitos'}
            </p>
          </div>
          {!loading && lista.length > 0 && (
            <div className="flex gap-3">
              {hoje.length > 0 && (
                <div className="flex flex-col items-center px-4 py-2 rounded-2xl"
                  style={{ background: `${GOLD}15` }}>
                  <span className="text-xl font-black" style={{ color: `${GOLD}` }}>{hoje.length}</span>
                  <span className="text-[10px] text-gray-500">hoje</span>
                </div>
              )}
              {semana.length > 0 && (
                <div className="flex flex-col items-center px-4 py-2 rounded-2xl bg-purple-50">
                  <span className="text-xl font-black text-purple-600">{semana.length}</span>
                  <span className="text-[10px] text-gray-500">esta semana</span>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 240 }}>
            <div className="w-9 h-9 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GOLD}40`, borderTopColor: "#f1f1f1" }} />
          </div>
        ) : lista.length === 0 ? (
          <div className="card p-14 text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 font-medium">Nenhum aniversariante cadastrado</p>
            <p className="text-sm text-gray-400 mt-1">Membros precisam ter data de nascimento registrada</p>
          </div>
        ) : (
          <>
            {/* ── Hoje — celebration card ─────────────────────────────────── */}
            {hoje.length > 0 && (
              <div className="aniv-card">
                <div className="relative rounded-2xl overflow-hidden"
                  style={{ background: `linear-gradient(135deg, #F59E0B 0%, #F59E0B 60%, #F59E0B 100%)` }}>
                  {[
                    { top: '15%', left: '12%', color: "#f1f1f1",      delay: '0s'   },
                    { top: '20%', left: '70%', color: '#10B981', delay: '0.3s' },
                    { top: '70%', left: '20%', color: '#F59E0B', delay: '0.6s' },
                    { top: '60%', left: '80%', color: '#C084FC', delay: '0.2s' },
                    { top: '40%', left: '50%', color: "#f1f1f1",      delay: '0.8s' },
                  ].map((c, i) => (
                    <div key={i} className="confetti-dot"
                      style={{ top: c.top, left: c.left, background: c.color, animationDelay: c.delay }} />
                  ))}

                  <div className="relative z-10 px-6 py-6">
                    <div className="flex items-center gap-2 mb-5">
                      <Cake size={16} style={{ color:"#f1f1f1" }} />
                      <span className="text-sm font-bold uppercase tracking-wide" style={{ color: "#f1f1f1" }}>
                        Aniversário Hoje
                      </span>
                      <span className="ml-1 text-lg">🎉</span>
                    </div>
                    <div className={`grid gap-4 ${hoje.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                      {hoje.map(a => {
                        const dn = a.data_nascimento
                        const s  = dn ? signo(safeDate(dn).getDate(), safeDate(dn).getMonth() + 1) : ''
                        return (
                          <div key={a.id} className="flex items-center gap-4">
                            <div className="relative flex-shrink-0">
                              <Avatar a={a} size="lg" ring={GOLD} />
                              <span className="absolute -top-2 -right-2 text-xl">🎂</span>
                            </div>
                            <div>
                              <p className="text-white font-bold text-lg leading-tight">{a.nome}</p>
                              <p className="text-sm mt-0.5" style={{ color: "#f1f1f1" }}>
                                {a.idade} anos hoje! {s}
                              </p>
                              {dn && (
                                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  {format(safeDate(dn), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Esta semana ─────────────────────────────────────────────── */}
            {semana.length > 0 && (
              <div className="aniv-card space-y-3">
                <SectionHeader title="Esta Semana" icon={<Star size={14} />} color="#8B5CF6" count={semana.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {semana.map((a, i) => <AnivCard key={a.id} a={a} idx={i} />)}
                </div>
              </div>
            )}

            {/* ── Este mês ─────────────────────────────────────────────────── */}
            {mes.length > 0 && (
              <div className="aniv-card space-y-3">
                <SectionHeader title="Este Mês" icon={<Gift size={14} />} color={GOLD} count={mes.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {mes.map((a, i) => <AnivCard key={a.id} a={a} idx={i} />)}
                </div>
              </div>
            )}

            {/* ── Próximos ─────────────────────────────────────────────────── */}
            {outros.length > 0 && (
              <div className="aniv-card space-y-3">
                <SectionHeader title="Próximos" icon={<Gift size={14} />} color="#9CA3AF" count={outros.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {outros.map((a, i) => <AnivCard key={a.id} a={a} idx={i} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
