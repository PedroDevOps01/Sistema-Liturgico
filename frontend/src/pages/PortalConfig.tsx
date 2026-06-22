import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  Globe,
  Save,
  ExternalLink,
  RefreshCw,
  Eye,
  Image,
  Type,
  BarChart3,
  MessageSquare,
  Mail,
  Palette,
  Images,
  Plus,
  Trash2,
  Link2,
  Upload,
  Check,
  BookOpen,
  HelpCircle,
  Flag,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import api from "../lib/api";
import axios from "axios";
import { getToken } from "../lib/auth";

export const PORTAL_CONFIG_KEY = "portal_config";

export interface CarrosselSlide {
  imageUrl: string;
  titulo: string;
  descricao: string;
}

export interface PortalDepoimento {
  nome: string;
  cargo: string;
  texto: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface OracaoItem {
  titulo: string;
  subtitulo: string;
  texto: string;
}

export interface MilestoneItem {
  ano: string;
  evento: string;
  desc: string;
}

export interface PortalConfig {
  nomeMinisterio: string;
  subtituloMinisterio: string;
  heroTitulo: string;
  heroSubtitulo: string;
  heroCta: string;
  frase_inspiradora: string;
  emailContato: string;
  telefoneContato: string;
  depoimentos: PortalDepoimento[];
  faqItems: FaqItem[];
  oracoes: OracaoItem[];
  milestones: MilestoneItem[];
  tema: string;
  carrosselPrincipal: CarrosselSlide[];
  carrosselServico: CarrosselSlide[];
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  whatsappUrl: string;
  endereco: string;
  enderecoMapUrl: string;
  enderecoEmbedUrl: string;
  youtubeEmbedUrl: string;
  proximaFesta_nome: string;
  proximaFesta_data: string;
  acolitoMes_nome: string;
  acolitoMes_cargo: string;
  acolitoMes_mensagem: string;
  mostrarStats: boolean;
  mostrarMissao: boolean;
  mostrarCarrosselPrincipal: boolean;
  mostrarCarrosselServico: boolean;
  mostrarFuncionalidades: boolean;
  mostrarComoFunciona: boolean;
  mostrarCalendario: boolean;
  mostrarDepoimentos: boolean;
  mostrarContato: boolean;
  mostrarFormulario: boolean;
  mostrarCountdown: boolean;
  mostrarAcolitoMes: boolean;
  mostrarFormacao: boolean;
  mostrarAgenda: boolean;
  mostrarFaq: boolean;
  mostrarCatequese: boolean;
  mostrarOracoes: boolean;
  mostrarTimeline: boolean;
  mostrarMapa: boolean;
  mostrarYoutube: boolean;
  mostrarMandamentos: boolean;
  intencaoMes_titulo: string;
  intencaoMes_texto: string;
  meditacao_versiculo: string;
  meditacao_fonte: string;
  meditacao_texto: string;
  meditacao_reflexao: string;
  atoConsagracao_texto: string;
  calend_santoDoDia: string;
  mostrarCalendarioLiturgico: boolean;
  mostrarGlossario: boolean;
  mostrarParamentos: boolean;
  mostrarGestos: boolean;
  mostrarMissaPassos: boolean;
  mostrarSantos: boolean;
  mostrarIntencaoMes: boolean;
  mostrarMeditacao: boolean;
  mostrarAtoConsagracao: boolean;
  secoes_ordem: string[];
}

export const DEFAULT_SECTION_ORDER: string[] = [
  'mostrarCountdown',
  'mostrarStats',
  'mostrarCarrosselPrincipal',
  'mostrarAcolitoMes',
  'mostrarMissao',
  'mostrarCarrosselServico',
  'mostrarFuncionalidades',
  'mostrarComoFunciona',
  'mostrarFormacao',
  'mostrarSantos',
  'mostrarGestos',
  'mostrarMissaPassos',
  'mostrarCalendario',
  'mostrarCalendarioLiturgico',
  'mostrarAgenda',
  'mostrarFaq',
  'mostrarCatequese',
  'mostrarMandamentos',
  'mostrarGlossario',
  'mostrarParamentos',
  'mostrarOracoes',
  'mostrarIntencaoMes',
  'mostrarMeditacao',
  'mostrarAtoConsagracao',
  'mostrarTimeline',
  'mostrarDepoimentos',
  'mostrarMapa',
  'mostrarYoutube',
  'mostrarContato',
  'mostrarFormulario',
];

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  nomeMinisterio: "Ministério dos Acólitos",
  subtituloMinisterio: "Sistema de Gestão Litúrgica",
  heroTitulo: "O portal do Ministério dos Acólitos",
  heroSubtitulo:
    "Organizamos escalas, acompanhamos cerimoniários e planejamos celebrações com dedicação e fé — um ministério a serviço da liturgia.",
  heroCta: "Conhecer o Ministério",
  frase_inspiradora: '"Servir é nossa missão, a liturgia é nossa vocação."',
  emailContato: "contato@ministerio.org",
  telefoneContato: "",
  depoimentos: [
    {
      nome: "Pe. Carlos",
      cargo: "Pároco",
      texto:
        "O sistema transformou a organização do nosso ministério. As escalas nunca foram tão claras.",
    },
    {
      nome: "Mariana S.",
      cargo: "Coordenadora de Acólitos",
      texto:
        "Incrível ter tudo centralizado: presença, treinamentos e comunicação em um só lugar.",
    },
    {
      nome: "João P.",
      cargo: "Cerimoniário-chefe",
      texto:
        "O calendário litúrgico integrado facilita demais o planejamento das celebrações especiais.",
    },
  ],
  faqItems: [
    {
      q: "O que é o Ministério dos Acólitos?",
      a: "O Ministério dos Acólitos é um grupo de serviço litúrgico que auxilia o celebrante nas missas e celebrações da Igreja. Os acólitos carregam a cruz, o turíbulo, as velas, o missal e os vasos sagrados, garantindo a boa ordem e a beleza da liturgia.",
    },
    {
      q: "Qual a idade mínima para ser acólito?",
      a: "Em geral, aceitamos a partir dos 10 anos de idade, após a Primeira Comunhão. Cada paróquia pode ter critérios específicos — consulte a coordenação do ministério.",
    },
    {
      q: "É necessário ter feito a Primeira Comunhão?",
      a: "Sim. A Primeira Comunhão é um requisito fundamental, pois o acólito participa ativamente da liturgia eucarística e precisa compreender o mistério da Eucaristia.",
    },
    {
      q: "Quantas missas por mês o acólito precisa servir?",
      a: "Geralmente o mínimo é de 2 celebrações por mês, mas isso varia conforme a disponibilidade e a escala do ministério. O sistema de escalas garante a distribuição justa entre todos.",
    },
    {
      q: "Como é o processo de formação?",
      a: "O novo acólito passa por uma formação que inclui: conhecimento das partes da missa, manuseio dos objetos litúrgicos, postura e reverência no altar, e acompanhamento de acólitos experientes antes do primeiro serviço oficial.",
    },
    {
      q: "Posso faltar por motivo de viagem ou compromisso?",
      a: "Sim, desde que a ausência seja comunicada com antecedência à coordenação. O sistema de escalas permite registrar indisponibilidades e o coordenador arranja um substituto.",
    },
    {
      q: "O ministério é aberto para meninas e mulheres?",
      a: "Sim. O Ministério dos Acólitos é aberto a todos — meninos, meninas, jovens e adultos — que tenham recebido a Primeira Comunhão e desejam servir na liturgia.",
    },
    {
      q: "O acólito recebe algum certificado de formação?",
      a: "O ministério pode emitir declarações de participação e o sistema registra o histórico completo de serviços de cada acólito, que pode ser consultado a qualquer momento.",
    },
  ],
  oracoes: [
    {
      titulo: "Pai Nosso",
      subtitulo: "Oração do Senhor · Mt 6,9-13",
      texto:
        "Pai nosso que estais nos céus,\nsantificado seja o vosso nome,\nvenha a nós o vosso reino,\nseja feita a vossa vontade,\nassim na terra como no céu.\nO pão nosso de cada dia nos dai hoje,\nperdoai-nos as nossas ofensas\nassim como nós perdoamos a quem nos tem ofendido,\ne não nos deixeis cair em tentação,\nmas livrai-nos do mal.\nAmém.",
    },
    {
      titulo: "Ave Maria",
      subtitulo: "Saudação Angélica · Lc 1,28-42",
      texto:
        "Ave Maria, cheia de graça,\no Senhor é convosco,\nbendita sois vós entre as mulheres,\ne bendito é o fruto do vosso ventre, Jesus.\nSanta Maria, Mãe de Deus,\nrogai por nós pecadores,\nagora e na hora de nossa morte.\nAmém.",
    },
    {
      titulo: "Glória ao Pai",
      subtitulo: "Doxologia Menor",
      texto:
        "Glória ao Pai,\nao Filho\ne ao Espírito Santo.\nComo era no princípio,\nagora e sempre,\npelos séculos dos séculos.\nAmém.",
    },
    {
      titulo: "Creio em Deus Pai",
      subtitulo: "Símbolo dos Apóstolos",
      texto:
        "Creio em Deus Pai todo-poderoso,\ncriador do céu e da terra;\ne em Jesus Cristo, seu único Filho, Nosso Senhor;\nque foi concebido pelo poder do Espírito Santo;\nnasceu da Virgem Maria;\npadeceu sob Pôncio Pilatos,\nfoi crucificado, morto e sepultado;\ndesceu à mansão dos mortos;\nressuscitou ao terceiro dia;\nsubiu aos céus;\nestá sentado à direita de Deus Pai todo-poderoso;\ne há de vir a julgar os vivos e os mortos.\nCreio no Espírito Santo,\nna Santa Igreja Católica,\nna comunhão dos santos,\nna remissão dos pecados,\nna ressurreição da carne,\nna vida eterna.\nAmém.",
    },
    {
      titulo: "Salve Rainha",
      subtitulo: "Antífona Mariana",
      texto:
        "Salve, Rainha, Mãe de misericórdia,\nvida, doçura e esperança nossa, salve!\nA vós bradamos, os degredados filhos de Eva;\na vós suspiramos, gemendo e chorando\nneste vale de lágrimas.\nEia, pois, advogada nossa,\nesses vossos olhos misericordiosos a nós volvei;\ne depois deste desterro,\nmostrai-nos Jesus,\nbendito fruto do vosso ventre.\nÓ clemente, ó piedosa, ó doce sempre Virgem Maria!",
    },
    {
      titulo: "Ato de Contrição",
      subtitulo: "Oração de Arrependimento",
      texto:
        "Meu Deus, por ser quem sois\ne porque vos amo sobre todas as coisas,\npesa-me de todo o coração\nde vos ter ofendido.\nProponho firmemente,\ncom o auxílio da vossa graça,\nnão vos ofender mais\ne evitar as ocasiões de pecado.\nAmém.",
    },
    {
      titulo: "Anjo de Deus",
      subtitulo: "Oração ao Anjo da Guarda",
      texto:
        "Anjo de Deus,\nmeu anjo da guarda,\niluminai, guardai,\ngoverna e conduzis\na mim, que fui confiado(a)\nà vossa piedade celestial.\nAmém.",
    },
    {
      titulo: "Oração antes das Refeições",
      subtitulo: "Bênção da Mesa",
      texto:
        "Bendizei, Senhor,\nestes alimentos que vamos receber\nda vossa bondade.\nDai pão a quem tem fome,\ne fome de Justiça\na quem tem pão.\nAmém.",
    },
    {
      titulo: "Oração de São Miguel Arcanjo",
      subtitulo: "Proteção Espiritual",
      texto:
        "São Miguel Arcanjo,\ndefendei-nos no combate.\nSede nosso protetor\ncontra as maldades e ciladas do demônio.\nQue Deus, a ele humildemente o pedimos,\nmanifeste sobre ele o seu poder.\nE vós, príncipe da milícia celestial,\npor força divina\nprecipitai no inferno a Satanás\ne os outros espíritos malignos,\nque andam pelo mundo\npara perdição das almas.\nAmém.",
    },
    {
      titulo: "Oração da Manhã",
      subtitulo: "Início do Dia",
      texto:
        "Senhor meu Deus,\nde todo coração vos agradeço\npor me terdes conservado esta noite.\nEsta manhã vos ofereço\ntodos os meus pensamentos,\npalavras e ações.\nGuardai-me dos pecados e do mal,\npara que tudo seja\ndo vosso agrado.\nAmém.",
    },
  ],
  milestones: [
    {
      ano: "1995",
      evento: "Fundação do Ministério",
      desc: "O grupo de acólitos foi fundado com os primeiros membros, sob a coordenação da paróquia.",
    },
    {
      ano: "2000",
      evento: "Primeira Turma Formada",
      desc: "Conclusão do primeiro ciclo completo de formação litúrgica, com acólitos certificados.",
    },
    {
      ano: "2008",
      evento: "50 Acólitos Formados",
      desc: "Marco histórico: o ministério ultrapassa 50 membros formados ao longo de sua história.",
    },
    {
      ano: "2015",
      evento: "Expansão das Celebrações",
      desc: "O ministério passa a cobrir todas as missas dominicais e solenidades do calendário litúrgico.",
    },
    {
      ano: "2020",
      evento: "Superação em Tempos Difíceis",
      desc: "Mesmo durante períodos desafiadores, o ministério se manteve ativo com adaptações e fé.",
    },
    {
      ano: "2024",
      evento: "Sistema Digital Integrado",
      desc: "Implantação do sistema de gestão digital: escalas, presenças e comunicação em uma plataforma.",
    },
  ],
  tema: "wine",
  carrosselPrincipal: [],
  carrosselServico: [],
  instagramUrl: "",
  facebookUrl: "",
  youtubeUrl: "",
  whatsappUrl: "",
  endereco: "",
  enderecoMapUrl: "",
  enderecoEmbedUrl: "",
  youtubeEmbedUrl: "",
  proximaFesta_nome: "",
  proximaFesta_data: "",
  acolitoMes_nome: "",
  acolitoMes_cargo: "",
  acolitoMes_mensagem: "",
  mostrarStats: true,
  mostrarMissao: true,
  mostrarCarrosselPrincipal: true,
  mostrarCarrosselServico: true,
  mostrarFuncionalidades: true,
  mostrarComoFunciona: true,
  mostrarCalendario: true,
  mostrarDepoimentos: true,
  mostrarContato: true,
  mostrarFormulario: true,
  mostrarCountdown: true,
  mostrarAcolitoMes: true,
  mostrarFormacao: true,
  mostrarAgenda: true,
  mostrarFaq: true,
  mostrarCatequese: true,
  mostrarOracoes: true,
  mostrarTimeline: true,
  mostrarMapa: true,
  mostrarYoutube: true,
  mostrarMandamentos: true,
  intencaoMes_titulo: 'Intenção do Mês',
  intencaoMes_texto: 'Pela santificação dos membros do ministério e para que cada celebração seja realizada com fervor e excelência para a glória de Deus.',
  meditacao_versiculo: 'Jo 15,5',
  meditacao_fonte: 'Evangelho de João',
  meditacao_texto: '"Eu sou a videira; vós sois os ramos. Quem permanece em mim e eu nele produz muito fruto, porque sem mim nada podeis fazer."',
  meditacao_reflexao: 'Como acólitos, somos chamados a permanecer unidos a Cristo, especialmente no serviço litúrgico. Que cada gesto, cada reverência, cada momento no altar seja uma oportunidade de nos unirmos a Ele.',
  atoConsagracao_texto: 'Ó São Domingos Sávio, jovem alegre e santo,\nvos pedimos que intercedais por nós, membros deste ministério.\nConsagrai nossas mentes, nossas mãos e nossos corações\npara que sirvamos a Deus com alegria, pureza e fidelidade.\n\nSenhor das coisas santas, ensinai-nos a amar a liturgia,\na reverenciar os sacramentos e a carregar com dignidade\nos objetos sagrados da nossa fé.\n\nMaria, Mãe de Deus e Rainha dos Acólitos,\nprotegei este ministério e a todos que nele servem.\n\nAmém.',
  calend_santoDoDia: '',
  mostrarCalendarioLiturgico: true,
  mostrarGlossario: true,
  mostrarParamentos: true,
  mostrarGestos: true,
  mostrarMissaPassos: true,
  mostrarSantos: true,
  mostrarIntencaoMes: true,
  mostrarMeditacao: true,
  mostrarAtoConsagracao: true,
  secoes_ordem: DEFAULT_SECTION_ORDER,
};

export function loadPortalConfig(): PortalConfig {
  try {
    const stored = localStorage.getItem(PORTAL_CONFIG_KEY);
    if (stored) return { ...DEFAULT_PORTAL_CONFIG, ...JSON.parse(stored) };
  } catch {
    /* ignore */
  }
  return DEFAULT_PORTAL_CONFIG;
}

function cachePortalConfig(cfg: PortalConfig) {
  localStorage.setItem(PORTAL_CONFIG_KEY, JSON.stringify(cfg));
}

const TEMAS = [
  { value: "wine", label: "Vinho / Borgonha", dot: "bg-red-900" },
  { value: "blue", label: "Azul Litúrgico", dot: "bg-blue-700" },
  { value: "green", label: "Verde Esperança", dot: "bg-emerald-700" },
  { value: "purple", label: "Roxo Advento", dot: "bg-violet-700" },
  { value: "gold", label: "Dourado Pascal", dot: "bg-amber-500" },
  {
    value: "white",
    label: "Branco Festivo",
    dot: "bg-gray-200 border border-gray-300",
  },
  { value: "red", label: "Vermelho Pentecostes", dot: "bg-red-600" },
  { value: "rose", label: "Rosa Gaudete", dot: "bg-pink-400" },
];

function compressToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX_W = 1400;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas
          .getContext("2d")!
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("compress failed")),
          "image/jpeg",
          0.82,
        );
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file: File): Promise<string> {
  const blob = await compressToBlob(file);
  const formData = new FormData();
  formData.append("image", blob, "image.jpg");
  const res = await axios.post("/api/portal-images", formData, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data.url as string;
}

const SectionSearchCtx = createContext('')

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({
  icon,
  title,
  subtitle,
  children,
  defaultOpen = false,
}: SectionProps) {
  const search = useContext(SectionSearchCtx)
  const [open, setOpen] = useState(defaultOpen);

  if (search && !title.toLowerCase().includes(search.toLowerCase())) return null;

  return (
    <div className="card w-full min-w-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 p-4 sm:p-5 text-left hover:bg-gray-50/70 transition-colors min-w-0"
      >
        <div className="w-8 h-8 bg-wine-50 rounded-xl flex items-center justify-center text-wine-700 flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-bold text-gray-900 text-sm truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-0 space-y-4 border-t border-gray-100 min-w-0 overflow-x-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

function SlideItem({
  slide,
  index,
  onRemove,
  onUpdate,
  placeholder,
  aspectRatio,
}: {
  slide: CarrosselSlide;
  index: number;
  onRemove: () => void;
  onUpdate: (field: keyof CarrosselSlide, value: string) => void;
  placeholder: string;
  aspectRatio: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onUpdate("imageUrl", url);
    } catch {
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
    }
  }

  const isServerFile = (slide.imageUrl ?? "").includes("/storage/portal/");

  return (
    <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-wine-700 uppercase tracking-wide">
          Slide {index + 1}
        </span>
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
        >
          <Trash2 size={12} /> Remover
        </button>
      </div>

      <div>
        <label className="label">Imagem</label>
        <div className="flex gap-2 min-w-0">
          <input
            value={isServerFile ? "" : (slide.imageUrl ?? "")}
            onChange={(e) => onUpdate("imageUrl", e.target.value)}
            className="input-field text-sm flex-1 min-w-0"
            placeholder={
              isServerFile
                ? "(arquivo salvo no servidor)"
                : "https://exemplo.com/imagem.jpg"
            }
            disabled={isServerFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-wine-700 border border-wine-200 rounded-xl hover:bg-wine-50 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            <Upload size={13} />
            {uploading ? "Carregando..." : "Upload"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
        {isServerFile && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <Check size={11} /> Imagem salva no servidor
            <button
              onClick={() => {
                api
                  .delete("/portal-images", { data: { path: slide.imageUrl } })
                  .catch(() => {});
                onUpdate("imageUrl", "");
              }}
              className="ml-2 text-red-400 hover:text-red-600 underline"
            >
              remover
            </button>
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <span className="inline-block w-3.5 h-3.5 rounded border border-gray-300 bg-gray-200 text-center leading-3 text-[9px] font-bold text-gray-500">i</span>
          Tamanho ideal: 1920 × 840 px — proporção 16:7 (banner panorâmico)
        </p>
      </div>

      {slide.imageUrl && (
        <div
          className="w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm"
          style={{ aspectRatio }}
        >
          <img
            src={slide.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.opacity = "0.3";
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Título</label>
          <input
            value={slide.titulo ?? ""}
            onChange={(e) => onUpdate("titulo", e.target.value)}
            className="input-field text-sm"
            placeholder={placeholder}
          />
        </div>
        <div>
          <label className="label">Descrição</label>
          <input
            value={slide.descricao ?? ""}
            onChange={(e) => onUpdate("descricao", e.target.value)}
            className="input-field text-sm"
            placeholder="Descrição breve"
          />
        </div>
      </div>
    </div>
  );
}

function SlideEditor({
  slides,
  onAdd,
  onRemove,
  onUpdate,
  placeholder,
  aspectRatio,
}: {
  slides: CarrosselSlide[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, field: keyof CarrosselSlide, value: string) => void;
  placeholder: string;
  aspectRatio: string;
}) {
  return (
    <div className="space-y-3">
      {slides.map((slide, i) => (
        <SlideItem
          key={i}
          slide={slide}
          index={i}
          onRemove={() => onRemove(i)}
          onUpdate={(field, value) => onUpdate(i, field, value)}
          placeholder={placeholder}
          aspectRatio={aspectRatio}
        />
      ))}

      {slides.length < 8 && (
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 text-sm font-semibold text-wine-700 hover:text-wine-900 border-2 border-dashed border-wine-200 hover:border-wine-400 rounded-2xl px-4 py-3 w-full transition-all hover:bg-wine-50/50"
        >
          <Plus size={15} />
          Adicionar Slide
          <span className="text-xs font-normal text-gray-400">
            ({slides.length}/8)
          </span>
        </button>
      )}

      {slides.length === 0 && (
        <div className="text-center py-6 text-gray-400">
          <Images size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            Nenhum slide adicionado. Clique em "Adicionar Slide" para começar.
          </p>
        </div>
      )}
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  mostrarCountdown:         "Countdown (próxima festa)",
  mostrarStats:             "Estatísticas (números)",
  mostrarCarrosselPrincipal:"Galeria Principal",
  mostrarAcolitoMes:        "Acólito em Destaque",
  mostrarMissao:            "Nossa Missão",
  mostrarCarrosselServico:  "Fotos de Serviço",
  mostrarFuncionalidades:   "Funcionalidades do Sistema",
  mostrarComoFunciona:      "Como Funciona",
  mostrarFormacao:          "Como Entrar no Ministério",
  mostrarSantos:            "Santos Padroeiros",
  mostrarGestos:            "Gestos e Posições",
  mostrarMissaPassos:       "A Missa Passo a Passo",
  mostrarCalendario:        "Cores Litúrgicas",
  mostrarCalendarioLiturgico:"Calendário Litúrgico do Mês",
  mostrarAgenda:            "Agenda Pública",
  mostrarFaq:               "Perguntas Frequentes (FAQ)",
  mostrarCatequese:         "Catequese",
  mostrarMandamentos:       "Mandamentos da Lei de Deus",
  mostrarGlossario:         "Glossário Litúrgico",
  mostrarParamentos:        "Paramentos e Vestes",
  mostrarOracoes:           "Orações",
  mostrarIntencaoMes:       "Intenção do Mês",
  mostrarMeditacao:         "Meditação da Semana",
  mostrarAtoConsagracao:    "Ato de Consagração",
  mostrarTimeline:          "História do Ministério",
  mostrarDepoimentos:       "Depoimentos",
  mostrarMapa:              "Localização / Mapa",
  mostrarYoutube:           "Vídeo do YouTube",
  mostrarContato:           "Contato / CTA",
  mostrarFormulario:        'Formulário "Quero Servir"',
};

function SortableSecao({
  id,
  active,
  onToggle,
}: {
  id: string;
  active: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        tabIndex={-1}
        aria-label="Arrastar"
      >
        <GripVertical size={16} />
      </button>
      <span className="flex-1 text-sm font-medium text-gray-700 min-w-0 truncate">
        {SECTION_LABELS[id] ?? id}
      </span>
      <div
        onClick={onToggle}
        className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors duration-200 flex-shrink-0 ${active ? "bg-wine-600" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${active ? "translate-x-5" : "translate-x-0"}`}
        />
      </div>
    </div>
  );
}

export default function PortalConfig() {
  const [config, setConfig] = useState<PortalConfig>(loadPortalConfig);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchConfig, setSearchConfig] = useState('');

  useEffect(() => {
    document.title = "Configuração do Portal · Ministério dos Acólitos";
    api
      .get("/configuracoes")
      .then((res) => {
        const remote = res.data?.data?.portal_config;
        if (remote) {
          const merged = { ...DEFAULT_PORTAL_CONFIG, ...remote };
          setConfig(merged);
          cachePortalConfig(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof PortalConfig>(
    key: K,
    value: PortalConfig[K],
  ) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  /* ── Generic array CRUD ─────────────────────────────── */
  function addItem<T>(key: keyof PortalConfig, empty: T) {
    setConfig((prev) => ({
      ...prev,
      [key]: [...((prev[key] as T[]) ?? []), empty],
    }));
    setSaved(false);
  }

  function removeItem(key: keyof PortalConfig, index: number) {
    setConfig((prev) => ({
      ...prev,
      [key]: (prev[key] as unknown[]).filter((_, i) => i !== index),
    }));
    setSaved(false);
  }

  function updateItem<T>(
    key: keyof PortalConfig,
    index: number,
    field: keyof T,
    value: string,
  ) {
    setConfig((prev) => {
      const arr = [...(prev[key] as T[])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [key]: arr };
    });
    setSaved(false);
  }

  /* ── Drag & drop — ordem das seções ─────────────────── */
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleSecoesReorder(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ordem = config.secoes_ordem?.length ? config.secoes_ordem : DEFAULT_SECTION_ORDER
    const oldIdx = ordem.indexOf(String(active.id))
    const newIdx = ordem.indexOf(String(over.id))
    if (oldIdx === -1 || newIdx === -1) return
    update('secoes_ordem', arrayMove(ordem, oldIdx, newIdx))
  }

  /* ── Depoimentos ────────────────────────────────────── */
  function updateDepoimento(
    index: number,
    field: keyof PortalDepoimento,
    value: string,
  ) {
    updateItem<PortalDepoimento>("depoimentos", index, field, value);
  }

  /* ── Carrossel ──────────────────────────────────────── */
  function addSlide(key: "carrosselPrincipal" | "carrosselServico") {
    addItem<CarrosselSlide>(key, { imageUrl: "", titulo: "", descricao: "" });
  }
  function removeSlide(
    key: "carrosselPrincipal" | "carrosselServico",
    index: number,
  ) {
    removeItem(key, index);
  }
  function updateSlide(
    key: "carrosselPrincipal" | "carrosselServico",
    index: number,
    field: keyof CarrosselSlide,
    value: string,
  ) {
    updateItem<CarrosselSlide>(key, index, field, value);
  }

  async function handleSave() {
    try {
      await api.put("/configuracoes", { portal_config: config });
      cachePortalConfig(config);
      setSaved(true);
      toast.success("Configurações do portal salvas!");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    }
  }

  function handleReset() {
    setConfig(DEFAULT_PORTAL_CONFIG);
    setSaved(false);
    toast("Configurações redefinidas para o padrão", { icon: "↩️" });
  }

  const portalUrl = `${window.location.origin}/portal`;

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      <PageHeader
        title="Configuração do Portal"
        subtitle="Personalize o conteúdo e aparência da landing page pública do ministério"
        action={
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <button
              onClick={() => window.open("/portal", "_blank")}
              className="btn-secondary text-sm px-4 py-2 justify-center"
            >
              <Eye size={16} /> Visualizar Portal
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary justify-center"
            >
              <Save size={16} /> {saved ? "Salvo!" : "Salvar"}
            </button>
          </div>
        }
      />

      {/* Link do portal */}
      <div className="card p-4 bg-gradient-to-r from-wine-50 to-gold-50 border border-wine-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-wine-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <Globe size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-wine-600 font-semibold uppercase tracking-wide mb-0.5">
              Endereço do Portal Público
            </p>
            <p className="text-sm font-mono text-wine-900 truncate">
              {portalUrl}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mt-3">
          <button
            onClick={() => window.open("/portal", "_blank")}
            className="flex items-center gap-2 px-4 py-2 bg-wine-900 text-white text-sm font-semibold rounded-xl hover:bg-wine-800 transition-colors"
          >
            <ExternalLink size={15} /> Abrir
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(portalUrl);
              toast.success("Link copiado!");
            }}
            className="px-4 py-2 border border-wine-300 text-wine-800 text-sm font-semibold rounded-xl hover:bg-wine-50 transition-colors"
          >
            Copiar link
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          value={searchConfig}
          onChange={(e) => setSearchConfig(e.target.value)}
          placeholder="Buscar seção de configuração..."
          className="input-field pl-10"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        {searchConfig && (
          <button onClick={() => setSearchConfig('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      <SectionSearchCtx.Provider value={searchConfig}>
      <div className="grid gap-6 lg:grid-cols-2 items-start w-full min-w-0">
        {/* ── Identidade ───────────────────────────────── */}
        <Section icon={<Image size={16} />} title="Identidade do Ministério">
          <div>
            <label className="label">Nome do Ministério</label>
            <input
              value={config.nomeMinisterio}
              onChange={(e) => update("nomeMinisterio", e.target.value)}
              className="input-field"
              placeholder="Ministério dos Acólitos"
            />
          </div>
          <div>
            <label className="label">Subtítulo / Tagline</label>
            <input
              value={config.subtituloMinisterio}
              onChange={(e) => update("subtituloMinisterio", e.target.value)}
              className="input-field"
              placeholder="Sistema de Gestão Litúrgica"
            />
          </div>
          <div>
            <label className="label">Frase Inspiradora</label>
            <textarea
              value={config.frase_inspiradora}
              onChange={(e) => update("frase_inspiradora", e.target.value)}
              rows={2}
              className="input-field resize-none"
              placeholder='"Servir é nossa missão, a liturgia é nossa vocação."'
            />
          </div>
        </Section>

        {/* ── Hero ─────────────────────────────────────── */}
        <Section icon={<Type size={16} />} title="Seção Principal (Hero)">
          <div>
            <label className="label">Título Principal</label>
            <textarea
              value={config.heroTitulo}
              onChange={(e) => update("heroTitulo", e.target.value)}
              rows={2}
              className="input-field resize-none"
              placeholder="O portal do Ministério dos Acólitos"
            />
          </div>
          <div>
            <label className="label">Subtítulo / Descrição</label>
            <textarea
              value={config.heroSubtitulo}
              onChange={(e) => update("heroSubtitulo", e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Descreva o ministério..."
            />
          </div>
          <div>
            <label className="label">Texto do Botão Principal</label>
            <input
              value={config.heroCta}
              onChange={(e) => update("heroCta", e.target.value)}
              className="input-field"
              placeholder="Conhecer o Ministério"
            />
          </div>
        </Section>

        {/* ── Carrossel Principal ───────────────────────── */}
        <div className="lg:col-span-2 min-w-0">
          <Section
            icon={<Images size={16} />}
            title="Carrossel Principal — Galeria de Artes"
            subtitle="Slides exibidos logo após os números do ministério. Ideal para artes e comunicados."
          >
            <SlideEditor
              slides={config.carrosselPrincipal ?? []}
              onAdd={() => addSlide("carrosselPrincipal")}
              onRemove={(i) => removeSlide("carrosselPrincipal", i)}
              onUpdate={(i, f, v) => updateSlide("carrosselPrincipal", i, f, v)}
              placeholder="Arte de Advento 2024"
              aspectRatio="16/7"
            />
          </Section>
        </div>

        {/* ── Carrossel de Serviço ──────────────────────── */}
        <div className="lg:col-span-2 min-w-0">
          <Section
            icon={<Images size={16} />}
            title="Carrossel de Serviço — Acólitos em Ação"
            subtitle='Fotos do serviço dos acólitos em celebrações. Aparece após a seção "Nossa Missão".'
          >
            <SlideEditor
              slides={config.carrosselServico ?? []}
              onAdd={() => addSlide("carrosselServico")}
              onRemove={(i) => removeSlide("carrosselServico", i)}
              onUpdate={(i, f, v) => updateSlide("carrosselServico", i, f, v)}
              placeholder="Missa de Natal — Catedral"
              aspectRatio="16/7"
            />
          </Section>
        </div>

        {/* ── Contato ───────────────────────────────────── */}
        <Section icon={<Mail size={16} />} title="Contato">
          <div>
            <label className="label">E-mail de Contato</label>
            <input
              value={config.emailContato}
              onChange={(e) => update("emailContato", e.target.value)}
              className="input-field"
              type="email"
              placeholder="contato@ministerio.org"
            />
          </div>
          <div>
            <label className="label">Telefone / WhatsApp (opcional)</label>
            <input
              value={config.telefoneContato}
              onChange={(e) => update("telefoneContato", e.target.value)}
              className="input-field"
              placeholder="(11) 99999-9999"
            />
          </div>
        </Section>

        {/* ── Redes Sociais ─────────────────────────────── */}
        <Section
          icon={<Link2 size={16} />}
          title="Redes Sociais"
          subtitle="Links exibidos no rodapé e seção de contato. Deixe em branco para ocultar."
        >
          {[
            {
              key: "instagramUrl" as const,
              label: "Instagram",
              placeholder: "https://instagram.com/seu_perfil",
              color: "text-pink-500",
            },
            {
              key: "facebookUrl" as const,
              label: "Facebook",
              placeholder: "https://facebook.com/sua_pagina",
              color: "text-blue-600",
            },
            {
              key: "youtubeUrl" as const,
              label: "YouTube",
              placeholder: "https://youtube.com/@seu_canal",
              color: "text-red-500",
            },
            {
              key: "whatsappUrl" as const,
              label: "WhatsApp",
              placeholder: "https://wa.me/55119999999999",
              color: "text-green-600",
            },
          ].map(({ key, label, placeholder, color }) => (
            <div key={key}>
              <label className="label">
                <span className={`text-xs font-bold ${color}`}>{label}</span>
              </label>
              <input
                value={config[key] ?? ""}
                onChange={(e) => update(key, e.target.value)}
                className="input-field"
                placeholder={placeholder}
              />
            </div>
          ))}
        </Section>

        {/* ── Depoimentos ──────────────────────────────── */}
        <Section
          icon={<MessageSquare size={16} />}
          title="Depoimentos"
          subtitle="Até 3 depoimentos exibidos na seção de testemunhos."
        >
          <div className="space-y-4">
            {config.depoimentos.map((dep, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-xl p-4 space-y-2.5"
              >
                <p className="text-xs font-semibold text-wine-700 uppercase tracking-wide">
                  Depoimento {i + 1}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="label">Nome</label>
                    <input
                      value={dep.nome}
                      onChange={(e) =>
                        updateDepoimento(i, "nome", e.target.value)
                      }
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">Cargo / Função</label>
                    <input
                      value={dep.cargo}
                      onChange={(e) =>
                        updateDepoimento(i, "cargo", e.target.value)
                      }
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Texto do Depoimento</label>
                  <textarea
                    value={dep.texto}
                    onChange={(e) =>
                      updateDepoimento(i, "texto", e.target.value)
                    }
                    rows={2}
                    className="input-field resize-none text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Acólito em Destaque ───────────────────────── */}
        <Section
          icon={<BarChart3 size={16} />}
          title="Acólito em Destaque"
          subtitle="Destaque um membro do ministério. Deixe o nome em branco para ocultar automaticamente."
        >
          <div>
            <label className="label">Nome do Acólito</label>
            <input
              value={config.acolitoMes_nome ?? ""}
              onChange={(e) => update("acolitoMes_nome", e.target.value)}
              className="input-field"
              placeholder="Ex: João Pedro"
            />
          </div>
          <div>
            <label className="label">Cargo / Função</label>
            <input
              value={config.acolitoMes_cargo ?? ""}
              onChange={(e) => update("acolitoMes_cargo", e.target.value)}
              className="input-field"
              placeholder="Ex: Cerimoniário-Chefe · 3 anos de serviço"
            />
          </div>
          <div>
            <label className="label">Mensagem de Destaque</label>
            <textarea
              value={config.acolitoMes_mensagem ?? ""}
              onChange={(e) => update("acolitoMes_mensagem", e.target.value)}
              rows={2}
              className="input-field resize-none"
              placeholder="Ex: Servir na liturgia é um privilégio que renova minha fé a cada celebração."
            />
          </div>
        </Section>

        {/* ── Countdown ─────────────────────────────────── */}
        <Section
          icon={<Mail size={16} />}
          title="Countdown — Próxima Grande Celebração"
          subtitle="Exibe um contador regressivo no portal. Deixe a data em branco para ocultar."
        >
          <div>
            <label className="label">Nome da Celebração</label>
            <input
              value={config.proximaFesta_nome ?? ""}
              onChange={(e) => update("proximaFesta_nome", e.target.value)}
              className="input-field"
              placeholder="Ex: Natal do Senhor · Corpus Christi"
            />
          </div>
          <div>
            <label className="label">Data</label>
            <input
              type="date"
              value={config.proximaFesta_data ?? ""}
              onChange={(e) => update("proximaFesta_data", e.target.value)}
              className="input-field"
            />
          </div>
        </Section>

        {/* ── Localização ───────────────────────────────── */}
        <Section
          icon={<Link2 size={16} />}
          title="Localização da Paróquia"
          subtitle="Endereço exibido na seção de mapa do portal."
        >
          <div>
            <label className="label">Endereço Completo</label>
            <textarea
              value={config.endereco ?? ""}
              onChange={(e) => update("endereco", e.target.value)}
              rows={2}
              className="input-field resize-none"
              placeholder="Rua das Flores, 123 · Bairro Centro · Cidade - UF · CEP 00000-000"
            />
          </div>
          <div>
            <label className="label">Link do Google Maps (opcional)</label>
            <input
              value={config.enderecoMapUrl ?? ""}
              onChange={(e) => update("enderecoMapUrl", e.target.value)}
              className="input-field"
              placeholder="https://maps.google.com/..."
            />
          </div>
          <div>
            <label className="label">URL de incorporação do Google Maps (opcional)</label>
            <input
              value={config.enderecoEmbedUrl ?? ""}
              onChange={(e) => update("enderecoEmbedUrl", e.target.value)}
              className="input-field"
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
            <p className="mt-1 text-xs text-gray-400">No Google Maps: Compartilhar → Incorporar mapa → copie o src do iframe</p>
          </div>
        </Section>

        {/* ── YouTube Embed ─────────────────────────────── */}
        <div className="lg:col-span-2 min-w-0">
          <Section
            icon={<Link2 size={16} />}
            title="Vídeo do YouTube"
            subtitle="Cole a URL de incorporação. Ex: https://www.youtube.com/embed/VIDEOID"
          >
            <div>
              <label className="label">URL de Incorporação (embed)</label>
              <input
                value={config.youtubeEmbedUrl ?? ""}
                onChange={(e) => update("youtubeEmbedUrl", e.target.value)}
                className="input-field"
                placeholder="https://www.youtube.com/embed/VIDEOID"
              />
            </div>
            <p className="text-xs text-gray-400">
              No YouTube: Compartilhar → Incorporar → copie apenas o src do
              iframe.
            </p>
          </Section>
        </div>

        {/* ── FAQ ──────────────────────────────────────── */}
        <div className="lg:col-span-2 min-w-0">
          <Section
            icon={<HelpCircle size={16} />}
            title="Perguntas Frequentes (FAQ)"
            subtitle="Perguntas e respostas exibidas na seção FAQ do portal."
          >
            <div className="space-y-3">
              {(config.faqItems ?? []).map((item, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-wine-700 uppercase tracking-wide">
                      Pergunta {i + 1}
                    </span>
                    <button
                      onClick={() => removeItem("faqItems", i)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={12} /> Remover
                    </button>
                  </div>
                  <div>
                    <label className="label">Pergunta</label>
                    <input
                      value={item.q}
                      onChange={(e) =>
                        updateItem<FaqItem>("faqItems", i, "q", e.target.value)
                      }
                      className="input-field text-sm"
                      placeholder="O que é o Ministério dos Acólitos?"
                    />
                  </div>
                  <div>
                    <label className="label">Resposta</label>
                    <textarea
                      value={item.a}
                      onChange={(e) =>
                        updateItem<FaqItem>("faqItems", i, "a", e.target.value)
                      }
                      rows={2}
                      className="input-field text-sm resize-none"
                      placeholder="Descreva a resposta..."
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => addItem<FaqItem>("faqItems", { q: "", a: "" })}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-wine-700 hover:text-wine-900 border-2 border-dashed border-wine-200 hover:border-wine-400 rounded-2xl px-4 py-3 w-full transition-all hover:bg-wine-50/50"
              >
                <Plus size={15} /> Adicionar Pergunta
              </button>
            </div>
          </Section>
        </div>

        {/* ── Orações ──────────────────────────────────── */}
        <div className="lg:col-span-2 min-w-0">
          <Section
            icon={<BookOpen size={16} />}
            title="Orações"
            subtitle="Orações exibidas na seção de orações do portal. Adicione, edite ou remova conforme necessário."
          >
            <div className="space-y-3">
              {(config.oracoes ?? []).map((oracao, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-wine-700 uppercase tracking-wide">
                      Oração {i + 1}
                    </span>
                    <button
                      onClick={() => removeItem("oracoes", i)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={12} /> Remover
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="label">Título</label>
                      <input
                        value={oracao.titulo}
                        onChange={(e) =>
                          updateItem<OracaoItem>(
                            "oracoes",
                            i,
                            "titulo",
                            e.target.value,
                          )
                        }
                        className="input-field text-sm"
                        placeholder="Pai Nosso"
                      />
                    </div>
                    <div>
                      <label className="label">Subtítulo / Referência</label>
                      <input
                        value={oracao.subtitulo}
                        onChange={(e) =>
                          updateItem<OracaoItem>(
                            "oracoes",
                            i,
                            "subtitulo",
                            e.target.value,
                          )
                        }
                        className="input-field text-sm"
                        placeholder="Oração do Senhor · Mt 6,9-13"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Texto da Oração</label>
                    <textarea
                      value={oracao.texto}
                      onChange={(e) =>
                        updateItem<OracaoItem>(
                          "oracoes",
                          i,
                          "texto",
                          e.target.value,
                        )
                      }
                      rows={5}
                      className="input-field text-sm font-serif leading-relaxed"
                      placeholder="Texto completo da oração..."
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  addItem<OracaoItem>("oracoes", {
                    titulo: "",
                    subtitulo: "",
                    texto: "",
                  })
                }
                className="flex items-center justify-center gap-2 text-sm font-semibold text-wine-700 hover:text-wine-900 border-2 border-dashed border-wine-200 hover:border-wine-400 rounded-2xl px-4 py-3 w-full transition-all hover:bg-wine-50/50"
              >
                <Plus size={15} /> Adicionar Oração
              </button>
            </div>
          </Section>
        </div>

        {/* ── História / Linha do Tempo ─────────────────── */}
        <div className="lg:col-span-2 min-w-0">
          <Section
            icon={<Flag size={16} />}
            title="História do Ministério — Linha do Tempo"
            subtitle="Marcos históricos exibidos na seção de timeline do portal."
          >
            <div className="space-y-3">
              {(config.milestones ?? []).map((m, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-wine-700 uppercase tracking-wide">
                      Marco {i + 1}
                    </span>
                    <button
                      onClick={() => removeItem("milestones", i)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={12} /> Remover
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="label">Ano</label>
                      <input
                        value={m.ano}
                        onChange={(e) =>
                          updateItem<MilestoneItem>(
                            "milestones",
                            i,
                            "ano",
                            e.target.value,
                          )
                        }
                        className="input-field text-sm"
                        placeholder="2024"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Evento</label>
                      <input
                        value={m.evento}
                        onChange={(e) =>
                          updateItem<MilestoneItem>(
                            "milestones",
                            i,
                            "evento",
                            e.target.value,
                          )
                        }
                        className="input-field text-sm"
                        placeholder="Nome do marco histórico"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Descrição</label>
                    <textarea
                      value={m.desc}
                      onChange={(e) =>
                        updateItem<MilestoneItem>(
                          "milestones",
                          i,
                          "desc",
                          e.target.value,
                        )
                      }
                      rows={2}
                      className="input-field text-sm resize-none"
                      placeholder="Breve descrição do que aconteceu neste marco."
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  addItem<MilestoneItem>("milestones", {
                    ano: "",
                    evento: "",
                    desc: "",
                  })
                }
                className="flex items-center justify-center gap-2 text-sm font-semibold text-wine-700 hover:text-wine-900 border-2 border-dashed border-wine-200 hover:border-wine-400 rounded-2xl px-4 py-3 w-full transition-all hover:bg-wine-50/50"
              >
                <Plus size={15} /> Adicionar Marco
              </button>
            </div>
          </Section>
        </div>

        {/* ── Calendário Litúrgico ──────────────────────── */}
        <Section
          icon={<BookOpen size={16} />}
          title="Calendário Litúrgico"
          subtitle="Santo em destaque do período. O tempo litúrgico é calculado automaticamente."
        >
          <div>
            <label className="label">Santo do Período (opcional)</label>
            <input
              value={config.calend_santoDoDia ?? ''}
              onChange={e => update('calend_santoDoDia', e.target.value)}
              className="input-field"
              placeholder="Ex: São Tarcísio · 15 de agosto"
            />
          </div>
        </Section>

        {/* ── Intenção do Mês ───────────────────────────── */}
        <Section
          icon={<BookOpen size={16} />}
          title="Intenção do Mês"
          subtitle="Intenção de oração do grupo para o mês atual."
        >
          <div>
            <label className="label">Título (ex: Intenção de Junho)</label>
            <input
              value={config.intencaoMes_titulo ?? ''}
              onChange={e => update('intencaoMes_titulo', e.target.value)}
              className="input-field"
              placeholder="Intenção do Mês"
            />
          </div>
          <div>
            <label className="label">Texto da Intenção</label>
            <textarea
              value={config.intencaoMes_texto ?? ''}
              onChange={e => update('intencaoMes_texto', e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Pela santificação dos membros do ministério..."
            />
          </div>
        </Section>

        {/* ── Meditação ─────────────────────────────────── */}
        <Section
          icon={<BookOpen size={16} />}
          title="Meditação da Semana"
          subtitle="Versículo bíblico com reflexão para o grupo."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="label">Referência (ex: Jo 15,5)</label>
              <input
                value={config.meditacao_versiculo ?? ''}
                onChange={e => update('meditacao_versiculo', e.target.value)}
                className="input-field text-sm"
                placeholder="Jo 15,5"
              />
            </div>
            <div>
              <label className="label">Fonte (ex: Evangelho de João)</label>
              <input
                value={config.meditacao_fonte ?? ''}
                onChange={e => update('meditacao_fonte', e.target.value)}
                className="input-field text-sm"
                placeholder="Evangelho de João"
              />
            </div>
          </div>
          <div>
            <label className="label">Texto do Versículo</label>
            <textarea
              value={config.meditacao_texto ?? ''}
              onChange={e => update('meditacao_texto', e.target.value)}
              rows={2}
              className="input-field resize-none text-sm"
              placeholder='"Eu sou a videira; vós sois os ramos..."'
            />
          </div>
          <div>
            <label className="label">Reflexão</label>
            <textarea
              value={config.meditacao_reflexao ?? ''}
              onChange={e => update('meditacao_reflexao', e.target.value)}
              rows={3}
              className="input-field resize-none text-sm"
              placeholder="Breve reflexão sobre o versículo para os acólitos..."
            />
          </div>
        </Section>

        {/* ── Ato de Consagração ────────────────────────── */}
        <div className="lg:col-span-2 min-w-0">
          <Section
            icon={<BookOpen size={16} />}
            title="Ato de Consagração ao Santo Padroeiro"
            subtitle="São Domingos Sávio é o santo padroeiro fixo do ministério. O texto abaixo é totalmente configurável."
          >
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              Santo padroeiro fixo do ministério: <strong>São Domingos Sávio</strong>. O texto da consagração pode ser personalizado livremente.
            </div>
            <div>
              <label className="label">Texto do Ato de Consagração</label>
              <textarea
                value={config.atoConsagracao_texto ?? ''}
                onChange={e => update('atoConsagracao_texto', e.target.value)}
                rows={8}
                className="input-field resize-none text-sm font-serif leading-relaxed"
                placeholder="Ó São Domingos Sávio..."
              />
            </div>
          </Section>
        </div>

        {/* ── Visibilidade das seções ───────────────────── */}
        <div className="lg:col-span-2 min-w-0">
          <Section
            icon={<Eye size={16} />}
            title="Visibilidade e Ordem das Seções"
            subtitle="Arraste para reordenar. O toggle ativa ou desativa cada seção no portal."
          >
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-3">
              <GripVertical size={12} /> Arraste pela alça para mudar a ordem de exibição
            </p>
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleSecoesReorder}>
              <SortableContext
                items={config.secoes_ordem?.length ? config.secoes_ordem : DEFAULT_SECTION_ORDER}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-1.5">
                  {(config.secoes_ordem?.length ? config.secoes_ordem : DEFAULT_SECTION_ORDER).map((key) => (
                    <SortableSecao
                      key={key}
                      id={key}
                      active={(config[key as keyof PortalConfig] ?? true) as boolean}
                      onToggle={() => update(key as keyof PortalConfig, !(config[key as keyof PortalConfig] ?? true) as PortalConfig[keyof PortalConfig])}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </Section>
        </div>

        {/* ── Tema de cores ─────────────────────────────── */}
        <Section icon={<Palette size={16} />} title="Paleta de Cores do Portal">
          <p className="text-xs text-gray-500">
            Escolha o tema visual principal do portal público.
          </p>
          <div className="space-y-2">
            {TEMAS.map((tema) => (
              <button
                key={tema.value}
                onClick={() => update("tema", tema.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  config.tema === tema.value
                    ? "border-wine-700 bg-wine-50 text-wine-900"
                    : "border-gray-200 hover:border-wine-300 text-gray-700"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex-shrink-0 ${tema.dot}`}
                />
                {tema.label}
                {config.tema === tema.value && (
                  <span className="ml-auto text-xs font-semibold text-wine-700 bg-wine-100 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>
      </div>
      </SectionSearchCtx.Provider>

      {/* Actions footer */}
      <div className="card p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw size={15} /> Redefinir para padrão
        </button>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => window.open("/portal", "_blank")}
            className="btn-secondary text-sm justify-center"
          >
            <Eye size={15} /> Visualizar Portal
          </button>
          <button onClick={handleSave} className="btn-primary justify-center">
            <Save size={16} />{" "}
            {saved ? "Configurações salvas!" : "Salvar Configurações"}
          </button>
        </div>
      </div>
    </div>
  );
}
