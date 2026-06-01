import { useRef, useState } from 'react'
import { MessageCircle, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import api from '../lib/api'
import logoGrupo from '../assets/logogrupo.png'

// ── Perguntas pré-definidas por categoria ─────────────────────────────────────

const CATEGORIES = [
  {
    icon: '📊',
    label: 'Visão Geral',
    questions: [
      { label: 'Estatísticas gerais do sistema', prompt: 'Mostre as estatísticas gerais do sistema: total de cerimoniários ativos, inativos, escalas, celebrações sem escala e treinamentos.' },
      { label: 'Quem mais serviu nas escalas?', prompt: 'Mostre o ranking dos 10 cerimoniários que mais serviram em escalas ativas.' },
    ],
  },
  {
    icon: '📅',
    label: 'Escalas',
    questions: [
      { label: 'Próximas escalas', prompt: 'Liste as próximas 10 escalas a partir de hoje com os cerimoniários escalados e suas funções.' },
      { label: 'Escalas desta semana', prompt: `Liste as escalas desta semana (de segunda a domingo) com os cerimoniários e funções.` },
      { label: 'Escalas deste mês', prompt: `Liste as escalas do mês atual com os cerimoniários escalados.` },
      { label: 'Últimas escalas criadas', prompt: 'Mostre as 10 escalas mais recentes.' },
    ],
  },
  {
    icon: '⛪',
    label: 'Celebrações',
    questions: [
      { label: 'Celebrações SEM escala', prompt: 'Liste todas as celebrações ativas que ainda não possuem escala associada, ordenadas por data.' },
      { label: 'Próximas celebrações', prompt: 'Liste as próximas 15 celebrações a partir de hoje com data, horário e período litúrgico.' },
      { label: 'Celebrações deste mês', prompt: 'Liste todas as celebrações do mês atual informando se têm escala ou não.' },
      { label: 'Casamentos agendados', prompt: 'Liste todas as celebrações de casamento agendadas com data e horário.' },
      { label: 'Batismos agendados', prompt: 'Liste todas as celebrações de batismo agendadas com data e horário.' },
      { label: 'Celebrações de fim de semana', prompt: 'Liste as próximas celebrações de final de semana com data, horário e se têm escala.' },
    ],
  },
  {
    icon: '👥',
    label: 'Cerimoniários',
    questions: [
      { label: 'Todos os cerimoniários ativos', prompt: 'Liste todos os cerimoniários ativos com nome e número.' },
      { label: 'Cerimoniários inativos', prompt: 'Liste os cerimoniários que estão inativos.' },
      { label: 'Cerimoniários experientes', prompt: 'Liste os cerimoniários ativos marcados como experientes.' },
      { label: 'Indisponíveis temporariamente', prompt: 'Quais cerimoniários estão marcados como indisponíveis temporariamente?' },
      { label: 'Disponíveis — Domingo manhã', prompt: 'Liste todos os cerimoniários disponíveis para o período de domingo manhã.' },
      { label: 'Disponíveis — Domingo tarde', prompt: 'Liste todos os cerimoniários disponíveis para o período de domingo tarde.' },
      { label: 'Disponíveis — Domingo noite', prompt: 'Liste todos os cerimoniários disponíveis para o período de domingo noite.' },
      { label: 'Disponíveis — Sábado', prompt: 'Liste todos os cerimoniários disponíveis para sábado.' },
      { label: 'Disponíveis — Semana manhã', prompt: 'Liste todos os cerimoniários disponíveis para dias de semana pela manhã.' },
    ],
  },
  {
    icon: '✅',
    label: 'Presenças',
    questions: [
      { label: 'Resumo geral de presenças', prompt: 'Mostre um resumo de presenças por cerimoniário: total de participações, confirmados, ausentes e pendentes.' },
      { label: 'Quem mais faltou?', prompt: 'Quais cerimoniários tiveram mais ausências registradas nas escalas?' },
      { label: 'Presenças pendentes de confirmação', prompt: 'Liste as presenças com status pendente que ainda precisam de confirmação.' },
    ],
  },
  {
    icon: '🎓',
    label: 'Treinamentos',
    questions: [
      { label: 'Próximos treinamentos', prompt: 'Liste os próximos treinamentos agendados com data, horário, tema e local.' },
      { label: 'Histórico de treinamentos', prompt: 'Liste os 10 últimos treinamentos realizados com tema e data.' },
    ],
  },
  {
    icon: '⚙️',
    label: 'Funções',
    questions: [
      { label: 'Funções litúrgicas cadastradas', prompt: 'Liste todas as funções/ministérios litúrgicos cadastrados no sistema com título e descrição.' },
    ],
  },
  {
    icon: '📋',
    label: 'Histórico',
    questions: [
      { label: 'Últimas alterações em escalas', prompt: 'Mostre o histórico das últimas 15 alterações feitas em escalas: o que foi feito, quando e por quem.' },
    ],
  },
]

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0
  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      elements.push(<p key={key++} className="font-bold text-gray-900 mt-2 mb-0.5">{inlineFormat(line.replace(/^#{1,3} /, ''))}</p>)
    } else if (/^[-*] /.test(line)) {
      elements.push(
        <div key={key++} className="flex gap-2 my-0.5 ml-1">
          <span className="mt-2 w-1 h-1 rounded-full bg-current flex-shrink-0" />
          <span>{inlineFormat(line.replace(/^[-*] /, ''))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-1.5" />)
    } else {
      elements.push(<p key={key++} className="leading-relaxed">{inlineFormat(line)}</p>)
    }
  }
  return <>{elements}</>
}

function inlineFormat(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="bg-black/10 px-1 rounded text-xs font-mono">{p.slice(1, -1)}</code>
    return p
  })
}

type View = 'home' | 'category' | 'answer'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('home')
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[0] | null>(null)
  const [answer, setAnswer] = useState('')
  const [activeQuestion, setActiveQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  function reset() { setView('home'); setActiveCategory(null); setAnswer(''); setActiveQuestion('') }

  async function ask(question: { label: string; prompt: string }) {
    setActiveQuestion(question.label)
    setAnswer('')
    setView('answer')
    setLoading(true)
    try {
      const res = await api.post('/chat', {
        messages: [{ role: 'user', content: question.prompt }],
      })
      setAnswer(res.data?.message ?? res.data ?? 'Sem resposta.')
    } catch {
      setAnswer('Erro ao buscar a informação. Verifique se o servidor está rodando.')
    } finally {
      setLoading(false)
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50)
    }
  }

  return (
    <>
      {/* Painel */}
      <div
        className={`fixed bottom-24 right-5 z-50 w-[370px] flex flex-col rounded-2xl overflow-hidden transition-all duration-300 origin-bottom-right ${
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
        }`}
        style={{ height: '540px', boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 sidebar-gradient">
          {view !== 'home' && (
            <button
              onClick={() => view === 'answer' && activeCategory ? setView('category') : reset()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-end justify-center"
               style={{ background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-600)) 100%)' }}>
            <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">Sávio</p>
            <p className="text-white/50 text-xs truncate">
              {view === 'home' && 'Assistente Litúrgico'}
              {view === 'category' && activeCategory?.label}
              {view === 'answer' && activeQuestion}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50">

          {/* Home — categorias */}
          {view === 'home' && (
            <div className="p-4">
              <div className="flex flex-col items-center text-center py-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden mb-2 flex items-end justify-center"
                     style={{ background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-600)) 100%)' }}>
                  <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
                </div>
                <p className="text-gray-700 font-semibold text-sm">Olá! Sou o Sávio.</p>
                <p className="text-gray-400 text-xs mt-0.5">Escolha uma categoria para consultar:</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.label}
                    onClick={() => { setActiveCategory(cat); setView('category') }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ borderColor: 'rgb(var(--w-100))', background: 'white' }}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-semibold text-gray-700 leading-tight">{cat.label}</span>
                    <span className="text-[10px] text-gray-400">{cat.questions.length} perguntas</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categoria — lista de perguntas */}
          {view === 'category' && activeCategory && (
            <div className="p-4 space-y-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">
                {activeCategory.icon} {activeCategory.label}
              </p>
              {activeCategory.questions.map(q => (
                <button
                  key={q.label}
                  onClick={() => ask(q)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] bg-white"
                  style={{ borderColor: 'rgb(var(--w-100))' }}
                >
                  <span className="text-sm text-gray-700 font-medium">{q.label}</span>
                  <ChevronRight size={14} className="flex-shrink-0 text-gray-300" />
                </button>
              ))}
            </div>
          )}

          {/* Resposta */}
          {view === 'answer' && (
            <div className="p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-end justify-center"
                       style={{ background: 'linear-gradient(160deg, rgb(var(--w-300)) 0%, rgb(var(--w-600)) 100%)' }}>
                    <img src={logoGrupo} alt="" className="w-[95%] h-[129%] object-contain object-top" />
                  </div>
                  <div className="flex gap-1.5">
                    {[0,1,2].map(d => (
                      <span key={d} className="w-2 h-2 rounded-full animate-bounce"
                            style={{ background: 'rgb(var(--w-500))', animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Consultando o banco de dados...</p>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border p-4 text-sm text-gray-700 border-gray-100 shadow-sm mb-4">
                    {renderMarkdown(answer)}
                  </div>
                  <button
                    onClick={() => activeCategory ? setView('category') : reset()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    style={{ background: 'rgb(var(--w-100))', color: 'rgb(var(--w-800))' }}
                  >
                    ← Fazer outra pergunta
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botão flutuante */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) reset() }}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95 hover:scale-105"
        style={{ background: 'linear-gradient(135deg, rgb(var(--w-500)), rgb(var(--w-800)))' }}
        aria-label="Abrir assistente"
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </>
  )
}
