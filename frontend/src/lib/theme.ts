import { getPeriodoLiturgico } from './liturgico'

// Escala completa de 11 tons: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
// Valores em formato RGB espaçado (sem rgb()) para compatibilidade com Tailwind / <alpha-value>
const SCALES: Record<string, string[]> = {
  // Padrão da app — vinho/laranja (cor litúrgica: especial/festivo)
  _default: [
    '255 247 237', '255 237 213', '254 215 170', '253 186 116', '251 146 60',
    '249 115 22',  '234 88 12',   '194 65 12',   '154 52 18',   '124 45 18',  '67 20 7',
  ],
  // Roxo violeta — Advento
  'Advento': [
    '245 243 255', '237 233 254', '221 214 254', '196 181 253', '167 139 250',
    '139 92 246',  '124 58 237',  '109 40 217',  '91 33 182',   '76 29 149',  '46 16 101',
  ],
  // Azul — Tempo do Natal
  'Tempo do Natal': [
    '239 246 255', '219 234 254', '191 219 254', '147 197 253', '96 165 250',
    '59 130 246',  '37 99 235',   '29 78 216',   '30 64 175',   '30 58 138',  '23 37 84',
  ],
  // Verde — Tempo Comum
  'Tempo Comum': [
    '240 253 244', '220 252 231', '187 247 208', '134 239 172', '74 222 128',
    '34 197 94',   '22 163 74',   '21 128 61',   '22 101 52',   '20 83 45',   '5 46 22',
  ],
  // Roxo púrpura — Quaresma (mais saturado que Advento)
  'Quaresma': [
    '250 245 255', '243 232 255', '233 213 255', '216 180 254', '192 132 252',
    '168 85 247',  '147 51 234',  '126 34 206',  '107 33 168',  '88 28 135',  '59 7 100',
  ],
  // Vermelho — Tríduo Pascal
  'Tríduo Pascal': [
    '255 241 242', '255 228 230', '254 205 211', '253 164 175', '251 113 133',
    '244 63 94',   '225 29 72',   '190 18 60',   '159 18 57',   '136 19 55',  '76 5 25',
  ],
  // Âmbar/dourado — Tempo Pascal
  'Tempo Pascal': [
    '255 251 235', '254 243 199', '253 230 138', '252 211 77',  '251 191 36',
    '245 158 11',  '217 119 6',   '180 83 9',    '146 64 14',   '120 53 15',  '69 26 3',
  ],
  // Vermelho — Pentecostes
  'Pentecostes': [
    '255 241 242', '255 228 230', '254 205 211', '253 164 175', '251 113 133',
    '244 63 94',   '225 29 72',   '190 18 60',   '159 18 57',   '136 19 55',  '76 5 25',
  ],
}

const KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

function toRgb(spaced: string) { return `rgb(${spaced.replace(/ /g, ', ')})` }

/**
 * Detecta o período litúrgico de hoje (ou da data passada),
 * aplica a paleta completa de cores no :root e retorna o nome do período.
 */
export function applyLiturgicalTheme(date?: Date): string {
  const { periodo } = getPeriodoLiturgico(date)
  const scale = SCALES[periodo] ?? SCALES['_default']

  const root = document.documentElement

  // 1. Atualiza toda a escala wine-* (usado por todas as classes Tailwind wine-*)
  KEYS.forEach((key, i) => {
    root.style.setProperty(`--w-${key}`, scale[i])
  })

  // 2. Deriva variáveis do sidebar e botão a partir da escala
  //    950 = from  |  900 = mid  |  700 = to / btn-from  |  600 = btn-to
  root.style.setProperty('--theme-from',           toRgb(scale[10])) // 950
  root.style.setProperty('--theme-mid',            toRgb(scale[9]))  // 900
  root.style.setProperty('--theme-to',             toRgb(scale[7]))  // 700
  root.style.setProperty('--theme-btn-from',       toRgb(scale[7]))  // 700
  root.style.setProperty('--theme-btn-to',         toRgb(scale[6]))  // 600
  root.style.setProperty('--theme-btn-hover-from', toRgb(scale[9]))  // 900
  root.style.setProperty('--theme-btn-hover-to',   toRgb(scale[7]))  // 700

  const [r, g, b] = scale[7].split(' ')
  root.style.setProperty('--theme-btn-shadow', `rgba(${r}, ${g}, ${b}, 0.35)`)

  return periodo
}
