import type { Celebracao } from '../types'

export function pluralizar(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

export type FlagKey =
  | 'celebracao_noite' | 'celebracao_6h' | 'possui_bispo' | 'celebracao_palavra'
  | 'celebracao_solene' | 'casamento' | 'batismo' | 'crisma'
  | 'primeira_eucaristia' | 'adoracao_santissimo' | 'procissao' | 'via_sacra'
  | 'exequias' | 'vigilia_pascal' | 'paixao_senhor' | 'ordenacao'
  | 'santa_missa' | 'missa_crismal' | 'corpus_christi' | 'missa_pontifical'
  | 'quinta_eucaristica' | 'triduo'

// Ordem de prioridade: a primeira característica marcada define o "tipo" da
// celebração. Se nenhuma estiver marcada (ou for Santa Missa), o tipo é "Missa".
const TIPO_CELEBRACAO_ORDEM: { key: FlagKey; label: string }[] = [
  { key: 'casamento', label: 'Casamento' },
  { key: 'batismo', label: 'Batismo' },
  { key: 'crisma', label: 'Crisma' },
  { key: 'primeira_eucaristia', label: 'Primeira Eucaristia' },
  { key: 'quinta_eucaristica', label: 'Quinta Eucarística' },
  { key: 'triduo', label: 'Tríduo' },
  { key: 'ordenacao', label: 'Ordenação' },
  { key: 'exequias', label: 'Exéquias' },
  { key: 'vigilia_pascal', label: 'Vigília Pascal' },
  { key: 'paixao_senhor', label: 'Paixão do Senhor' },
  { key: 'corpus_christi', label: 'Corpus Christi' },
  { key: 'missa_crismal', label: 'Missa Crismal' },
  { key: 'missa_pontifical', label: 'Missa Pontifical' },
  { key: 'adoracao_santissimo', label: 'Adoração ao Santíssimo' },
  { key: 'procissao', label: 'Procissão' },
  { key: 'via_sacra', label: 'Via-Sacra' },
  { key: 'celebracao_palavra', label: 'Celebração da Palavra' },
  { key: 'celebracao_solene', label: 'Missa Solene' },
]

export const TIPO_CELEBRACAO_OPCOES = ['Missa', ...TIPO_CELEBRACAO_ORDEM.map((t) => t.label)]

export const PERIODOS_LITURGICOS = [
  'Advento',
  'Tempo do Natal',
  'Tempo Comum',
  'Quaresma',
  'Tríduo Pascal',
  'Tempo Pascal',
  'Pentecostes',
]

export function getTipoCelebracao(c: Partial<Celebracao>): string {
  const encontrada = TIPO_CELEBRACAO_ORDEM.find(({ key }) => c[key])
  return encontrada ? encontrada.label : 'Missa'
}

// Regra: antes das 18h → 5 cerimoniários; 18h em diante → 6 (+ Turiferário)
export function getQtdCerimoniariosDefault(horario: string): number {
  const hora = Number((horario || '00:00').split(':')[0])
  return hora >= 18 ? 6 : 5
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// Aliases usados no import por CSV (texto livre digitado por humano)
const TIPO_ALIASES: { match: string[]; label: string }[] = [
  { match: ['casamento'], label: 'Casamento' },
  { match: ['batismo'], label: 'Batismo' },
  { match: ['crisma', 'confirmacao'], label: 'Crisma' },
  { match: ['primeira eucaristia', 'primeira comunhao'], label: 'Primeira Eucaristia' },
  { match: ['quinta eucaristica', 'quinta de adoracao'], label: 'Quinta Eucarística' },
  { match: ['triduo'], label: 'Tríduo' },
  { match: ['ordenacao'], label: 'Ordenação' },
  { match: ['exequias', 'corpo presente'], label: 'Exéquias' },
  { match: ['vigilia pascal'], label: 'Vigília Pascal' },
  { match: ['paixao do senhor', 'sexta-feira santa', 'sexta feira santa'], label: 'Paixão do Senhor' },
  { match: ['corpus christi'], label: 'Corpus Christi' },
  { match: ['missa crismal'], label: 'Missa Crismal' },
  { match: ['missa pontifical'], label: 'Missa Pontifical' },
  { match: ['adoracao ao santissimo', 'adoracao do santissimo', 'adoracao eucaristica'], label: 'Adoração ao Santíssimo' },
  { match: ['procissao'], label: 'Procissão' },
  { match: ['via sacra', 'via-sacra', 'via crucis'], label: 'Via-Sacra' },
  { match: ['celebracao da palavra'], label: 'Celebração da Palavra' },
  { match: ['missa solene', 'celebracao solene'], label: 'Missa Solene' },
]

/**
 * Resolve um texto de "tipo" para o label canônico (um de TIPO_CELEBRACAO_OPCOES).
 * `fuzzy: true` (import CSV, texto livre digitado por humano) normaliza acentos/caixa e casa por alias.
 * `fuzzy: false` (extração via IA, já restrita a um enum fechado) exige match exato do label.
 * Sem match (ou texto vazio), retorna 'Missa'.
 */
export function resolverTipoLabel(tipo: string | undefined | null, opts?: { fuzzy?: boolean }): string {
  const raw = (tipo ?? '').trim()
  if (!raw) return 'Missa'

  if (opts?.fuzzy) {
    const norm = normalizar(raw)
    const alias = TIPO_ALIASES.find(({ match }) => match.some((m) => norm.includes(m)))
    return alias ? alias.label : 'Missa'
  }

  const entrada = TIPO_CELEBRACAO_ORDEM.find((t) => t.label === raw)
  return entrada ? entrada.label : 'Missa'
}

/** Converte um label de tipo (já canônico) nas flags boolean correspondentes da Celebracao. */
export function mapTipoParaFlags(tipo: string | undefined | null, opts?: { fuzzy?: boolean }): Partial<Record<FlagKey, boolean>> {
  const label = resolverTipoLabel(tipo, opts)
  const entrada = TIPO_CELEBRACAO_ORDEM.find((t) => t.label === label)
  return entrada ? { [entrada.key]: true } : {}
}
