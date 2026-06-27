/**
 * Utilitário para parse de PDF via pdfjs-dist.
 * Extrai texto página a página e estrutura em tópicos/seções hierárquicas.
 */

import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api'

export interface Topico {
  titulo: string
  conteudo: string
  subtopicos?: Topico[]
}

export interface ConteudoEstruturado {
  topicos: Topico[]
  total_paginas: number
  titulo_detectado?: string
}

function limpar_titulo(t: string): string {
  return t.replace(/\.+\s*$/, '').trim();
}

function parece_titulo(texto: string, tocTerminated: boolean): boolean {
  const t = texto.trim();
  if (t.length < 3 || t.length > 100) return false;
  
  // Ignorar sumário e separadores comuns de PDF
  if (/\.{4,}/.test(t)) return false;
  if (/^[…\-\–\_\.]{3,}$/.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  
  // Se ainda estivermos no Sumário, ignorar tudo exceto o início real
  const conhecidosInicio = ['apresentação', 'introdução'];
  if (!tocTerminated) {
    return conhecidosInicio.includes(t.toLowerCase());
  }

  // 1. Títulos principais numerados (ex: "1 - Da história", "2– Do Ministério")
  if (/^\d+\s*[\-–—]\s*[A-ZÀ-Ú]/i.test(t)) {
    return true;
  }

  // 2. Subtópicos numerados (ex: "5.1-Formação" ou "5.1 Formação" ou "5.1 - Formação")
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

function limpar_texto(texto: string): string {
  return texto
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function obter_nivel(titulo: string): number {
  const clean = titulo.trim();
  const match = clean.match(/^(\d+)\.(\d+)/);
  if (match) {
    return 2; // Subtópico (ex: 5.1)
  }
  return 1; // Tópico principal
}

export async function parsePdf(base64: string): Promise<ConteudoEstruturado> {
  const pdfjsLib = await import('pdfjs-dist')

  // Worker via UNPKG para evitar problemas de CORS e 404
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const raw = base64.replace(/^data:[^;]+;base64,/, '')
  const binary = atob(raw)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: bytes }).promise
  const totalPaginas = pdf.numPages

  const linhasPorPagina: string[][] = []

  for (let p = 1; p <= totalPaginas; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const linhas: string[] = []

    let ultimaY = -1
    let linhaAtual = ''

    for (const item of content.items as TextItem[]) {
      const texto = item.str
      if (!texto) continue
      const y = Math.round(item.transform[5])

      if (ultimaY === -1) {
        ultimaY = y
        linhaAtual = texto
      } else if (Math.abs(y - ultimaY) < 3) {
        linhaAtual += ' ' + texto
      } else {
        if (linhaAtual.trim()) linhas.push(linhaAtual.trim())
        linhaAtual = texto
        ultimaY = y
      }
    }
    if (linhaAtual.trim()) linhas.push(linhaAtual.trim())
    linhasPorPagina.push(linhas)
  }

  const todasLinhas = linhasPorPagina.flat()

  // Detectar título do documento (primeira linha substancial)
  let titulo_detectado: string | undefined
  for (const linha of todasLinhas) {
    if (linha.trim().length > 3) {
      titulo_detectado = limpar_titulo(linha)
      break
    }
  }

  const topicos: Topico[] = []
  let topicoPrincipalAtual: Topico | null = null
  let topicoAtual: Topico | null = null
  let conteudoAtual: string[] = []
  let tocTerminated = false

  for (const linha of todasLinhas) {
    const limpa = linha.trim()
    if (parece_titulo(limpa, tocTerminated)) {
      if (!tocTerminated && ['apresentação', 'introdução'].includes(limpa.toLowerCase())) {
        tocTerminated = true;
      }

      const tituloLimpo = limpar_titulo(limpa)
      const nivel = obter_nivel(tituloLimpo)

      if (topicoAtual) {
        topicoAtual.conteudo = limpar_texto(conteudoAtual.join('\n'))
      }

      const novoTopico: Topico = { titulo: tituloLimpo, conteudo: '', subtopicos: [] }

      if (nivel === 1) {
        topicos.push(novoTopico)
        topicoPrincipalAtual = novoTopico
        topicoAtual = novoTopico
      } else {
        if (topicoPrincipalAtual) {
          if (!topicoPrincipalAtual.subtopicos) topicoPrincipalAtual.subtopicos = []
          topicoPrincipalAtual.subtopicos.push(novoTopico)
          topicoAtual = novoTopico
        } else {
          topicos.push(novoTopico)
          topicoPrincipalAtual = novoTopico
          topicoAtual = novoTopico
        }
      }
      conteudoAtual = []
    } else {
      if (topicoAtual) {
        conteudoAtual.push(linha)
      }
    }
  }

  if (topicoAtual) {
    topicoAtual.conteudo = limpar_texto(conteudoAtual.join('\n'))
  }

  // Se não detectou tópicos, criar um único tópico com todo o conteúdo
  if (topicos.length === 0) {
    topicos.push({
      titulo: titulo_detectado ?? 'Conteúdo',
      conteudo: limpar_texto(todasLinhas.join('\n')),
      subtopicos: []
    })
  }

  return { topicos, total_paginas: totalPaginas, titulo_detectado }
}
