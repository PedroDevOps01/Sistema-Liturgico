import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Safely parses "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss.000000Z" → local Date */
export function parseDate(raw: string): Date {
  const s = raw.substring(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "dd/MM/yyyy (Seg)" */
export function formatDataShort(raw: string): string {
  try { return format(parseDate(raw), "dd/MM/yyyy (EEE)", { locale: ptBR }) }
  catch { return raw.substring(0, 10) }
}

/** "dd de Maio" */
export function formatDataMedium(raw: string): string {
  try { return format(parseDate(raw), "dd 'de' MMMM", { locale: ptBR }) }
  catch { return raw.substring(0, 10) }
}

/** "dd de Maio de 2026 (Segunda-feira)" */
export function formatDataLong(raw: string): string {
  try { return format(parseDate(raw), "dd 'de' MMMM 'de' yyyy (EEEE)", { locale: ptBR }) }
  catch { return raw.substring(0, 10) }
}

/** "HH:mm" from "HH:mm:ss" or "HH:mm:ss.000000Z" */
export function formatHorario(raw: string): string {
  return raw?.substring(0, 5) ?? '--:--'
}

/** "28/05/2026 às 14:30" from ISO datetime string */
export function formatDatetime(raw: string): string {
  try {
    return format(new Date(raw), "dd/MM/yyyy 'às' HH:mm")
  } catch {
    return raw?.substring(0, 16).replace('T', ' ') ?? '—'
  }
}

/** Day / Month / Weekday parts for DateBox */
export function parseDateParts(raw: string): { day: string; month: string; weekday: string } {
  try {
    const dt = parseDate(raw)
    return {
      day:     format(dt, 'dd'),
      month:   format(dt, 'MMM', { locale: ptBR }),
      weekday: format(dt, 'EEE', { locale: ptBR }),
    }
  } catch {
    return { day: '--', month: '---', weekday: '---' }
  }
}

/** Phone: "85992493585" → "(85) 99249-3585" */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '—'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  }
  return raw
}
