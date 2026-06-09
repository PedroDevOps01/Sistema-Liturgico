export interface User {
  id: number
  nome: string
  usuario: string
  ativo: boolean
}

export interface Cerimoniario {
  id: number
  nome: string
  numero?: string
  observacao?: string
  ativo: boolean
  disponivel_domingo_manha: boolean
  disponivel_domingo_tarde: boolean
  disponivel_domingo_noite: boolean
  disponivel_semana_manha: boolean
  disponivel_semana_tarde: boolean
  disponivel_semana_noite: boolean
  disponivel_sabado: boolean
  indisponivel_temporario: boolean
  experiente: boolean
  mestre: boolean
}

export interface Funcao {
  id: number
  titulo: string
  descricao?: string
  ordem: number
}

export interface Celebracao {
  id: number
  ativo: boolean
  data: string
  horario: string
  periodo_liturgico: string
  qtd_cerimoniarios: number
  celebracao_noite: boolean
  possui_bispo: boolean
  celebracao_6h: boolean
  celebracao_palavra: boolean
  celebracao_solene: boolean
  casamento: boolean
  batismo: boolean
  crisma: boolean
  primeira_eucaristia: boolean
  adoracao_santissimo: boolean
  procissao: boolean
  via_sacra: boolean
  exequias: boolean
  vigilia_pascal: boolean
  paixao_senhor: boolean
  ordenacao: boolean
  santa_missa: boolean
  missa_crismal: boolean
  corpus_christi: boolean
  missa_pontifical: boolean
  cor_liturgica?: string
  final_de_semana: boolean
  weekend_group_id?: string
  observacao?: string
  escala?: Escala
}

export interface Escala {
  id: number
  ativo: boolean
  celebracao_id: number
  celebracao?: Celebracao
  criado_por: number
  escala_itens?: EscalaItem[]   // API returns "escala_itens" (Laravel snake_case)
  itens?: EscalaItem[]          // alias used in some views
  observacao?: string
  created_at: string
}

export interface EscalaItem {
  id: string
  escala_id?: number
  cerimoniario_id?: number
  cerimoniario?: Cerimoniario
  funcao_id?: number
  funcao?: Funcao
  funcao_label?: string
  ordem: number
  presenca?: Presenca
  token_confirmacao?: string
  status_confirmacao?: 'confirmado' | 'recusado' | null
}

export interface Interessado {
  id: number
  nome: string
  telefone?: string
  email?: string
  mensagem?: string
  lido: boolean
  created_at: string
}

export interface Presenca {
  id: number
  escala_item_id: number
  /** Confirmação prévia: se o cerimoniário confirmou presença antes da celebração */
  status_confirmacao?: 'confirmado' | null
  /** Status real pós-celebração */
  status?: 'serviu' | 'faltou' | 'substituido' | 'justificado' | null
  observacao?: string
  substituto_id?: number | null
  substituto?: Cerimoniario | null
}

export interface Dashboard {
  proximasCelebracoes: Celebracao[]
  escalasDoMes: number
  cerimoniarios_ativos: number
  celebracoesSemEscala: number
  alertasConflito: number
}

export interface Configuracoes {
  nome_paroquia: string
  endereco: string
  telefone: string
  nome_coordenador: string
  logo_url?: string
}

export interface CerimoniarioDisponibilidade {
  cerimoniario_id: number
  disponivel: boolean
  motivo?: string
}
