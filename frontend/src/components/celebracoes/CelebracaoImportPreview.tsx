import { Plus, Trash2 } from 'lucide-react'
import { TIPO_CELEBRACAO_OPCOES, PERIODOS_LITURGICOS, pluralizar } from '../../lib/celebracaoUtils'

export interface CelebracaoPreviewRow {
  _key: string
  data: string       // YYYY-MM-DD
  horario: string    // HH:mm
  tipo: string        // um dos TIPO_CELEBRACAO_OPCOES
  periodo_liturgico?: string
  qtd_cerimoniarios?: number
  observacao?: string
  erro?: string
}

export interface CelebracaoImportResultado {
  criadas: unknown[]
  puladas: { indice: number; motivo: string }[]
  erros: { indice: number; erros: Record<string, string[]> }[]
}

interface Props {
  rows: CelebracaoPreviewRow[]
  onChange: (rows: CelebracaoPreviewRow[]) => void
  onConfirm: () => void
  confirming?: boolean
  resultado?: CelebracaoImportResultado | null
}

export default function CelebracaoImportPreview({ rows, onChange, onConfirm, confirming, resultado }: Props) {
  function updateRow(key: string, patch: Partial<CelebracaoPreviewRow>) {
    onChange(rows.map((r) => (r._key === key ? { ...r, ...patch, erro: undefined } : r)))
  }

  function removeRow(key: string) {
    onChange(rows.filter((r) => r._key !== key))
  }

  function addRow() {
    onChange([
      ...rows,
      { _key: `nova-${Math.random().toString(36).slice(2)}`, data: '', horario: '', tipo: 'Missa', periodo_liturgico: PERIODOS_LITURGICOS[2], qtd_cerimoniarios: 5, observacao: '' },
    ])
  }

  const validas = rows.filter((r) => r.data && r.horario)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Pré-visualização — edite antes de confirmar</span>
        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">
          Total
          <span className="bg-white text-gray-800 rounded-full px-1.5 py-0.5 text-xs leading-none">{rows.length}</span>
        </span>
      </div>

      {resultado && (
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            Criadas
            <span className="bg-white text-green-800 rounded-full px-1.5 py-0.5 text-xs leading-none">{resultado.criadas.length}</span>
          </span>
          {resultado.puladas.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full"
                  title={resultado.puladas.map((p) => p.motivo).join('\n')}>
              Puladas (já existiam)
              <span className="bg-white text-amber-800 rounded-full px-1.5 py-0.5 text-xs leading-none">{resultado.puladas.length}</span>
            </span>
          )}
          {resultado.erros.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              Com erro
              <span className="bg-white text-red-800 rounded-full px-1.5 py-0.5 text-xs leading-none">{resultado.erros.length}</span>
            </span>
          )}
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Data</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Horário</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Período</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Qtd. Cerim.</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Observação</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row._key} className={`border-t border-gray-100 ${row.erro ? 'bg-red-50' : ''}`}>
                <td className="px-3 py-2 text-gray-400 text-xs tabular-nums">{i + 1}</td>
                <td className="px-3 py-2">
                  <input
                    type="date"
                    value={row.data}
                    onChange={(e) => updateRow(row._key, { data: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-[9.5rem]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    value={row.horario}
                    onChange={(e) => updateRow(row._key, { horario: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-24"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.periodo_liturgico ?? ''}
                    onChange={(e) => updateRow(row._key, { periodo_liturgico: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm max-w-[9.5rem]"
                  >
                    <option value="">—</option>
                    {PERIODOS_LITURGICOS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={row.qtd_cerimoniarios ?? ''}
                    onChange={(e) => updateRow(row._key, { qtd_cerimoniarios: e.target.value ? Number(e.target.value) : undefined })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-16"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.tipo}
                    onChange={(e) => updateRow(row._key, { tipo: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm max-w-[12rem]"
                  >
                    {TIPO_CELEBRACAO_OPCOES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.observacao ?? ''}
                    onChange={(e) => updateRow(row._key, { observacao: e.target.value })}
                    placeholder="Opcional"
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-full min-w-[9rem]"
                  />
                  {row.erro && <p className="text-red-600 text-xs mt-1">{row.erro}</p>}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(row._key)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Remover linha"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400 text-sm">
                  Nenhuma linha para revisar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-3">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 text-sm text-wine-700 hover:text-wine-900 font-medium transition-colors"
          title="Adicionar uma celebração que a extração não pegou (ex: sem horário explícito no original)"
        >
          <Plus size={15} />
          Adicionar celebração
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming || validas.length === 0}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirming ? 'Importando...' : `Importar ${validas.length} ${pluralizar(validas.length, 'celebração', 'celebrações')}`}
        </button>
      </div>
    </div>
  )
}
