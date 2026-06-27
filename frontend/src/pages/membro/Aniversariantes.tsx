import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Gift, Cake, Star, Users, Sparkles, Calendar } from 'lucide-react'
import membroApi from '../../lib/membroApi'
import { parseDate } from '../../lib/dateUtils'

// ── Paleta ─────────────────────────────────────────────────────────────────
const GOLD = '#f59e0b'
const PURPLE = '#8B5CF6'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Aniversariante {
  id: number
  nome: string
  foto_base64?: string | null
  dias_para_aniversario: number
  idade: number
  data_nascimento?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
function safeDate(raw: string): Date {
  try { return parseDate(raw) } catch { return new Date() }
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({
  a, size = 'md', glow, pulse,
}: {
  a: Aniversariante; size?: 'sm' | 'md' | 'lg' | 'xl'; glow?: string; pulse?: boolean
}) {
  const ini = a.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const dim = size === 'xl' ? 88 : size === 'lg' ? 68 : size === 'md' ? 52 : 40
  const txt = size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-xs'

  return (
    <div className="relative flex-shrink-0" style={{ width: dim, height: dim }}>
      {pulse && (
        <div className="aniv-pulse" style={{
          position: 'absolute', inset: -7, borderRadius: '50%',
          background: `${glow ?? GOLD}28`,
        }} />
      )}
      {a.foto_base64 ? (
        <img
          src={a.foto_base64} alt=""
          className="rounded-2xl object-cover"

          style={{
            width: dim, height: dim,
            border: '1px solid #ffffff', // <-- borda preta

            boxShadow: glow ? `0 0 0 3px ${glow}, 0 4px 20px ${glow}44` : '0 2px 10px rgba(0,0,0,0.12)',
          }}
        />
      ) : (
        <div
          className={`rounded-2xl flex items-center justify-center font-black flex-shrink-0 ${txt}`}
          style={{
            width: dim, height: dim,
            background: `linear-gradient(135deg, ${GOLD} 0%, #f59e0b 100%)`,
            border: '1px solid #ffffff', // <-- borda preta

            color: '#431407',
            boxShadow: glow ? `0 0 0 3px ${glow}, 0 4px 20px ${glow}44` : '0 2px 10px rgba(0,0,0,0.10)',
          }}
        >
          {ini}
        </div>
      )}
    </div>
  )
}

// ── Partículas de confete ──────────────────────────────────────────────────
const CONFETTI_COLORS = ['#fbbf24', '#f472b6', '#34d399', '#60a5fa', '#a78bfa', '#fb7185']
const confettiItems = Array.from({ length: 18 }, (_, i) => ({
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${5 + (i * 5.2) % 91}%`,
  delay: `${(i * 0.15).toFixed(2)}s`,
  duration: `${1.8 + (i % 4) * 0.35}s`,
  size: i % 3 === 0 ? 8 : i % 3 === 1 ? 5 : 6,
  shape: i % 2 === 0 ? 'circle' : 'rect',
}))

// ── Card de Hoje — Hero ────────────────────────────────────────────────────
function HeroCard({ a }: { a: Aniversariante }) {
  const dn = a.data_nascimento
  const dateStr = dn ? format(safeDate(dn), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : null

  return (
    <div className="aniv-hero relative rounded-3xl overflow-hidden" style={{
      background: 'linear-gradient(135deg, #f59e0b 0%, #f59e0b 35%, #f59e0b 70%, #f59e0b 100%)',
      boxShadow: '0 20px 60px rgba(180,83,9,0.35), 0 4px 16px rgba(0,0,0,0.15)',
    }}>
      {confettiItems.map((c, i) => (
        <div key={i} className="aniv-confetti" style={{
          position: 'absolute', left: c.left, top: '-10px',
          width: c.size, height: c.shape === 'rect' ? c.size * 1.7 : c.size,
          borderRadius: c.shape === 'circle' ? '50%' : 3,
          background: c.color,
          animationDelay: c.delay,
          animationDuration: c.duration,
        }} />
      ))}
      <div style={{
        position: 'absolute', top: -50, right: -50, width: 220, height: 220,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -35, left: -35, width: 170, height: 170,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="relative z-10 p-7">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
            <Cake size={13} color="white" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              Aniversário Hoje
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <Avatar a={a} size="xl" glow="rgba(255,255,255,0.65)" pulse />
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-2xl leading-tight tracking-tight">
              {a.nome}
            </p>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.22)', color: 'white' }}>
                {a.idade} anos
              </span>
            </div>
            {dateStr && (
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {dateStr}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Countdown chip com barra de progresso ──────────────────────────────────
function DaysChip({ d, max }: { d: number; max: number }) {
  const pct = Math.max(8, 100 - (d / max) * 100)
  const color = d <= 7 ? PURPLE : d <= 30 ? GOLD : '#9CA3AF'
  const bg = d <= 7 ? '#EDE9FE' : d <= 30 ? '#FEF3C7' : '#F3F4F6'

  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ minWidth: 50 }}>
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-black leading-none" style={{ color }}>{d}</span>
        <span className="text-[10px] font-semibold text-gray-400 ml-0.5">d</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: bg, width: 48 }}>
        <div
          className="h-full rounded-full aniv-bar"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ── Card individual de aniversariante ─────────────────────────────────────
function AnivCard({ a, idx, maxDias }: { a: Aniversariante; idx: number; maxDias: number }) {
  const d = a.dias_para_aniversario
  const dn = a.data_nascimento
  const dateStr = dn ? format(safeDate(dn), 'dd/MM', { locale: ptBR }) : null
  const isWeek = d > 0 && d <= 7

  return (
    <div
      className="aniv-card card flex items-center gap-4 p-4 hover:-translate-y-0.5 hover:shadow-lg cursor-default"
      style={{ animationDelay: `${idx * 0.05}s` }}
    >
      <Avatar a={a} size="md" glow={isWeek ? PURPLE : undefined} pulse={isWeek} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 leading-tight truncate">{a.nome}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {dateStr && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <Calendar size={10} />
              {dateStr}
            </span>
          )}
        </div>
        <p className="text-xs mt-1">
          {d === 1 ? (
            <span className="font-bold" style={{ color: PURPLE }}>Amanhã!</span>
          ) : d <= 7 ? (
            <span className="font-semibold" style={{ color: PURPLE }}>
              {a.idade + 1} anos em {d} dias
            </span>
          ) : (
            <span className="text-gray-500">
              {a.idade + 1} anos em <strong style={{ color: GOLD }}>{d} dias</strong>
            </span>
          )}
        </p>
      </div>
      <DaysChip d={d} max={maxDias} />
    </div>
  )
}

// ── Section header estilizado ──────────────────────────────────────────────
function SectionHeader({
  title, icon, color, count,
}: {
  title: string; icon: React.ReactNode; color: string; count: number
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <h2 className="text-sm font-bold text-gray-700 flex-1">
        {title}
      </h2>
      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
        style={{ background: `${color}15`, color }}>
        {count} {count === 1 ? 'membro' : 'membros'}
      </span>
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl skeleton" style={{ height: 176 }} />
      <div className="card p-5 space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton rounded-2xl flex-shrink-0" style={{ width: 52, height: 52 }} />
            <div className="flex-1 space-y-2">
              <div className="skeleton rounded-lg h-4" style={{ width: '55%' }} />
              <div className="skeleton rounded-lg h-3" style={{ width: '38%' }} />
            </div>
            <div className="skeleton rounded-xl" style={{ width: 50, height: 36 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tela principal ─────────────────────────────────────────────────────────
export default function MembroAniversariantes() {
  const [lista, setLista] = useState<Aniversariante[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    membroApi.get<Aniversariante[]>('/aniversariantes')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }, [])

  const hoje = lista.filter(a => a.dias_para_aniversario === 0)
  const semana = lista.filter(a => a.dias_para_aniversario > 0 && a.dias_para_aniversario <= 7)
  const mes = lista.filter(a => a.dias_para_aniversario > 7 && a.dias_para_aniversario <= 30)
  const outros = lista.filter(a => a.dias_para_aniversario > 30)

  return (
    <>
      <style>{`
        @keyframes anivFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes anivConfetti {
          0%   { transform: translateY(-10px) rotate(0deg)   scale(1);    opacity: 1;   }
          80%  { opacity: 0.5; }
          100% { transform: translateY(120px) rotate(540deg) scale(0.5);  opacity: 0;   }
        }
        @keyframes anivPulse {
          0%, 100% { transform: scale(1);    opacity: 0.5; }
          50%       { transform: scale(1.4);  opacity: 0;   }
        }
        @keyframes anivBar {
          from { width: 0%; }
        }
        .aniv-card    { animation: anivFadeUp  0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .aniv-hero    { animation: anivFadeUp  0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .aniv-confetti { animation: anivConfetti 2s ease-in infinite; }
        .aniv-pulse   { animation: anivPulse   2.2s ease-in-out infinite; }
        .aniv-bar     { animation: anivBar     0.8s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="space-y-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="aniv-card flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <Gift size={22} style={{ color: GOLD }} />
              Aniversariantes
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {lista.length > 0
                ? `${lista.length} membros com aniversário registrado`
                : 'Membros do Ministério dos Acólitos'}
            </p>
          </div>

          {!loading && lista.length > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              {hoje.length > 0 && (
                <div className="flex flex-col items-center px-3 py-2 rounded-2xl text-center"
                  style={{ background: `${GOLD}18` }}>
                  <span className="text-[11px] font-bold" style={{ color: GOLD }}>
                    {hoje.length} hoje
                  </span>
                </div>
              )}
              {semana.length > 0 && (
                <div className="flex flex-col items-center px-3 py-2 rounded-2xl text-center"
                  style={{ background: `${PURPLE}12` }}>
                  <span className="text-[11px] font-bold" style={{ color: PURPLE }}>
                    {semana.length} semana
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Conteúdo ──────────────────────────────────────────────────── */}
        {loading ? (
          <LoadingSkeleton />
        ) : lista.length === 0 ? (
          <div className="card p-16 text-center aniv-card">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: `${GOLD}15` }}>
              <Users size={32} style={{ color: GOLD }} />
            </div>
            <p className="font-bold text-gray-600 text-lg">Nenhum aniversariante cadastrado</p>
            <p className="text-sm text-gray-400 mt-2">
              Membros precisam ter data de nascimento registrada para aparecer aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Hoje */}
            {hoje.length > 0 && (
              <div className="space-y-3">
                {hoje.map(a => <HeroCard key={a.id} a={a} />)}
              </div>
            )}

            {/* Esta semana */}
            {semana.length > 0 && (
              <div className="aniv-card card p-5">
                <SectionHeader
                  title="Esta Semana"
                  icon={<Star size={15} />}
                  color={PURPLE}
                  count={semana.length}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {semana.map((a, i) => (
                    <AnivCard key={a.id} a={a} idx={i} maxDias={7} />
                  ))}
                </div>
              </div>
            )}

            {/* Este mês */}
            {mes.length > 0 && (
              <div className="aniv-card card p-5">
                <SectionHeader
                  title="Este Mês"
                  icon={<Gift size={15} />}
                  color={GOLD}
                  count={mes.length}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {mes.map((a, i) => (
                    <AnivCard key={a.id} a={a} idx={i} maxDias={30} />
                  ))}
                </div>
              </div>
            )}

            {/* Próximos */}
            {outros.length > 0 && (
              <div className="aniv-card card p-5">
                <SectionHeader
                  title="Próximos"
                  icon={<Sparkles size={15} />}
                  color="#9CA3AF"
                  count={outros.length}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {outros.map((a, i) => (
                    <AnivCard key={a.id} a={a} idx={i} maxDias={365} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
