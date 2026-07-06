// ── Algoritmo de cálculo do Ano Litúrgico Católico ──────────────────────────
// Segue o calendário litúrgico romano conforme adotado no Brasil (CNBB).
// Epifania celebrada no domingo entre 2-8 de janeiro (norma da CNBB).

export type CorLiturgica = 'roxo' | 'verde' | 'branco' | 'vermelho' | 'rosa'

export interface PeriodoInfo {
  /** Nome do período conforme os selects do sistema */
  periodo: string
  /** Cor litúrgica canônica */
  cor: CorLiturgica
  /** Variante de badge Tailwind correspondente */
  badgeVariant: 'purple' | 'green' | 'blue' | 'red' | 'wine'
}

// ── Helpers internos ─────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000)
}

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

/** Domingo da semana litúrgica corrente (a própria data, se já for domingo). */
function sundayOnOrBefore(d: Date): Date {
  return addDays(d, -d.getDay())
}

const ROMAN_TABLE: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

function toRoman(n: number): string {
  let num = n
  let out = ''
  for (const [value, symbol] of ROMAN_TABLE) {
    while (num >= value) { out += symbol; num -= value }
  }
  return out
}

/**
 * Número da semana do Tempo Comum (numeração oficial romana/CNBB, contada
 * regressivamente a partir da semana 34 = Cristo Rei, véspera do Advento).
 * O domingo do Batismo do Senhor não tem numeração própria (é substituído
 * pela festa), então só numeramos a partir do dia seguinte.
 */
function getSemanaTempoComum(date: Date, baptism: Date, ashWed: Date, adventStart: Date): number | null {
  if (date.getTime() === baptism.getTime()) return null

  const sunday = sundayOnOrBefore(date)

  if (date > baptism && date < ashWed) {
    return diffDays(sunday, baptism) / 7 + 1
  }

  const sunday34 = addDays(adventStart, -7)
  return 34 - diffDays(sunday34, sunday) / 7
}

/** Algoritmo de Meeus/Jones/Butcher para calcular a Páscoa. */
function getEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3=março,4=abril
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Epifania no domingo entre 2–8 de janeiro (uso CNBB). */
function getEpiphany(year: number): Date {
  for (let d = 2; d <= 8; d++) {
    const date = new Date(year, 0, d)
    if (date.getDay() === 0) return date
  }
  return new Date(year, 0, 6) // fallback para 6 de jan
}

/** Batismo do Senhor = domingo seguinte à Epifania. */
function getBaptism(year: number): Date {
  return addDays(getEpiphany(year), 7)
}

/** Primeiro domingo do Advento = 4º domingo antes do Natal. */
function getAdventStart(year: number): Date {
  const christmas = new Date(year, 11, 25)
  const dow = christmas.getDay() // 0=dom
  const daysBack = dow === 0 ? 28 : dow + 21
  return new Date(year, 11, 25 - daysBack)
}

// ── Função principal ─────────────────────────────────────────────────────────

/**
 * Retorna o período litúrgico para uma data (padrão: hoje).
 * O período retornado bate exatamente com os valores do select do sistema.
 */
export function getPeriodoLiturgico(input: Date | string = new Date()): PeriodoInfo {
  // `input` pode vir como "YYYY-MM-DD" ou timestamp ISO completo (ex: cast 'date' do Laravel) —
  // sempre trunca pros 10 primeiros chars antes de montar o horário fixo, senão a concatenação
  // gera uma string de data inválida e todas as comparações abaixo falham silenciosamente.
  const raw  = typeof input === 'string' ? new Date(input.substring(0, 10) + 'T12:00:00') : input
  const date = dateOnly(raw)
  const y    = date.getFullYear()

  // Móveis do ano corrente
  const easter      = getEaster(y)
  const ashWed      = addDays(easter, -46)  // Quarta de Cinzas
  const holyThursday = addDays(easter, -3)  // Quinta-feira Santa
  const pentecost   = addDays(easter, 49)   // Pentecostes
  const adventStart = getAdventStart(y)
  const baptism     = getBaptism(y)         // Batismo do Senhor (jan)
  const christmas   = new Date(y, 11, 25)   // Natal (dez)

  // ── Ordem de verificação ─────────────────────────────────────────────────

  // 1. Advento (começa no 1º dom do Advento, termina no dia antes do Natal)
  if (date >= adventStart && date < christmas) {
    return { periodo: 'Advento', cor: 'roxo', badgeVariant: 'purple' }
  }

  // 2. Natal — dez/25 até Batismo do Senhor do ANO SEGUINTE
  //    Para datas em dezembro >= 25
  if (date >= christmas) {
    return { periodo: 'Tempo do Natal', cor: 'branco', badgeVariant: 'blue' }
  }

  // 3. A partir daqui, datas antes do Natal do ano corrente (jan–nov)

  // 4. Após Pentecostes: Tempo Comum (segunda parte)
  if (date > pentecost && date < adventStart) {
    return { periodo: 'Tempo Comum', cor: 'verde', badgeVariant: 'green' }
  }

  // 5. Pentecostes (único dia)
  if (date.getTime() === pentecost.getTime()) {
    return { periodo: 'Pentecostes', cor: 'vermelho', badgeVariant: 'red' }
  }

  // 6. Tempo Pascal (Páscoa até véspera de Pentecostes)
  if (date >= easter && date < pentecost) {
    return { periodo: 'Tempo Pascal', cor: 'branco', badgeVariant: 'blue' }
  }

  // 7. Tríduo Pascal (Quinta-feira Santa até véspera da Páscoa)
  if (date >= holyThursday && date < easter) {
    return { periodo: 'Tríduo Pascal', cor: 'vermelho', badgeVariant: 'red' }
  }

  // 8. Quaresma (Quarta de Cinzas até véspera da Quinta-feira Santa)
  if (date >= ashWed && date < holyThursday) {
    return { periodo: 'Quaresma', cor: 'roxo', badgeVariant: 'purple' }
  }

  // 9. Tempo Comum (primeira parte): Batismo do Senhor até Quarta de Cinzas
  if (date >= baptism && date < ashWed) {
    return { periodo: 'Tempo Comum', cor: 'verde', badgeVariant: 'green' }
  }

  // 10. Natal do ano anterior: jan 1 até Batismo do Senhor
  if (date < baptism) {
    return { periodo: 'Tempo do Natal', cor: 'branco', badgeVariant: 'blue' }
  }

  // Fallback
  return { periodo: 'Tempo Comum', cor: 'verde', badgeVariant: 'green' }
}

/**
 * Período litúrgico para exibição textual (relatórios, texto de WhatsApp etc.),
 * incluindo o número da semana quando cair no Tempo Comum (ex: "Tempo Comum XIV").
 * Não usar para persistir em `periodo_liturgico` — esse campo é um enum fixo,
 * comparado literalmente em vários lugares do sistema (selects, cores, citações).
 */
export function getPeriodoLiturgicoComNumero(input: Date | string = new Date()): string {
  const raw    = typeof input === 'string' ? new Date(input.substring(0, 10) + 'T12:00:00') : input
  const date   = dateOnly(raw)
  const y      = date.getFullYear()
  const { periodo } = getPeriodoLiturgico(input)

  if (periodo !== 'Tempo Comum') return periodo

  const easter      = getEaster(y)
  const ashWed      = addDays(easter, -46)
  const adventStart = getAdventStart(y)
  const baptism     = getBaptism(y)

  const semana = getSemanaTempoComum(date, baptism, ashWed, adventStart)
  return semana ? `Tempo Comum ${toRoman(semana)}` : periodo
}

/**
 * Mesma ideia de `getPeriodoLiturgicoComNumero`, mas a partir de um `periodo_liturgico`
 * já salvo (enum) + a data da celebração — útil pra exibir o número sem recalcular
 * o período do zero em telas que já recebem o enum pronto da API.
 */
export function formatPeriodoParaExibicao(periodo: string | undefined | null, data: string | undefined | null): string {
  if (!periodo) return ''
  if (periodo !== 'Tempo Comum' || !data) return periodo
  return getPeriodoLiturgicoComNumero(data)
}

/**
 * Mapeamento rápido de nome de período → variante de badge.
 * Útil para colorir badges em listas onde o período já está salvo como string.
 */
export function getPeriodoBadgeVariant(
  periodo: string,
): 'purple' | 'green' | 'blue' | 'red' | 'wine' {
  const p = periodo?.toLowerCase() ?? ''
  if (p.includes('advento') || p.includes('quaresma'))          return 'purple'
  if (p.includes('natal') || p.includes('pascal') && !p.includes('tríduo') && !p.includes('triduo')) return 'blue'
  if (p.includes('comum'))                                       return 'green'
  if (p.includes('tríduo') || p.includes('triduo') || p.includes('pentecoste') || p.includes('paixão')) return 'red'
  return 'wine'
}

/** Cor CSS para uso em estilos inline ou classes dinâmicas. */
export function getCorLiturgicaCSS(cor: CorLiturgica): string {
  return {
    roxo:     '#7c3aed',
    verde:    '#16a34a',
    branco:   '#94a3b8',
    vermelho: '#dc2626',
    rosa:     '#ec4899',
  }[cor]
}
