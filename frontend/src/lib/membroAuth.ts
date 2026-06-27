const TOKEN_KEY = 'membro_token'
const USER_KEY  = 'membro_user'

export interface MembroUser {
  id: number
  nome: string
  usuario: string
  numero?: string
  foto_base64?: string | null
  mestre: boolean
  ativo: boolean
  data_nascimento?: string
}

export function getMembroToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setMembroToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeMembroToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getMembroUser(): MembroUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as MembroUser } catch { return null }
}

export function setMembroUser(user: MembroUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeMembroUser(): void {
  localStorage.removeItem(USER_KEY)
}

export function isMembroAuthenticated(): boolean {
  return !!getMembroToken()
}
