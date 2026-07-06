import { useEffect, useState, useCallback } from "react";
import { X, BarChart2, Calendar, User } from "lucide-react";
import { format, parseISO, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";
import api from "../lib/api";
import type { RelatorioFrequenciaData, Cerimoniario } from "../types";
import PageHeader from "../components/common/PageHeader";
import Badge from "../components/common/Badge";
import CalcNote from "../components/common/CalcNote";
import { formatPeriodoParaExibicao } from "../lib/liturgico";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateBR(iso: string) {
  try {
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
}

function taxaColor(taxa: number): string {
  if (taxa >= 80) return "text-green-700";
  if (taxa >= 60) return "text-amber-700";
  return "text-red-700";
}

function taxaBg(taxa: number): string {
  if (taxa >= 80) return "bg-green-50 border-green-200";
  if (taxa >= 60) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function statusBadge(status: string | null) {
  if (status === "serviu")
    return (
      <Badge variant="green" size="sm">
        Serviu
      </Badge>
    );
  if (status === "faltou")
    return (
      <Badge variant="red" size="sm">
        Faltou
      </Badge>
    );
  if (status === "justificado")
    return (
      <Badge variant="orange" size="sm">
        Justificado
      </Badge>
    );
  if (status === "substituido")
    return (
      <Badge variant="gray" size="sm">
        Substituído
      </Badge>
    );
  return (
    <Badge variant="gray" size="sm">
      Sem registro
    </Badge>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function RelatorioFrequencia() {
  const today = new Date();
  const defaultDe = format(startOfYear(today), "yyyy-MM-dd");
  const defaultAte = format(today, "yyyy-MM-dd");

  const [cerimoniarios, setCerimoniarios] = useState<Cerimoniario[]>([]);
  const [cerLoading, setCerLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCer, setSelectedCer] = useState<Cerimoniario | null>(null);
  const [de, setDe] = useState(defaultDe);
  const [ate, setAte] = useState(defaultAte);
  const [relatorio, setRelatorio] = useState<RelatorioFrequenciaData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const loadCerimoniarios = useCallback(async () => {
    try {
      const r = await api.get<Cerimoniario[]>("/cerimoniarios");
      setCerimoniarios(r.data.filter((c) => c.ativo));
    } catch {
      toast.error("Erro ao carregar cerimoniários");
    } finally {
      setCerLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCerimoniarios();
  }, [loadCerimoniarios]);

  async function gerarRelatorio() {
    if (!selectedCer) {
      toast.error("Selecione um cerimoniário");
      return;
    }
    setLoading(true);
    try {
      const r = await api.get<RelatorioFrequenciaData>(
        `/relatorios/frequencia/${selectedCer.id}?de=${de}&ate=${ate}`,
      );
      setRelatorio(r.data);
    } catch {
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  }

  const filteredCer = cerimoniarios
    .filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frequência Individual"
        subtitle="Relatório de presenças e faltas por cerimoniário"
      />

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Cerimoniário search */}
          <div className="relative">
            <label className="label">Cerimoniário</label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={selectedCer ? selectedCer.nome : search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedCer(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Buscar cerimoniário..."
                className="input-field pl-10 pr-8"
                readOnly={!!selectedCer}
              />
              {selectedCer && (
                <button
                  onClick={() => {
                    setSelectedCer(null);
                    setSearch("");
                    setRelatorio(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {showDropdown && !selectedCer && search && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden">
                {cerLoading ? (
                  <p className="px-4 py-3 text-sm text-gray-400">
                    Carregando...
                  </p>
                ) : filteredCer.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">
                    Nenhum resultado
                  </p>
                ) : (
                  filteredCer.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={() => {
                        setSelectedCer(c);
                        setSearch(c.nome);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-wine-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {c.nome}
                      </p>
                      {c.numero && (
                        <p className="text-xs text-gray-400">{c.numero}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">De</label>
              <input
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Até</label>
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <button
              onClick={gerarRelatorio}
              disabled={!selectedCer || loading}
              className="btn-primary"
            >
              <BarChart2 size={16} />
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded" />
            ))}
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {!loading && relatorio && (
        <div className="space-y-5">
          {/* Cerimoniário header */}
          <div className="card p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
              <span className="text-gold-400 text-lg font-bold">
                {relatorio.cerimoniario.nome
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {relatorio.cerimoniario.nome}
              </h2>
              {relatorio.cerimoniario.numero && (
                <p className="text-sm text-gray-400">
                  {relatorio.cerimoniario.numero}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Calendar size={12} />
                {formatDateBR(relatorio.periodo.inicio)} —{" "}
                {formatDateBR(relatorio.periodo.fim)}
              </p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                label: "Total Escalado",
                value: relatorio.resumo.total_escalado,
                cls: "text-gray-900",
                bg: "",
              },
              {
                label: "Serviu",
                value: relatorio.resumo.serviu,
                cls: "text-green-700",
                bg: "bg-green-50",
              },
              {
                label: "Faltou",
                value: relatorio.resumo.faltou,
                cls: "text-red-700",
                bg: "bg-red-50",
              },
              {
                label: "Justificado",
                value: relatorio.resumo.justificado,
                cls: "text-amber-700",
                bg: "bg-amber-50",
              },
              {
                label: "Taxa de Presença",
                value: relatorio.resumo.taxa_presenca != null
                  ? `${relatorio.resumo.taxa_presenca}%`
                  : "—",
                cls: relatorio.resumo.taxa_presenca != null
                  ? taxaColor(relatorio.resumo.taxa_presenca)
                  : "text-gray-400",
                bg: relatorio.resumo.taxa_presenca != null
                  ? taxaBg(relatorio.resumo.taxa_presenca).split(" ")[0]
                  : "",
              },
            ].map((k) => (
              <div key={k.label} className={`card p-4 ${k.bg}`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {k.label}
                </p>
                <p className={`text-2xl font-bold mt-1 ${k.cls}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Observação de cálculo */}
          <CalcNote items={[
            {
              label: 'Taxa de Presença',
              formula: 'Serviu ÷ (Serviu + Faltou) × 100',
              note: 'Somente registros com status definitivo entram no cálculo. Escalações sem presença registrada, justificadas e substituições não afetam o denominador.',
            },
            {
              label: 'Gráfico mensal — barra vinho',
              formula: 'Serviu ÷ Total escalado no mês × 100',
              note: 'Barra vermelha representa faltas sobre o mesmo total. A soma das duas barras pode ser menor que 100% quando há registros sem status.',
            },
          ]} />

          {/* Monthly bar chart */}
          {relatorio.por_mes.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">
                Frequência por Mês
              </h3>
              <div className="space-y-2.5">
                {relatorio.por_mes.map((m) => {
                  const pct = m.total > 0 ? (m.serviu / m.total) * 100 : 0;
                  return (
                    <div key={m.mes} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 w-16 text-right flex-shrink-0">
                        {m.label}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                        <div
                          className="h-5 rounded-full bg-wine-700 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                        <div
                          className="absolute top-0 h-5 rounded-full bg-red-300 transition-all duration-500"
                          style={{
                            left: `${pct}%`,
                            width: `${m.total > 0 ? (m.faltou / m.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                        {m.serviu}/{m.total} ({Math.round(pct)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-wine-700 inline-block" />
                  Serviu
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-300 inline-block" />
                  Faltou
                </span>
              </div>
            </div>
          )}

          {/* History table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Histórico Detalhado
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">
                      Data
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">
                      Horário
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">
                      Período
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">
                      Função
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {relatorio.historico.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-10 text-gray-400"
                      >
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : (
                    relatorio.historico.map((h, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {formatDateBR(h.data)}
                        </td>
                        <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">
                          {h.horario}
                        </td>
                        <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                          {formatPeriodoParaExibicao(h.periodo_liturgico, h.data)}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {h.funcao_label}
                        </td>
                        <td className="px-5 py-3">{statusBadge(h.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !relatorio && (
        <div className="card p-16 text-center">
          <BarChart2 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">
            Selecione um cerimoniário e gere o relatório
          </p>
          <p className="text-sm text-gray-400 mt-1">
            O histórico de presenças e faltas será exibido aqui.
          </p>
        </div>
      )}
    </div>
  );
}
