import { useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  Users,
  CalendarDays,
  ShieldCheck,
  ListChecks,
  Bell,
  ChevronRight,
  ChevronLeft,
  Star,
  Clock,
  CheckCircle2,
  BarChart3,
  Layers,
  Menu,
  X,
  Mail,
  Phone,
  Heart,
  Cross,
  BookOpen,
  Award,
  Loader2,
  Send,
  Images,
  MessageSquare,
  Link2,
} from 'lucide-react'
import logoGrupo from '../assets/logogrupo.png'
import { loadPortalConfig, DEFAULT_PORTAL_CONFIG, type PortalConfig, type CarrosselSlide } from './PortalConfig'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/* ── Portal Stats types ────────────────────────────────── */
interface ProxCelebracao {
  data: string
  horario: string
  periodo_liturgico: string
  celebracao_noite: boolean
  tipo: string
}

interface PortalStats {
  total_acolitos: number
  total_celebracoes: number
  celebracoes_semana: number
  presenca_media: number
  anos_servico: number
  proximas_celebracoes: ProxCelebracao[]
}

async function fetchPortalStats(): Promise<PortalStats | null> {
  try {
    const res = await fetch('/api/portal-stats')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/* ── Intersection Observer hook ───────────────────────── */
function useVisible(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

/* ── Animated counter ─────────────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const { ref, visible } = useVisible(0.3)
  useEffect(() => {
    if (!visible) return
    let start = 0
    const step = Math.ceil(to / 60)
    const timer = setInterval(() => {
      start = Math.min(start + step, to)
      setVal(start)
      if (start >= to) clearInterval(timer)
    }, 22)
    return () => clearInterval(timer)
  }, [visible, to])
  return <span ref={ref}>{val}{suffix}</span>
}

/* ── Tema → cores ─────────────────────────────────────── */
const TEMA_COLORS: Record<string, { from: string; to: string; mid: string; text: string; light: string; accent: string }> = {
  wine:   { from: '#7c2d12', to: '#c2410c', mid: '#9a3412', text: '#7c2d12', light: '#fff7ed', accent: '#fbbf24' },
  blue:   { from: '#1e3a8a', to: '#2563eb', mid: '#1d4ed8', text: '#1e3a8a', light: '#eff6ff', accent: '#60a5fa' },
  green:  { from: '#14532d', to: '#16a34a', mid: '#15803d', text: '#14532d', light: '#f0fdf4', accent: '#4ade80' },
  purple: { from: '#4c1d95', to: '#7c3aed', mid: '#6d28d9', text: '#4c1d95', light: '#f5f3ff', accent: '#c084fc' },
  gold:   { from: '#78350f', to: '#d97706', mid: '#92400e', text: '#78350f', light: '#fefce8', accent: '#fcd34d' },
}

const features = [
  { icon: Users,      color: 'bg-wine-900 text-white',       badge: 'Equipe',    title: 'Gestão de Acólitos',              description: 'Cadastre, organize e acompanhe cada acólito com perfil completo, função e histórico de serviço.' },
  { icon: CalendarDays, color: 'bg-amber-500 text-wine-900', badge: 'Liturgia',  title: 'Calendário Litúrgico Inteligente', description: 'Visualize celebrações e datas especiais em um calendário que muda de cor com o tempo da Igreja.' },
  { icon: ListChecks, color: 'bg-wine-700 text-white',       badge: 'Escalas',   title: 'Escalonamento de Celebrações',     description: 'Monte escalas com praticidade, controle presenças e gere relatórios com um clique.' },
  { icon: ShieldCheck,color: 'bg-emerald-600 text-white',    badge: 'Segurança', title: 'Controle de Acesso Seguro',        description: 'Perfis de permissão, histórico de auditoria e dados protegidos para toda a equipe.' },
  { icon: BarChart3,  color: 'bg-violet-600 text-white',     badge: 'Análise',   title: 'Relatórios e Métricas',            description: 'Acompanhe frequência, participação e evolução de cada membro do ministério.' },
  { icon: Bell,       color: 'bg-amber-500 text-wine-950',   badge: 'Avisos',    title: 'Comunicação Instantânea',          description: 'Notificações claras para toda a equipe sobre alterações, confirmações e novidades.' },
]

const steps = [
  { num: '01', icon: Users,       title: 'Cadastro da Equipe',   desc: 'Acólitos são cadastrados com disponibilidade, função e perfil completo no sistema.' },
  { num: '02', icon: CalendarDays,title: 'Celebrações',          desc: 'As celebrações são registradas com data, horário, período litúrgico e características.' },
  { num: '03', icon: ListChecks,  title: 'Montagem das Escalas', desc: 'A escala é montada com arrastar e soltar, respeitando disponibilidade de cada acólito.' },
  { num: '04', icon: CheckCircle2,title: 'Acompanhamento',       desc: 'Presenças, treinamentos e histórico são acompanhados em tempo real pelo coordenador.' },
]

/* ── Carousel ─────────────────────────────────────────── */
type TemaColors = { from: string; to: string; mid: string; text: string; light: string; accent: string }

function PortalCarousel({
  slides,
  variant,
  tema,
}: {
  slides: CarrosselSlide[]
  variant: 'principal' | 'servico'
  tema: TemaColors
}) {
  const validSlides = slides.filter(s => s.imageUrl)
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  const [lightbox, setLightbox] = useState(false)
  const n = validSlides.length
  const prev = () => setIdx(i => (i - 1 + n) % n)
  const next = () => setIdx(i => (i + 1) % n)
  const slide = validSlides[idx]

  useEffect(() => {
    setIdx(0)
  }, [n])

  useEffect(() => {
    if (paused || n <= 1) return
    const id = setInterval(() => setIdx(i => (i + 1) % n), 5000)
    return () => clearInterval(id)
  }, [paused, n])

  if (!slide) return null

  if (variant === 'principal') {
    return (
      <>
        <div
          className="relative group rounded-3xl overflow-hidden shadow-2xl select-none cursor-zoom-in"
          style={{ aspectRatio: '16/7' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onClick={() => setLightbox(true)}
        >
          {/* Slides stack */}
          {validSlides.map((s, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 10 : 0 }}
            >
              <img src={s.imageUrl} alt={s.titulo} className="w-full h-full object-cover" />
            </div>
          ))}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-20" />

          {/* Text overlay */}
          <div className="absolute bottom-0 inset-x-0 p-8 z-30">
            {slide.titulo && (
              <h3 className="text-2xl font-bold text-white drop-shadow-sm mb-1">{slide.titulo}</h3>
            )}
            {slide.descricao && (
              <p className="text-white/75 text-sm max-w-2xl">{slide.descricao}</p>
            )}
          </div>

          {/* Arrows */}
          {n > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* Slide counter */}
          {n > 1 && (
            <div className="absolute top-5 left-5 z-30 bg-black/40 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-semibold">
              {idx + 1} / {n}
            </div>
          )}
        </div>

        {/* Dots */}
        {n > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {validSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 28 : 8,
                  background: i === idx ? tema.mid : '#d1d5db',
                }}
              />
            ))}
          </div>
        )}

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.92)' }}
            onClick={() => setLightbox(false)}
          >
            <div className="relative max-w-6xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <img
                src={slide.imageUrl}
                alt={slide.titulo}
                className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
              />
              {(slide.titulo || slide.descricao) && (
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent rounded-b-2xl">
                  {slide.titulo && <p className="text-white font-bold text-lg">{slide.titulo}</p>}
                  {slide.descricao && <p className="text-white/70 text-sm mt-0.5">{slide.descricao}</p>}
                </div>
              )}
              <button
                onClick={() => setLightbox(false)}
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
              >
                <X size={18} />
              </button>
              {n > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors">
                    <ChevronLeft size={22} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors">
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  /* variant === 'servico' ───────────────────────────────── */
  return (
    <div
      className="relative group select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-3xl shadow-xl border border-gray-100 bg-white">
        {/* Image stack */}
        <div className="relative overflow-hidden cursor-zoom-in" style={{ aspectRatio: '4/3' }} onClick={() => setLightbox(true)}>
          {validSlides.map((s, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 10 : 0 }}
            >
              <img src={s.imageUrl} alt={s.titulo} className="w-full h-full object-cover" />
            </div>
          ))}
          {/* Subtle tint overlay */}
          <div className="absolute inset-0 z-20 pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${tema.from}18, transparent 60%)` }} />

          {/* Arrows */}
          {n > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Text card */}
        <div className="p-8">
          {slide.titulo && (
            <h3 className="text-xl font-bold text-gray-900 mb-2">{slide.titulo}</h3>
          )}
          {slide.descricao && (
            <p className="text-gray-500 text-sm leading-relaxed">{slide.descricao}</p>
          )}
        </div>
      </div>

      {/* Dots */}
      {n > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {validSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === idx ? 28 : 8,
                background: i === idx ? tema.mid : '#d1d5db',
              }}
            />
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-w-4xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={slide.imageUrl} alt={slide.titulo} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
            {(slide.titulo || slide.descricao) && (
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent rounded-b-2xl">
                {slide.titulo && <p className="text-white font-bold text-lg">{slide.titulo}</p>}
                {slide.descricao && <p className="text-white/70 text-sm mt-0.5">{slide.descricao}</p>}
              </div>
            )}
            <button onClick={() => setLightbox(false)} className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
              <X size={18} />
            </button>
            {n > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"><ChevronLeft size={22} /></button>
                <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"><ChevronRight size={22} /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Component ────────────────────────────────────────── */
export default function Portal() {
  const [menuOpen, setMenuOpen]   = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const [stats, setStats]         = useState<PortalStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [form, setForm]           = useState({ nome: '', telefone: '', mensagem: '' })
  const [enviando, setEnviando]   = useState(false)
  const [enviado, setEnviado]     = useState(false)
  const [config, setConfig]       = useState<PortalConfig>(loadPortalConfig)
  const tema = TEMA_COLORS[config.tema ?? 'wine'] ?? TEMA_COLORS.wine

  const heroSection          = useVisible(0.05)
  const statsSection         = useVisible(0.2)
  const carrosselPrincipalSec = useVisible(0.1)
  const featuresSection      = useVisible(0.1)
  const missionSection       = useVisible(0.1)
  const carrosselServicoSec  = useVisible(0.1)
  const stepsSection         = useVisible(0.1)
  const liturgicalSection    = useVisible(0.1)
  const testimonialsSection  = useVisible(0.1)
  const ctaSection           = useVisible(0.1)

  const hasCarrosselPrincipal = (config.carrosselPrincipal ?? []).some(s => s.imageUrl)
  const hasCarrosselServico   = (config.carrosselServico ?? []).some(s => s.imageUrl)
  const hasSocial = config.instagramUrl || config.facebookUrl || config.youtubeUrl || config.whatsappUrl

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    fetchPortalStats().then(data => { setStats(data); setStatsLoading(false) })
    fetch('/api/portal-config')
      .then(r => r.json())
      .then(res => {
        if (res?.data) {
          const merged = { ...DEFAULT_PORTAL_CONFIG, ...res.data }
          setConfig(merged)
          localStorage.setItem('portal_config', JSON.stringify(merged))
        }
      })
      .catch(() => { /* mantém cache local */ })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.title = `${config.nomeMinisterio} · Portal`
  }, [config.nomeMinisterio])

  async function handleInteresse(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setEnviando(true)
    try {
      await fetch('/api/interessados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setEnviado(true)
    } catch {
      alert('Erro ao enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const themeGradient = `linear-gradient(135deg, ${tema.from} 0%, ${tema.mid} 50%, ${tema.to} 100%)`

  const whatsappHref = config.whatsappUrl
    ? config.whatsappUrl.startsWith('http')
      ? config.whatsappUrl
      : `https://wa.me/${config.whatsappUrl.replace(/\D/g, '')}`
    : null

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/92 backdrop-blur-md shadow-sm border-b border-gray-100'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-md" style={{ background: themeGradient }}>
              <img src={logoGrupo} alt="Logo" className="h-6 w-6 object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide" style={{ color: tema.text }}>{config.nomeMinisterio}</p>
              <p className="text-[11px] text-gray-500 leading-none">{config.subtituloMinisterio}</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 md:flex">
            {[
              ['#missao', 'Nossa Missão'],
              ['#funcionalidades', 'O Sistema'],
              ['#como-funciona', 'Como Funciona'],
              ['#depoimentos', 'Depoimentos'],
              ['#contato', 'Contato'],
            ].map(([href, label]) => (
              <a key={href} href={href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {label}
              </a>
            ))}
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition-colors md:hidden"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="absolute inset-x-0 top-full border-t border-gray-100 bg-white/97 backdrop-blur-md shadow-lg md:hidden">
            <div className="flex flex-col gap-1 px-4 py-4">
              {[
                ['#missao', 'Nossa Missão'],
                ['#funcionalidades', 'O Sistema'],
                ['#como-funciona', 'Como Funciona'],
                ['#depoimentos', 'Depoimentos'],
                ['#contato', 'Contato'],
              ].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <section
        ref={heroSection.ref}
        className="relative flex min-h-screen items-center overflow-hidden pt-20"
        style={{ background: `linear-gradient(150deg, ${tema.light} 0%, #fff 50%, ${tema.light} 100%)` }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: tema.from }} />
        <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full opacity-15 blur-3xl"
          style={{ background: tema.accent }} />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full opacity-10 blur-3xl"
          style={{ background: tema.mid }} />

        {/* Subtle cross pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%237c2d12' fill-opacity='1'%3E%3Crect x='27' y='10' width='6' height='40'/%3E%3Crect x='10' y='27' width='40' height='6'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">

            {/* Left — copy */}
            <div className={`space-y-8 transition-all duration-700 ${heroSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm backdrop-blur-sm"
                style={{ borderColor: `${tema.text}30`, background: 'rgba(255,255,255,0.8)', color: tema.text }}>
                <Sparkles size={15} style={{ color: tema.accent }} />
                {config.subtituloMinisterio}
              </div>

              <div className="space-y-5">
                <h1 className="text-[2.8rem] font-extrabold leading-[1.08] tracking-tight sm:text-6xl"
                  style={{ color: tema.text }}>
                  {config.heroTitulo.split('Ministério').length > 1 ? (
                    <>
                      {config.heroTitulo.split('Ministério')[0]}
                      <span style={{ background: `linear-gradient(135deg, ${tema.from} 0%, ${tema.to} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        Ministério
                      </span>
                      {config.heroTitulo.split('Ministério')[1]}
                    </>
                  ) : config.heroTitulo}
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-gray-600">
                  {config.heroSubtitulo}
                </p>
                {config.frase_inspiradora && (
                  <p className="text-base italic font-medium" style={{ color: tema.mid }}>
                    {config.frase_inspiradora}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="#funcionalidades"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
                  style={{ background: themeGradient, boxShadow: `0 8px 24px ${tema.from}40` }}>
                  {config.heroCta}
                  <ChevronRight size={18} />
                </a>
                <a href="#contato"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-base font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-300 bg-white/80 backdrop-blur-sm transition-all">
                  Entrar em Contato
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-5 pt-1">
                {[
                  { icon: CheckCircle2, text: 'Calendário litúrgico integrado' },
                  { icon: CheckCircle2, text: 'Escalas automáticas' },
                  { icon: CheckCircle2, text: 'Relatórios em tempo real' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-gray-600">
                    <Icon size={16} className="flex-shrink-0" style={{ color: tema.accent }} />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — visual */}
            <div className={`transition-all duration-700 delay-200 ${heroSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="relative">
                {/* Main card */}
                <div className="relative overflow-hidden rounded-3xl p-1 shadow-2xl" style={{ background: themeGradient }}>
                  <div className="rounded-[1.4rem] p-6" style={{ background: `linear-gradient(145deg, ${tema.from}ee, ${tema.from}dd)` }}>
                    {/* Fake app header */}
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${tema.accent}, ${tema.to})` }}>
                          <img src={logoGrupo} alt="Logo" className="h-5 w-5 object-contain" />
                        </div>
                        <span className="text-sm font-semibold text-white/90">Painel do Ministério</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="mb-5 grid grid-cols-3 gap-3">
                      {statsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="rounded-2xl bg-white/10 p-3 text-center animate-pulse">
                            <div className="h-6 w-8 bg-white/20 rounded mx-auto mb-1" />
                            <div className="h-2 w-12 bg-white/10 rounded mx-auto" />
                          </div>
                        ))
                      ) : [
                        { label: 'Acólitos', value: stats ? String(stats.total_acolitos) : '—', trend: 'ativos' },
                        { label: 'Esta semana', value: stats ? String(stats.celebracoes_semana) : '—', trend: 'celebrações' },
                        { label: 'Presença', value: stats ? `${stats.presenca_media}%` : '—', trend: '↑ média' },
                      ].map(item => (
                        <div key={item.label} className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur-sm">
                          <p className="text-xl font-bold text-white">{item.value}</p>
                          <p className="mt-0.5 text-[10px] text-white/60">{item.label}</p>
                          <p className="mt-1 text-[10px] font-semibold" style={{ color: tema.accent }}>{item.trend}</p>
                        </div>
                      ))}
                    </div>

                    {/* Próximas celebrações reais */}
                    <div className="space-y-2.5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Próximas celebrações</p>
                      {statsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 border border-white/10 animate-pulse">
                            <div className="h-10 w-10 bg-white/20 rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 bg-white/20 rounded w-3/4" />
                              <div className="h-2 bg-white/10 rounded w-1/3" />
                            </div>
                          </div>
                        ))
                      ) : stats && stats.proximas_celebracoes.length > 0 ? (
                        stats.proximas_celebracoes.map((cel, i) => {
                          const dt = parseISO(cel.data)
                          const dayName = format(dt, 'EEE', { locale: ptBR })
                          const dayNum = format(dt, 'dd')
                          return (
                            <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 border border-white/10">
                              <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-white/10 text-center">
                                <span className="text-[9px] font-semibold uppercase text-white/50">{dayName}</span>
                                <span className="text-sm font-bold text-white">{dayNum}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-white/90">
                                  {cel.tipo} — {cel.horario.substring(0, 5)}
                                </p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/15 text-white/60 font-medium">
                                  {cel.periodo_liturgico}
                                  {cel.celebracao_noite ? ' · Noturna' : ''}
                                </span>
                              </div>
                              <ChevronRight size={14} className="flex-shrink-0 text-white/30" />
                            </div>
                          )
                        })
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-4 text-white/40 text-sm">
                          {statsLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                          Sem celebrações próximas
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Floating badge — liturgical season */}
                <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-white px-3 py-2 shadow-lg">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: tema.accent }} />
                  <span className="text-xs font-semibold" style={{ color: tema.text }}>Tempo Comum</span>
                </div>

                {/* Floating badge — activity */}
                <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
                  <Star size={13} fill="currentColor" style={{ color: tema.accent }} />
                  <span className="text-xs font-semibold text-gray-800">12 acólitos confirmados</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-gray-400">
          <span className="text-xs tracking-widest uppercase">Explorar</span>
          <div className="h-8 w-5 rounded-full border-2 border-gray-300 flex items-start justify-center pt-1.5">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────── */}
      <section
        ref={statsSection.ref}
        className="relative overflow-hidden py-16"
        style={{ background: themeGradient }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Crect x='27' y='10' width='6' height='40'/%3E%3Crect x='10' y='27' width='40' height='6'/%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`grid gap-8 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-700 ${statsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {([
              { label: 'Acólitos cadastrados',    suffix: '+', icon: Users,        value: stats?.total_acolitos    ?? 0 },
              { label: 'Celebrações registradas', suffix: '+', icon: CalendarDays, value: stats?.total_celebracoes ?? 0 },
              { label: 'Anos de serviço',         suffix: '',  icon: Star,         value: stats?.anos_servico      ?? 0 },
              { label: 'Presença média',          suffix: '%', icon: CheckCircle2, value: stats?.presenca_media    ?? 0 },
            ] as const).map(({ label, suffix, icon: Icon, value }) => (
              <div key={label} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Icon size={22} style={{ color: tema.accent }} />
                </div>
                <p className="text-4xl font-extrabold text-white">
                  {statsLoading
                    ? <span className="inline-block h-9 w-16 rounded-xl bg-white/20 animate-pulse" />
                    : <Counter to={value} suffix={suffix} />
                  }
                </p>
                <p className="text-sm text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Carrossel Principal ─────────────────────────── */}
      {hasCarrosselPrincipal && (
        <section ref={carrosselPrincipalSec.ref} className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className={`mb-10 text-center transition-all duration-700 ${carrosselPrincipalSec.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                style={{ background: tema.light, color: tema.text, outline: `1px solid ${tema.from}25` }}>
                <Images size={14} />
                Galeria do Ministério
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: tema.text }}>
                Nossas Artes
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-gray-500">
                Clique em qualquer imagem para ampliar e navegar pela galeria.
              </p>
            </div>
            <div className={`transition-all duration-700 delay-100 ${carrosselPrincipalSec.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <PortalCarousel
                slides={config.carrosselPrincipal ?? []}
                variant="principal"
                tema={tema}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Nossa Missão ───────────────────────────────── */}
      <section
        id="missao"
        ref={missionSection.ref}
        className="py-24 bg-white"
        style={hasCarrosselPrincipal ? { borderTop: '1px solid #f3f4f6' } : {}}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`grid gap-12 lg:grid-cols-2 lg:items-center transition-all duration-700 ${missionSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                style={{ background: `${tema.light}`, color: tema.text }}>
                <Heart size={14} />
                Nossa Missão
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: tema.text }}>
                Servir com excelência<br />
                <span className="text-gray-500 font-light">na liturgia da Igreja</span>
              </h2>
              <p className="text-lg leading-relaxed text-gray-600">
                O Ministério dos Acólitos é um grupo de serviço litúrgico dedicado a auxiliar nas celebrações da Igreja, com responsabilidade, fé e formação contínua.
              </p>
              <p className="text-base leading-relaxed text-gray-500">
                Cada acólito passa por um processo de formação, acompanhamento e escalonamento criterioso para garantir a boa ordem e a beleza das celebrações litúrgicas.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { icon: Cross,      label: 'Fé',          desc: 'Enraizados na espiritualidade cristã' },
                  { icon: BookOpen,   label: 'Formação',    desc: 'Treinamento litúrgico contínuo' },
                  { icon: Award,      label: 'Excelência',  desc: 'Serviço de qualidade em cada missa' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-white" style={{ background: themeGradient }}>
                      <Icon size={20} />
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{label}</p>
                    <p className="text-xs text-gray-500 leading-tight">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual card */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${tema.light}, #fff)`, border: `1px solid ${tema.from}20` }}>
                <div className="p-8 space-y-5">
                  <div className="relative">
                    <div className="text-6xl font-serif leading-none opacity-20" style={{ color: tema.from }}>"</div>
                    <p className="text-lg italic text-gray-700 -mt-4">
                      {config.frase_inspiradora || '"Servir é nossa missão, a liturgia é nossa vocação."'}
                    </p>
                  </div>
                  <div className="space-y-3 pt-2">
                    {[
                      'Formação litúrgica de qualidade',
                      'Respeito e pontualidade nas celebrações',
                      'Espírito de equipe e fraternidade',
                      'Devoção e comprometimento com a fé',
                    ].map(item => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: themeGradient }}>
                          <CheckCircle2 size={12} className="text-white" />
                        </div>
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 -top-8 -right-8 w-48 h-48 rounded-full opacity-10"
                style={{ background: themeGradient }} />
              <div className="absolute -z-10 -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10"
                style={{ background: tema.accent }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Carrossel de Serviço ────────────────────────── */}
      {hasCarrosselServico && (
        <section
          ref={carrosselServicoSec.ref}
          className="py-20 border-t border-gray-100"
          style={{ background: `linear-gradient(180deg, ${tema.light}60 0%, #fff 100%)` }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className={`mb-10 text-center transition-all duration-700 ${carrosselServicoSec.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                style={{ background: tema.light, color: tema.text, outline: `1px solid ${tema.from}25` }}>
                <Users size={14} />
                Acólitos em Serviço
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: tema.text }}>
                Nossa Equipe Atuando
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-gray-500">
                Momentos de serviço, fé e dedicação dos nossos acólitos nas celebrações.
              </p>
            </div>
            <div className={`transition-all duration-700 delay-100 ${carrosselServicoSec.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <PortalCarousel
                slides={config.carrosselServico ?? []}
                variant="servico"
                tema={tema}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Features ───────────────────────────────────── */}
      <section id="funcionalidades" className="py-24" style={{ background: `linear-gradient(180deg, ${tema.light}80 0%, #fff 100%)` }}>
        <div ref={featuresSection.ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`mb-16 text-center transition-all duration-700 ${featuresSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{ background: tema.light, color: tema.text, outline: `1px solid ${tema.from}30` }}>
              <Layers size={14} />
              O Sistema de Gestão
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: tema.text }}>
              Tudo que o ministério precisa
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              Um sistema completo — do cadastro de acólitos ao relatório de presença — com cores litúrgicas que se adaptam ao tempo da Igreja.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <article
                  key={f.title}
                  className={`group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-gray-200 ${featuresSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-3xl"
                    style={{ background: `linear-gradient(135deg, ${tema.light}50, transparent)` }} />
                  <div className="relative">
                    <div className="mb-5 flex items-start justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.color} shadow-sm`}>
                        <Icon size={22} />
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: tema.light, color: tema.text, outline: `1px solid ${tema.from}20` }}>
                        {f.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-gray-600">{f.description}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section id="como-funciona" ref={stepsSection.ref} className="py-24 bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`mb-16 max-w-2xl transition-all duration-700 ${stepsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{ background: tema.light, color: tema.text }}>
              <Clock size={14} />
              Como Funciona
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: tema.text }}>
              Organização simples e eficiente
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Em poucos passos, o ministério fica organizado e toda a equipe conectada às celebrações.
            </p>
          </div>

          <div className="relative grid gap-8 lg:grid-cols-4">
            <div className="absolute top-8 left-[12.5%] right-[12.5%] hidden h-px lg:block"
              style={{ background: `linear-gradient(90deg, ${tema.from}40, ${tema.accent}60, ${tema.from}40)` }} />

            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={step.num}
                  className={`relative transition-all duration-700 ${stepsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg text-white"
                    style={{ background: themeGradient, boxShadow: `0 8px 20px ${tema.from}35` }}>
                    <Icon size={22} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: tema.accent }}>Passo {step.num}</p>
                  <h3 className="mb-2.5 text-xl font-bold text-gray-900">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Liturgical highlight banner ─────────────────── */}
      <section ref={liturgicalSection.ref} className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] p-10 shadow-2xl lg:p-14"
            style={{ background: themeGradient }}>
            <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-10 blur-3xl bg-white" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-10 blur-3xl bg-white" />

            <div className={`relative grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-center transition-all duration-700 ${liturgicalSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20">
                  <Sparkles size={14} />
                  Exclusivo: Paleta litúrgica dinâmica
                </p>
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Cores que mudam com o<br />
                  <span style={{ color: tema.accent }}>Tempo da Igreja</span>
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
                  O sistema detecta automaticamente o tempo litúrgico — Advento, Natal, Quaresma, Páscoa, Pentecostes — e ajusta toda a interface conforme as cores e o espírito de cada período, incluindo os dias solenes segundo a CNBB e o Vaticano.
                </p>
              </div>

              {/* Season swatches */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Advento',      color: 'bg-violet-700',  text: 'text-violet-200',  descricao: 'Roxo' },
                  { name: 'Natal',        color: 'bg-blue-600',    text: 'text-blue-200',    descricao: 'Branco' },
                  { name: 'Quaresma',     color: 'bg-purple-800',  text: 'text-purple-200',  descricao: 'Roxo' },
                  { name: 'Tempo Comum',  color: 'bg-emerald-700', text: 'text-emerald-200', descricao: 'Verde' },
                  { name: 'Tempo Pascal', color: 'bg-amber-500',   text: 'text-amber-100',   descricao: 'Branco/Dourado' },
                  { name: 'Pentecostes',  color: 'bg-red-700',     text: 'text-red-200',     descricao: 'Vermelho' },
                ].map(s => (
                  <div key={s.name} className={`${s.color} flex flex-col items-center justify-center rounded-2xl p-4 shadow-inner gap-1`}>
                    <span className={`text-xs font-bold ${s.text} text-center`}>{s.name}</span>
                    <span className={`text-[10px] ${s.text} opacity-70`}>{s.descricao}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dias Solenes info */}
            <div className={`relative mt-8 pt-8 border-t border-white/20 transition-all duration-700 delay-200 ${liturgicalSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="text-white/80 text-sm font-semibold mb-4">Cores para Dias Solenes (CNBB/Vaticano)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { cor: 'bg-white border border-white/30', nome: 'Branco', ex: 'Natal · Páscoa · Maria · Confessores' },
                  { cor: 'bg-red-600', nome: 'Vermelho', ex: 'Pentecostes · Mártires · Apóstolos · Paixão' },
                  { cor: 'bg-pink-400', nome: 'Rosa', ex: 'Gaudete (3º Advento) · Laetare (4ª Quaresma)' },
                  { cor: 'bg-amber-400', nome: 'Dourado', ex: 'Grandes Solenidades · Corpus Christi' },
                ].map(s => (
                  <div key={s.nome} className="flex items-start gap-2.5 bg-white/10 rounded-xl p-3">
                    <span className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${s.cor}`} />
                    <div>
                      <p className="text-white text-xs font-bold">{s.nome}</p>
                      <p className="text-white/60 text-[10px] leading-tight mt-0.5">{s.ex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────── */}
      <section id="depoimentos" ref={testimonialsSection.ref} className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`mb-14 text-center transition-all duration-700 ${testimonialsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{ background: tema.light, color: tema.text, outline: `1px solid ${tema.from}25` }}>
              <Star size={14} style={{ color: tema.accent }} />
              Depoimentos
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: tema.text }}>
              O que dizem sobre o ministério
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {config.depoimentos.map((t, i) => (
              <div
                key={t.nome}
                className={`relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-700 hover:shadow-xl hover:-translate-y-1 ${testimonialsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="mb-5 flex gap-1">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} size={15} fill="currentColor" style={{ color: tema.accent }} />
                  ))}
                </div>
                <p className="text-base leading-relaxed text-gray-700 italic">"{t.texto}"</p>
                <div className="mt-6 flex items-center gap-3 border-t border-gray-50 pt-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                    style={{ background: themeGradient }}>
                    {t.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.nome}</p>
                    <p className="text-xs text-gray-500">{t.cargo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact / CTA ──────────────────────────────── */}
      <section id="contato" ref={ctaSection.ref} className="py-24" style={{ background: `linear-gradient(160deg, ${tema.light} 0%, #fff 100%)` }}>
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className={`overflow-hidden rounded-[2.5rem] bg-white p-12 shadow-xl transition-all duration-700 ${ctaSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ boxShadow: `0 24px 48px ${tema.from}12`, border: `1px solid ${tema.from}20` }}>
            <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl shadow-xl text-white"
              style={{ background: themeGradient }}>
              <img src={logoGrupo} alt="Logo" className="h-12 w-16 object-contain" />
            </div>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: tema.text }}>
              Entre em contato
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-gray-600">
              Quer saber mais sobre o ministério? Tem alguma dúvida ou quer fazer parte da equipe? Entre em contato conosco.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4">
              {config.emailContato && (
                <a
                  href={`mailto:${config.emailContato}`}
                  className="inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
                  style={{ background: themeGradient, boxShadow: `0 8px 24px ${tema.from}35` }}
                >
                  <Mail size={18} />
                  {config.emailContato}
                </a>
              )}
              {config.telefoneContato && (
                <a
                  href={`tel:${config.telefoneContato}`}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-base font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-300 bg-white transition-all"
                >
                  <Phone size={18} />
                  {config.telefoneContato}
                </a>
              )}

              {/* Social links in contact */}
              {hasSocial && (
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {config.instagramUrl && (
                    <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-100 text-sm font-semibold text-gray-500 hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50 transition-all"
                    >
                      <Link2 size={13} /> Instagram
                    </a>
                  )}
                  {config.facebookUrl && (
                    <a href={config.facebookUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-100 text-sm font-semibold text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                    >
                      <Link2 size={13} /> Facebook
                    </a>
                  )}
                  {config.youtubeUrl && (
                    <a href={config.youtubeUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-100 text-sm font-semibold text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
                    >
                      <Link2 size={13} /> YouTube
                    </a>
                  )}
                  {whatsappHref && (
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-100 text-sm font-semibold text-gray-500 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition-all"
                    >
                      <MessageSquare size={13} /> WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quero Servir ───────────────────────────────── */}
      <section id="servir" className="py-24 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold mb-5"
            style={{ background: tema.light, color: tema.text }}>
            <Heart size={14} /> Fazer Parte
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-3" style={{ color: tema.text }}>
            Sinto o Chamado
          </h2>
          <p className="text-gray-500 mb-10 text-lg leading-relaxed">
            Você sente o desejo de servir no Ministério dos Acólitos?<br />
            Deixe seus dados e entraremos em contato.
          </p>

          {enviado ? (
            <div className="rounded-3xl border border-green-200 bg-green-50 p-10 text-center">
              <CheckCircle2 size={44} className="mx-auto mb-4 text-green-600" />
              <p className="text-xl font-semibold text-gray-900">Interesse registrado!</p>
              <p className="mt-2 text-gray-500">Em breve entraremos em contato. Que Deus abençoe!</p>
            </div>
          ) : (
            <form onSubmit={handleInteresse} className="space-y-4 text-left">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome *</label>
                <input
                  required
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Seu nome completo"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as string]: tema.mid }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
                <input
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(XX) XXXXX-XXXX"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mensagem (opcional)</label>
                <textarea
                  value={form.mensagem}
                  onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  rows={3}
                  placeholder="Conte um pouco sobre você..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-70"
                style={{ background: themeGradient }}
              >
                <Send size={16} />
                {enviando ? 'Enviando...' : 'Enviar interesse'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl shadow-md text-white"
                style={{ background: themeGradient }}>
                <img src={logoGrupo} alt="Logo" className="h-5 w-5 object-contain" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: tema.text }}>{config.nomeMinisterio}</p>
                <p className="text-xs text-gray-400">{config.subtituloMinisterio}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-5 text-xs text-gray-400">
              <a href="#missao" className="hover:text-gray-700 transition-colors">Nossa Missão</a>
              <a href="#funcionalidades" className="hover:text-gray-700 transition-colors">O Sistema</a>
              <a href="#como-funciona" className="hover:text-gray-700 transition-colors">Como Funciona</a>
              <a href="#depoimentos" className="hover:text-gray-700 transition-colors">Depoimentos</a>
              <a href="#contato" className="hover:text-gray-700 transition-colors">Contato</a>
              <a href="#servir" className="hover:text-gray-700 transition-colors" style={{ color: tema.text }}>Quero Servir</a>
            </div>

            {/* Social in footer */}
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
              {config.instagramUrl && (
                <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-pink-500 transition-colors font-medium">
                  Instagram
                </a>
              )}
              {config.facebookUrl && (
                <a href={config.facebookUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-blue-600 transition-colors font-medium">
                  Facebook
                </a>
              )}
              {config.youtubeUrl && (
                <a href={config.youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors font-medium">
                  YouTube
                </a>
              )}
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-green-500 transition-colors font-medium">
                  WhatsApp
                </a>
              )}
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} {config.nomeMinisterio}
              </p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
