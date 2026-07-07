import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  Pencil,
  FileDown,
  Send,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  MinusCircle,
  Copy,
  MessageCircle,
  Unlock,
  Lock,
  UserCheck,
  UserX,
  ArrowLeftRight,
  Info,
  AlertTriangle,
} from 'lucide-react'
import SearchableSelect from '../components/common/SearchableSelect'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { Cerimoniario, Escala, EscalaItem } from '../types'
import Badge from '../components/common/Badge'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { formatDataLong, formatHorario } from '../lib/dateUtils'
import { getPeriodoBadgeVariant, formatPeriodoParaExibicao } from '../lib/liturgico'

// Resultado real (após a celebração) — só exibido se confirmado
const PRESENCA_OPTIONS = [
  {
    value: 'serviu' as const,
    label: 'Serviu',
    icon: <CheckCircle size={13} />,
    activeClass: 'bg-blue-600 text-white border-blue-600',
    hoverClass: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300',
  },
  {
    value: 'faltou' as const,
    label: 'Faltou',
    icon: <XCircle size={13} />,
    activeClass: 'bg-red-600 text-white border-red-600',
    hoverClass: 'hover:bg-red-50 hover:text-red-700 hover:border-red-300',
  },
  {
    value: 'substituido' as const,
    label: 'Substituído',
    icon: <RotateCcw size={13} />,
    activeClass: 'bg-amber-500 text-white border-amber-500',
    hoverClass: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300',
  },
  {
    value: 'justificado' as const,
    label: 'Justificado',
    icon: <MinusCircle size={13} />,
    activeClass: 'bg-gray-600 text-white border-gray-600',
    hoverClass: 'hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400',
  },
]

function formatData(data: string) { return formatDataLong(data) }

function buildWhatsAppText(escala: Escala): string {
  if (!escala.celebracao) return ''
  const celebracao = escala.celebracao
  const dataFormatada = formatData(celebracao.data)
  const lines = [
    '🕊️ ESCALA LITÚRGICA',
    `📅 ${dataFormatada} - ⏰ ${formatHorario(celebracao.horario)}`,
    `📖 ${formatPeriodoParaExibicao(celebracao.periodo_liturgico, celebracao.data)}`,
    '',
  ]

  const itensWA = escala.escala_itens ?? escala.itens ?? []
  for (const item of itensWA) {
    if (item.funcao_label && item.cerimoniario) {
      const prefix = item.cerimoniario.mestre ? 'M - ' : ''
      lines.push(`${prefix}${item.funcao_label}: ${item.cerimoniario.nome}`)
      lines.push('')
    }
  }

  return lines.join('\n').trim()
}

export default function EscalaView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [escala, setEscala] = useState<Escala | null>(null)
  const [loading, setLoading] = useState(true)
  const [cerimoniarios, setCerimoniarios] = useState<Cerimoniario[]>([])
  const [substituindoItemId, setSubstituindoItemId] = useState<string | null>(null)
  const [janelaLoading, setJanelaLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const loadEscala = useCallback(async () => {
    try {
      const r = await api.get<Escala>(`/escalas/${id}`)
      setEscala(r.data)
    } catch {
      toast.error('Erro ao carregar escala')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadEscala() }, [loadEscala])

  useEffect(() => {
    api.get<Cerimoniario[]>('/cerimoniarios').then((r) => setCerimoniarios(r.data)).catch(() => null)
  }, [])

  // Marca como confirmado (não faz nada se já está)
  async function handleSetConfirmado(item: EscalaItem) {
    if (item.presenca?.status_confirmacao === 'confirmado') return
    try {
      await api.put(`/escala-itens/${item.id}/presenca`, { status_confirmacao: 'confirmado' })
      toast.success('Presença confirmada!')
      loadEscala()
    } catch {
      toast.error('Erro ao confirmar presença')
    }
  }

  // Marca como "não confirmou" — limpa tudo (cria registro com nulls se ainda não existe)
  async function handleSetNaoConfirmado(item: EscalaItem) {
    // Idempotente: se já está sem confirmação, não refaz a chamada
    if (item.presenca && item.presenca.status_confirmacao !== 'confirmado') return
    try {
      await api.put(`/escala-itens/${item.id}/presenca`, {
        status_confirmacao: null,
        status: null,
        substituto_id: null,
      })
      toast.success('Marcado como não confirmado')
      loadEscala()
    } catch {
      toast.error('Erro ao registrar')
    }
  }

  // Alterna o resultado (toggle: clicar no mesmo limpa; só disponível se confirmado)
  async function handlePresenca(item: EscalaItem, value: 'serviu' | 'faltou' | 'substituido' | 'justificado') {
    const novo = item.presenca?.status === value ? null : value
    const payload: Record<string, string | null> = { status: novo }
    // Marcar como serviu implica confirmação — seta automaticamente para não ficar com "Não confirmou" ativo
    if (novo === 'serviu' && item.presenca?.status_confirmacao !== 'confirmado') {
      payload.status_confirmacao = 'confirmado'
    }
    try {
      await api.put(`/escala-itens/${item.id}/presenca`, payload)
      toast.success(novo ? 'Resultado registrado!' : 'Resultado removido')
      loadEscala()
    } catch {
      toast.error('Erro ao registrar resultado')
    }
  }

  async function handleSubstituto(item: EscalaItem, substitutoId: number | null) {
    try {
      await api.put(`/escala-itens/${item.id}/presenca`, { substituto_id: substitutoId })
      toast.success(substitutoId ? 'Substituto registrado!' : 'Substituto removido')
      loadEscala()
    } catch {
      toast.error('Erro ao registrar substituto')
    }
  }

  async function handleAbrirJanela() {
    if (!escala) return
    setJanelaLoading(true)
    try {
      await api.post(`/escalas/${escala.id}/presenca/abrir`)
      toast.success('Janela de presença aberta!')
      loadEscala()
    } catch {
      toast.error('Erro ao abrir janela')
    } finally {
      setJanelaLoading(false)
    }
  }

  async function handleFecharJanela() {
    if (!escala) return
    setJanelaLoading(true)
    try {
      await api.post(`/escalas/${escala.id}/presenca/fechar`)
      toast.success('Janela fechada. Faltas automáticas aplicadas.')
      loadEscala()
    } catch {
      toast.error('Erro ao fechar janela')
    } finally {
      setJanelaLoading(false)
    }
  }

  async function handleSubstituirNoControle(item: EscalaItem, novoCerimoniarioId: number | null) {
    try {
      await api.patch(`/escala-itens/${item.id}/substituir`, { cerimoniario_id: novoCerimoniarioId })
      toast.success('Substituição registrada!')
      setSubstituindoItemId(null)
      loadEscala()
    } catch {
      toast.error('Erro ao registrar substituição')
    }
  }

  async function handleCopyWhatsApp() {
    if (!id) return
    try {
      const r = await api.get<{ texto: string }>(`/escalas/${id}/whatsapp`)
      await navigator.clipboard.writeText(r.data.texto)
      toast.success('Escala copiada para a área de transferência!')
    } catch {
      // Fallback: build locally
      if (escala) navigator.clipboard.writeText(buildWhatsAppText(escala)).catch(() => null)
      toast.success('Copiado!')
    }
  }

  async function handleSendWhatsApp() {
    if (!id) return
    try {
      const r = await api.get<{ texto: string }>(`/escalas/${id}/whatsapp`)
      window.open(`https://wa.me/?text=${encodeURIComponent(r.data.texto)}`, '_blank')
    } catch {
      if (escala) window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppText(escala))}`, '_blank')
    }
  }

  async function handlePdf() {
    if (!id) return
    try {
      const r = await api.get(`/escalas/${id}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `escala-${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      window.print()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!escala) {
    return (
      <div className="card p-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-gray-400" />
        </div>
        <p className="text-lg font-bold text-gray-500">Escala não encontrada</p>
        <button onClick={() => navigate('/escalas')} className="btn-secondary mt-4">
          <ChevronLeft size={18} />
          Voltar às escalas
        </button>
      </div>
    )
  }

  const celebracao = escala.celebracao

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/escalas')}
            className="p-2 mt-1 text-gray-500 hover:text-wine-900 hover:bg-wine-50 rounded-xl transition-all duration-200 flex-shrink-0"
            aria-label="Voltar"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Escala #{escala.id}</h1>
            {celebracao && (
              <p className="text-sm text-gray-500 mt-0.5 capitalize">
                {formatData(celebracao.data)} — {formatHorario(celebracao.horario)}
              </p>
            )}
          </div>
        </div>
        {/* Export actions top right */}
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          <button
            onClick={() => navigate(`/escalas/${escala.id}/editar`)}
            className="btn-secondary text-sm px-4 py-2"
          >
            <Pencil size={16} />
            Editar
          </button>
          <button onClick={handleCopyWhatsApp} className="btn-secondary text-sm px-4 py-2" title="Copiar texto da escala">
            <Copy size={16} />
            <span className="hidden sm:inline">Copiar</span>
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-200 text-sm"
          >
            <Send size={16} />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            onClick={handlePdf}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm"
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Celebration Info Card */}
      {celebracao && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-9 h-9 bg-wine-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar size={16} className="text-gold-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Data</div>
                <div className="font-semibold text-sm capitalize">{formatData(celebracao.data)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Horário</div>
                <div className="font-semibold text-sm">{formatHorario(celebracao.horario)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 ml-auto">
              <Badge variant={getPeriodoBadgeVariant(celebracao.periodo_liturgico)} size="sm">{formatPeriodoParaExibicao(celebracao.periodo_liturgico, celebracao.data)}</Badge>
              {celebracao.celebracao_noite && <Badge variant="blue" size="sm">Noite</Badge>}
              {celebracao.possui_bispo && <Badge variant="purple" size="sm">Bispo</Badge>}
              {celebracao.casamento && <Badge variant="gold" size="sm">Casamento</Badge>}
              {celebracao.batismo && <Badge variant="blue" size="sm">Batismo</Badge>}
              {celebracao.crisma && <Badge variant="purple" size="sm">Crisma</Badge>}
            </div>
          </div>
        </div>
      )}

      {/* Scale Items with Presence */}
      <div ref={printRef} className="card overflow-hidden">
        <div className="flex items-center justify-between bg-wine-900 px-6 py-4">
          <h2 className="text-white font-bold">Cerimoniários</h2>
          <span className="text-white/60 text-sm">
            {(escala.escala_itens ?? escala.itens ?? []).length} {(escala.escala_itens ?? escala.itens ?? []).length === 1 ? 'função' : 'funções'}
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {(escala.escala_itens ?? escala.itens ?? []).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">Nenhum cerimoniário na escala</p>
              <button
                onClick={() => navigate(`/escalas/${escala.id}/editar`)}
                className="mt-3 btn-primary text-sm px-4 py-2"
              >
                <Pencil size={14} />
                Montar escala
              </button>
            </div>
          ) : (
            (escala.escala_itens ?? escala.itens ?? []).map((item, index) => {
              const linkStatus    = item.status_confirmacao            // resposta via link
              const confirmacao   = item.presenca?.status_confirmacao  // toggle manual
              const statusPresenca = item.presenca?.status
              // link confirmado OU toggle manual confirmado
              const isConfirmed = confirmacao === 'confirmado' || linkStatus === 'confirmado'
              // padrão é "não confirmou" — ativo sempre que não confirmado (inclusive itens novos sem presença)
              const isNotConfirmedActive = linkStatus === 'recusado' || !isConfirmed
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  {/* Number */}
                  <div className="w-8 h-8 rounded-full bg-wine-900 text-gold-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>

                  {/* Name + function */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                      {item.funcao_label || item.funcao?.titulo}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold ${statusPresenca === 'substituido' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.cerimoniario?.nome || (
                          <span className="text-gray-400 italic font-normal text-sm">Não atribuído</span>
                        )}
                      </span>
                      {statusPresenca === 'substituido' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <RotateCcw size={9} />
                          Substituído
                        </span>
                      )}
                      {item.cerimoniario && item.token_confirmacao && (
                        <>
                          {item.status_confirmacao === 'confirmado' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                              ✓ Confirmado
                            </span>
                          )}
                          {item.status_confirmacao === 'recusado' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                              ✗ Recusou
                            </span>
                          )}
                          {!item.status_confirmacao && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                              Pendente
                            </span>
                          )}
                          {/* Botão de envio: oculto se já confirmado, "Reenviar" se recusou */}
                          {item.cerimoniario.numero && linkStatus !== 'confirmado' && (
                            <button
                              onClick={() => {
                                const num = item.cerimoniario!.numero!.replace(/\D/g, '')
                                const full = num.startsWith('55') ? num : `55${num}`
                                const link = `${window.location.origin}/confirmar/${item.token_confirmacao}`
                                const dataCel = escala.celebracao ? formatData(escala.celebracao.data) : ''
                                const horarioCel = escala.celebracao ? formatHorario(escala.celebracao.horario) : ''
                                const infoData = dataCel && horarioCel ? `\n📅 *${dataCel}* às *${horarioCel}*` : ''
                                const msg = linkStatus === 'recusado'
                                  ? `Olá ${item.cerimoniario!.nome}! Estamos reenviando o link de confirmação para *${item.funcao_label || 'sua função'}*.${infoData}\n\nConfirme sua presença: ${link}`
                                  : `Olá ${item.cerimoniario!.nome}! Você foi escalado(a) para *${item.funcao_label || 'sua função'}*.${infoData}\n\nConfirme sua presença: ${link}`
                                window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank')
                              }}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white transition-colors ${
                                linkStatus === 'recusado'
                                  ? 'bg-amber-500 hover:bg-amber-600'
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                              title={linkStatus === 'recusado' ? 'Reenviar link de confirmação' : 'Enviar link de confirmação por WhatsApp'}
                            >
                              <MessageCircle size={10} />
                              {linkStatus === 'recusado' ? 'Reenviar' : 'Confirmar'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {/* Pedido de substituição */}
                    {item.pedido_substituto && !item.pedido_substituto.resolvido && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle size={11} className="text-orange-500 flex-shrink-0" />
                        <span className="text-xs text-orange-700 font-semibold">
                          Pediu substituto
                          {item.pedido_substituto.motivo && (
                            <span className="font-normal text-orange-500"> — {item.pedido_substituto.motivo}</span>
                          )}
                        </span>
                      </div>
                    )}
                    {/* Substituto display */}
                    {statusPresenca === 'substituido' && item.presenca?.substituto && (
                      <div className="flex items-center gap-1 mt-1">
                        <RotateCcw size={11} className="text-amber-500 flex-shrink-0" />
                        <span className="text-xs text-amber-700 font-medium">
                          {item.presenca.substituto.nome}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Controles de confirmação e resultado */}
                  {item.cerimoniario && (
                    <div className="flex-shrink-0 flex flex-col gap-2 items-end">

                      {/* Passo 1 — sempre visível: Confirmou? */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 mr-1 hidden sm:block">Confirmação:</span>

                        {/* Confirmou */}
                        <button
                          onClick={() => handleSetConfirmado(item)}
                          title="Confirmou presença"
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                            isConfirmed
                              ? 'bg-green-600 text-white border-green-600'
                              : 'border-gray-200 text-gray-400 hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                          }`}
                        >
                          <CheckCircle size={13} />
                          <span className="hidden sm:inline">Confirmou</span>
                        </button>

                        {/* Não Confirmou */}
                        <button
                          onClick={() => handleSetNaoConfirmado(item)}
                          title="Não confirmou presença"
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                            isNotConfirmedActive
                              ? 'bg-red-500 text-white border-red-500'
                              : 'border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                          }`}
                        >
                          <XCircle size={13} />
                          <span className="hidden sm:inline">Não confirmou</span>
                        </button>
                      </div>

                      {/* Passo 2a — confirmou: resultado (serviu / faltou / substituído) */}
                      {isConfirmed && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 mr-1 hidden sm:block">Resultado:</span>
                          {PRESENCA_OPTIONS.filter(o => o.value !== 'justificado').map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => handlePresenca(item, opt.value)}
                              title={opt.label}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                                statusPresenca === opt.value
                                  ? opt.activeClass
                                  : `border-gray-200 text-gray-400 ${opt.hoverClass}`
                              }`}
                            >
                              {opt.icon}
                              <span className="hidden sm:inline">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Passo 2a-bis — confirmou e faltou: permite justificar (ou já justificou) */}
                      {isConfirmed && (statusPresenca === 'faltou' || statusPresenca === 'justificado') && (() => {
                        const opt = PRESENCA_OPTIONS.find(o => o.value === 'justificado')!
                        const ativo = statusPresenca === 'justificado'
                        return (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 mr-1 hidden sm:block">Motivo:</span>
                            <button
                              onClick={() => handlePresenca(item, 'justificado')}
                              title={opt.label}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                                ativo ? opt.activeClass : `border-gray-200 text-gray-400 ${opt.hoverClass}`
                              }`}
                            >
                              {opt.icon}
                              <span className="hidden sm:inline">{opt.label}</span>
                            </button>
                          </div>
                        )
                      })()}

                      {/* Passo 2b — não confirmou (link ou manual): justificou ou foi substituído? */}
                      {isNotConfirmedActive && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 mr-1 hidden sm:block">Motivo:</span>
                          {PRESENCA_OPTIONS.filter((o) => o.value === 'justificado' || o.value === 'substituido').map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => handlePresenca(item, opt.value)}
                              title={opt.label}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                                statusPresenca === opt.value
                                  ? opt.activeClass
                                  : `border-gray-200 text-gray-400 ${opt.hoverClass}`
                              }`}
                            >
                              {opt.icon}
                              <span className="hidden sm:inline">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Passo 3 — substituído (confirmado ou não): quem serviu? */}
                      {statusPresenca === 'substituido' && (
                        <div className="flex items-center gap-1.5">
                          <RotateCcw size={11} className="text-amber-500 flex-shrink-0" />
                          <SearchableSelect
                            className="max-w-[180px]"
                            options={cerimoniarios
                              .filter((c) => c.id !== item.cerimoniario_id)
                              .map((c) => ({ value: c.id, label: c.nome }))}
                            value={item.presenca?.substituto_id ?? null}
                            onChange={(val) => handleSubstituto(item, val ? Number(val) : null)}
                            placeholder="— Quem serviu? —"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── CONTROLE DE PRESENÇA ───────────────────────────────────────── */}
      {celebracao && (() => {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
        const dataCel = new Date(celebracao.data.substring(0, 10) + 'T00:00:00')
        const isPastOrToday = dataCel <= hoje
        if (!isPastOrToday) return null

        const itens = (escala.escala_itens ?? escala.itens ?? []).filter(i => i.cerimoniario_id)
        const abertaEm = escala.presenca_aberta_em
          ? new Date(escala.presenca_aberta_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : null
        const fechadaEm = escala.presenca_fechada_em
          ? new Date(escala.presenca_fechada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : null

        const statusBadge = (item: EscalaItem) => {
          const s = item.presenca?.status
          if (s === 'serviu')     return { label: 'Serviu',      cls: 'bg-blue-100 text-blue-700' }
          if (s === 'justificado') return { label: 'Justificou', cls: 'bg-gray-100 text-gray-600' }
          if (s === 'substituido') return { label: 'Substituído', cls: 'bg-amber-100 text-amber-700' }
          if (s === 'faltou')     return { label: 'Faltou',      cls: 'bg-red-100 text-red-700' }
          return escala.presenca_aberta
            ? { label: 'Aguardando', cls: 'bg-yellow-100 text-yellow-700' }
            : { label: 'Não confirmou', cls: 'bg-red-50 text-red-500' }
        }

        return (
          <div className="card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                {escala.presenca_aberta
                  ? <Unlock size={16} className="text-green-600" />
                  : escala.presenca_fechada_em
                    ? <Lock size={16} className="text-gray-500" />
                    : <Lock size={16} className="text-gray-300" />
                }
                <h2 className="font-bold text-gray-900 text-sm">Controle de Presença</h2>
                {escala.presenca_aberta && (
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    Aberta desde {abertaEm}
                  </span>
                )}
                {!escala.presenca_aberta && escala.presenca_fechada_em && (
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Fechada às {fechadaEm}
                  </span>
                )}
                {!escala.presenca_aberta && !escala.presenca_fechada_em && (
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    Não iniciada
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {!escala.presenca_aberta && !escala.presenca_fechada_em && (
                  <button
                    onClick={handleAbrirJanela}
                    disabled={janelaLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Unlock size={13} />
                    Abrir Janela
                  </button>
                )}
                {escala.presenca_aberta && (
                  <button
                    onClick={handleFecharJanela}
                    disabled={janelaLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Lock size={13} />
                    Fechar Janela
                  </button>
                )}
              </div>
            </div>

            {/* Info bar */}
            {escala.presenca_aberta && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 border-b border-green-100">
                <Info size={13} className="text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-700">
                  Janela aberta — os cerimoniários podem registrar a presença. Ao fechar, quem não respondeu recebe falta automática.
                </p>
              </div>
            )}

            {/* Member list */}
            {itens.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                Nenhum cerimoniário atribuído nesta escala.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {itens.map(item => {
                  const badge = statusBadge(item)
                  const isSubstituindo = substituindoItemId === item.id
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                      {/* Status icon */}
                      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gray-100">
                        {item.presenca?.status === 'serviu'
                          ? <UserCheck size={14} className="text-blue-600" />
                          : item.presenca?.status === 'faltou'
                            ? <UserX size={14} className="text-red-500" />
                            : item.presenca?.status === 'justificado'
                              ? <MinusCircle size={14} className="text-gray-500" />
                              : item.presenca?.status === 'substituido'
                                ? <RotateCcw size={14} className="text-amber-500" />
                                : <Clock size={14} className="text-gray-400" />
                        }
                      </div>

                      {/* Name + function */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                          {item.cerimoniario?.nome}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{item.funcao_label || item.funcao?.titulo}</p>
                      </div>

                      {/* Badge */}
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {item.presenca?.status === 'justificado' &&
                          (item.presenca.status_confirmacao === 'confirmado' || item.status_confirmacao === 'confirmado') && (
                          <span className="text-[10px] text-green-600 font-medium">
                            ✓ Havia confirmado
                          </span>
                        )}
                        {item.presenca?.status === 'substituido' && item.presenca.substituto && (
                          <span className="text-[10px] text-amber-600 font-medium">
                            ↳ {item.presenca.substituto.nome}
                          </span>
                        )}
                      </div>

                      {/* Substituição */}
                      {(escala.presenca_aberta || !escala.presenca_fechada_em) && (
                        isSubstituindo ? (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <SearchableSelect
                              className="max-w-[180px]"
                              options={cerimoniarios
                                .filter(c => c.ativo && c.id !== item.cerimoniario_id)
                                .map(c => ({ value: c.id, label: c.nome }))}
                              value={null}
                              onChange={(val) => {
                                if (val) handleSubstituirNoControle(item, Number(val))
                              }}
                              placeholder="— Escolher substituto —"
                            />
                            <button
                              onClick={() => setSubstituindoItemId(null)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <XCircle size={15} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSubstituindoItemId(item.id)}
                            title="Substituir cerimoniário"
                            className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-wine-700 transition-colors px-1.5 py-1 rounded-lg hover:bg-wine-50"
                          >
                            <ArrowLeftRight size={13} />
                          </button>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* Observação */}
      {escala.observacao && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-2">Observação</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{escala.observacao}</p>
        </div>
      )}

      {/* Bottom Export Actions */}
      <div className="flex flex-wrap gap-3 pb-6">
        <button onClick={handleCopyWhatsApp} className="btn-secondary" title="Copiar texto formatado para WhatsApp">
          <Copy size={18} />
          Copiar para WhatsApp
        </button>
        <button
          onClick={handleSendWhatsApp}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-200 text-base"
        >
          <Send size={18} />
          Enviar no WhatsApp
        </button>
        <button
          onClick={handlePdf}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 text-base"
        >
          <FileDown size={18} />
          Baixar PDF
        </button>
      </div>
    </div>
  )
}
