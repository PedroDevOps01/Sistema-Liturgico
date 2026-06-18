import { useEffect, useRef, useState } from 'react'
import {
  Globe, Save, ExternalLink, RefreshCw, Eye, Image, Type, BarChart3,
  MessageSquare, Mail, Palette, Images, Plus, Trash2, Link2, Upload, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/common/PageHeader'
import api from '../lib/api'
import axios from 'axios'
import { getToken } from '../lib/auth'

export const PORTAL_CONFIG_KEY = 'portal_config'

export interface CarrosselSlide {
  imageUrl: string
  titulo: string
  descricao: string
}

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
  carrosselPrincipal: CarrosselSlide[]
  carrosselServico: CarrosselSlide[]
  instagramUrl: string
  facebookUrl: string
  youtubeUrl: string
  whatsappUrl: string
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
  carrosselPrincipal: [],
  carrosselServico: [],
  instagramUrl: '',
  facebookUrl: '',
  youtubeUrl: '',
  whatsappUrl: '',
}

export function loadPortalConfig(): PortalConfig {
  try {
    const stored = localStorage.getItem(PORTAL_CONFIG_KEY)
    if (stored) return { ...DEFAULT_PORTAL_CONFIG, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_PORTAL_CONFIG
}

function cachePortalConfig(cfg: PortalConfig) {
  localStorage.setItem(PORTAL_CONFIG_KEY, JSON.stringify(cfg))
}

const TEMAS = [
  { value: 'wine',   label: 'Vinho / Borgonha', dot: 'bg-red-900' },
  { value: 'blue',   label: 'Azul Litúrgico',   dot: 'bg-blue-700' },
  { value: 'green',  label: 'Verde Esperança',   dot: 'bg-emerald-700' },
  { value: 'purple', label: 'Roxo Advento',      dot: 'bg-violet-700' },
  { value: 'gold',   label: 'Dourado Pascal',    dot: 'bg-amber-500' },
]

function compressToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = e => {
      const img = new window.Image()
      img.onerror = reject
      img.onload = () => {
        const MAX_W = 1400
        const scale = img.width > MAX_W ? MAX_W / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('compress failed')), 'image/jpeg', 0.82)
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

async function uploadImage(file: File): Promise<string> {
  const blob = await compressToBlob(file)
  const formData = new FormData()
  formData.append('image', blob, 'image.jpg')
  const res = await axios.post('/api/portal-images', formData, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  return res.data.url as string
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}

function Section({ icon, title, subtitle, children }: SectionProps) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start gap-2.5 pb-3 border-b border-gray-100">
        <div className="w-8 h-8 bg-wine-50 rounded-xl flex items-center justify-center text-wine-700 flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function SlideItem({
  slide,
  index,
  onRemove,
  onUpdate,
  placeholder,
}: {
  slide: CarrosselSlide
  index: number
  onRemove: () => void
  onUpdate: (field: keyof CarrosselSlide, value: string) => void
  placeholder: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const url = await uploadImage(file)
      onUpdate('imageUrl', url)
    } catch {
      toast.error('Erro ao fazer upload da imagem')
    } finally {
      setUploading(false)
    }
  }

  const isServerFile = (slide.imageUrl ?? '').includes('/storage/portal/')

  return (
    <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-wine-700 uppercase tracking-wide">Slide {index + 1}</span>
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
        >
          <Trash2 size={12} /> Remover
        </button>
      </div>

      <div>
        <label className="label">Imagem</label>
        <div className="flex gap-2">
          <input
            value={isServerFile ? '' : (slide.imageUrl ?? '')}
            onChange={e => onUpdate('imageUrl', e.target.value)}
            className="input-field text-sm flex-1"
            placeholder={isServerFile ? '(arquivo salvo no servidor)' : 'https://exemplo.com/imagem.jpg'}
            disabled={isServerFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-wine-700 border border-wine-200 rounded-xl hover:bg-wine-50 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            <Upload size={13} />
            {uploading ? 'Carregando...' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        {isServerFile && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <Check size={11} /> Imagem salva no servidor
            <button
              onClick={() => { api.delete('/portal-images', { data: { path: slide.imageUrl } }).catch(() => {}); onUpdate('imageUrl', '') }}
              className="ml-2 text-red-400 hover:text-red-600 underline"
            >
              remover
            </button>
          </p>
        )}
      </div>

      {slide.imageUrl && (
        <div className="rounded-xl overflow-hidden bg-gray-100 shadow-sm" style={{ aspectRatio: '16/7' }}>
          <img
            src={slide.imageUrl}
            alt=""
            className="w-full h-full object-contain"
            onError={e => { e.currentTarget.style.opacity = '0.3' }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Título</label>
          <input
            value={slide.titulo ?? ''}
            onChange={e => onUpdate('titulo', e.target.value)}
            className="input-field text-sm"
            placeholder={placeholder}
          />
        </div>
        <div>
          <label className="label">Descrição</label>
          <input
            value={slide.descricao ?? ''}
            onChange={e => onUpdate('descricao', e.target.value)}
            className="input-field text-sm"
            placeholder="Descrição breve"
          />
        </div>
      </div>
    </div>
  )
}

function SlideEditor({
  slides,
  onAdd,
  onRemove,
  onUpdate,
  placeholder,
}: {
  slides: CarrosselSlide[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: keyof CarrosselSlide, value: string) => void
  placeholder: string
}) {
  return (
    <div className="space-y-3">
      {slides.map((slide, i) => (
        <SlideItem
          key={i}
          slide={slide}
          index={i}
          onRemove={() => onRemove(i)}
          onUpdate={(field, value) => onUpdate(i, field, value)}
          placeholder={placeholder}
        />
      ))}

      {slides.length < 8 && (
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 text-sm font-semibold text-wine-700 hover:text-wine-900 border-2 border-dashed border-wine-200 hover:border-wine-400 rounded-2xl px-4 py-3 w-full transition-all hover:bg-wine-50/50"
        >
          <Plus size={15} />
          Adicionar Slide
          <span className="text-xs font-normal text-gray-400">({slides.length}/8)</span>
        </button>
      )}

      {slides.length === 0 && (
        <div className="text-center py-6 text-gray-400">
          <Images size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum slide adicionado. Clique em "Adicionar Slide" para começar.</p>
        </div>
      )}
    </div>
  )
}

export default function PortalConfig() {
  const [config, setConfig] = useState<PortalConfig>(loadPortalConfig)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Configuração do Portal · Ministério dos Acólitos'
    api.get('/configuracoes').then(res => {
      const remote = res.data?.data?.portal_config
      if (remote) {
        const merged = { ...DEFAULT_PORTAL_CONFIG, ...remote }
        setConfig(merged)
        cachePortalConfig(merged)
      }
    }).catch(() => { /* usa o cache local */ }).finally(() => setLoading(false))
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

  function addSlide(key: 'carrosselPrincipal' | 'carrosselServico') {
    setConfig(prev => ({
      ...prev,
      [key]: [...(prev[key] ?? []), { imageUrl: '', titulo: '', descricao: '' }],
    }))
    setSaved(false)
  }

  function removeSlide(key: 'carrosselPrincipal' | 'carrosselServico', index: number) {
    setConfig(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }))
    setSaved(false)
  }

  function updateSlide(key: 'carrosselPrincipal' | 'carrosselServico', index: number, field: keyof CarrosselSlide, value: string) {
    setConfig(prev => {
      const slides = [...(prev[key] ?? [])]
      slides[index] = { ...slides[index], [field]: value }
      return { ...prev, [key]: slides }
    })
    setSaved(false)
  }

  async function handleSave() {
    try {
      await api.put('/configuracoes', { portal_config: config })
      cachePortalConfig(config)
      setSaved(true)
      toast.success('Configurações do portal salvas!')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    }
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
            <button onClick={handleSave} disabled={loading} className="btn-primary">
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

        {/* ── Identidade ───────────────────────────────── */}
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

        {/* ── Hero ─────────────────────────────────────── */}
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

        {/* ── Carrossel Principal ───────────────────────── */}
        <div className="lg:col-span-2">
          <Section
            icon={<Images size={16} />}
            title="Carrossel Principal — Galeria de Artes"
            subtitle="Slides exibidos logo após os números do ministério. Ideal para artes, divulgações e comunicados. Aparece com lightbox ao clicar."
          >
            <SlideEditor
              slides={config.carrosselPrincipal ?? []}
              onAdd={() => addSlide('carrosselPrincipal')}
              onRemove={i => removeSlide('carrosselPrincipal', i)}
              onUpdate={(i, f, v) => updateSlide('carrosselPrincipal', i, f, v)}
              placeholder="Arte de Advento 2024"
            />
          </Section>
        </div>

        {/* ── Carrossel de Serviço ──────────────────────── */}
        <div className="lg:col-span-2">
          <Section
            icon={<Images size={16} />}
            title="Carrossel de Serviço — Acólitos em Ação"
            subtitle='Fotos do serviço dos acólitos em celebrações. Aparece após a seção "Nossa Missão", para mostrar a equipe atuando.'
          >
            <SlideEditor
              slides={config.carrosselServico ?? []}
              onAdd={() => addSlide('carrosselServico')}
              onRemove={i => removeSlide('carrosselServico', i)}
              onUpdate={(i, f, v) => updateSlide('carrosselServico', i, f, v)}
              placeholder="Missa de Natal — Catedral"
            />
          </Section>
        </div>

        {/* ── Números ──────────────────────────────────── */}
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

        {/* ── Contato ───────────────────────────────────── */}
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

        {/* ── Redes Sociais ─────────────────────────────── */}
        <Section icon={<Link2 size={16} />} title="Redes Sociais" subtitle="Links exibidos no rodapé e seção de contato do portal. Deixe em branco para ocultar.">
          {[
            { key: 'instagramUrl' as const, label: 'Instagram', placeholder: 'https://instagram.com/seu_perfil', color: 'text-pink-500' },
            { key: 'facebookUrl'  as const, label: 'Facebook',  placeholder: 'https://facebook.com/sua_pagina',  color: 'text-blue-600' },
            { key: 'youtubeUrl'   as const, label: 'YouTube',   placeholder: 'https://youtube.com/@seu_canal',   color: 'text-red-500'  },
            { key: 'whatsappUrl'  as const, label: 'WhatsApp',  placeholder: 'https://wa.me/55119999999999 ou número direto', color: 'text-green-600' },
          ].map(({ key, label, placeholder, color }) => (
            <div key={key}>
              <label className="label flex items-center gap-1.5">
                <span className={`text-xs font-bold ${color}`}>{label}</span>
              </label>
              <input
                value={config[key] ?? ''}
                onChange={e => update(key, e.target.value)}
                className="input-field"
                placeholder={placeholder}
              />
            </div>
          ))}
        </Section>

        {/* ── Depoimentos ──────────────────────────────── */}
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

        {/* ── Tema de cores ─────────────────────────────── */}
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
