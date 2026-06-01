export function applyDynamicFavicon(logoUrl: string) {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const style = getComputedStyle(document.documentElement)
  const w300 = `rgb(${style.getPropertyValue('--w-200').trim()})`
  const w500 = `rgb(${style.getPropertyValue('--w-500').trim()})`
  const w700 = `rgb(${style.getPropertyValue('--w-700').trim()})`

  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, w300)
  grad.addColorStop(0.45, w500)
  grad.addColorStop(1, w700)

  // Fundo circular com gradiente da paleta
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  const img = new Image()
  img.onload = () => {
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()

    // Escala pela altura para caber cabeça + ombros no círculo
    const scale = size / img.naturalHeight
    const drawW = img.naturalWidth * scale
    const drawH = size
    // Centraliza horizontalmente
    const offsetX = (size - drawW) / 2
    ctx.drawImage(img, offsetX, 0, drawW, drawH)
    ctx.restore()

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      document.head.appendChild(link)
    }
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = canvas.toDataURL('image/png')
  }
  img.src = logoUrl
}
