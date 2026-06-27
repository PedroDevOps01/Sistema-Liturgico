import { useEffect, useRef, useState } from 'react'
import {
  Camera, Lock, Phone, User,
  Eye, EyeOff, Calendar, Shield, Save,
} from 'lucide-react'
import toast from 'react-hot-toast'
import membroApi from '../../lib/membroApi'
import { getMembroUser, setMembroUser } from '../../lib/membroAuth'
import { parseDate } from '../../lib/dateUtils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Cerimoniario {
  id: number
  nome: string
  usuario: string
  numero?: string | null
  foto_base64?: string | null
  mestre: boolean
  ativo: boolean
  data_nascimento?: string | null
  observacao?: string | null
  experiente?: boolean
  disponivel_domingo_manha?: boolean
  disponivel_domingo_tarde?: boolean
  disponivel_domingo_noite?: boolean
  disponivel_semana_manha?: boolean
  disponivel_semana_tarde?: boolean
  disponivel_semana_noite?: boolean
  disponivel_sabado?: boolean
  indisponivel_temporario?: boolean
}

interface EscalaItem { presenca: { status: string } | null }

function safeDate(raw: string): Date {
  try { return parseDate(raw) } catch { return new Date() }
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

function DisponToggle({ label, value, onChange }: { label: string; value: boolean | undefined; onChange: (v: boolean) => void }) {
  const active = value ?? false
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 w-full text-left group"
    >
      <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
      <div className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-3"
        style={{ background: active ? '#fbbf24' : '#E5E7EB' }}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  )
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input-field pr-12"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

export default function MembroPerfil() {
  const [cer, setCer]                 = useState<Cerimoniario | null>(null)
  const [stats, setStats]             = useState({ total: 0, serviu: 0, faltou: 0, justificado: 0 })
  const [loading, setLoading]         = useState(true)

  // Dados pessoais
  const [dataNasc, setDataNasc]       = useState('')
  const [observacao, setObservacao]   = useState('')
  const [savingDados, setSavingDados] = useState(false)

  // Contato
  const [numero, setNumero]           = useState('')
  const [savingNum, setSavingNum]     = useState(false)

  // Disponibilidade
  const [dispon, setDispon]           = useState<Record<string, boolean>>({})
  const [savingDispon, setSavingDispon] = useState(false)

  // Senha
  const [senhaAtual, setSenhaAtual]   = useState('')
  const [senhaNova, setSenhaNova]     = useState('')
  const [senhaConf, setSenhaConf]     = useState('')
  const [savingSenha, setSavingSenha] = useState(false)

  // Foto
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)

  const user     = getMembroUser()
  const initials = user?.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'

  useEffect(() => {
    Promise.all([
      membroApi.get<Cerimoniario>('/me'),
      membroApi.get<EscalaItem[]>('/escalas', { params: { periodo: 'todas' } }),
    ]).then(([me, esc]) => {
      const c = me.data as Cerimoniario
      setCer(c)
      setDataNasc(c.data_nascimento ? c.data_nascimento.substring(0, 10) : '')
      setObservacao(c.observacao ?? '')
      setNumero(c.numero ?? '')
      setDispon({
        disponivel_domingo_manha: c.disponivel_domingo_manha ?? false,
        disponivel_domingo_tarde: c.disponivel_domingo_tarde ?? false,
        disponivel_domingo_noite: c.disponivel_domingo_noite ?? false,
        disponivel_semana_manha:  c.disponivel_semana_manha  ?? false,
        disponivel_semana_tarde:  c.disponivel_semana_tarde  ?? false,
        disponivel_semana_noite:  c.disponivel_semana_noite  ?? false,
        disponivel_sabado:        c.disponivel_sabado        ?? false,
      })
      const itens = Array.isArray(esc.data) ? esc.data : []
      const s = { total: itens.length, serviu: 0, faltou: 0, justificado: 0 }
      itens.forEach(i => {
        if (i.presenca?.status === 'serviu')           s.serviu++
        else if (i.presenca?.status === 'faltou')      s.faltou++
        else if (i.presenca?.status === 'justificado') s.justificado++
      })
      setStats(s)
    }).finally(() => setLoading(false))
  }, [])

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setUploadingFoto(true)
      try {
        const r = await membroApi.post<{ foto_base64: string | null }>('/foto', { foto_base64: base64 })
        const novaFoto = (r.data as { foto_base64?: string | null }).foto_base64 ?? null
        setCer(prev => prev ? { ...prev, foto_base64: novaFoto } : prev)
        setMembroUser({ ...user!, foto_base64: novaFoto })
        toast.success('Foto atualizada!')
      } catch { toast.error('Erro ao enviar foto') }
      finally { setUploadingFoto(false) }
    }
    reader.readAsDataURL(file)
  }

  async function handleRemoveFoto() {
    setUploadingFoto(true)
    try {
      await membroApi.post('/foto', { foto_base64: null })
      setCer(prev => prev ? { ...prev, foto_base64: null } : prev)
      setMembroUser({ ...user!, foto_base64: null })
      toast.success('Foto removida.')
    } catch { toast.error('Erro ao remover foto') }
    finally { setUploadingFoto(false) }
  }

  async function handleSalvarDados() {
    setSavingDados(true)
    try {
      const r = await membroApi.put<Cerimoniario>('/perfil', {
        data_nascimento: dataNasc || null,
        observacao:      observacao || null,
      })
      setCer(r.data as Cerimoniario)
      toast.success('Dados atualizados!')
    } catch { toast.error('Erro ao salvar') }
    finally { setSavingDados(false) }
  }

  async function handleSalvarNumero() {
    setSavingNum(true)
    try {
      const r = await membroApi.put<Cerimoniario>('/perfil', { numero: numero || null })
      setCer(r.data as Cerimoniario)
      toast.success('Número atualizado!')
    } catch { toast.error('Erro ao salvar número') }
    finally { setSavingNum(false) }
  }

  async function handleSalvarDispon() {
    setSavingDispon(true)
    try {
      const r = await membroApi.put<Cerimoniario>('/perfil', dispon)
      setCer(r.data as Cerimoniario)
      toast.success('Disponibilidade atualizada!')
    } catch { toast.error('Erro ao salvar disponibilidade') }
    finally { setSavingDispon(false) }
  }

  async function handleSalvarSenha() {
    if (!senhaAtual || !senhaNova || !senhaConf) { toast.error('Preencha todos os campos'); return }
    if (senhaNova !== senhaConf)  { toast.error('As senhas não coincidem'); return }
    if (senhaNova.length < 6)    { toast.error('Senha deve ter ao menos 6 caracteres'); return }
    setSavingSenha(true)
    try {
      await membroApi.put('/senha', { senha_atual: senhaAtual, senha_nova: senhaNova })
      toast.success('Senha alterada com sucesso!')
      setSenhaAtual(''); setSenhaNova(''); setSenhaConf('')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Senha atual incorreta ou erro inesperado')
    } finally { setSavingSenha(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 300 }}>
        <div className="w-9 h-9 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(251,191,36,0.25)', borderTopColor: '#fbbf24' }} />
      </div>
    )
  }

  const { total, serviu, faltou, justificado } = stats
  const comStatus = serviu + faltou + justificado
  const pct       = comStatus > 0 ? Math.round((serviu / comStatus) * 100) : null

  const DISPON_LABELS: { key: keyof typeof dispon; label: string }[] = [
    { key: 'disponivel_domingo_manha',  label: 'Domingo manhã'  },
    { key: 'disponivel_domingo_tarde',  label: 'Domingo tarde'  },
    { key: 'disponivel_domingo_noite',  label: 'Domingo noite'  },
    { key: 'disponivel_semana_manha',   label: 'Semana manhã'   },
    { key: 'disponivel_semana_tarde',   label: 'Semana tarde'   },
    { key: 'disponivel_semana_noite',   label: 'Semana noite'   },
    { key: 'disponivel_sabado',         label: 'Sábado'         },
  ]

  return (
    <>
      <style>{`
        @keyframes mpFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .perf-card { animation: mpFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* Page title */}
      <div className="perf-card mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-sm text-gray-400 mt-0.5">Informações pessoais e configurações</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-5">

          {/* Avatar hero */}
          <div className="perf-card sidebar-gradient rounded-2xl overflow-hidden shadow-lg">
            <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-4">

              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden cursor-pointer relative"
                  style={{ boxShadow: '0 0 0 3px rgb(var(--w-400)), 0 8px 24px rgba(0,0,0,0.35)' }}
                  onClick={() => fotoRef.current?.click()}>
                  {cer?.foto_base64 ? (
                    <img src={cer.foto_base64} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold"
                      style={{ background: 'linear-gradient(135deg, rgb(var(--w-400)), rgb(var(--w-700)))', color: 'white' }}>
                      {initials}
                    </div>
                  )}
                  {uploadingFoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <button onClick={() => fotoRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 btn-primary p-0 shadow-lg">
                  <Camera size={14} />
                </button>
              </div>
              <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />

              {/* Name / role */}
              <div className="text-center">
                <h2 className="text-white font-bold text-xl">{cer?.nome}</h2>
                <p className="text-sm mt-0.5 text-white/45">@{cer?.usuario}</p>
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{
                      background: cer?.mestre ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.08)',
                      color:      cer?.mestre ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                    }}>
                    {cer?.mestre ? '★ Mestre Cerimoniário' : 'Cerimoniário'}
                  </span>
                  {cer?.experiente && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: 'rgba(99,102,241,0.2)', color: '#A5B4FC' }}>
                      Experiente
                    </span>
                  )}
                  {cer?.indisponivel_temporario && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                      Indisponível
                    </span>
                  )}
                </div>
              </div>

              {/* Stats strip */}
              <div className="w-full flex pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                {[
                  { label: 'Total',    value: total,                           color: 'rgba(255,255,255,0.85)' },
                  { label: 'Serviços', value: serviu,                          color: '#10B981'                },
                  { label: 'Presença', value: pct !== null ? `${pct}%` : '—', color: 'rgb(var(--w-300))'      },
                ].map((s, i) => (
                  <div key={s.label} className="flex-1 text-center"
                    style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5 text-white/40">{s.label}</p>
                  </div>
                ))}
              </div>

              {cer?.foto_base64 && (
                <button onClick={handleRemoveFoto} disabled={uploadingFoto}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors">
                  Remover foto
                </button>
              )}
            </div>
          </div>

          {/* Disponibilidade */}
          <div className="perf-card card p-5 space-y-0">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={15} style={{ color: '#fbbf24' }} />
              <h2 className="text-sm font-bold text-gray-800 flex-1">Disponibilidade</h2>
            </div>

            {DISPON_LABELS.map(({ key, label }) => (
              <DisponToggle
                key={key}
                label={label}
                value={dispon[key]}
                onChange={v => setDispon(prev => ({ ...prev, [key]: v }))}
              />
            ))}

            {cer?.indisponivel_temporario && (
              <div className="mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <p className="text-xs font-bold text-red-600 mb-0.5">Indisponível Temporariamente</p>
                <p className="text-xs text-red-500">Fale com o coordenador para regularizar.</p>
              </div>
            )}

            <button onClick={handleSalvarDispon} disabled={savingDispon}
              className="btn-primary w-full justify-center mt-4 py-2.5 text-sm">
              <Save size={14} />
              {savingDispon ? 'Salvando...' : 'Salvar Disponibilidade'}
            </button>
          </div>
        </div>

        {/* ── Right column ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Dados Pessoais */}
          <div className="perf-card card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User size={15} style={{ color: '#fbbf24' }} />
              <h2 className="text-sm font-bold text-gray-800">Dados Pessoais</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Nome — read-only */}
              <div>
                <label className="label">Nome completo</label>
                <input type="text" value={cer?.nome ?? ''} readOnly
                  className="input-field bg-gray-50 text-gray-400 cursor-default" />
              </div>
              {/* Usuário — read-only */}
              <div>
                <label className="label">Usuário</label>
                <input type="text" value={cer?.usuario ?? ''} readOnly
                  className="input-field bg-gray-50 text-gray-400 cursor-default" />
              </div>
            </div>

            {/* Data de Nascimento */}
            <div>
              <label className="label">
                <Calendar size={12} className="inline mr-1.5" />
                Data de Nascimento
              </label>
              <input
                type="date"
                value={dataNasc}
                onChange={e => setDataNasc(e.target.value)}
                className="input-field"
              />
              {dataNasc && (
                <p className="text-xs text-gray-400 mt-1.5 capitalize">
                  {format(safeDate(dataNasc), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            {/* Observação */}
            <div>
              <label className="label">Observação</label>
              <textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                rows={3}
                placeholder="Informações adicionais..."
                className="input-field resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={handleSalvarDados} disabled={savingDados}
                className="btn-primary flex-1 justify-center py-2.5 text-sm">
                <Save size={14} />
                {savingDados ? 'Salvando...' : 'Salvar Dados'}
              </button>
            </div>
            <p className="text-xs text-gray-400">Nome e usuário só podem ser alterados pelo coordenador.</p>
          </div>

          {/* Contato */}
          <div className="perf-card card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Phone size={15} style={{ color: '#fbbf24' }} />
              <h2 className="text-sm font-bold text-gray-800">Contato</h2>
            </div>
            <div>
              <label className="label">Número WhatsApp</label>
              <input
                type="tel"
                value={numero}
                onChange={e => setNumero(maskPhone(e.target.value))}
                placeholder="(85) 99999-9999"
                className="input-field"
              />
            </div>
            <button onClick={handleSalvarNumero} disabled={savingNum}
              className="btn-primary w-full justify-center py-2.5 text-sm">
              <Save size={14} />
              {savingNum ? 'Salvando...' : 'Salvar Número'}
            </button>
          </div>

          {/* Presença summary */}
         
          {/* Alterar Senha */}
          <div className="perf-card card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lock size={15} style={{ color: '#fbbf24' }} />
              <h2 className="text-sm font-bold text-gray-800">Alterar Senha</h2>
            </div>
            <PasswordField label="Senha Atual"          value={senhaAtual} onChange={setSenhaAtual} />
            <div className="grid sm:grid-cols-2 gap-4">
              <PasswordField label="Nova Senha"          value={senhaNova}  onChange={setSenhaNova} />
              <PasswordField label="Confirmar Nova Senha" value={senhaConf}  onChange={setSenhaConf} />
            </div>
            <button onClick={handleSalvarSenha} disabled={savingSenha}
              className="btn-primary w-full justify-center py-2.5 text-sm">
              <Save size={14} />
              {savingSenha ? 'Alterando...' : 'Alterar Senha'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Senha padrão: data de nascimento no formato <span className="font-mono">DDMMAAAA</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
