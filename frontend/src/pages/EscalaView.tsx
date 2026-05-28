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
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import type { Escala, EscalaItem } from '../types'
import Badge from '../components/common/Badge'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { formatDataLong, formatHorario } from '../lib/dateUtils'

// Status 1: confirmação prévia (antes da celebração)
const CONFIRMACAO_OPTIONS = [
  {
    value: 'confirmado' as const,
    label: 'Confirmado',
    icon: <CheckCircle size={13} />,
    activeClass: 'bg-green-600 text-white border-green-600',
    hoverClass: 'hover:bg-green-50 hover:text-green-700 hover:border-green-300',
  },
]

// Status 2: resultado real (após a celebração)
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
    `📖 ${celebracao.periodo_liturgico}`,
    '',
  ]

  const itensWA = escala.escala_itens ?? escala.itens ?? []
  for (const item of itensWA) {
    if (item.funcao_label && item.cerimoniario) {
      lines.push(`${item.funcao_label}:`)
      lines.push(item.cerimoniario.nome)
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

  async function handleConfirmacao(item: EscalaItem, value: 'confirmado' | null) {
    try {
      // Toggle: se já está confirmado e clicar de novo, limpa
      const novo = item.presenca?.status_confirmacao === value ? null : value
      await api.put(`/escala-itens/${item.id}/presenca`, { status_confirmacao: novo })
      toast.success(novo ? 'Confirmado!' : 'Confirmação removida')
      loadEscala()
    } catch {
      toast.error('Erro ao registrar confirmação')
    }
  }

  async function handlePresenca(item: EscalaItem, value: 'serviu' | 'faltou' | 'substituido' | 'justificado') {
    try {
      // Toggle: se já está com esse status e clicar de novo, limpa
      const novo = item.presenca?.status === value ? null : value
      await api.put(`/escala-itens/${item.id}/presenca`, { status: novo })
      toast.success(novo ? 'Presença registrada!' : 'Status removido')
      loadEscala()
    } catch {
      toast.error('Erro ao registrar presença')
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
              <Badge variant="wine" size="sm">{celebracao.periodo_liturgico}</Badge>
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
              const confirmacao = item.presenca?.status_confirmacao
              const statusPresenca = item.presenca?.status
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
                    <div className="font-bold text-gray-900">
                      {item.cerimoniario?.nome || (
                        <span className="text-gray-400 italic font-normal text-sm">Não atribuído</span>
                      )}
                    </div>
                  </div>

                  {/* Two-status controls */}
                  {item.cerimoniario && (
                    <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                      {/* Row 1: Confirmação */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 mr-1 hidden sm:block">Confirmou?</span>
                        {CONFIRMACAO_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleConfirmacao(item, opt.value)}
                            title={opt.label}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                              confirmacao === opt.value
                                ? opt.activeClass
                                : `border-gray-200 text-gray-400 ${opt.hoverClass}`
                            }`}
                          >
                            {opt.icon}
                            <span className="hidden sm:inline">{opt.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Row 2: Resultado pós-celebração */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 mr-1 hidden sm:block">Resultado:</span>
                        {PRESENCA_OPTIONS.map((opt) => (
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
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

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
