import { useEffect, useState } from 'react'
import { Phone, Search, Star } from 'lucide-react'
import membroApi from '../../lib/membroApi'

const GOLD = '#fbbf24'

interface Contato {
  id: number
  nome: string
  foto_base64?: string | null
  numero?: string | null
  mestre: boolean
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export default function MembroContatos() {
  const [lista, setLista] = useState<Contato[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    membroApi.get<Contato[]>('/contatos')
      .then(r => setLista(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false))
  }, [])

  const filtrado = lista.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const mestres = filtrado.filter(c => c.mestre)
  const membros = filtrado.filter(c => !c.mestre)

  function ContactCard({ c }: { c: Contato }) {
    const ini = c.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    return (
      <div className="card flex items-center gap-3.5 p-4">
        {c.foto_base64 ? (
          <img src={c.foto_base64} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#431407' }}>
            {ini}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-gray-900 text-sm truncate">{c.nome}</p>
            {c.mestre && <Star size={11} style={{ color: GOLD, fill: GOLD }} className="flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{c.mestre ? 'Mestre' : 'Cerimoniário'}</p>
        </div>
        {c.numero ? (
          <a href={`tel:${c.numero.replace(/\D/g, '')}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex-shrink-0"
            style={{ background: `${GOLD}20`, color: '#f59e0b' }}>
            <Phone size={12} />
            {maskPhone(c.numero)}
          </a>
        ) : (
          <span className="text-xs text-gray-300 flex-shrink-0">Sem contato</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Phone size={22} style={{ color: GOLD }} /> Contatos
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">{lista.length} membros do ministério</p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input-field pl-9"
          placeholder="Buscar membro..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
        </div>
      ) : (
        <div className="space-y-5">
          {mestres.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">Mestres</p>
              {mestres.map(c => <ContactCard key={c.id} c={c} />)}
            </div>
          )}
          {membros.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em]">Cerimoniários</p>
              {membros.map(c => <ContactCard key={c.id} c={c} />)}
            </div>
          )}
          {!filtrado.length && (
            <div className="card p-10 text-center">
              <p className="text-gray-400 font-medium">Nenhum membro encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
