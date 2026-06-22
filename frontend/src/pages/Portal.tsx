import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Users,
  CalendarDays,
  ShieldCheck,
  ListChecks,
  Bell,
  ChevronRight,
  ChevronUp,
  ChevronLeft,
  Star,
  Clock,
  CheckCircle2,
  BarChart3,
  Layers,
  Menu,
  X,
  Mail,
  Phone,
  Heart,
  Cross,
  BookOpen,
  Award,
  Loader2,
  Send,
  Images,
  MessageSquare,
  Link2,
  GraduationCap,
  MapPin,
  HelpCircle,
  ChevronDown,
  Play,
  Flag,
  Trophy,
  Church,
} from "lucide-react";
import logoGrupo from "../assets/logogrupo.png";
import imgTarcisio from "../assets/saotarcisio.png";
import imgDomingos from "../assets/saodomingos.png";
import {
  loadPortalConfig,
  DEFAULT_PORTAL_CONFIG,
  DEFAULT_SECTION_ORDER,
  type PortalConfig,
  type CarrosselSlide,
} from "./PortalConfig";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ── Portal Stats types ────────────────────────────────── */
interface ProxCelebracao {
  data: string;
  horario: string;
  periodo_liturgico: string;
  celebracao_noite: boolean;
  tipo: string;
}

interface PortalStats {
  total_acolitos: number;
  total_celebracoes: number;
  celebracoes_semana: number;
  presenca_media: number;
  anos_servico: number;
  proximas_celebracoes: ProxCelebracao[];
  agenda: ProxCelebracao[];
}

async function fetchPortalStats(): Promise<PortalStats | null> {
  try {
    const res = await fetch("/api/portal-stats");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ── Intersection Observer hook ───────────────────────── */
function useVisible(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Animated counter ─────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useVisible(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(to / 60);
    const timer = setInterval(() => {
      start = Math.min(start + step, to);
      setVal(start);
      if (start >= to) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [visible, to]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

/* ── Tema → cores ─────────────────────────────────────── */
const TEMA_COLORS: Record<
  string,
  {
    from: string;
    to: string;
    mid: string;
    text: string;
    light: string;
    accent: string;
  }
> = {
  wine: {
    from: "#7c2d12",
    to: "#c2410c",
    mid: "#9a3412",
    text: "#7c2d12",
    light: "#fff7ed",
    accent: "#fbbf24",
  },
  blue: {
    from: "#1e3a8a",
    to: "#2563eb",
    mid: "#1d4ed8",
    text: "#1e3a8a",
    light: "#eff6ff",
    accent: "#60a5fa",
  },
  green: {
    from: "#14532d",
    to: "#16a34a",
    mid: "#15803d",
    text: "#14532d",
    light: "#f0fdf4",
    accent: "#4ade80",
  },
  purple: {
    from: "#4c1d95",
    to: "#7c3aed",
    mid: "#6d28d9",
    text: "#4c1d95",
    light: "#f5f3ff",
    accent: "#c084fc",
  },
  gold: {
    from: "#78350f",
    to: "#d97706",
    mid: "#92400e",
    text: "#78350f",
    light: "#fefce8",
    accent: "#fcd34d",
  },
  white: {
    from: "#94a3b8",
    to: "#cbd5e1",
    mid: "#94a3b8",
    text: "#334155",
    light: "#f8fafc",
    accent: "#e2e8f0",
  },
  red: {
    from: "#7f1d1d",
    to: "#dc2626",
    mid: "#b91c1c",
    text: "#7f1d1d",
    light: "#fef2f2",
    accent: "#fca5a5",
  },
  rose: {
    from: "#9d174d",
    to: "#ec4899",
    mid: "#be185d",
    text: "#9d174d",
    light: "#fdf2f8",
    accent: "#f9a8d4",
  },
};

const features = [
  {
    icon: Users,
    color: "bg-wine-900 text-white",
    badge: "Equipe",
    title: "Gestão de Acólitos",
    description:
      "Cadastre, organize e acompanhe cada acólito com perfil completo, função e histórico de serviço.",
  },
  {
    icon: CalendarDays,
    color: "bg-amber-500 text-wine-900",
    badge: "Liturgia",
    title: "Calendário Litúrgico Inteligente",
    description:
      "Visualize celebrações e datas especiais em um calendário que muda de cor com o tempo da Igreja.",
  },
  {
    icon: ListChecks,
    color: "bg-wine-700 text-white",
    badge: "Escalas",
    title: "Escalonamento de Celebrações",
    description:
      "Monte escalas com praticidade, controle presenças e gere relatórios com um clique.",
  },
  {
    icon: ShieldCheck,
    color: "bg-emerald-600 text-white",
    badge: "Segurança",
    title: "Controle de Acesso Seguro",
    description:
      "Perfis de permissão, histórico de auditoria e dados protegidos para toda a equipe.",
  },
  {
    icon: BarChart3,
    color: "bg-violet-600 text-white",
    badge: "Análise",
    title: "Relatórios e Métricas",
    description:
      "Acompanhe frequência, participação e evolução de cada membro do ministério.",
  },
  {
    icon: Bell,
    color: "bg-amber-500 text-wine-950",
    badge: "Avisos",
    title: "Comunicação Instantânea",
    description:
      "Notificações claras para toda a equipe sobre alterações, confirmações e novidades.",
  },
];

const steps = [
  {
    num: "01",
    icon: Users,
    title: "Cadastro da Equipe",
    desc: "Acólitos são cadastrados com disponibilidade, função e perfil completo no sistema.",
  },
  {
    num: "02",
    icon: CalendarDays,
    title: "Celebrações",
    desc: "As celebrações são registradas com data, horário, período litúrgico e características.",
  },
  {
    num: "03",
    icon: ListChecks,
    title: "Montagem das Escalas",
    desc: "A escala é montada com arrastar e soltar, respeitando disponibilidade de cada acólito.",
  },
  {
    num: "04",
    icon: CheckCircle2,
    title: "Acompanhamento",
    desc: "Presenças, treinamentos e histórico são acompanhados em tempo real pelo coordenador.",
  },
];

/* ── Countdown hook ───────────────────────────────────── */
function useCountdown(targetDate: string) {
  const [left, setLeft] = useState<{
    d: number;
    h: number;
    m: number;
    s: number;
  } | null>(null);
  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      // Parse como horário LOCAL (evita problema de UTC vs fuso do Brasil)
      const iso =
        targetDate.length === 10 ? targetDate + "T23:59:59" : targetDate;
      const diff = new Date(iso).getTime() - Date.now();
      if (diff <= 0) {
        setLeft(null);
        return;
      }
      setLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return left;
}

/* ── Mandamentos da Lei de Deus ───────────────────────── */
const mandamentos = [
  {
    num: "1º",
    titulo: "Amar a Deus sobre todas as coisas",
    desc: "Amarás o Senhor, teu Deus, com todo o teu coração, com toda a tua alma e com todo o teu entendimento. Nenhuma criatura deve ser colocada acima d'Ele.",
    cor: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    num: "2º",
    titulo: "Não tomar o nome de Deus em vão",
    desc: "O nome de Deus é santo e deve ser pronunciado com respeito. Não se deve blasfemar, jurar em falso nem usar o nome de Deus de forma leviana.",
    cor: "#2563eb",
    bg: "#eff6ff",
  },
  {
    num: "3º",
    titulo: "Guardar os domingos e festas de guarda",
    desc: "O domingo é o dia do Senhor. Devemos participar da Santa Missa, descansar das obras servis e dedicar esse dia à adoração e às obras de misericórdia.",
    cor: "#0891b2",
    bg: "#ecfeff",
  },
  {
    num: "4º",
    titulo: "Honrar pai e mãe",
    desc: "Devemos respeitar, obedecer e cuidar dos nossos pais e superiores. Este mandamento estende-se ao respeito por todas as autoridades legítimas.",
    cor: "#059669",
    bg: "#f0fdf4",
  },
  {
    num: "5º",
    titulo: "Não matar",
    desc: "A vida humana é sagrada, pois o homem foi criado à imagem e semelhança de Deus. É proibido qualquer ato que atente contra a dignidade da vida.",
    cor: "#dc2626",
    bg: "#fef2f2",
  },
  {
    num: "6º",
    titulo: "Não pecar contra a castidade",
    desc: "Devemos manter pureza de pensamentos, palavras e ações. A castidade é a integração da sexualidade na pessoa segundo sua vocação.",
    cor: "#db2777",
    bg: "#fdf2f8",
  },
  {
    num: "7º",
    titulo: "Não furtar",
    desc: "É proibido tomar o que pertence ao próximo, reter injustamente salário, fazer fraudes ou prejudicar o bem comum. Devemos ser honestos e generosos.",
    cor: "#d97706",
    bg: "#fffbeb",
  },
  {
    num: "8º",
    titulo: "Não levantar falso testemunho",
    desc: "Devemos sempre falar a verdade. É proibido mentir, caluniar, difamar ou causar dano à honra e à reputação do próximo.",
    cor: "#0ea5e9",
    bg: "#f0f9ff",
  },
  {
    num: "9º",
    titulo: "Não desejar a mulher do próximo",
    desc: "Devemos guardar a pureza do coração e da vontade. O desejo desordenado é contrário ao amor conjugal e à fidelidade.",
    cor: "#9333ea",
    bg: "#faf5ff",
  },
  {
    num: "10º",
    titulo: "Não cobiçar as coisas alheias",
    desc: "Devemos dominar os desejos de riqueza excessiva e o apego aos bens materiais. A cobiça desordenada opõe-se à justiça e à caridade.",
    cor: "#16a34a",
    bg: "#f0fdf4",
  },
];

/* ── Calendário Litúrgico ─────────────────────────── */
function computeEaster(year: number): Date {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100;
  const d = Math.floor(b / 4),
    e = b % 4;
  const f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4),
    k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getLiturgicalSeason(date: Date) {
  const year = date.getFullYear();
  const doy = Math.floor(
    (date.getTime() - new Date(year, 0, 0).getTime()) / 86400000,
  );
  const easter = computeEaster(year);
  const easterDoy = Math.floor(
    (easter.getTime() - new Date(year, 0, 0).getTime()) / 86400000,
  );

  // Advent: 4th Sunday before Christmas (approx Nov 27 – Dec 24)
  const christmas = new Date(year, 11, 25);
  const christmasDow = christmas.getDay();
  const adventStart = new Date(year, 11, 25 - christmasDow - 21);
  const adventDoy = Math.floor(
    (adventStart.getTime() - new Date(year, 0, 0).getTime()) / 86400000,
  );

  if (doy >= adventDoy && doy <= 358)
    return { nome: "Advento", cor: "#7c3aed", corNome: "Roxo", emoji: "✦" };
  if (doy >= 359 || doy <= 12)
    return {
      nome: "Natal",
      cor: "#f59e0b",
      corNome: "Branco/Dourado",
      emoji: "✦",
    };
  if (doy > easterDoy - 46 && doy < easterDoy)
    return { nome: "Quaresma", cor: "#6d28d9", corNome: "Roxo", emoji: "✦" };
  if (doy >= easterDoy && doy < easterDoy + 49)
    return {
      nome: "Tempo Pascal",
      cor: "#d97706",
      corNome: "Branco/Dourado",
      emoji: "✦",
    };
  if (doy === easterDoy + 49)
    return {
      nome: "Pentecostes",
      cor: "#dc2626",
      corNome: "Vermelho",
      emoji: "✦",
    };
  return { nome: "Tempo Comum", cor: "#16a34a", corNome: "Verde", emoji: "✦" };
}

const glossario = [
  {
    termo: "Âmbão",
    def: "Estrado ou púlpito de onde se proclama a Palavra de Deus. É reservado às leituras, ao salmo responsorial, ao Evangelho, à homilia e às preces.",
  },
  {
    termo: "Credência",
    def: "Mesa lateral no presbitério onde são colocados os vasos sagrados, o missal, as âmbulas e outros objetos litúrgicos antes e após a Missa.",
  },
  {
    termo: "Estola",
    def: "Faixa comprida que o sacerdote usa ao redor do pescoço e cruzada sobre o peito. Representa a autoridade sacerdotal e sua cor varia com o tempo litúrgico.",
  },
  {
    termo: "Turíbulo",
    def: "Recipiente metálico suspenso por correntes, usado para queimar incenso durante as celebrações. O acólito que o carrega chama-se turiferário.",
  },
  {
    termo: "Naveta",
    def: "Pequeno recipiente em forma de barco que contém o incenso a ser colocado no turíbulo. Geralmente acompanha o turíbulo.",
  },
  {
    termo: "Cálice",
    def: "Taça sagrada de metal usado para conter o vinho que se torna o Sangue de Cristo na consagração.",
  },
  {
    termo: "Patena",
    def: "Prato sagrado, geralmente de metal dourado, sobre o qual é colocada a hóstia durante a Missa. Pode também ser usada para recolher hóstias.",
  },
  {
    termo: "Píxide",
    def: "Recipiente com tampa, geralmente metálico, usado para guardar ou distribuir hóstias consagradas. É mantido no Tabernáculo.",
  },
  {
    termo: "Custódia",
    def: "Recipiente suntuoso, em forma de sol radiante, usado para expor o Santíssimo Sacramento à adoração dos fiéis.",
  },
  {
    termo: "Pluvial",
    def: "Manto litúrgico sem mangas, preso na frente por um fecho, usado em procissões, bênçãos e outras celebrações não eucarísticas.",
  },
  {
    termo: "Casula",
    def: "Veste exterior que o sacerdote usa sobre a alba e a estola durante a Missa. Sua cor varia conforme o tempo litúrgico.",
  },
  {
    termo: "Alba",
    def: "Veste branca comprida, usada por ministros ordenados e acólitos. Simboliza a pureza batismal e a vida nova em Cristo.",
  },
  {
    termo: "Presbitério",
    def: "Parte elevada da igreja onde se encontra o altar, o âmbão e a sede presidencial. É o espaço reservado ao celebrante e aos ministros.",
  },
  {
    termo: "Tabernáculo",
    def: "Pequeno cofre sagrado, geralmente de metal, onde se guarda o Santíssimo Sacramento. Diante dele se genuflecte.",
  },
  {
    termo: "Aspersório",
    def: "Instrumento usado para borrifar água benta sobre os fiéis ou objetos. Pode ser um raminho de hissopo ou um rolo metálico perfurado.",
  },
];

const paramentos = [
  {
    nome: "Alba",
    desc: "Veste comprida de linho branco, símbolo da pureza batismal. Usada por sacerdotes, diáconos e acólitos em todas as celebrações.",
    cor: "#f8fafc",
    corBorda: "#cbd5e1",
    corTexto: "#334155",
    tempos: "Todos os tempos",
  },
  {
    nome: "Estola",
    desc: "Faixa sagrada que representa o jugo suave de Cristo. O sacerdote a usa cruzada; o diácono, transversal. Cor varia com o tempo litúrgico.",
    cor: "#f5f3ff",
    corBorda: "#8b5cf6",
    corTexto: "#4c1d95",
    tempos: "Conforme o tempo",
  },
  {
    nome: "Casula / Planeta",
    desc: "Veste principal do sacerdote na Missa. Cobre a alba e a estola. Sua cor litúrgica é o elemento mais visível do tempo da Igreja.",
    cor: "#fff7ed",
    corBorda: "#f97316",
    corTexto: "#7c2d12",
    tempos: "Conforme o tempo",
  },
  {
    nome: "Dalmática",
    desc: "Veste larga com mangas, usada pelo diácono. É mais larga que a casula e representa o serviço ao próximo.",
    cor: "#eff6ff",
    corBorda: "#3b82f6",
    corTexto: "#1e3a8a",
    tempos: "Conforme o tempo",
  },
  {
    nome: "Pluvial / Capa de Asperge",
    desc: "Manto sem mangas usado em procissões, bênçãos e horas do ofício. Não é usado durante a Missa propriamente dita.",
    cor: "#f0fdf4",
    corBorda: "#22c55e",
    corTexto: "#14532d",
    tempos: "Procissões e bênçãos",
  },
  {
    nome: "Mitra",
    desc: "Chapéu pontudo que o bispo usa em celebrações solenes. Símbolo da autoridade episcopal.",
    cor: "#fefce8",
    corBorda: "#eab308",
    corTexto: "#78350f",
    tempos: "Celebrações episcopais",
  },
];

const coresLiturgicas: {
  cor: string;
  borda?: string;
  nome: string;
  uso: string;
}[] = [
  {
    cor: "#ffffff",
    borda: "#e2e8f0",
    nome: "Branco",
    uso: "Natal, Páscoa, festas de Maria, Confessores, Doutores",
  },
  {
    cor: "#dc2626",
    nome: "Vermelho",
    uso: "Pentecostes, Paixão do Senhor, festas de Mártires e Apóstolos",
  },
  {
    cor: "#7c3aed",
    nome: "Roxo/Violeta",
    uso: "Advento, Quaresma, missas de requiem",
  },
  {
    cor: "#16a34a",
    nome: "Verde",
    uso: "Tempo Comum — domingos e dias da semana fora de tempos especiais",
  },
  {
    cor: "#ec4899",
    nome: "Rosa",
    uso: "Domingo Gaudete (3º Advento) e Domingo Laetare (4ª Quaresma)",
  },
  {
    cor: "#d97706",
    nome: "Dourado",
    uso: "Grandes solenidades, como substituto do branco em celebrações festivas",
  },
];

const gestos = [
  {
    gesto: "Genuflexão",
    quando:
      "Ao passar diante do Tabernáculo com o Santíssimo; ao início e fim da Missa no altar",
    como: "Dobrar o joelho direito até o chão, mantendo o corpo ereto e a cabeça levemente inclinada. Breve mas reverente.",
  },
  {
    gesto: "Inclinação Profunda",
    quando:
      "Diante do altar sem Santíssimo exposto; ao pronunciar o nome de Jesus, Maria e do santo do dia na Liturgia das Horas",
    como: "Inclinar o corpo a 90° a partir da cintura, olhar para o chão, por cerca de 2 segundos.",
  },
  {
    gesto: "Inclinação de Cabeça",
    quando:
      "Ao nome da Santíssima Trindade; ao nome de Jesus e Maria no Evangelho; ao nome do Papa e do bispo diocesano",
    como: "Baixar apenas a cabeça, sem mover o tronco. Gesto discreto mas deliberado.",
  },
  {
    gesto: "Postura de Pé",
    quando:
      "Durante o Evangelho, a oração do dia, o Credo e a oração eucarística (exceto joelhos na consagração)",
    como: "Pés unidos ou ligeiramente separados, costas eretas, olhar para a frente ou para o celebrante, mãos ao lado do corpo ou juntas.",
  },
  {
    gesto: "Joelhos",
    quando:
      "Após a consagração do pão e do vinho; durante a adoração eucarística; em momentos de prostração",
    como: "Ambos os joelhos no chão, corpo ereto. Não sentar sobre os calcanhares. Manter recolhimento interior.",
  },
  {
    gesto: "Mãos Juntas (Orans simples)",
    quando:
      "Em procissão, ao carregar objetos litúrgicos sem outra finalidade, durante momentos de oração pessoal",
    como: "Palmas unidas diante do peito, dedos apontando para cima e levemente inclinados. Cotovelos próximos ao corpo.",
  },
  {
    gesto: "Incensação",
    quando:
      "Ao incensar o altar, o Evangeliário, as oferendas, o celebrante, os fiéis",
    como: "Segurar o turíbulo com a mão direita (cadeia curta) e esquerda (cadeia longa). Balançar em movimentos duplos (para pessoas) ou triplos (para objetos sagrados).",
  },
];

const missaPassos = [
  {
    fase: "Rito de Entrada",
    numero: "01",
    cor: "#7c3aed",
    passos: [
      {
        passo: "Procissão de entrada",
        desc: "O acólito abre a procissão carregando a cruz processional (cruciferário) ou as velas. Caminha ereto, passo firme e olhar à frente.",
      },
      {
        passo: "Veneração ao altar",
        desc: "Ao chegar ao presbitério, todos se inclinam profundamente para o altar (ou genuflectem se o Santíssimo estiver exposto). Os ministros ordenados beijam o altar.",
      },
      {
        passo: "Saudação e ato penitencial",
        desc: "O celebrante saúda a assembleia. Segue-se o Ato Penitencial (Confiteor ou outro rito), o Glória (quando previsto) e a oração do dia.",
      },
    ],
  },
  {
    fase: "Liturgia da Palavra",
    numero: "02",
    cor: "#2563eb",
    passos: [
      {
        passo: "Primeira e Segunda Leituras",
        desc: "O leitor proclama as leituras do Lecionário do âmbão. O acólito permanece sentado em seu lugar, atento e recolhido.",
      },
      {
        passo: "Salmo responsorial e Aleluia",
        desc: "Cantado ou recitado entre as leituras. Ao Aleluia, a assembleia se levanta. O acólito pode ajudar a preparar o Evangeliário no âmbão.",
      },
      {
        passo: "Proclamação do Evangelho",
        desc: "O diácono ou sacerdote proclama o Evangelho do âmbão. O acólito pode portar as velas ao lado do proclamador durante o Evangelho.",
      },
      {
        passo: "Homilia e Credo",
        desc: "Após a homilia, recita-se o Credo (aos domingos). O acólito acompanha a assembleia em pé, com reverência ao trecho da Encarnação.",
      },
    ],
  },
  {
    fase: "Liturgia Eucarística",
    numero: "03",
    cor: "#d97706",
    passos: [
      {
        passo: "Preparação das oferendas",
        desc: "O acólito leva ao celebrante o cálice, a patena com as hóstias e o missal. Também ajuda com a lavagem das mãos (lavabo): apresenta a jarra de água, a bacia e a toalha.",
      },
      {
        passo: "Incensação (quando prevista)",
        desc: "O turiferário apresenta o turíbulo ao celebrante para a incensação das oferendas, do altar e do povo. Após, incensa o celebrante e os ministros.",
      },
      {
        passo: "Oração eucarística e Consagração",
        desc: "A assembleia se ajoelha após a consagração do pão e do vinho. O acólito toca o sino ao elevatório (quando previsto) e permanece em reverência.",
      },
      {
        passo: "Rito da Comunhão",
        desc: "Após o Pai Nosso e o Cordeiro de Deus, o acólito pode ajudar a distribuir a Sagrada Comunhão (se for ministro extraordinário) ou manter a ordem e higiene dos vasos sagrados.",
      },
    ],
  },
  {
    fase: "Rito de Conclusão",
    numero: "04",
    cor: "#16a34a",
    passos: [
      {
        passo: "Avisos e oração pós-comunhão",
        desc: "Após um momento de silêncio ou canto de ação de graças, o celebrante faz os avisos e a oração pós-comunhão. O acólito retira os vasos sagrados da credência.",
      },
      {
        passo: "Bênção e despedida",
        desc: 'O celebrante abençoa a assembleia e o diácono (ou ele mesmo) diz a fórmula de despedida. A assembleia responde "Demos graças a Deus".',
      },
      {
        passo: "Procissão de saída",
        desc: "O acólito forma a procissão de saída na ordem inversa à da entrada. Ao passar diante do altar, realiza a inclinação profunda ou genuflexão. Sai com reverência e dignidade.",
      },
    ],
  },
];

const santos = [
  {
    nome: "São Tarcísio",
    titulo: "Mártir da Eucaristia · Patrono dos Acólitos",
    festa: "15 de agosto",
    cor: "#dc2626",
    corLight: "#fef2f2",
    imagem: imgTarcisio,
    bio: "Jovem acólito romano do século III, São Tarcísio morreu mártir para proteger a Sagrada Eucaristia que transportava para os cristãos presos. Ao ser cercado por um grupo pagão que queria saber o que carregava, recusou-se a entregar o Corpo de Cristo e foi espancado até a morte.",
    legado:
      "Seu martírio é o símbolo supremo da reverência que todo acólito deve ter à Eucaristia. Nos ensinamos que os objetos e sacramentos sagrados merecem nosso amor até o sacrifício.",
    citation: '"Prefiro morrer a entregar o Corpo de Cristo aos pagãos."',
  },
  {
    nome: "São Domingos Sávio",
    titulo: "Santo Padroeiro do Ministério · Jovem e Santo",
    festa: "9 de março",
    cor: "#1d4ed8",
    corLight: "#eff6ff",
    imagem: imgDomingos,
    bio: "Nascido em 1842 em Riva di Chieri, Itália, Domingos Sávio foi discípulo de São João Bosco e destacou-se por sua alegria, pureza e amor à Eucaristia desde a Primeira Comunhão. Morreu aos 15 anos, em 1857, após breve doença, deixando um legado de santidade jovem e autêntica.",
    legado:
      'Sua máxima — "Antes morrer do que pecar" — é o lema do nosso ministério. Ele nos mostra que a santidade é possível na juventude, no serviço cotidiano e no amor fiel à Igreja.',
    citation: '"Antes morrer do que pecar."',
  },
];

/* ── Catequese data ───────────────────────────────────── */
const catequese_etapas = [
  {
    num: "01",
    titulo: "Pré-Catequese",
    idades: "5 – 6 anos",
    cor: "#0ea5e9",
    descricao:
      "Primeiro contato com a fé cristã. A criança é apresentada a Deus, à oração, ao sinal da cruz e à vida em família cristã.",
  },
  {
    num: "02",
    titulo: "1ª Etapa",
    idades: "7 – 8 anos",
    cor: "#10b981",
    descricao:
      "Aprofundamento na criação, nos mandamentos e na vida de Jesus. Base para o início da vida sacramental.",
  },
  {
    num: "03",
    titulo: "2ª Etapa",
    idades: "8 – 9 anos",
    cor: "#8b5cf6",
    descricao:
      "Conhecimento dos sacramentos, da Missa e da confissão. Preparação próxima para a Primeira Comunhão.",
  },
  {
    num: "04",
    titulo: "1ª Comunhão",
    idades: "9 – 10 anos",
    cor: "#f59e0b",
    descricao:
      "A criança recebe pela primeira vez o Sacramento da Eucaristia. Momento central da vida cristã, celebrado com toda a comunidade.",
  },
  {
    num: "05",
    titulo: "Mistagogia",
    idades: "10 – 12 anos",
    cor: "#f97316",
    descricao:
      "Aprofundamento do mistério vivido na Primeira Comunhão. A fé é consolidada e o jovem se insere mais ativamente na vida da Igreja.",
  },
  {
    num: "06",
    titulo: "Crisma",
    idades: "13 – 17 anos",
    cor: "#dc2626",
    descricao:
      "Confirmação da fé pelo Sacramento da Confirmação. O jovem renova os compromissos do Batismo e recebe os dons do Espírito Santo.",
  },
];

const sacramentos = [
  {
    nome: "Batismo",
    descricao: "Entrada na vida cristã; purificação do pecado original.",
    bg: "#eff6ff",
    cor: "#1d4ed8",
  },
  {
    nome: "Crisma",
    descricao: "Confirmação da fé; recepção dos dons do Espírito Santo.",
    bg: "#fef2f2",
    cor: "#b91c1c",
  },
  {
    nome: "Eucaristia",
    descricao: "Corpo e Sangue de Cristo; fonte e cume da vida cristã.",
    bg: "#fffbeb",
    cor: "#92400e",
  },
  {
    nome: "Penitência",
    descricao: "Reconciliação com Deus pelo perdão dos pecados confessados.",
    bg: "#f5f3ff",
    cor: "#6d28d9",
  },
  {
    nome: "Unção dos Enfermos",
    descricao: "Conforto espiritual e físico em momento de doença grave.",
    bg: "#f0fdf4",
    cor: "#15803d",
  },
  {
    nome: "Ordem",
    descricao: "Consagração de diáconos, presbíteros e bispos ao serviço.",
    bg: "#fdf4ff",
    cor: "#7e22ce",
  },
  {
    nome: "Matrimônio",
    descricao: "União sagrada entre homem e mulher, reflexo do amor de Cristo.",
    bg: "#fff1f2",
    cor: "#be123c",
  },
];

/* ── Carousel ─────────────────────────────────────────── */
type TemaColors = {
  from: string;
  to: string;
  mid: string;
  text: string;
  light: string;
  accent: string;
};

function PortalCarousel({
  slides,
  variant,
  tema,
}: {
  slides: CarrosselSlide[];
  variant: "principal" | "servico";
  tema: TemaColors;
}) {
  const validSlides = slides.filter((s) => s.imageUrl);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const n = validSlides.length;
  const prev = () => setIdx((i) => (i - 1 + n) % n);
  const next = () => setIdx((i) => (i + 1) % n);
  const slide = validSlides[idx];

  useEffect(() => {
    setIdx(0);
  }, [n]);

  useEffect(() => {
    if (paused || n <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % n), 5000);
    return () => clearInterval(id);
  }, [paused, n]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
    touchStartX.current = null;
  }

  if (!slide) return null;

  const aspectRatio = "16/7";

  return (
    <>
      <div className="max-w-6xl mx-auto">
        <div
          className="relative group select-none overflow-hidden rounded-3xl shadow-2xl"
          style={{ aspectRatio }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Slides */}
          {validSlides.map((s, i) => (
            <img
              key={i}
              src={s.imageUrl}
              alt={s.titulo}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 10 : 0 }}
            />
          ))}

          {/* Gradient + texto overlay */}
          {(slide.titulo || slide.descricao) && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent z-20 pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8 z-30 pointer-events-none">
                {slide.titulo && (
                  <h3 className="text-lg sm:text-2xl font-bold text-white drop-shadow-sm mb-1">
                    {slide.titulo}
                  </h3>
                )}
                {slide.descricao && (
                  <p className="text-white/75 text-xs sm:text-sm max-w-2xl">
                    {slide.descricao}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Contador */}
          {n > 1 && (
            <div className="absolute top-4 left-4 z-30 bg-black/40 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-semibold">
              {idx + 1} / {n}
            </div>
          )}

          {/* Setas — sempre visíveis no mobile, aparecem no hover no desktop */}
          {n > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 backdrop-blur-sm"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 backdrop-blur-sm"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {n > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {validSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 28 : 8,
                  background: i === idx ? tema.mid : "#d1d5db",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Component ────────────────────────────────────────── */
export default function Portal() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState<PortalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [form, setForm] = useState({ nome: "", telefone: "", mensagem: "" });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [config, setConfig] = useState<PortalConfig>(loadPortalConfig);
  const tema = TEMA_COLORS[config.tema ?? "wine"] ?? TEMA_COLORS.wine;

  const heroSection = useVisible(0.05);
  const statsSection = useVisible(0.2);
  const carrosselPrincipalSec = useVisible(0.1);
  const featuresSection = useVisible(0.1);
  const missionSection = useVisible(0.1);
  const carrosselServicoSec = useVisible(0.1);
  const stepsSection = useVisible(0.1);
  const liturgicalSection = useVisible(0.1);
  const testimonialsSection = useVisible(0.1);
  const ctaSection = useVisible(0.1);
  const countdownSection = useVisible(0.1);
  const acolitoMesSection = useVisible(0.1);
  const formacaoSection = useVisible(0.1);
  const agendaSection = useVisible(0.1);
  const faqSection = useVisible(0.1);
  const catequesesSection = useVisible(0.1);
  const oracoesSection = useVisible(0.1);
  const timelineSection = useVisible(0.1);
  const mapaSection = useVisible(0.1);
  const youtubeSection = useVisible(0.1);

  const mandamentosSection = useVisible(0.1);

  const calendLiturgSection = useVisible(0.1);
  const glossarioSection = useVisible(0.1);
  const paramentosSection = useVisible(0.1);
  const gestosSection = useVisible(0.1);
  const missaPassosSection = useVisible(0.1);
  const santosSection = useVisible(0.1);
  const intencaoMesSection = useVisible(0.1);
  const meditacaoSection = useVisible(0.1);
  const atoConsSection = useVisible(0.1);

  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [oracaoOpen, setOracaoOpen] = useState<number | null>(null);
  const [celebracoesExpandidas, setCelebracoesExpandidas] = useState(false);

  const countdown = useCountdown(config.proximaFesta_data ?? "");

  const hasCarrosselPrincipal = (config.carrosselPrincipal ?? []).some(
    (s) => s.imageUrl,
  );
  const hasCarrosselServico = (config.carrosselServico ?? []).some(
    (s) => s.imageUrl,
  );
  const hasSocial =
    config.instagramUrl ||
    config.facebookUrl ||
    config.youtubeUrl ||
    config.whatsappUrl;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    fetchPortalStats().then((data) => {
      setStats(data);
      setStatsLoading(false);
    });
    fetch("/api/portal-config")
      .then((r) => r.json())
      .then((res) => {
        if (res?.data) {
          const merged = { ...DEFAULT_PORTAL_CONFIG, ...res.data };
          setConfig(merged);
          localStorage.setItem("portal_config", JSON.stringify(merged));
        }
      })
      .catch(() => {
        /* mantém cache local */
      });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.title = `${config.nomeMinisterio} · Portal`;
  }, [config.nomeMinisterio]);

  async function handleInteresse(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setEnviando(true);
    try {
      await fetch("/api/interessados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEnviado(true);
    } catch {
      alert("Erro ao enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const themeGradient = `linear-gradient(135deg, ${tema.from} 0%, ${tema.mid} 50%, ${tema.to} 100%)`;

  const secoes = config.secoes_ordem?.length
    ? config.secoes_ordem
    : DEFAULT_SECTION_ORDER;
  const secOrder = (key: string) => secoes.indexOf(key);

  const whatsappHref = config.whatsappUrl
    ? config.whatsappUrl.startsWith("http")
      ? config.whatsappUrl
      : `https://wa.me/${config.whatsappUrl.replace(/\D/g, "")}`
    : null;

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/92 backdrop-blur-md shadow-sm border-b border-gray-100"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-md"
              style={{ background: themeGradient }}
            >
              <img
                src={logoGrupo}
                alt="Logo"
                className="h-6 w-6 object-contain"
              />
            </div>
            <div className="leading-tight">
              <p
                className="text-sm font-bold tracking-wide"
                style={{ color: tema.text }}
              >
                {config.nomeMinisterio}
              </p>
              <p className="text-[11px] text-gray-500 leading-none">
                {config.subtituloMinisterio}
              </p>
            </div>
          </div>

          {/* Menu toggle — visible on all sizes */}
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
            <span className="text-sm font-medium hidden sm:inline">{menuOpen ? 'Fechar' : 'Menu'}</span>
          </button>
        </div>

        {/* Full dropdown */}
        {menuOpen && (
          <div className="absolute inset-x-0 top-full border-t border-gray-100 bg-white shadow-xl">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {[
                  ["#missao", "Nossa Missão"],
                  ["#funcionalidades", "O Sistema"],
                  ["#como-funciona", "Como Funciona"],
                  ["#celebracoes", "Próximas Celebrações"],
                  ["#catequese", "Catequese"],
                  ["#mandamentos", "Mandamentos"],
                  ["#santos", "Santos Padroeiros"],
                  ["#gestos", "Gestos na Missa"],
                  ["#missa-passos", "A Missa"],
                  ["#glossario", "Glossário Litúrgico"],
                  ["#ato-consagracao", "Consagração"],
                  ["#oracoes", "Orações"],
                  ["#agenda", "Agenda Litúrgica"],
                  ["#faq", "Dúvidas Frequentes"],
                  ["#localizacao", "Localização"],
                  ["#contato", "Contato"],
                  ["#servir", "Quero Servir"],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <section
        ref={heroSection.ref}
        className="relative flex min-h-screen items-center overflow-hidden pt-20"
        style={{
          background: `linear-gradient(150deg, ${tema.light} 0%, #fff 50%, ${tema.light} 100%)`,
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: tema.from }}
        />
        <div
          className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full opacity-15 blur-3xl"
          style={{ background: tema.accent }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full opacity-10 blur-3xl"
          style={{ background: tema.mid }}
        />

        {/* Subtle cross pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%237c2d12' fill-opacity='1'%3E%3Crect x='27' y='10' width='6' height='40'/%3E%3Crect x='10' y='27' width='40' height='6'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left — copy */}
            <div
              className={`space-y-8 transition-all duration-700 ${heroSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
            >
              <div
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm backdrop-blur-sm"
                style={{
                  borderColor: `${tema.text}30`,
                  background: "rgba(255,255,255,0.8)",
                  color: tema.text,
                }}
              >
                <Sparkles size={15} style={{ color: tema.accent }} />
                {config.subtituloMinisterio}
              </div>

              <div className="space-y-5">
                <h1
                  className="text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-[2.8rem] lg:text-6xl"
                  style={{ color: tema.text }}
                >
                  {config.heroTitulo.split("Ministério").length > 1 ? (
                    <>
                      {config.heroTitulo.split("Ministério")[0]}
                      <span
                        className="gradient-text-clip"
                        style={
                          {
                            "--gt": `linear-gradient(135deg, ${tema.from} 0%, ${tema.to} 100%)`,
                          } as React.CSSProperties
                        }
                      >
                        Ministério
                      </span>
                      {config.heroTitulo.split("Ministério")[1]}
                    </>
                  ) : (
                    config.heroTitulo
                  )}
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-gray-600">
                  {config.heroSubtitulo}
                </p>
                {config.frase_inspiradora && (
                  <p
                    className="text-base italic font-medium"
                    style={{ color: tema.mid }}
                  >
                    {config.frase_inspiradora}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#funcionalidades"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
                  style={{
                    background: themeGradient,
                    boxShadow: `0 8px 24px ${tema.from}40`,
                  }}
                >
                  {config.heroCta}
                  <ChevronRight size={18} />
                </a>
                <a
                  href="#contato"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-base font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-300 bg-white/80 backdrop-blur-sm transition-all"
                >
                  Entrar em Contato
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-5 pt-1">
                {[
                  {
                    icon: CheckCircle2,
                    text: "Calendário litúrgico integrado",
                  },
                  { icon: CheckCircle2, text: "Escalas automáticas" },
                  { icon: CheckCircle2, text: "Relatórios em tempo real" },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <Icon
                      size={16}
                      className="flex-shrink-0"
                      style={{ color: tema.accent }}
                    />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — visual */}
            <div
              className={`transition-all duration-700 delay-200 ${heroSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
            >
              <div className="relative">
                {/* Main card */}
                <div
                  className="relative overflow-hidden rounded-3xl p-1 shadow-2xl"
                  style={{ background: themeGradient }}
                >
                  <div
                    className="rounded-[1.4rem] p-6"
                    style={{
                      background: `linear-gradient(145deg, ${tema.from}ee, ${tema.from}dd)`,
                    }}
                  >
                    {/* Fake app header */}
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-xl"
                          style={{
                            background: `linear-gradient(135deg, ${tema.accent}, ${tema.to})`,
                          }}
                        >
                          <img
                            src={logoGrupo}
                            alt="Logo"
                            className="h-5 w-5 object-contain"
                          />
                        </div>
                        <span className="text-sm font-semibold text-white/90">
                          Painel do Ministério
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="mb-5 grid grid-cols-3 gap-3">
                      {statsLoading
                        ? Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className="rounded-2xl bg-white/10 p-3 text-center animate-pulse"
                            >
                              <div className="h-6 w-8 bg-white/20 rounded mx-auto mb-1" />
                              <div className="h-2 w-12 bg-white/10 rounded mx-auto" />
                            </div>
                          ))
                        : [
                            {
                              label: "Acólitos",
                              value: stats ? String(stats.total_acolitos) : "—",
                              trend: "ativos",
                            },
                            {
                              label: "Esta semana",
                              value: stats
                                ? String(stats.celebracoes_semana)
                                : "—",
                              trend: "celebrações",
                            },
                            {
                              label: "Presença",
                              value: stats ? `${stats.presenca_media}%` : "—",
                              trend: "↑ média",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur-sm"
                            >
                              <p className="text-xl font-bold text-white">
                                {item.value}
                              </p>
                              <p className="mt-0.5 text-[10px] text-white/60">
                                {item.label}
                              </p>
                              <p
                                className="mt-1 text-[10px] font-semibold"
                                style={{ color: tema.accent }}
                              >
                                {item.trend}
                              </p>
                            </div>
                          ))}
                    </div>

                    {/* Próximas celebrações reais */}
                    <div className="space-y-2.5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
                        Próximas celebrações
                      </p>
                      {statsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 border border-white/10 animate-pulse"
                          >
                            <div className="h-10 w-10 bg-white/20 rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 bg-white/20 rounded w-3/4" />
                              <div className="h-2 bg-white/10 rounded w-1/3" />
                            </div>
                          </div>
                        ))
                      ) : stats && stats.proximas_celebracoes.length > 0 ? (
                        <>
                          {(celebracoesExpandidas
                            ? stats.proximas_celebracoes
                            : stats.proximas_celebracoes.slice(0, 5)
                          ).map((cel, i) => {
                            const dt = parseISO(cel.data);
                            const dayName = format(dt, "EEE", { locale: ptBR });
                            const dayNum = format(dt, "dd");
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 border border-white/10"
                              >
                                <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-white/10 text-center">
                                  <span className="text-[9px] font-semibold uppercase text-white/50">
                                    {dayName}
                                  </span>
                                  <span className="text-sm font-bold text-white">
                                    {dayNum}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-white/90">
                                    {cel.tipo} — {cel.horario.substring(0, 5)}
                                  </p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/15 text-white/60 font-medium">
                                    {cel.periodo_liturgico}
                                    {cel.celebracao_noite ? " · Noturna" : ""}
                                  </span>
                                </div>
                                <ChevronRight
                                  size={14}
                                  className="flex-shrink-0 text-white/30"
                                />
                              </div>
                            );
                          })}
                          {stats.proximas_celebracoes.length > 5 && (
                            <button
                              onClick={() =>
                                setCelebracoesExpandidas((v) => !v)
                              }
                              className="w-full mt-1 py-2 text-xs font-semibold text-white/50 hover:text-white/80 transition-colors flex items-center justify-center gap-1.5"
                            >
                              {celebracoesExpandidas ? (
                                <>
                                  <ChevronUp size={13} /> Ver menos
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={13} /> Ver mais (
                                  {stats.proximas_celebracoes.length - 5}{" "}
                                  celebrações)
                                </>
                              )}
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-4 text-white/40 text-sm">
                          {statsLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : null}
                          Sem celebrações próximas
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Floating badge — liturgical season */}
                <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-white px-3 py-2 shadow-lg">
                  <div
                    className="h-2.5 w-2.5 animate-pulse rounded-full"
                    style={{ background: tema.accent }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: tema.text }}
                  >
                    Tempo Comum
                  </span>
                </div>

                {/* Floating badge — activity */}
                {stats && stats.total_acolitos > 0 && (
                  <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
                    <Star
                      size={13}
                      fill="currentColor"
                      style={{ color: tema.accent }}
                    />
                    <span className="text-xs font-semibold text-gray-800">
                      {stats.total_acolitos} acólitos ativos
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-gray-400">
          <span className="text-xs tracking-widest uppercase">Explorar</span>
          <div className="h-8 w-5 rounded-full border-2 border-gray-300 flex items-start justify-center pt-1.5">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
          </div>
        </div>
      </section>

      {/* ── Seções dinâmicas (ordem configurável) ──────── */}
      <style>
        {secoes
          .map((k, i) => `[data-section="${k}"] { order: ${i}; }`)
          .join(" ")}
      </style>
      <div className="flex flex-col">
        <div data-section="mostrarCountdown">
          {/* ── Countdown ──────────────────────────────────── */}
          {(config.mostrarCountdown ?? true) &&
            countdown &&
            config.proximaFesta_nome && (
              <section
                ref={countdownSection.ref}
                className="relative overflow-hidden py-10"
                style={{
                  background: `linear-gradient(135deg, ${tema.from} 0%, ${tema.mid} 100%)`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Crect x='27' y='10' width='6' height='40'/%3E%3Crect x='10' y='27' width='40' height='6'/%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                />
                <div className="relative mx-auto max-w-4xl px-4 text-center">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/60">
                    Contagem regressiva
                  </p>
                  <h2 className="mb-6 text-2xl font-extrabold text-white">
                    {config.proximaFesta_nome}
                  </h2>
                  <div className="flex items-center justify-center gap-3 sm:gap-6">
                    {[
                      { v: countdown.d, label: "dias" },
                      { v: countdown.h, label: "horas" },
                      { v: countdown.m, label: "min" },
                      { v: countdown.s, label: "seg" },
                    ].map(({ v, label }) => (
                      <div key={label} className="flex flex-col items-center">
                        <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-inner">
                          <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
                            {String(v).padStart(2, "0")}
                          </span>
                        </div>
                        <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
        </div>

        <div data-section="mostrarStats">
          {/* ── Stats ──────────────────────────────────────── */}
          {(config.mostrarStats ?? true) && (
            <section
              ref={statsSection.ref}
              className="relative overflow-hidden py-10"
              style={{ background: themeGradient }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Crect x='27' y='10' width='6' height='40'/%3E%3Crect x='10' y='27' width='40' height='6'/%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
              <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`grid gap-8 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-700 ${statsSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  {(
                    [
                      {
                        label: "Acólitos cadastrados",
                        suffix: "+",
                        icon: Users,
                        value: stats?.total_acolitos ?? 0,
                      },
                      {
                        label: "Celebrações registradas",
                        suffix: "+",
                        icon: CalendarDays,
                        value: stats?.total_celebracoes ?? 0,
                      },
                      {
                        label: "Anos de serviço",
                        suffix: "",
                        icon: Star,
                        value: stats?.anos_servico ?? 0,
                      },
                      {
                        label: "Presença média",
                        suffix: "%",
                        icon: CheckCircle2,
                        value: stats?.presenca_media ?? 0,
                      },
                    ] as const
                  ).map(({ label, suffix, icon: Icon, value }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-3 text-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                        <Icon size={22} style={{ color: tema.accent }} />
                      </div>
                      <p className="text-4xl font-extrabold text-white">
                        {statsLoading ? (
                          <span className="inline-block h-9 w-16 rounded-xl bg-white/20 animate-pulse" />
                        ) : (
                          <Counter to={value} suffix={suffix} />
                        )}
                      </p>
                      <p className="text-sm text-white/60">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarCarrosselPrincipal">
          {/* ── Carrossel Principal ─────────────────────────── */}
          {(config.mostrarCarrosselPrincipal ?? true) &&
            hasCarrosselPrincipal && (
              <section
                ref={carrosselPrincipalSec.ref}
                className="py-20 bg-white"
              >
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                  <div
                    className={`mb-10 text-center transition-all duration-700 ${carrosselPrincipalSec.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  >
                    <div
                      className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                      style={{
                        background: tema.light,
                        color: tema.text,
                        outline: `1px solid ${tema.from}25`,
                      }}
                    >
                      <Images size={14} />
                      Galeria do Ministério
                    </div>
                    <h2
                      className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                      style={{ color: tema.text }}
                    >
                      Nossas Artes
                    </h2>
                  </div>
                  <div
                    className={`transition-all duration-700 delay-100 ${carrosselPrincipalSec.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  >
                    <PortalCarousel
                      slides={config.carrosselPrincipal ?? []}
                      variant="principal"
                      tema={tema}
                    />
                  </div>
                </div>
              </section>
            )}
        </div>

        <div data-section="mostrarAcolitoMes">
          {/* ── Acólito em Destaque ────────────────────────── */}
          {(config.mostrarAcolitoMes ?? true) && config.acolitoMes_nome && (
            <section
              ref={acolitoMesSection.ref}
              className="py-16 border-t border-gray-100"
              style={{
                background: `linear-gradient(180deg, ${tema.light}80, #fff)`,
              }}
            >
              <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
                <div
                  className={`transition-all duration-700 ${acolitoMesSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{ background: tema.light, color: tema.text }}
                  >
                    <Trophy size={14} /> Acólito em Destaque
                  </div>
                  <div
                    className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-xl border"
                    style={{ borderColor: `${tema.from}20` }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-5 rounded-3xl"
                      style={{
                        background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                      }}
                    />
                    <div className="relative flex flex-col items-center gap-4">
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-extrabold text-white shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                        }}
                      >
                        {config.acolitoMes_nome.slice(0, 2).toUpperCase()}
                      </div>
                      {config.acolitoMes_mensagem && (
                        <div className="relative max-w-lg">
                          <div
                            className="text-5xl font-serif leading-none opacity-15 absolute -top-3 -left-2"
                            style={{ color: tema.from }}
                          >
                            "
                          </div>
                          <p className="text-base italic text-gray-700 leading-relaxed px-4">
                            {config.acolitoMes_mensagem}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {config.acolitoMes_nome}
                        </p>
                        {config.acolitoMes_cargo && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {config.acolitoMes_cargo}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill="currentColor"
                            style={{ color: tema.accent }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarMissao">
          {/* ── Nossa Missão ───────────────────────────────── */}
          {(config.mostrarMissao ?? true) && (
            <section
              id="missao"
              ref={missionSection.ref}
              className="py-24 bg-white"
              style={
                hasCarrosselPrincipal ? { borderTop: "1px solid #f3f4f6" } : {}
              }
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`grid gap-12 lg:grid-cols-2 lg:items-center transition-all duration-700 ${missionSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div className="space-y-6">
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                      style={{ background: `${tema.light}`, color: tema.text }}
                    >
                      <Heart size={14} />
                      Nossa Missão
                    </div>
                    <h2
                      className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                      style={{ color: tema.text }}
                    >
                      Servir com excelência
                      <br />
                      <span className="text-gray-500 font-light">
                        na liturgia da Igreja
                      </span>
                    </h2>
                    <p className="text-lg leading-relaxed text-gray-600">
                      O Ministério dos Acólitos é um grupo de serviço litúrgico
                      dedicado a auxiliar nas celebrações da Igreja, com
                      responsabilidade, fé e formação contínua.
                    </p>
                    <p className="text-base leading-relaxed text-gray-500">
                      Cada acólito passa por um processo de formação,
                      acompanhamento e escalonamento criterioso para garantir a
                      boa ordem e a beleza das celebrações litúrgicas.
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      {[
                        {
                          icon: Cross,
                          label: "Fé",
                          desc: "Enraizados na espiritualidade cristã",
                        },
                        {
                          icon: BookOpen,
                          label: "Formação",
                          desc: "Treinamento litúrgico contínuo",
                        },
                        {
                          icon: Award,
                          label: "Excelência",
                          desc: "Serviço de qualidade em cada missa",
                        },
                      ].map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="text-center space-y-2">
                          <div
                            className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-white"
                            style={{ background: themeGradient }}
                          >
                            <Icon size={20} />
                          </div>
                          <p className="font-bold text-gray-900 text-sm">
                            {label}
                          </p>
                          <p className="text-xs text-gray-500 leading-tight">
                            {desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visual card */}
                  <div className="relative">
                    <div
                      className="relative rounded-3xl overflow-hidden shadow-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${tema.light}, #fff)`,
                        border: `1px solid ${tema.from}20`,
                      }}
                    >
                      <div className="p-8 space-y-5">
                        <div className="relative">
                          <div
                            className="text-6xl font-serif leading-none opacity-20"
                            style={{ color: tema.from }}
                          >
                            "
                          </div>
                          <p className="text-lg italic text-gray-700 -mt-4">
                            {config.frase_inspiradora ||
                              '"Servir é nossa missão, a liturgia é nossa vocação."'}
                          </p>
                        </div>
                        <div className="space-y-3 pt-2">
                          {[
                            "Formação litúrgica de qualidade",
                            "Respeito e pontualidade nas celebrações",
                            "Espírito de equipe e fraternidade",
                            "Devoção e comprometimento com a fé",
                          ].map((item) => (
                            <div key={item} className="flex items-center gap-3">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: themeGradient }}
                              >
                                <CheckCircle2
                                  size={12}
                                  className="text-white"
                                />
                              </div>
                              <span className="text-sm text-gray-700">
                                {item}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div
                      className="absolute -z-10 -top-8 -right-8 w-48 h-48 rounded-full opacity-10"
                      style={{ background: themeGradient }}
                    />
                    <div
                      className="absolute -z-10 -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10"
                      style={{ background: tema.accent }}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarCarrosselServico">
          {/* ── Carrossel de Serviço ────────────────────────── */}
          {(config.mostrarCarrosselServico ?? true) && hasCarrosselServico && (
            <section
              ref={carrosselServicoSec.ref}
              className="py-20 border-t border-gray-100 overflow-hidden"
              style={{
                background: `linear-gradient(180deg, ${tema.light}60 0%, #fff 100%)`,
              }}
            >
              <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-10 text-center transition-all duration-700 ${carrosselServicoSec.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Users size={14} />
                    Acólitos em Serviço
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    Nossa Equipe Atuando
                  </h2>
                </div>
                <div
                  className={`transition-all duration-700 delay-100 ${carrosselServicoSec.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <PortalCarousel
                    slides={config.carrosselServico ?? []}
                    variant="servico"
                    tema={tema}
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarFuncionalidades">
          {/* ── Features ───────────────────────────────────── */}
          {(config.mostrarFuncionalidades ?? true) && (
            <section
              id="funcionalidades"
              className="py-24"
              style={{
                background: `linear-gradient(180deg, ${tema.light}80 0%, #fff 100%)`,
              }}
            >
              <div
                ref={featuresSection.ref}
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
              >
                <div
                  className={`mb-16 text-center transition-all duration-700 ${featuresSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}30`,
                    }}
                  >
                    <Layers size={14} />O Sistema de Gestão
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    Tudo que o ministério precisa
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
                    Um sistema completo — do cadastro de acólitos ao relatório
                    de presença — com cores litúrgicas que se adaptam ao tempo
                    da Igreja.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {features.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <article
                        key={f.title}
                        className={`group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-gray-200 ${featuresSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                        style={{ transitionDelay: `${i * 70}ms` }}
                      >
                        <div
                          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-3xl"
                          style={{
                            background: `linear-gradient(135deg, ${tema.light}50, transparent)`,
                          }}
                        />
                        <div className="relative">
                          <div className="mb-5 flex items-start justify-between">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.color} shadow-sm`}
                            >
                              <Icon size={22} />
                            </div>
                            <span
                              className="rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{
                                background: tema.light,
                                color: tema.text,
                                outline: `1px solid ${tema.from}20`,
                              }}
                            >
                              {f.badge}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {f.title}
                          </h3>
                          <p className="mt-2.5 text-sm leading-relaxed text-gray-600">
                            {f.description}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarComoFunciona">
          {/* ── How it works ───────────────────────────────── */}
          {(config.mostrarComoFunciona ?? true) && (
            <section
              id="como-funciona"
              ref={stepsSection.ref}
              className="py-24 bg-white overflow-hidden"
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-16 max-w-2xl transition-all duration-700 ${stepsSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{ background: tema.light, color: tema.text }}
                  >
                    <Clock size={14} />
                    Como Funciona
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    Organização simples e eficiente
                  </h2>
                  <p className="mt-4 text-lg text-gray-600">
                    Em poucos passos, o ministério fica organizado e toda a
                    equipe conectada às celebrações.
                  </p>
                </div>

                <div className="relative grid gap-8 lg:grid-cols-4">
                  <div
                    className="absolute top-8 left-[12.5%] right-[12.5%] hidden h-px lg:block"
                    style={{
                      background: `linear-gradient(90deg, ${tema.from}40, ${tema.accent}60, ${tema.from}40)`,
                    }}
                  />

                  {steps.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.num}
                        className={`relative transition-all duration-700 ${stepsSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                        style={{ transitionDelay: `${i * 100}ms` }}
                      >
                        <div
                          className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg text-white"
                          style={{
                            background: themeGradient,
                            boxShadow: `0 8px 20px ${tema.from}35`,
                          }}
                        >
                          <Icon size={22} />
                        </div>
                        <p
                          className="text-xs font-bold uppercase tracking-widest mb-1"
                          style={{ color: tema.accent }}
                        >
                          Passo {step.num}
                        </p>
                        <h3 className="mb-2.5 text-xl font-bold text-gray-900">
                          {step.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-gray-600">
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarFormacao">
          {/* ── Como Entrar / Formação ─────────────────────── */}
          {(config.mostrarFormacao ?? true) && (
            <section
              id="formacao"
              ref={formacaoSection.ref}
              className="py-24 border-t border-gray-100"
              style={{
                background: `linear-gradient(180deg, #fff, ${tema.light}60, #fff)`,
              }}
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-14 text-center transition-all duration-700 ${formacaoSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <GraduationCap size={14} /> Como Entrar no Ministério
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    Sinta o chamado. Dê o passo.
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
                    Tornando-se acólito você passa por um processo de formação
                    que prepara para servir com excelência e fé na liturgia da
                    Igreja.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      num: "01",
                      icon: Heart,
                      titulo: "Interesse e Inscrição",
                      desc: "Demonstre interesse à coordenação do ministério ou preencha o formulário de contato neste portal. Uma conversa inicial será agendada.",
                    },
                    {
                      num: "02",
                      icon: Users,
                      titulo: "Apresentação ao Grupo",
                      desc: "Você é apresentado ao ministério, conhece os demais acólitos, as funções e a dinâmica das celebrações.",
                    },
                    {
                      num: "03",
                      icon: BookOpen,
                      titulo: "Formação Litúrgica",
                      desc: "Aulas sobre as partes da Missa, objetos litúrgicos, postura no altar, hierarquia e reverências durante as celebrações.",
                    },
                    {
                      num: "04",
                      icon: Award,
                      titulo: "Acompanhamento Prático",
                      desc: "O novo acólito serve ao lado de um experiente, aprendendo na prática antes de assumir uma função com autonomia.",
                    },
                    {
                      num: "05",
                      icon: CheckCircle2,
                      titulo: "Primeiro Serviço Oficial",
                      desc: "Com o aval do coordenador, o acólito entra na escala e começa a servir oficialmente nas celebrações da paróquia.",
                    },
                    {
                      num: "06",
                      icon: Star,
                      titulo: "Acólito Experiente",
                      desc: "Após meses de serviço e formação contínua, o acólito é reconhecido como membro experiente do ministério.",
                    },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div
                        key={s.num}
                        className={`relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-700 hover:-translate-y-1 hover:shadow-lg ${formacaoSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                        style={{ transitionDelay: `${i * 60}ms` }}
                      >
                        <div className="mb-4 flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                            }}
                          >
                            <Icon size={18} />
                          </div>
                          <span
                            className="text-xs font-bold uppercase tracking-widest"
                            style={{ color: tema.accent }}
                          >
                            Passo {s.num}
                          </span>
                        </div>
                        <h3 className="mb-2 text-base font-bold text-gray-900">
                          {s.titulo}
                        </h3>
                        <p className="text-sm leading-relaxed text-gray-500">
                          {s.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-12 text-center">
                  <a
                    href="#servir"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                      boxShadow: `0 8px 24px ${tema.from}35`,
                    }}
                  >
                    <Heart size={16} /> Quero fazer parte
                  </a>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarSantos">
          {/* ── Santos Padroeiros ──────────────────────────── */}
          {(config.mostrarSantos ?? true) && (
            <section
              id="santos"
              ref={santosSection.ref}
              className="py-14 sm:py-24 border-t border-gray-100"
              style={{
                background: `linear-gradient(180deg, ${tema.light}50, #fff)`,
              }}
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-10 sm:mb-14 text-center transition-all duration-700 ${santosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Star size={14} /> Santos Padroeiros
                  </div>
                  <h2
                    className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl"
                    style={{ color: tema.text }}
                  >
                    Nossos Modelos de Santidade
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-gray-600">
                    Dois jovens santos que viveram o serviço litúrgico com total
                    entrega e nos inspiram a cada celebração.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {santos.map((s, i) => (
                    <div
                      key={s.nome}
                      className={`relative overflow-hidden rounded-3xl bg-white border shadow-lg transition-all duration-700 hover:-translate-y-1 hover:shadow-xl ${santosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                      style={{
                        borderColor: `${s.cor}30`,
                        transitionDelay: `${i * 100}ms`,
                      }}
                    >
                      <div
                        className="h-2 w-full"
                        style={{
                          background: `linear-gradient(90deg, ${s.cor}, ${s.cor}80)`,
                        }}
                      />
                      <div className="p-5 sm:p-8">
                        {/* Título — sem card ícone */}
                        <div className="mb-5">
                          <p
                            className="text-xs font-bold uppercase tracking-widest mb-1"
                            style={{ color: s.cor }}
                          >
                            Padroeiro
                          </p>
                          <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
                            {s.nome}
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {s.titulo}
                          </p>
                          <span
                            className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: s.corLight, color: s.cor }}
                          >
                            Festa: {s.festa}
                          </span>
                        </div>

                        <div className="relative mb-4">
                          <div
                            className="text-4xl sm:text-5xl font-serif leading-none opacity-10 absolute -top-2 -left-1"
                            style={{ color: s.cor }}
                          >
                            "
                          </div>
                          <p className="text-sm sm:text-base italic text-gray-700 px-4 leading-relaxed">
                            {s.citation}
                          </p>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                          {s.bio}
                        </p>

                        <div
                          className="rounded-2xl p-3 sm:p-4 mb-5"
                          style={{ background: s.corLight }}
                        >
                          <p
                            className="text-xs font-bold uppercase tracking-wide mb-1.5"
                            style={{ color: s.cor }}
                          >
                            Legado para nós
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {s.legado}
                          </p>
                        </div>

                        {/* Foto do santo */}
                        <div
                          className="overflow-hidden rounded-2xl border"
                          style={{ borderColor: `${s.cor}20` }}
                        >
                          <img
                            src={s.imagem}
                            alt={s.nome}
                            className="w-full h-auto block"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarGestos">
          {/* ── Gestos e Posições ──────────────────────────── */}
          {(config.mostrarGestos ?? true) && (
            <section
              id="gestos"
              ref={gestosSection.ref}
              className="py-14 sm:py-24 bg-white border-t border-gray-100"
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-10 sm:mb-14 text-center transition-all duration-700 ${gestosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Award size={14} /> Gestos e Posições
                  </div>
                  <h2
                    className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl"
                    style={{ color: tema.text }}
                  >
                    A Linguagem do Corpo na Liturgia
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-gray-600">
                    Cada gesto litúrgico é uma oração do corpo. Aprenda o
                    significado e a forma correta de cada postura no serviço do
                    altar.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 items-start">
                  {gestos.map((g, i) => (
                    <div
                      key={g.gesto}
                      className={`rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-700 hover:-translate-y-0.5 hover:shadow-md ${gestosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                      style={{ transitionDelay: `${i * 50}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                          }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {g.gesto}
                          </p>
                          <p
                            className="text-[11px] font-semibold mt-0.5 mb-2"
                            style={{ color: tema.text }}
                          >
                            Quando:{" "}
                            <span className="font-normal text-gray-500">
                              {g.quando}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {g.como}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarMissaPassos">
          {/* ── Missa Passo a Passo ────────────────────────── */}
          {(config.mostrarMissaPassos ?? true) && (
            <section
              id="missa-passos"
              ref={missaPassosSection.ref}
              className="py-14 sm:py-24 border-t border-gray-100"
              style={{
                background: `linear-gradient(180deg, ${tema.light}40, #fff)`,
              }}
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-10 sm:mb-14 text-center transition-all duration-700 ${missaPassosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Church size={14} /> A Santa Missa
                  </div>
                  <h2
                    className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl"
                    style={{ color: tema.text }}
                  >
                    A Missa Passo a Passo
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-gray-600">
                    Conheça cada momento da Celebração Eucarística e o papel do
                    acólito em cada fase.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {missaPassos.map((fase, fi) => (
                    <div
                      key={fase.fase}
                      className={`relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-sm transition-all duration-700 ${missaPassosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                      style={{ transitionDelay: `${fi * 80}ms` }}
                    >
                      <div
                        className="h-1.5 w-full"
                        style={{ background: fase.cor }}
                      />
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-5">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-extrabold shadow-sm"
                            style={{ background: fase.cor }}
                          >
                            {fase.numero}
                          </div>
                          <h3 className="text-base font-extrabold text-gray-900">
                            {fase.fase}
                          </h3>
                        </div>
                        <div className="space-y-4">
                          {fase.passos.map((p, pi) => (
                            <div key={pi} className="flex gap-3">
                              <div
                                className="w-1.5 flex-shrink-0 rounded-full mt-1"
                                style={{
                                  background: `${fase.cor}60`,
                                  minHeight: "1rem",
                                }}
                              />
                              <div>
                                <p className="text-sm font-semibold text-gray-800 mb-0.5">
                                  {p.passo}
                                </p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                  {p.desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarCalendario">
          {/* ── Liturgical highlight banner ─────────────────── */}
          {(config.mostrarCalendario ?? true) && (
            <section ref={liturgicalSection.ref} className="py-20 bg-white">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className="relative overflow-hidden rounded-[2.5rem] p-6 shadow-2xl sm:p-10 lg:p-14"
                  style={{ background: themeGradient }}
                >
                  <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-10 blur-3xl bg-white" />
                  <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-10 blur-3xl bg-white" />

                  <div
                    className={`relative grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-center transition-all duration-700 ${liturgicalSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  >
                    <div>
                      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20">
                        <Sparkles size={14} />
                        Exclusivo: Paleta litúrgica dinâmica
                      </p>
                      <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                        Cores que mudam com o<br />
                        <span style={{ color: tema.accent }}>
                          Tempo da Igreja
                        </span>
                      </h2>
                      <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
                        O sistema detecta automaticamente o tempo litúrgico —
                        Advento, Natal, Quaresma, Páscoa, Pentecostes — e ajusta
                        toda a interface conforme as cores e o espírito de cada
                        período, incluindo os dias solenes segundo a CNBB e o
                        Vaticano.
                      </p>
                    </div>

                    {/* Season swatches */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          name: "Advento",
                          color: "bg-violet-700",
                          text: "text-violet-200",
                          descricao: "Roxo",
                        },
                        {
                          name: "Natal",
                          color: "bg-gray-50 border border-white/60 shadow-md",
                          text: "text-gray-800 font-bold",
                          descricao: "Branco",
                        },
                        {
                          name: "Quaresma",
                          color: "bg-purple-800",
                          text: "text-purple-200",
                          descricao: "Roxo",
                        },
                        {
                          name: "Tempo Comum",
                          color: "bg-emerald-700",
                          text: "text-emerald-200",
                          descricao: "Verde",
                        },
                        {
                          name: "Tempo Pascal",
                          color: "bg-amber-500",
                          text: "text-amber-100",
                          descricao: "Branco/Dourado",
                        },
                        {
                          name: "Pentecostes",
                          color: "bg-red-700",
                          text: "text-red-200",
                          descricao: "Vermelho",
                        },
                      ].map((s) => (
                        <div
                          key={s.name}
                          className={`${s.color} flex flex-col items-center justify-center rounded-2xl p-4 shadow-inner gap-1`}
                        >
                          <span
                            className={`text-xs font-bold ${s.text} text-center`}
                          >
                            {s.name}
                          </span>
                          <span className={`text-[10px] ${s.text} opacity-70`}>
                            {s.descricao}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dias Solenes info */}
                  <div
                    className={`relative mt-8 pt-8 border-t border-white/20 transition-all duration-700 delay-200 ${liturgicalSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  >
                    <p className="text-white/80 text-sm font-semibold mb-4">
                      Cores para Dias Solenes (CNBB/Vaticano)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          cor: "bg-white border border-white/30",
                          nome: "Branco",
                          ex: "Natal · Páscoa · Maria · Confessores",
                        },
                        {
                          cor: "bg-red-600",
                          nome: "Vermelho",
                          ex: "Pentecostes · Mártires · Apóstolos · Paixão",
                        },
                        {
                          cor: "bg-pink-400",
                          nome: "Rosa",
                          ex: "Gaudete (3º Advento) · Laetare (4ª Quaresma)",
                        },
                        {
                          cor: "bg-amber-400",
                          nome: "Dourado",
                          ex: "Grandes Solenidades · Corpus Christi",
                        },
                      ].map((s) => (
                        <div
                          key={s.nome}
                          className="flex items-start gap-2.5 bg-white/10 rounded-xl p-3"
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${s.cor}`}
                          />
                          <div>
                            <p className="text-white text-xs font-bold">
                              {s.nome}
                            </p>
                            <p className="text-white/60 text-[10px] leading-tight mt-0.5">
                              {s.ex}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarCalendarioLiturgico">
          {/* ── Calendário Litúrgico do Mês ────────────────── */}
          {(config.mostrarCalendarioLiturgico ?? true) &&
            (() => {
              const season = getLiturgicalSeason(new Date());
              return (
                <section
                  ref={calendLiturgSection.ref}
                  id="calendario-liturgico"
                  className="py-20 bg-white border-t border-gray-100"
                >
                  <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div
                      className={`transition-all duration-700 ${calendLiturgSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                    >
                      <div
                        className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                        style={{
                          background: tema.light,
                          color: tema.text,
                          outline: `1px solid ${tema.from}25`,
                        }}
                      >
                        <CalendarDays size={14} /> Calendário Litúrgico
                      </div>
                      <h2
                        className="text-2xl font-extrabold tracking-tight sm:text-3xl mb-6 sm:mb-10"
                        style={{ color: tema.text }}
                      >
                        Tempo Litúrgico Atual
                      </h2>

                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                        {/* Tempo atual */}
                        <div
                          className="rounded-3xl p-5 sm:p-6 text-white shadow-xl sm:col-span-2 lg:col-span-1"
                          style={{
                            background: `linear-gradient(135deg, ${season.cor}, ${season.cor}cc)`,
                          }}
                        >
                          <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">
                            Tempo Atual
                          </p>
                          <p className="text-3xl sm:text-4xl font-extrabold mb-1">
                            {season.nome}
                          </p>
                          <div className="flex items-center gap-2 mt-4">
                            <span
                              className="inline-block w-4 h-4 rounded-full border-2 border-white/60"
                              style={{
                                background:
                                  season.cor === "#ffffff"
                                    ? "#f8fafc"
                                    : "white",
                              }}
                            />
                            <span className="text-sm font-semibold opacity-80">
                              Cor litúrgica: {season.corNome}
                            </span>
                          </div>

                          {/* Santo do período */}
                          <div className="rounded-3xl border border-gray-100 bg-gray-100 p-6 mt-9 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                              {config.calend_santoDoDia
                                ? "Santo em Destaque"
                                : "São Domingos Sávio"}
                            </p>
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow"
                                style={{
                                  background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                                }}
                              >
                                ✦
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">
                                  {config.calend_santoDoDia ||
                                    "São Domingos Sávio"}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {config.calend_santoDoDia
                                    ? "Santo do período"
                                    : "Padroeiro do ministério · 9 de março"}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed italic">
                              {config.calend_santoDoDia
                                ? "Que a intercessão deste santo fortaleça nosso serviço litúrgico."
                                : '"Antes morrer do que pecar." — nosso lema e nossa inspiração diária.'}
                            </p>
                          </div>
                        </div>

                        {/* Cores do tempo */}
                        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                            Significado das Cores
                          </p>
                          <div className="space-y-2.5">
                            {coresLiturgicas.map((c) => (
                              <div
                                key={c.nome}
                                className="flex items-start gap-2.5"
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 border"
                                  style={{
                                    background: c.cor,
                                    borderColor: c.borda ?? c.cor,
                                  }}
                                />
                                <div>
                                  <span className="text-xs font-bold text-gray-800">
                                    {c.nome}
                                  </span>
                                  <span className="text-[10px] text-gray-400 ml-1.5">
                                    {c.uso}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })()}
        </div>

        <div data-section="mostrarAgenda">
          {/* ── Agenda Pública ─────────────────────────────── */}
          {(config.mostrarAgenda ?? true) && (
            <section
              id="agenda"
              ref={agendaSection.ref}
              className="py-24 bg-white border-t border-gray-100"
            >
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-12 text-center transition-all duration-700 ${agendaSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <CalendarDays size={14} /> Agenda Pública
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    Próximas Celebrações
                  </h2>
                  <p className="mt-3 text-base text-gray-500">
                    Acompanhe as celebrações que estão chegando na paróquia.
                  </p>
                </div>

                <div
                  className={`space-y-3 transition-all duration-700 ${agendaSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  {statsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 animate-pulse"
                      >
                        <div className="h-12 w-12 rounded-xl bg-gray-200 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-1/3" />
                          <div className="h-2 bg-gray-100 rounded w-1/4" />
                        </div>
                      </div>
                    ))
                  ) : stats &&
                    (stats.agenda ?? stats.proximas_celebracoes).length > 0 ? (
                    (stats.agenda ?? stats.proximas_celebracoes).map(
                      (cel, i) => {
                        const dt = parseISO(cel.data);
                        const diaSem = format(dt, "EEE", { locale: ptBR });
                        const diaNum = format(dt, "dd");
                        const mes = format(dt, "MMM", { locale: ptBR });
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-700`}
                            style={{
                              transitionDelay: `${i * 40}ms`,
                              opacity: agendaSection.visible ? 1 : 0,
                              transform: agendaSection.visible
                                ? "translateY(0)"
                                : "translateY(12px)",
                            }}
                          >
                            <div
                              className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-sm"
                              style={{
                                background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                              }}
                            >
                              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">
                                {diaSem}
                              </span>
                              <span className="text-xl font-extrabold leading-none">
                                {diaNum}
                              </span>
                              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">
                                {mes}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">
                                {cel.tipo}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock size={11} />{" "}
                                  {cel.horario.substring(0, 5)}
                                </span>
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    background: tema.light,
                                    color: tema.text,
                                  }}
                                >
                                  {cel.periodo_liturgico}
                                </span>
                                {cel.celebracao_noite && (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                                    Noturna
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight
                              size={16}
                              className="flex-shrink-0 text-gray-300"
                            />
                          </div>
                        );
                      },
                    )
                  ) : (
                    <div className="py-12 text-center text-gray-400">
                      <CalendarDays
                        size={36}
                        className="mx-auto mb-3 opacity-30"
                      />
                      <p className="text-sm">
                        Nenhuma celebração cadastrada no momento.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarFaq">
          {/* ── FAQ ────────────────────────────────────────── */}
          {(config.mostrarFaq ?? true) && (
            <section
              id="faq"
              ref={faqSection.ref}
              className="py-24"
              style={{
                background: `linear-gradient(180deg, ${tema.light}50, #fff)`,
              }}
            >
              <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-12 text-center transition-all duration-700 ${faqSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <HelpCircle size={14} /> Perguntas Frequentes
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    Ficou com dúvida?
                  </h2>
                  <p className="mt-3 text-base text-gray-500">
                    Respondemos as perguntas mais comuns sobre o ministério.
                  </p>
                </div>

                <div
                  className={`space-y-3 transition-all duration-700 ${faqSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  {(config.faqItems ?? []).map((item, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <button
                        onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-gray-50"
                      >
                        <span className="font-semibold text-gray-900 text-sm leading-snug">
                          {item.q}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`flex-shrink-0 transition-transform duration-200 ${faqOpen === i ? "rotate-180" : ""}`}
                          style={{ color: tema.text }}
                        />
                      </button>
                      {faqOpen === i && (
                        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                          <p className="text-sm leading-relaxed text-gray-600">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-center text-sm text-gray-500">
                  Outras dúvidas?{" "}
                  <a
                    href="#contato"
                    className="font-semibold underline underline-offset-2"
                    style={{ color: tema.text }}
                  >
                    Entre em contato
                  </a>
                </p>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarCatequese">
          {/* ── Catequese ──────────────────────────────────── */}
          {(config.mostrarCatequese ?? true) && (
            <section
              id="catequese"
              ref={catequesesSection.ref}
              className="py-24 bg-white border-t border-gray-100"
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-14 text-center transition-all duration-700 ${catequesesSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <GraduationCap size={14} /> Catequese
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    O caminho da fé
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
                    A catequese é a escola da fé cristã. Conheça cada etapa do
                    processo de formação e os sete sacramentos da Igreja
                    Católica.
                  </p>
                </div>

                {/* Etapas */}
                <div className="mb-16">
                  <h3 className="mb-8 text-center text-xl font-bold text-gray-800">
                    Etapas da Catequese
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {catequese_etapas.map((etapa, i) => (
                      <div
                        key={etapa.num}
                        className={`relative overflow-hidden rounded-3xl bg-white border border-gray-100 p-6 shadow-sm transition-all duration-700 hover:-translate-y-1 hover:shadow-lg ${catequesesSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                        style={{ transitionDelay: `${i * 70}ms` }}
                      >
                        <div
                          className="absolute top-0 left-0 h-1.5 w-full rounded-t-3xl"
                          style={{ background: etapa.cor }}
                        />
                        <div className="mb-4 flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white text-sm font-bold shadow"
                            style={{ background: etapa.cor }}
                          >
                            {etapa.num}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">
                              {etapa.titulo}
                            </p>
                            <p className="text-xs text-gray-400">
                              {etapa.idades}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-600">
                          {etapa.descricao}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sacramentos */}
                <div
                  className="relative overflow-hidden rounded-[2rem] p-5 sm:p-8 lg:p-12"
                  style={{
                    background: `linear-gradient(135deg, ${tema.light}, #fff)`,
                    border: `1px solid ${tema.from}15`,
                  }}
                >
                  <h3
                    className="mb-8 text-center text-xl font-bold"
                    style={{ color: tema.text }}
                  >
                    <Church size={20} className="inline mr-2 -mt-0.5" />
                    Os 7 Sacramentos da Igreja Católica
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {sacramentos.map((s, i) => (
                      <div
                        key={s.nome}
                        className={`rounded-2xl p-5 transition-all duration-700 ${catequesesSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                        style={{
                          background: s.bg,
                          transitionDelay: `${i * 60}ms`,
                        }}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ background: s.cor }}
                          />
                          <p
                            className="font-bold text-sm"
                            style={{ color: s.cor }}
                          >
                            {s.nome}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {s.descricao}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarMandamentos">
          {/* ── Mandamentos da Lei de Deus ─────────────────── */}
          {(config.mostrarMandamentos ?? true) && (
            <section
              id="mandamentos"
              ref={mandamentosSection.ref}
              className="py-24 border-t border-gray-100"
              style={{
                background: `linear-gradient(180deg, ${tema.light}40, #fff)`,
              }}
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`transition-all duration-700 ${mandamentosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="relative overflow-hidden rounded-[2rem] p-5 sm:p-8 lg:p-12"
                    style={{
                      background: `linear-gradient(135deg, ${tema.light}, #fff)`,
                      border: `1px solid ${tema.from}15`,
                    }}
                  >
                    <h3
                      className="mb-8 text-center text-xl font-bold"
                      style={{ color: tema.text }}
                    >
                      <Cross size={20} className="inline mr-2 -mt-0.5" />
                      Os 10 Mandamentos da Lei de Deus
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {mandamentos.map((m, i) => (
                        <div
                          key={m.num}
                          className={`rounded-2xl p-5 transition-all duration-700 ${mandamentosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                          style={{
                            background: m.bg,
                            transitionDelay: `${i * 60}ms`,
                          }}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ background: m.cor }}
                            />
                            <p
                              className="font-bold text-sm"
                              style={{ color: m.cor }}
                            >
                              {m.num} — {m.titulo}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {m.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 text-center">
                      <p className="text-sm italic text-gray-400">
                        "Amai ao Senhor, vosso Deus, de todo o coração, de toda
                        a alma, de todo o entendimento e de todas as forças." —
                        Mc 12,30
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarGlossario">
          {/* ── Glossário Litúrgico ─────────────────────────── */}
          {(config.mostrarGlossario ?? true) && (
            <section
              id="glossario"
              ref={glossarioSection.ref}
              className="py-14 sm:py-24 bg-white border-t border-gray-100"
            >
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-8 sm:mb-12 text-center transition-all duration-700 ${glossarioSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <BookOpen size={14} /> Glossário
                  </div>
                  <h2
                    className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl"
                    style={{ color: tema.text }}
                  >
                    Glossário Litúrgico
                  </h2>
                  <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base text-gray-500">
                    Os principais termos usados na liturgia e no serviço do
                    altar, com definições simples.
                  </p>
                </div>

                <div
                  className={`grid gap-3 sm:grid-cols-2 items-start transition-all duration-700 ${glossarioSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  {glossario.map((g, i) => (
                    <div
                      key={g.termo}
                      className={`rounded-2xl border border-gray-100 bg-white shadow-sm p-5 transition-all duration-700 hover:-translate-y-0.5 hover:shadow-md ${glossarioSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                      style={{ transitionDelay: `${i * 30}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                          }}
                        >
                          {g.termo.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {g.termo}
                          </p>
                          <p className="text-xs text-gray-500 leading-relaxed mt-1">
                            {g.def}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarParamentos">
          {/* ── Paramentos e Vestes ─────────────────────────── */}
          {(config.mostrarParamentos ?? true) && (
            <section
              id="paramentos"
              ref={paramentosSection.ref}
              className="py-14 sm:py-24 border-t border-gray-100"
              style={{
                background: `linear-gradient(180deg, ${tema.light}40, #fff)`,
              }}
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-10 sm:mb-14 text-center transition-all duration-700 ${paramentosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Layers size={14} /> Paramentos
                  </div>
                  <h2
                    className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl"
                    style={{ color: tema.text }}
                  >
                    Paramentos e Vestes Litúrgicas
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-gray-600">
                    Cada vestimenta tem um significado sagrado. Conheça as
                    principais vestes usadas nas celebrações da Igreja.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {paramentos.map((p, i) => (
                    <div
                      key={p.nome}
                      className={`relative overflow-hidden rounded-3xl bg-white border shadow-sm transition-all duration-700 hover:-translate-y-1 hover:shadow-lg ${paramentosSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                      style={{
                        borderColor: p.corBorda,
                        transitionDelay: `${i * 60}ms`,
                      }}
                    >
                      <div
                        className="h-1.5 w-full"
                        style={{ background: p.corBorda }}
                      />
                      <div className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-extrabold border-2"
                            style={{
                              background: p.cor,
                              borderColor: p.corBorda,
                              color: p.corTexto,
                            }}
                          >
                            {p.nome.slice(0, 1)}
                          </div>
                          <span
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                            style={{
                              background: p.cor,
                              color: p.corTexto,
                              border: `1px solid ${p.corBorda}`,
                            }}
                          >
                            {p.tempos}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-gray-900 text-base mb-2">
                          {p.nome}
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {p.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarOracoes">
          {/* ── Orações ────────────────────────────────────── */}
          {(config.mostrarOracoes ?? true) && (
            <section
              id="oracoes"
              ref={oracoesSection.ref}
              className="py-24"
              style={{
                background: `linear-gradient(180deg, ${tema.light}60, #fff)`,
              }}
            >
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-12 text-center transition-all duration-700 ${oracoesSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Cross size={14} /> Orações
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    Orações da Catequese
                  </h2>
                  <p className="mt-3 max-w-xl mx-auto text-base text-gray-500">
                    As principais orações ensinadas na catequese, especialmente
                    na preparação para a Primeira Comunhão. Clique para ver o
                    texto completo.
                  </p>
                </div>

                <div
                  className={`grid gap-3 sm:grid-cols-2 items-start transition-all duration-700 ${oracoesSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  {(config.oracoes ?? []).map((oracao, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <button
                        onClick={() =>
                          setOracaoOpen(oracaoOpen === i ? null : i)
                        }
                        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {oracao.titulo}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {oracao.subtitulo}
                          </p>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`flex-shrink-0 transition-transform duration-200 ${oracaoOpen === i ? "rotate-180" : ""}`}
                          style={{ color: tema.text }}
                        />
                      </button>
                      {oracaoOpen === i && (
                        <div
                          className="border-t px-5 pb-6 pt-4"
                          style={{
                            borderColor: `${tema.from}15`,
                            background: tema.light,
                          }}
                        >
                          <pre className="whitespace-pre-wrap font-serif text-sm leading-loose text-gray-700">
                            {oracao.texto}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarIntencaoMes">
          {/* ── Intenção do Mês ────────────────────────────── */}
          {(config.mostrarIntencaoMes ?? true) && config.intencaoMes_texto && (
            <section
              id="intencao-mes"
              ref={intencaoMesSection.ref}
              className="py-20 bg-white border-t border-gray-100"
            >
              <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`transition-all duration-700 ${intencaoMesSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Heart size={14} /> Espiritualidade
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-extrabold tracking-tight mb-5 sm:mb-8"
                    style={{ color: tema.text }}
                  >
                    {config.intencaoMes_titulo || "Intenção do Mês"}
                  </h2>
                  <div
                    className="relative overflow-hidden rounded-3xl p-5 sm:p-8 text-white shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${tema.from}, ${tema.mid})`,
                    }}
                  >
                    <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative">
                      <div className="text-5xl sm:text-6xl font-serif leading-none opacity-20 mb-2">
                        "
                      </div>
                      <p className="text-base sm:text-lg leading-relaxed font-medium -mt-3 sm:-mt-4">
                        {config.intencaoMes_texto}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarMeditacao">
          {/* ── Meditação da Semana ─────────────────────────── */}
          {(config.mostrarMeditacao ?? true) && config.meditacao_texto && (
            <section
              id="meditacao"
              ref={meditacaoSection.ref}
              className="py-20 border-t border-gray-100"
              style={{
                background: `linear-gradient(180deg, ${tema.light}40, #fff)`,
              }}
            >
              <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`transition-all duration-700 ${meditacaoSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <BookOpen size={14} /> Meditação da Semana
                  </div>
                  <div className="grid gap-5 sm:grid-cols-[1fr_1.3fr]">
                    {/* Versículo */}
                    <div
                      className="rounded-3xl border p-5 sm:p-7 bg-white shadow-sm flex flex-col justify-between"
                      style={{ borderColor: `${tema.from}20` }}
                    >
                      <div>
                        <div
                          className="text-4xl sm:text-5xl font-serif leading-none opacity-15 -mb-2"
                          style={{ color: tema.from }}
                        >
                          "
                        </div>
                        <p className="text-sm sm:text-base italic text-gray-800 leading-relaxed mt-2">
                          {config.meditacao_texto}
                        </p>
                      </div>
                      <div
                        className="mt-5 pt-4 border-t"
                        style={{ borderColor: `${tema.from}15` }}
                      >
                        <p
                          className="font-extrabold text-sm"
                          style={{ color: tema.text }}
                        >
                          {config.meditacao_versiculo || ""}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {config.meditacao_fonte || ""}
                        </p>
                      </div>
                    </div>

                    {/* Reflexão */}
                    {config.meditacao_reflexao && (
                      <div
                        className="rounded-3xl p-5 sm:p-7 text-white shadow-xl"
                        style={{
                          background: `linear-gradient(145deg, ${tema.from}, ${tema.to})`,
                        }}
                      >
                        <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-3">
                          Reflexão
                        </p>
                        <p className="text-sm leading-relaxed opacity-90">
                          {config.meditacao_reflexao}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarAtoConsagracao">
          {/* ── Ato de Consagração ──────────────────────────── */}
          {(config.mostrarAtoConsagracao ?? true) &&
            config.atoConsagracao_texto && (
              <section
                id="ato-consagracao"
                ref={atoConsSection.ref}
                className="py-20 bg-white border-t border-gray-100"
              >
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                  <div
                    className={`transition-all duration-700 ${atoConsSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  >
                    <div
                      className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                      style={{
                        background: tema.light,
                        color: tema.text,
                        outline: `1px solid ${tema.from}25`,
                      }}
                    >
                      <Star size={14} /> São Domingos Sávio
                    </div>
                    <h2
                      className="text-xl sm:text-2xl font-extrabold tracking-tight mb-6 sm:mb-8"
                      style={{ color: tema.text }}
                    >
                      Ato de Consagração ao Santo Padroeiro
                    </h2>
                    <div
                      className="relative overflow-hidden rounded-3xl border bg-white shadow-xl p-5 sm:p-8 lg:p-10"
                      style={{ borderColor: `${tema.from}20` }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.03] rounded-3xl"
                        style={{
                          background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                        }}
                      />
                      <div className="relative text-center">
                        <div
                          className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-5 sm:mb-6 rounded-3xl flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                          }}
                        >
                          ✦
                        </div>
                        <pre className="whitespace-pre-wrap font-serif text-sm sm:text-base leading-loose text-gray-700 text-center max-w-lg mx-auto">
                          {config.atoConsagracao_texto}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
        </div>

        <div data-section="mostrarTimeline">
          {/* ── História / Timeline ─────────────────────────── */}
          {(config.mostrarTimeline ?? true) && (
            <section
              id="historia"
              ref={timelineSection.ref}
              className="py-24 bg-white border-t border-gray-100"
            >
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-14 text-center transition-all duration-700 ${timelineSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Flag size={14} /> Nossa História
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    Uma caminhada de fé
                  </h2>
                  <p className="mt-3 text-base text-gray-500">
                    Os marcos que definiram o ministério ao longo dos anos.
                  </p>
                </div>

                <div className="relative">
                  {/* Linha central */}
                  <div
                    className="absolute left-6 top-0 bottom-0 w-px sm:left-1/2 sm:-translate-x-1/2"
                    style={{
                      background: `linear-gradient(180deg, ${tema.from}60, ${tema.accent}60, transparent)`,
                    }}
                  />

                  <div className="space-y-10">
                    {(config.milestones ?? []).map((m, i) => {
                      const isRight = i % 2 === 0;
                      return (
                        <div
                          key={m.ano}
                          className={`relative flex gap-6 sm:gap-0 transition-all duration-700 ${timelineSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${isRight ? "sm:flex-row" : "sm:flex-row-reverse"}`}
                          style={{ transitionDelay: `${i * 80}ms` }}
                        >
                          {/* Círculo central */}
                          <div
                            className="absolute left-6 sm:left-1/2 top-5 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-white shadow-md"
                            style={{
                              background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                            }}
                          />

                          {/* Conteúdo */}
                          <div
                            className={`ml-14 sm:ml-0 sm:w-[45%] ${isRight ? "sm:pr-10 sm:text-right" : "sm:pl-10"}`}
                          >
                            <div
                              className={`overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow`}
                            >
                              <span
                                className="text-xs font-bold uppercase tracking-widest"
                                style={{ color: tema.accent }}
                              >
                                {m.ano}
                              </span>
                              <h3 className="mt-1 font-bold text-gray-900 text-sm">
                                {m.evento}
                              </h3>
                              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                                {m.desc}
                              </p>
                            </div>
                          </div>

                          {/* Spacer lado oposto */}
                          <div className="hidden sm:block sm:w-[45%]" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarDepoimentos">
          {/* ── Testimonials ───────────────────────────────── */}
          {(config.mostrarDepoimentos ?? true) && (
            <section
              id="depoimentos"
              ref={testimonialsSection.ref}
              className="py-24 bg-white"
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                  className={`mb-14 text-center transition-all duration-700 ${testimonialsSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Star size={14} style={{ color: tema.accent }} />
                    Depoimentos
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    O que dizem sobre o ministério
                  </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  {config.depoimentos.map((t, i) => (
                    <div
                      key={t.nome}
                      className={`relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-700 hover:shadow-xl hover:-translate-y-1 ${testimonialsSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                      style={{ transitionDelay: `${i * 100}ms` }}
                    >
                      <div className="mb-5 flex gap-1">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <Star
                            key={si}
                            size={15}
                            fill="currentColor"
                            style={{ color: tema.accent }}
                          />
                        ))}
                      </div>
                      <p className="text-base leading-relaxed text-gray-700 italic">
                        "{t.texto}"
                      </p>
                      <div className="mt-6 flex items-center gap-3 border-t border-gray-50 pt-5">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                          style={{ background: themeGradient }}
                        >
                          {t.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {t.nome}
                          </p>
                          <p className="text-xs text-gray-500">{t.cargo}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarMapa">
          {/* ── Localização / Mapa ─────────────────────────── */}
          {(config.mostrarMapa ?? true) && config.endereco && (
            <section
              id="localizacao"
              ref={mapaSection.ref}
              className="py-20 bg-white border-t border-gray-100"
            >
              <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
                <div
                  className={`transition-all duration-700 ${mapaSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{ background: tema.light, color: tema.text }}
                  >
                    <MapPin size={14} /> Nossa Localização
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight mb-8"
                    style={{ color: tema.text }}
                  >
                    Onde nos encontrar
                  </h2>
                  <div
                    className="overflow-hidden rounded-3xl border bg-white shadow-xl"
                    style={{ borderColor: `${tema.from}20` }}
                  >
                    {config.enderecoEmbedUrl ? (
                      <iframe
                        src={config.enderecoEmbedUrl}
                        width="100%"
                        height="360"
                        style={{ border: 0, display: "block" }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Localização da paróquia"
                      />
                    ) : null}
                    <div className="flex flex-col items-center gap-4 p-8">
                      {!config.enderecoEmbedUrl && (
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                          }}
                        >
                          <MapPin size={26} />
                        </div>
                      )}
                      <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line font-medium text-center">
                        {config.endereco}
                      </p>
                      {config.enderecoMapUrl && (
                        <a
                          href={config.enderecoMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${tema.from}, ${tema.to})`,
                            boxShadow: `0 6px 20px ${tema.from}35`,
                          }}
                        >
                          <MapPin size={15} /> Abrir no Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarYoutube">
          {/* ── YouTube ────────────────────────────────────── */}
          {(config.mostrarYoutube ?? true) && config.youtubeEmbedUrl && (
            <section
              ref={youtubeSection.ref}
              className="py-20 border-t border-gray-100"
              style={{
                background: `linear-gradient(180deg, ${tema.light}50, #fff)`,
              }}
            >
              <div className="mx-auto max-w-4xl px-4 sm:px-6">
                <div
                  className={`mb-10 text-center transition-all duration-700 ${youtubeSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                  <div
                    className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      background: tema.light,
                      color: tema.text,
                      outline: `1px solid ${tema.from}25`,
                    }}
                  >
                    <Play size={14} /> Vídeo
                  </div>
                  <h2
                    className="text-3xl font-extrabold tracking-tight"
                    style={{ color: tema.text }}
                  >
                    Assista à celebração
                  </h2>
                </div>
                <div
                  className={`overflow-hidden rounded-3xl shadow-2xl transition-all duration-700 delay-100 ${youtubeSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={{ aspectRatio: "16/9" }}
                >
                  <iframe
                    src={config.youtubeEmbedUrl}
                    title="Vídeo do ministério"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarContato">
          {/* ── Contact / CTA ──────────────────────────────── */}
          {(config.mostrarContato ?? true) && (
            <section
              id="contato"
              ref={ctaSection.ref}
              className="py-24"
              style={{
                background: `linear-gradient(160deg, ${tema.light} 0%, #fff 100%)`,
              }}
            >
              <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                <div
                  className={`overflow-hidden rounded-[2.5rem] bg-white p-6 sm:p-12 shadow-xl transition-all duration-700 ${ctaSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={{
                    boxShadow: `0 24px 48px ${tema.from}12`,
                    border: `1px solid ${tema.from}20`,
                  }}
                >
                  <div
                    className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl shadow-xl text-white"
                    style={{ background: themeGradient }}
                  >
                    <img
                      src={logoGrupo}
                      alt="Logo"
                      className="h-12 w-16 object-contain"
                    />
                  </div>
                  <h2
                    className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                    style={{ color: tema.text }}
                  >
                    Entre em contato
                  </h2>
                  <p className="mx-auto mt-4 max-w-lg text-lg text-gray-600">
                    Quer saber mais sobre o ministério? Tem alguma dúvida ou
                    quer fazer parte da equipe? Entre em contato conosco.
                  </p>

                  <div className="mt-8 flex flex-col items-center gap-4">
                    {config.emailContato && (
                      <a
                        href={`mailto:${config.emailContato}`}
                        className="inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
                        style={{
                          background: themeGradient,
                          boxShadow: `0 8px 24px ${tema.from}35`,
                        }}
                      >
                        <Mail size={18} />
                        {config.emailContato}
                      </a>
                    )}
                    {config.telefoneContato && (
                      <a
                        href={`tel:${config.telefoneContato}`}
                        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-base font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-300 bg-white transition-all"
                      >
                        <Phone size={18} />
                        {config.telefoneContato}
                      </a>
                    )}

                    {/* Social links in contact */}
                    {hasSocial && (
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {config.instagramUrl && (
                          <a
                            href={config.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-100 text-sm font-semibold text-gray-500 hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50 transition-all"
                          >
                            <Link2 size={13} /> Instagram
                          </a>
                        )}
                        {config.facebookUrl && (
                          <a
                            href={config.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-100 text-sm font-semibold text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                          >
                            <Link2 size={13} /> Facebook
                          </a>
                        )}
                        {config.youtubeUrl && (
                          <a
                            href={config.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-100 text-sm font-semibold text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
                          >
                            <Link2 size={13} /> YouTube
                          </a>
                        )}
                        {whatsappHref && (
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-100 text-sm font-semibold text-gray-500 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition-all"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div data-section="mostrarFormulario">
          {/* ── Quero Servir ───────────────────────────────── */}
          {(config.mostrarFormulario ?? true) && (
            <section
              id="servir"
              className="py-24 bg-white border-t border-gray-100"
            >
              <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 text-center">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold mb-5"
                  style={{ background: tema.light, color: tema.text }}
                >
                  <Heart size={14} /> Fazer Parte
                </div>
                <h2
                  className="text-4xl font-extrabold tracking-tight mb-3"
                  style={{ color: tema.text }}
                >
                  Sinto o Chamado
                </h2>
                <p className="text-gray-500 mb-10 text-lg leading-relaxed">
                  Você sente o desejo de servir no Ministério dos Acólitos?
                  <br />
                  Deixe seus dados e entraremos em contato.
                </p>

                {enviado ? (
                  <div className="rounded-3xl border border-green-200 bg-green-50 p-6 sm:p-10 text-center">
                    <CheckCircle2
                      size={44}
                      className="mx-auto mb-4 text-green-600"
                    />
                    <p className="text-xl font-semibold text-gray-900">
                      Interesse registrado!
                    </p>
                    <p className="mt-2 text-gray-500">
                      Em breve entraremos em contato. Que Deus abençoe!
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleInteresse}
                    className="space-y-4 text-left"
                  >
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Nome *
                      </label>
                      <input
                        required
                        value={form.nome}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, nome: e.target.value }))
                        }
                        placeholder="Seu nome completo"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2"
                        style={{ ["--tw-ring-color" as string]: tema.mid }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Telefone (WhatsApp)
                      </label>
                      <input
                        value={form.telefone}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, telefone: e.target.value }))
                        }
                        placeholder="(XX) XXXXX-XXXX"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Mensagem (opcional)
                      </label>
                      <textarea
                        value={form.mensagem}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, mensagem: e.target.value }))
                        }
                        rows={3}
                        placeholder="Conte um pouco sobre você..."
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={enviando}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-70"
                      style={{ background: themeGradient }}
                    >
                      <Send size={16} />
                      {enviando ? "Enviando..." : "Enviar interesse"}
                    </button>
                  </form>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
      {/* /seções dinâmicas */}

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-10 items-center justify-center rounded-2xl shadow-md text-white"
                style={{ background: themeGradient }}
              >
                <img
                  src={logoGrupo}
                  alt="Logo"
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: tema.text }}>
                  {config.nomeMinisterio}
                </p>
                <p className="text-xs text-gray-400">
                  {config.subtituloMinisterio}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-5 text-xs text-gray-400">
              <a
                href="#missao"
                className="hover:text-gray-700 transition-colors"
              >
                Nossa Missão
              </a>
              <a
                href="#funcionalidades"
                className="hover:text-gray-700 transition-colors"
              >
                O Sistema
              </a>
              <a
                href="#formacao"
                className="hover:text-gray-700 transition-colors"
              >
                Formação
              </a>
              <a
                href="#agenda"
                className="hover:text-gray-700 transition-colors"
              >
                Agenda
              </a>
              <a href="#faq" className="hover:text-gray-700 transition-colors">
                Dúvidas
              </a>
              <a
                href="#catequese"
                className="hover:text-gray-700 transition-colors"
              >
                Catequese
              </a>
              <a
                href="#mandamentos"
                className="hover:text-gray-700 transition-colors"
              >
                Mandamentos
              </a>
              <a
                href="#santos"
                className="hover:text-gray-700 transition-colors"
              >
                Santos
              </a>
              <a
                href="#glossario"
                className="hover:text-gray-700 transition-colors"
              >
                Glossário
              </a>
              <a
                href="#ato-consagracao"
                className="hover:text-gray-700 transition-colors"
              >
                Consagração
              </a>
              <a
                href="#oracoes"
                className="hover:text-gray-700 transition-colors"
              >
                Orações
              </a>
              <a
                href="#historia"
                className="hover:text-gray-700 transition-colors"
              >
                História
              </a>
              <a
                href="#contato"
                className="hover:text-gray-700 transition-colors"
              >
                Contato
              </a>
              <a
                href="#servir"
                className="hover:text-gray-700 transition-colors font-semibold"
                style={{ color: tema.text }}
              >
                Quero Servir
              </a>
            </div>

            {/* Social in footer */}
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
              {config.instagramUrl && (
                <a
                  href={config.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-pink-500 transition-colors font-medium"
                >
                  Instagram
                </a>
              )}
              {config.facebookUrl && (
                <a
                  href={config.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-blue-600 transition-colors font-medium"
                >
                  Facebook
                </a>
              )}
              {config.youtubeUrl && (
                <a
                  href={config.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors font-medium"
                >
                  YouTube
                </a>
              )}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-green-500 transition-colors font-medium"
                >
                  WhatsApp
                </a>
              )}
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} {config.nomeMinisterio}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
