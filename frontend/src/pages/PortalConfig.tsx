import { useEffect, useState } from 'react'
import { Globe, Save, ExternalLink, RefreshCw, Eye, Image, Type, BarChart3, MessageSquare, Mail, Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/common/PageHeader'

export const PORTAL_CONFIG_KEY = 'portal_config'

export interface PortalStat {
  label: string
  valor: number
  sufixo: string
  icone?: string
}

export interface PortalDepoimento {
  nome: string
  cargo: string
  texto: string
}

export interface PortalConfig {
  nomeMinisterio: string
  subtituloMinisterio: string
  heroTitulo: string
  heroSubtitulo: string
  heroCta: string
  frase_inspiradora: string
  emailContato: string
  telefoneContato: string
  stats: PortalStat[]
  depoimentos: PortalDepoimento[]
  tema: string
}

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  nomeMinisterio: 'Ministério dos Acólitos',
  subtituloMinisterio: 'Sistema de Gestão Litúrgica',
  heroTitulo: 'O portal do Ministério dos Acólitos',
  heroSubtitulo: 'Organizamos escalas, acompanhamos cerimoniários e planejamos celebrações com dedicação e fé — um ministério a serviço da liturgia.',
  heroCta: 'Conhecer o Ministério',
  frase_inspiradora: '"Servir é nossa missão, a liturgia é nossa vocação."',
  emailContato: 'contato@ministerio.org',
  telefoneContato: '',
  stats: [
    { label: 'Acólitos cadastrados', valor: 240, sufixo: '+' },
    { label: 'Celebrações registradas', valor: 1800, sufixo: '+' },
    { label: 'Anos de serviço', valor: 12, sufixo: '' },
    { label: 'Presença média', valor: 94, sufixo: '%' },
  ],
  depoimentos: [
    { nome: 'Pe. Carlos', cargo: 'Pároco', texto: 'O sistema transformou a organização do nosso ministério. As escalas nunca foram tão claras.' },
    { nome: 'Mariana S.', cargo: 'Coordenadora de Acólitos', texto: 'Incrível ter tudo centralizado: presença, treinamentos e comunicação em um só lugar.' },
    { nome: 'João P.', cargo: 'Cerimoniário-chefe', texto: 'O calendário litúrgico integrado facilita demais o planejamento das celebrações especiais.' },
  ],
  tema: 'wine',
}

export function loadPortalConfig(): PortalConfig {
  try {
    const stored = localStorage.getItem(PORTAL_CONFIG_KEY)
    if (stored) return { ...DEFAULT_PORTAL_CONFIG, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_PORTAL_CONFIG
}

function savePortalConfig(cfg: PortalConfig) {
  localStorage.setItem(PORTAL_CONFIG_KEY, JSON.stringify(cfg))
}

const TEMAS = [
  { value: 'wine',   label: 'Vinho / Borgonha', dot: 'bg-wine-900' },
  { value: 'blue',   label: 'Azul Litúrgico',   dot: 'bg-blue-700' },
  { value: 'green',  label: 'Verde Esperança',   dot: 'bg-emerald-700' },
  { value: 'purple', label: 'Roxo Advento',      dot: 'bg-violet-700' },
  { value: 'gold',   label: 'Dourado Pascal',    dot: 'bg-amber-500' },
]

interface SectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
        <div className="w-8 h-8 bg-wine-50 rounded-xl flex items-center justify-center text-wine-700">
          {icon}
        </div>
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function PortalConfig() {
  const [config, setConfig] = useState<PortalConfig>(loadPortalConfig)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    document.title = 'Configuração do Portal · Ministério dos Acólitos'
  }, [])

  function update<K extends keyof PortalConfig>(key: K, value: PortalConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function updateStat(index: number, field: keyof PortalStat, value: string | number) {
    setConfig(prev => {
      const stats = [...prev.stats]
      stats[index] = { ...stats[index], [field]: field === 'valor' ? Number(value) : value }
      return { ...prev, stats }
    })
    setSaved(false)
  }

  function updateDepoimento(index: number, field: keyof PortalDepoimento, value: string) {
    setConfig(prev => {
      const depoimentos = [...prev.depoimentos]
      depoimentos[index] = { ...depoimentos[index], [field]: value }
      return { ...prev, depoimentos }
    })
    setSaved(false)
  }

  function handleSave() {
    savePortalConfig(config)
    setSaved(true)
    toast.success('Configurações do portal salvas!')
  }

  function handleReset() {
    setConfig(DEFAULT_PORTAL_CONFIG)
    setSaved(false)
    toast('Configurações redefinidas para o padrão', { icon: '↩️' })
  }

  const portalUrl = `${window.location.origin}/portal`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuração do Portal"
        subtitle="Personalize o conteúdo e aparência da landing page pública do ministério"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => window.open('/portal', '_blank')}
              className="btn-secondary text-sm px-4 py-2"
            >
              <Eye size={16} />
              Visualizar Portal
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
            >
              <Save size={16} />
              {saved ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        }
      />

      {/* Link do portal */}
      <div className="card p-4 flex items-center gap-4 bg-gradient-to-r from-wine-50 to-gold-50 border border-wine-200">
        <div className="w-10 h-10 bg-wine-900 rounded-xl flex items-center justify-center flex-shrink-0">
          <Globe size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-wine-600 font-semibold uppercase tracking-wide mb-0.5">Endereço do Portal Público</p>
          <p className="text-sm font-mono text-wine-900 truncate">{portalUrl}</p>
        </div>
        <button
          onClick={() => window.open('/portal', '_blank')}
          className="flex items-center gap-2 px-4 py-2 bg-wine-900 text-white text-sm font-semibold rounded-xl hover:bg-wine-800 transition-colors flex-shrink-0"
        >
          <ExternalLink size={15} />
          Abrir
        </button>
        <button
          onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('Link copiado!') }}
          className="px-4 py-2 border border-wine-300 text-wine-800 text-sm font-semibold rounded-xl hover:bg-wine-50 transition-colors flex-shrink-0"
        >
          Copiar link
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Identidade */}
        <Section icon={<Image size={16} />} title="Identidade do Ministério">
          <div>
            <label className="label">Nome do Ministério</label>
            <input
              value={config.nomeMinisterio}
              onChange={e => update('nomeMinisterio', e.target.value)}
              className="input-field"
              placeholder="Ministério dos Acólitos"
            />
          </div>
          <div>
            <label className="label">Subtítulo / Tagline</label>
            <input
              value={config.subtituloMinisterio}
              onChange={e => update('subtituloMinisterio', e.target.value)}
              className="input-field"
              placeholder="Sistema de Gestão Litúrgica"
            />
          </div>
          <div>
            <label className="label">Frase Inspiradora</label>
            <textarea
              value={config.frase_inspiradora}
              onChange={e => update('frase_inspiradora', e.target.value)}
              rows={2}
              className="input-field resize-none"
              placeholder='"Servir é nossa missão, a liturgia é nossa vocação."'
            />
          </div>
        </Section>

        {/* Hero */}
        <Section icon={<Type size={16} />} title="Seção Principal (Hero)">
          <div>
            <label className="label">Título Principal</label>
            <textarea
              value={config.heroTitulo}
              onChange={e => update('heroTitulo', e.target.value)}
              rows={2}
              className="input-field resize-none"
              placeholder="O portal do Ministério dos Acólitos"
            />
          </div>
          <div>
            <label className="label">Subtítulo / Descrição</label>
            <textarea
              value={config.heroSubtitulo}
              onChange={e => update('heroSubtitulo', e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Descreva o ministério..."
            />
          </div>
          <div>
            <label className="label">Texto do Botão Principal</label>
            <input
              value={config.heroCta}
              onChange={e => update('heroCta', e.target.value)}
              className="input-field"
              placeholder="Conhecer o Ministério"
            />
          </div>
        </Section>

        {/* Números */}
        <Section icon={<BarChart3 size={16} />} title="Números do Ministério">
          <p className="text-xs text-gray-500">Os 4 contadores animados que aparecem na seção de destaque.</p>
          <div className="space-y-3">
            {config.stats.map((stat, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_60px] gap-2 items-end">
                <div>
                  {i === 0 && <label className="label">Rótulo</label>}
                  <input
                    value={stat.label}
                    onChange={e => updateStat(i, 'label', e.target.value)}
                    className="input-field text-sm"
                    placeholder={`Estatística ${i + 1}`}
                  />
                </div>
                <div>
                  {i === 0 && <label className="label">Valor</label>}
                  <input
                    type="number"
                    value={stat.valor}
                    onChange={e => updateStat(i, 'valor', e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  {i === 0 && <label className="label">Sufixo</label>}
                  <input
                    value={stat.sufixo}
                    onChange={e => updateStat(i, 'sufixo', e.target.value)}
                    className="input-field text-sm"
                    placeholder="+/%"
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Contato */}
        <Section icon={<Mail size={16} />} title="Contato">
          <div>
            <label className="label">E-mail de Contato</label>
            <input
              value={config.emailContato}
              onChange={e => update('emailContato', e.target.value)}
              className="input-field"
              type="email"
              placeholder="contato@ministerio.org"
            />
          </div>
          <div>
            <label className="label">Telefone / WhatsApp (opcional)</label>
            <input
              value={config.telefoneContato}
              onChange={e => update('telefoneContato', e.target.value)}
              className="input-field"
              placeholder="(11) 99999-9999"
            />
          </div>
          <p className="text-xs text-gray-400">O e-mail e telefone aparecem no rodapé e seção de contato do portal.</p>
        </Section>

        {/* Depoimentos */}
        <Section icon={<MessageSquare size={16} />} title="Depoimentos">
          <p className="text-xs text-gray-500">Até 3 depoimentos exibidos na seção de testemunhos.</p>
          <div className="space-y-4">
            {config.depoimentos.map((dep, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2.5">
                <p className="text-xs font-semibold text-wine-700 uppercase tracking-wide">Depoimento {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Nome</label>
                    <input
                      value={dep.nome}
                      onChange={e => updateDepoimento(i, 'nome', e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">Cargo / Função</label>
                    <input
                      value={dep.cargo}
                      onChange={e => updateDepoimento(i, 'cargo', e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Texto do Depoimento</label>
                  <textarea
                    value={dep.texto}
                    onChange={e => updateDepoimento(i, 'texto', e.target.value)}
                    rows={2}
                    className="input-field resize-none text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Tema de cores */}
        <Section icon={<Palette size={16} />} title="Paleta de Cores do Portal">
          <p className="text-xs text-gray-500">Escolha o tema visual principal do portal público.</p>
          <div className="space-y-2">
            {TEMAS.map(tema => (
              <button
                key={tema.value}
                onClick={() => update('tema', tema.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  config.tema === tema.value
                    ? 'border-wine-700 bg-wine-50 text-wine-900'
                    : 'border-gray-200 hover:border-wine-300 text-gray-700'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex-shrink-0 ${tema.dot}`} />
                {tema.label}
                {config.tema === tema.value && (
                  <span className="ml-auto text-xs font-semibold text-wine-700 bg-wine-100 px-2 py-0.5 rounded-full">Ativo</span>
                )}
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Actions footer */}
      <div className="flex items-center justify-between gap-4 card p-4">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw size={15} />
          Redefinir para padrão
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => window.open('/portal', '_blank')}
            className="btn-secondary text-sm"
          >
            <Eye size={15} />
            Visualizar Portal
          </button>
          <button onClick={handleSave} className="btn-primary">
            <Save size={16} />
            {saved ? 'Configurações salvas!' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}
