export function isFuncaoMestre(label?: string | null): boolean {
  return (label ?? '').toLowerCase().includes('mestre')
}
