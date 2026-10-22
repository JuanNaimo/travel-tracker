const MAX_SIDE = 2000
const JPEG_QUALITY = 0.85

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    // readAsDataURL siempre deja un string en result
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Convierte la foto en data URL para guardarla en la API. Las fotos grandes del celular se
 * achican a 2000 px de lado como máximo para que entren en el límite de 5 MB.
 */
export async function photoToDataUrl(file: File): Promise<string> {
  if (file.type === "image/gif") return readAsDataUrl(file)
  const keepsFormat = ["image/jpeg", "image/png", "image/webp"].includes(file.type)

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  if (keepsFormat && scale === 1 && file.size <= 1.5 * 1024 * 1024) {
    bitmap.close()
    return readAsDataUrl(file)
  }

  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY)
}

/** Tamaño en bytes del contenido de una data URL en base64. */
export const dataUrlBytes = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4)
