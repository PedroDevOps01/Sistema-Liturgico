import fs from 'fs';

const lines = fs.readFileSync('./diretorio_extracted.txt', 'utf-8').split('\n');

function limpar_titulo(t) {
  return t.replace(/\.+\s*$/, '').trim();
}

function parece_titulo(texto, tocTerminated) {
  const t = texto.trim();
  if (t.length < 3 || t.length > 100) return false;
  
  // Ignorar sumário e separadores
  if (/\.{4,}/.test(t)) return false;
  if (/^[…\-\–\_\.]{3,}$/.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  
  // Se ainda estivermos no Sumário, ignorar tudo exceto o início real
  const conhecidosInicio = ['apresentação', 'introdução'];
  if (!tocTerminated) {
    return conhecidosInicio.includes(t.toLowerCase());
  }

  // 1. Títulos principais numerados: ex "1 - Da história", "2– Do Ministério"
  if (/^\d+\s*[\-–—]\s*[A-ZÀ-Ú]/i.test(t)) {
    return true;
  }

  // 2. Subtópicos numerados: ex "5.1-Formação" ou "5.1 Formação" ou "5.1 - Formação"
  if (/^\d+\.\d+\s*([\-–—]|\s+[A-ZÀ-Ú]|\-[A-ZÀ-Ú])/i.test(t)) {
    return true;
  }
  
  // 3. Títulos conhecidos não numerados
  const conhecidos = ['apresentação', 'introdução', 'conclusão', 'anexos', 'anexo', 'sumário', 'modelos de vestes de cerimoniários'];
  if (conhecidos.includes(t.toLowerCase())) {
    return true;
  }
  if (/^anexo\s+\d+/i.test(t)) {
    return true;
  }
  
  return false;
}

function limpar_texto(texto) {
  return texto
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Analisar nível do título
function obter_nivel(titulo) {
  const clean = titulo.trim();
  const match = clean.match(/^(\d+)\.(\d+)/);
  if (match) {
    return 2; // Subtópico (ex: 5.1)
  }
  return 1; // Tópico principal
}

const topicos = [];
let topicoPrincipalAtual = null;
let topicoAtual = null;
let conteudoAtual = [];
let tocTerminated = false;

for (let i = 0; i < lines.length; i++) {
  const linha = lines[i].trim();
  
  if (parece_titulo(linha, tocTerminated)) {
    if (!tocTerminated && ['apresentação', 'introdução'].includes(linha.toLowerCase())) {
      tocTerminated = true;
    }
    
    const tituloLimpo = limpar_titulo(linha);
    const nivel = obter_nivel(tituloLimpo);
    
    // Salvar o conteúdo acumulado para o tópico anterior
    if (topicoAtual) {
      topicoAtual.conteudo = limpar_texto(conteudoAtual.join('\n'));
    }
    
    const novoTopico = { titulo: tituloLimpo, conteudo: '', subtopicos: [] };
    
    if (nivel === 1) {
      topicos.push(novoTopico);
      topicoPrincipalAtual = novoTopico;
      topicoAtual = novoTopico;
    } else {
      // É nível 2 (subtópico)
      if (topicoPrincipalAtual) {
        topicoPrincipalAtual.subtopicos.push(novoTopico);
        topicoAtual = novoTopico;
      } else {
        topicos.push(novoTopico);
        topicoPrincipalAtual = novoTopico;
        topicoAtual = novoTopico;
      }
    }
    conteudoAtual = [];
  } else {
    if (topicoAtual) {
      conteudoAtual.push(linha);
    }
  }
}

if (topicoAtual) {
  topicoAtual.conteudo = limpar_texto(conteudoAtual.join('\n'));
}

console.log('Total de tópicos principais estruturados:', topicos.length);
topicos.forEach((t, i) => {
  console.log(`\n[${i+1}] TÓPICO PRINCIPAL: "${t.titulo}" (${t.subtopicos.length} subtópicos)`);
  if (t.conteudo) {
    console.log(`    CONTEÚDO (primeiros 100 caracteres): "${t.conteudo.slice(0, 100).replace(/\n/g, ' ')}..."`);
  }
  t.subtopicos.forEach((st, j) => {
    console.log(`    └─ [${i+1}.${j+1}] SUBTÓPICO: "${st.titulo}"`);
    if (st.conteudo) {
      console.log(`        CONTEÚDO (primeiros 80 caracteres): "${st.conteudo.slice(0, 80).replace(/\n/g, ' ')}..."`);
    }
  });
});
