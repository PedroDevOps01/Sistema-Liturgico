import { useRef, useState } from 'react'
import { MessageCircle, X, ChevronLeft, ChevronRight, Loader2, Send, Sparkles, LayoutGrid } from 'lucide-react'
import api from '../lib/api'
import logoGrupo from '../assets/logogrupo.png'

// ── Limite diário de perguntas livres ────────────────────────────────────────

const DAILY_LIMIT = 20
const STORAGE_KEY = 'savio_livre'

function getDailyUsage(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { count: 0, date: '' }
}

function incrementDailyUsage(): number {
  const today = new Date().toISOString().slice(0, 10)
  const usage = getDailyUsage()
  const count = usage.date === today ? usage.count + 1 : 1
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, date: today }))
  return count
}

function getRemainingToday(): number {
  const today = new Date().toISOString().slice(0, 10)
  const usage = getDailyUsage()
  if (usage.date !== today) return DAILY_LIMIT
  return Math.max(0, DAILY_LIMIT - usage.count)
}

// ── Consultas rápidas ────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    icon: '📊', label: 'Visão Geral',
    questions: [
      { label: 'Estatísticas gerais do sistema', tipo: 'estatisticas_gerais' },
      { label: 'Quem mais serviu nas escalas?',  tipo: 'ranking_servicos' },
    ],
  },
  {
    icon: '📅', label: 'Escalas',
    questions: [
      { label: 'Próximas escalas',        tipo: 'proximas_escalas' },
      { label: 'Escalas desta semana',    tipo: 'escalas_semana' },
      { label: 'Escalas deste mês',       tipo: 'escalas_mes' },
      { label: 'Últimas escalas criadas', tipo: 'ultimas_escalas' },
    ],
  },
  {
    icon: '⛪', label: 'Celebrações',
    questions: [
      { label: 'Celebrações SEM escala',      tipo: 'celebracoes_sem_escala' },
      { label: 'Próximas celebrações',         tipo: 'proximas_celebracoes' },
      { label: 'Celebrações deste mês',        tipo: 'celebracoes_mes' },
      { label: 'Casamentos agendados',         tipo: 'casamentos' },
      { label: 'Batismos agendados',           tipo: 'batismos' },
      { label: 'Celebrações de fim de semana', tipo: 'celebracoes_fim_semana' },
    ],
  },
  {
    icon: '👥', label: 'Cerimoniários',
    questions: [
      { label: 'Todos os cerimoniários ativos',  tipo: 'cerimoniarios_ativos' },
      { label: 'Cerimoniários inativos',          tipo: 'cerimoniarios_inativos' },
      { label: 'Cerimoniários experientes',       tipo: 'cerimoniarios_experientes' },
      { label: 'Cerimoniários mestres',           tipo: 'mestres' },
      { label: 'Indisponíveis temporariamente',   tipo: 'indisponiveis_temporario' },
      { label: 'Disponíveis — Domingo manhã',     tipo: 'disponiveis_domingo_manha' },
      { label: 'Disponíveis — Domingo tarde',     tipo: 'disponiveis_domingo_tarde' },
      { label: 'Disponíveis — Domingo noite',     tipo: 'disponiveis_domingo_noite' },
      { label: 'Disponíveis — Sábado',            tipo: 'disponiveis_sabado' },
      { label: 'Disponíveis — Semana manhã',      tipo: 'disponiveis_semana_manha' },
      { label: 'Disponíveis — Semana tarde',      tipo: 'disponiveis_semana_tarde' },
      { label: 'Disponíveis — Semana noite',      tipo: 'disponiveis_semana_noite' },
    ],
  },
  {
    icon: '✅', label: 'Presenças',
    questions: [
      { label: 'Resumo geral de presenças',          tipo: 'resumo_presencas' },
      { label: 'Quem mais faltou?',                  tipo: 'mais_faltaram' },
      { label: 'Presenças pendentes de confirmação', tipo: 'presencas_pendentes' },
      { label: 'Cerimoniários em risco (3+ faltas)', tipo: 'cerimoniarios_risco' },
    ],
  },
  {
    icon: '🎓', label: 'Treinamentos',
    questions: [
      { label: 'Próximos treinamentos',              tipo: 'proximos_treinamentos' },
      { label: 'Histórico de treinamentos',          tipo: 'historico_treinamentos' },
      { label: 'Treinamentos com competências',      tipo: 'treinamentos_competencias' },
    ],
  },
  {
    icon: '📚', label: 'Formação',
    questions: [
      { label: 'Níveis e competências cadastradas',  tipo: 'formacao_niveis' },
      { label: 'Cerimoniários sem competências',     tipo: 'cerimoniarios_sem_formacao' },
      { label: 'Progresso geral da formação',        tipo: 'progresso_formacao' },
    ],
  },
  {
    icon: '👔', label: 'Túnicas',
    questions: [
      { label: 'Túnicas disponíveis',                tipo: 'tunicas_disponiveis' },
      { label: 'Túnicas emprestadas',                tipo: 'tunicas_emprestadas' },
      { label: 'Devoluções em atraso',               tipo: 'tunicas_atrasadas' },
      { label: 'Túnicas perdidas',                   tipo: 'tunicas_perdidas' },
    ],
  },
  {
    icon: '📈', label: 'Analytics',
    questions: [
      { label: 'Saúde do ministério',                tipo: 'saude_ministerio' },
      { label: 'Cerimoniários em risco de evasão',   tipo: 'cerimoniarios_risco' },
    ],
  },
  {
    icon: '⛪', label: 'Celebrações especiais',
    questions: [
      { label: 'Crismas agendadas',                  tipo: 'crismas' },
      { label: 'Ordenações agendadas',               tipo: 'ordenacoes' },
      { label: 'Celebrações com Bispo/Arcebispo',    tipo: 'celebracoes_bispo' },
    ],
  },
  {
    icon: '⚙️', label: 'Funções',
    questions: [{ label: 'Funções litúrgicas cadastradas', tipo: 'funcoes_liturgicas' }],
  },
  {
    icon: '📋', label: 'Histórico',
    questions: [{ label: 'Últimas alterações em escalas', tipo: 'historico_escalas' }],
  },
]

// ── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const els: React.ReactNode[] = []
  let key = 0
  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      els.push(<p key={key++} className="font-bold text-gray-900 mt-2 mb-0.5">{fmt(line.replace(/^#{1,3} /, ''))}</p>)
    } else if (/^[-*] /.test(line)) {
      els.push(<div key={key++} className="flex gap-2 my-0.5 ml-1"><span className="mt-2 w-1 h-1 rounded-full bg-current flex-shrink-0" /><span>{fmt(line.replace(/^[-*] /, ''))}</span></div>)
    } else if (/^_.*_$/.test(line.trim())) {
      els.push(<p key={key++} className="text-xs text-gray-400 mt-1">{line.trim().slice(1, -1)}</p>)
    } else if (line.trim() === '') {
      els.push(<div key={key++} className="h-1.5" />)
    } else {
      els.push(<p key={key++} className="leading-relaxed">{fmt(line)}</p>)
    }
  }
  return <>{els}</>
}

function fmt(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="bg-black/10 px-1 rounded text-xs font-mono">{p.slice(1, -1)}</code>
    if (p.startsWith('_') && p.endsWith('_')) return <span key={i} className="text-gray-400 text-xs">{p.slice(1, -1)}</span>
    return p
  })
}

// ── Tipos ────────────────────────────────────────────────────────────────────

type Tab    = 'rapidas' | 'livre'
type View   = 'home' | 'category' | 'answer'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

// ── Componente ───────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen]               = useState(false)
  const [tab, setTab]                 = useState<Tab>('rapidas')

  // consultas rápidas
  const [view, setView]               = useState<View>('home')
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[0] | null>(null)
  const [quickAnswer, setQuickAnswer] = useState('')
  const [quickQuestion, setQuickQuestion] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)

  // pergunta livre
  const [messages, setMessages]       = useState<ChatMessage[]>([])
  const [input, setInput]             = useState('')
  const [freeLoading, setFreeLoading] = useState(false)
  const [remaining, setRemaining]     = useState(getRemainingToday)

  const scrollRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const bottomRef   = useRef<HTMLDivElement>(null)

  function resetRapidas() { setView('home'); setActiveCategory(null); setQuickAnswer(''); setQuickQuestion('') }

  // ── Consulta rápida ──────────────────────────────────────────────────────

  async function askRapida(q: { label: string; tipo: string }) {
    setQuickQuestion(q.label)
    setQuickAnswer('')
    setView('answer')
    setQuickLoading(true)
    try {
      const res = await api.post('/consulta', { tipo: q.tipo })
      setQuickAnswer(res.data?.message ?? 'Sem resposta.')
    } catch {
      setQuickAnswer('Erro ao buscar. Verifique se o servidor está rodando.')
    } finally {
      setQuickLoading(false)
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50)
    }
  }

  // ── Pergunta livre ───────────────────────────────────────────────────────

  async function sendFree() {
    const text = input.trim()
    if (!text || freeLoading || remaining <= 0) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setFreeLoading(true)

    const used = incrementDailyUsage()
    setRemaining(DAILY_LIMIT - used)

    try {
      const res = await api.post('/chat', { messages: newMessages })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data?.message ?? 'Sem resposta.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao processar sua pergunta.' }])
    } finally {
      setFreeLoading(false)
      setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); inputRef.current?.focus() }, 50)
    }
  }

  // ── Header title ─────────────────────────────────────────────────────────

  const headerSub = tab === 'livre'
    ? `Pergunta Livre · ${remaining}/${DAILY_LIMIT} hoje`
    : view === 'home' ? 'Consultas Rápidas'
    : view === 'category' ? activeCategory?.label ?? ''
    : quickQuestion

  return (
    <>
      {/* Painel */}
      <div
        className={`fixed bottom-24 right-2 sm:right-5 z-50 w-[min(370px,calc(100vw-1rem))] flex flex-col rounded-2xl overflow-hidden transition-all duration-300 origin-bottom-right ${
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
        }`}
        style={{ height: '560px', boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 sidebar-gradient">
          {tab === 'rapidas' && view !== 'home' && (
            <button onClick={() => view === 'answer' && activeCategory ? setView('category') : resetRapidas()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-end justify-center"
               style={{ background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-600)) 100%)' }}>
            <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">Sávio</p>
            <p className="text-white/50 text-xs truncate">{headerSub}</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Abas */}
        <div className="flex flex-shrink-0 bg-white border-b border-gray-100">
          {([
            { id: 'rapidas', icon: <LayoutGrid size={13} />, label: 'Consultas Rápidas' },
            // { id: 'livre',   icon: <Sparkles size={13} />,   label: 'Pergunta Livre' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-b-2 ${
                tab === t.id
                  ? 'border-wine-500 text-wine-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
              style={tab === t.id ? { borderBottomColor: 'rgb(var(--w-600))' } : {}}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Conteúdo: Consultas Rápidas ── */}
        {tab === 'rapidas' && (
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50">
            {view === 'home' && (
              <div className="p-4">
                <div className="flex flex-col items-center text-center py-2 mb-4">
                  <div className="w-11 h-11 rounded-full overflow-hidden mb-2 flex items-end justify-center"
                       style={{ background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-600)) 100%)' }}>
                    <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
                  </div>
                  <p className="text-gray-600 text-xs">Escolha uma categoria:</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.label}
                      onClick={() => { setActiveCategory(cat); setView('category') }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.02] active:scale-[0.98] bg-white"
                      style={{ borderColor: 'rgb(var(--w-100))' }}>
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-xs font-semibold text-gray-700 leading-tight">{cat.label}</span>
                      <span className="text-[10px] text-gray-400">{cat.questions.length} perguntas</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view === 'category' && activeCategory && (
              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">
                  {activeCategory.icon} {activeCategory.label}
                </p>
                {activeCategory.questions.map(q => (
                  <button key={q.tipo} onClick={() => askRapida(q)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] bg-white"
                    style={{ borderColor: 'rgb(var(--w-100))' }}>
                    <span className="text-sm text-gray-700 font-medium">{q.label}</span>
                    <ChevronRight size={14} className="flex-shrink-0 text-gray-300" />
                  </button>
                ))}
              </div>
            )}

            {view === 'answer' && (
              <div className="p-4">
                {quickLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-11 h-11 rounded-full overflow-hidden flex items-end justify-center"
                         style={{ background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-600)) 100%)' }}>
                      <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
                    </div>
                    <div className="flex gap-1.5">
                      {[0,1,2].map(d => (
                        <span key={d} className="w-2 h-2 rounded-full animate-bounce"
                              style={{ background: 'rgb(var(--w-500))', animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">Consultando...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-sm text-gray-700 mb-4">
                      {renderMarkdown(quickAnswer)}
                    </div>
                    <button onClick={() => activeCategory ? setView('category') : resetRapidas()}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                      style={{ background: 'rgb(var(--w-100))', color: 'rgb(var(--w-800))' }}>
                      ← Fazer outra pergunta
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Conteúdo: Pergunta Livre ── */}
        {tab === 'livre' && (
          <>
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center text-center pt-6 gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-end justify-center"
                       style={{ background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-600)) 100%)' }}>
                    <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
                  </div>
                  <div>
                    <p className="text-gray-700 font-semibold text-sm">Pode perguntar livremente!</p>
                    <p className="text-gray-400 text-xs mt-1">Tenho acesso a todos os dados do sistema.</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                       style={{ background: 'rgb(var(--w-100))', color: 'rgb(var(--w-700))' }}>
                    <Sparkles size={11} />
                    {remaining} de {DAILY_LIMIT} perguntas disponíveis hoje
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 overflow-hidden flex items-end justify-center ${m.role === 'user' ? 'bg-gray-200 items-center' : ''}`}
                       style={m.role === 'assistant' ? { background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-600)) 100%)' } : {}}>
                    {m.role === 'user'
                      ? <span className="text-gray-500 text-xs font-bold">Eu</span>
                      : <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />}
                  </div>
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
                  }`} style={m.role === 'user' ? { background: 'linear-gradient(135deg, rgb(var(--w-600)), rgb(var(--w-700)))' } : {}}>
                    {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                  </div>
                </div>
              ))}

              {freeLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-end justify-center overflow-hidden"
                       style={{ background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-600)) 100%)' }}>
                    <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      {[0,1,2].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: 'rgb(var(--w-500))', animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-3 bg-white border-t border-gray-100">
              {remaining <= 0 ? (
                <p className="text-center text-xs text-gray-400 py-2">
                  Limite diário atingido ({DAILY_LIMIT}/{DAILY_LIMIT}). Volta amanhã! 🌅
                </p>
              ) : (
                <>
                  <form onSubmit={e => { e.preventDefault(); sendFree() }} className="flex gap-2">
                    <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                      placeholder="Ex: quem serviu no último domingo?"
                      disabled={freeLoading}
                      className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border-2 border-gray-100 focus:outline-none transition-colors disabled:opacity-50 bg-gray-50"
                      style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                      onFocus={e => e.target.style.borderColor = 'rgb(var(--w-400))'}
                      onBlur={e => e.target.style.borderColor = ''}
                    />
                    <button type="submit" disabled={freeLoading || !input.trim()}
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, rgb(var(--w-500)), rgb(var(--w-700)))' }}>
                      {freeLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </form>
                  <p className="text-center text-[10px] text-gray-300 mt-1.5">
                    {remaining} de {DAILY_LIMIT} perguntas restantes hoje
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Botão flutuante */}
      <button
        onClick={() => { setOpen(o => !o) }}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95 hover:scale-105"
        style={{ background: 'linear-gradient(135deg, rgb(var(--w-500)), rgb(var(--w-800)))' }}
        aria-label="Abrir assistente"
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </>
  )
}
