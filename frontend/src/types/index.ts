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
  data_nascimento?: string
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

export interface AniversarioCerimoniario {
  id: number
  nome: string
  numero?: string
  data_nascimento: string
  aniversario_este_ano: string
  dias_para_aniversario: number
  idade: number
  mes_aniversario: number
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

export interface DashboardCelebracaoHoje {
  id: number
  data: string
  horario: string
  periodo_liturgico: string
  escala?: {
    itens: {
      id: string
      cerimoniario?: { id: number; nome: string }
      funcao_label?: string
    }[]
  }
}

export interface DashboardAlertaConfirmacao {
  celebracao_id: number
  data: string
  horario: string
  periodo_liturgico: string
  pendentes: number
}

export interface Dashboard {
  proximasCelebracoes: Celebracao[]
  escalasDoMes: number
  cerimoniarios_ativos: number
  celebracoesSemEscala: number
  alertasConflito: number
  celebracoesHoje?: DashboardCelebracaoHoje[]
  alertasConfirmacao?: DashboardAlertaConfirmacao[]
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

export interface Tunica {
  id: number
  codigo: string
  tamanho: 'PP' | 'P' | 'M' | 'G' | 'GG'
  cor: 'branca' | 'vermelha' | 'preta'
  estado: 'novo' | 'bom' | 'regular' | 'ruim'
  observacao?: string
  emprestimo_atual?: TunicaEmprestimo | null
  created_at: string
}

export interface TunicaEmprestimo {
  id: number
  tunica_id: number
  tunica?: Tunica
  cerimoniario_id: number
  cerimoniario?: Cerimoniario
  data_emprestimo: string
  data_devolucao_prevista?: string | null
  data_devolucao_real?: string | null
  status: 'emprestada' | 'devolvida' | 'perdida'
  observacao?: string
  created_at: string
}

export interface FormacaoNivel {
  id: number
  nome: string
  descricao?: string
  ordem: number
  cor: string
  competencias?: FormacaoCompetencia[]
  competencias_count?: number
}

export interface FormacaoCompetencia {
  id: number
  formacao_nivel_id: number
  nome: string
  descricao?: string
  obrigatoria: boolean
  ordem: number
  concluida?: boolean
  data_conclusao?: string | null
  observacao?: string
}

export interface FormacaoProgresso {
  cerimoniario: Cerimoniario
  niveis: FormacaoNivelProgresso[]
  pct_total: number
}

export interface FormacaoNivelProgresso extends FormacaoNivel {
  competencias: FormacaoCompetencia[]
  total: number
  concluidas: number
  pct: number
}

export interface FormacaoOverviewItem {
  id: number
  nome: string
  numero?: string
  pct_total: number
  nivel_atual_nome?: string
}

export interface RelatorioFrequenciaData {
  cerimoniario: { id: number; nome: string; numero?: string }
  periodo: { inicio: string; fim: string }
  resumo: {
    total_escalado: number
    serviu: number
    faltou: number
    justificado: number
    substituido: number
    sem_registro: number
    taxa_presenca: number
  }
  por_mes: { mes: string; label: string; total: number; serviu: number; faltou: number }[]
  historico: { data: string; horario: string; periodo_liturgico: string; status: string | null; funcao_label: string }[]
}

export interface RelatorioCrescimentoData {
  resumo: {
    total_ativos: number
    total_inativos: number
    total_geral: number
    novos_no_periodo: number
    interessados_no_periodo: number
  }
  por_mes: { mes: string; label: string; novos_cerimoniarios: number; interessados: number; acumulado_cerimoniarios: number }[]
}

export interface RelatorioTreinamentosData {
  totais: { total_treinamentos: number; total_participantes: number; media_presenca_pct: number }
  por_treinamento: { id: number; data: string; tema: string; local?: string; total_convocados: number; presentes: number; ausentes: number; justificados: number; sem_registro: number; taxa_presenca_pct: number }[]
  por_cerimoniario: { id: number; nome: string; treinamentos_convocado: number; presentes: number; ausentes: number; justificados: number; taxa_pct: number }[]
}
