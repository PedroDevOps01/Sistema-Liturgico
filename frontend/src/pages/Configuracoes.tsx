import { useEffect, useRef, useState } from 'react'
import { useConfig } from '../contexts/ConfigContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Upload, Church, MapPin, Phone, User, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PageHeader from '../components/common/PageHeader'
import LoadingSpinner from '../components/common/LoadingSpinner'

const schema = z.object({
  nome_paroquia:    z.string().min(2, 'Nome da paróquia é obrigatório'),
  endereco:         z.string().optional(),
  telefone:         z.string().optional(),
  nome_coordenador: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ConfigData {
  nome_paroquia:    string
  logo_base64:      string | null
  endereco:         string | null
  telefone:         string | null
  nome_coordenador: string | null
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Configuracoes() {
  const { refreshConfig } = useConfig()
  const [loading, setLoading]     = useState(true)
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    api
      .get<ConfigData>('/configuracoes')
      .then((r) => {
        reset({
          nome_paroquia:    r.data.nome_paroquia    ?? '',
          endereco:         r.data.endereco         ?? '',
          telefone:         r.data.telefone         ?? '',
          nome_coordenador: r.data.nome_coordenador ?? '',
        })
        setLogoBase64(r.data.logo_base64 || null)
      })
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [reset])

  async function onSubmit(data: FormData) {
    try {
      await api.put('/configuracoes', data)
      toast.success('Configurações salvas!')
    } catch {
      toast.error('Erro ao salvar configurações')
    }
  }

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Envie apenas arquivos de imagem (PNG, JPG, SVG)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB')
      return
    }

    setLogoUploading(true)
    try {
      const base64 = await fileToBase64(file)
      await api.post('/configuracoes/logo', { logo_base64: base64 })
      setLogoBase64(base64)
      refreshConfig()
      toast.success('Logo salvo!')
    } catch {
      toast.error('Erro ao salvar logo')
    } finally {
      setLogoUploading(false)
    }
  }

  async function removeLogo() {
    try {
      await api.post('/configuracoes/logo', { logo_base64: null })
      setLogoBase64(null)
      refreshConfig()
      toast.success('Logo removido')
    } catch {
      toast.error('Erro ao remover logo')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Informações da paróquia e do sistema" />

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Logo */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-wine-900 rounded-xl flex items-center justify-center">
              <Church size={16} className="text-gold-400" />
            </div>
            Logo da Paróquia
          </h2>

          <div className="flex flex-col items-center gap-4">
            {/* Preview */}
            <div className="relative w-28 h-28 rounded-2xl bg-gray-50 border-2 border-gray-200 flex items-center justify-center overflow-hidden">
              {logoBase64 ? (
                <>
                  <img src={logoBase64} alt="Logo" className="w-full h-full object-contain" />
                  <button
                    onClick={removeLogo}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
                    title="Remover logo"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <Church size={40} className="text-gray-300" />
              )}
            </div>

            {/* Drop area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) handleLogoFile(file)
              }}
              onClick={() => fileRef.current?.click()}
              className={`w-full rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 p-4 text-center ${
                dragOver
                  ? 'border-wine-700 bg-wine-50'
                  : 'border-gray-200 hover:border-wine-400 hover:bg-gray-50'
              }`}
            >
              {logoUploading ? (
                <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                  <div className="h-4 w-4 border-2 border-gray-300 border-t-wine-900 rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : (
                <>
                  <Upload size={18} className="mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-gray-500 font-medium">Arraste ou clique para enviar</p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG · máx 2MB</p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleLogoFile(file)
                e.target.value = ''
              }}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={logoUploading}
              className="btn-secondary text-sm w-full"
            >
              <Upload size={16} />
              {logoBase64 ? 'Trocar Logo' : 'Enviar Logo'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <div className="w-8 h-8 bg-wine-900 rounded-xl flex items-center justify-center">
              <Church size={16} className="text-gold-400" />
            </div>
            Dados da Paróquia
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <Church size={13} className="text-gray-400" /> Nome da Paróquia *
              </label>
              <input {...register('nome_paroquia')} className="input-field" placeholder="Ex: Paróquia São José" />
              {errors.nome_paroquia && (
                <p className="text-red-600 text-sm mt-1">{errors.nome_paroquia.message}</p>
              )}
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <MapPin size={13} className="text-gray-400" /> Endereço
              </label>
              <input {...register('endereco')} className="input-field" placeholder="Rua, número, bairro, cidade" />
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <Phone size={13} className="text-gray-400" /> Telefone
              </label>
              <input {...register('telefone')} className="input-field" placeholder="(11) 99999-9999" />
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <User size={13} className="text-gray-400" /> Nome do Coordenador
              </label>
              <input {...register('nome_coordenador')} className="input-field" placeholder="Nome do responsável" />
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary">
                {isSubmitting ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
