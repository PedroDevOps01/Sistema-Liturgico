/** Comprime uma imagem no browser (resize + JPEG) antes de enviar ao backend. */
export function compressToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new window.Image()
      img.onerror = reject
      img.onload = () => {
        const MAX_W = 1400
        const scale = img.width > MAX_W ? MAX_W / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas
          .getContext('2d')!
          .drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('compress failed'))),
          'image/jpeg',
          0.82,
        )
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Lê um File como data URL (base64) e retorna já sem o prefixo "data:...;base64,". */
export function readFileAsBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.replace(/^data:[^;]+;base64,/, ''))
    }
    reader.readAsDataURL(file)
  })
}
