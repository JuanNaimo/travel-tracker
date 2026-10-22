"use client"

import { useRef, useState } from "react"
import { z } from "zod"
import { ImagePlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db, type PlacePhoto } from "@/lib/api-client"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const
// Las fotos se guardan embebidas (data URL) en la base de datos: limitar el tamaño
const MAX_SIZE = 5 * 1024 * 1024

const photoFileSchema = z.object({
  type: z.enum(ACCEPTED_TYPES, { message: "Formato no válido. Usa JPEG, PNG, WebP o GIF." }),
  size: z.number().max(MAX_SIZE, "El archivo no puede superar los 5 MB."),
})

// Convierte el archivo a data URL para persistirlo (una blob: URL solo vive en la pestaña actual)
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    // readAsDataURL siempre produce un string en result
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface PhotoUploadProps {
  placeId: string
  onSuccess: (photo: PlacePhoto) => void
}

export function PhotoUpload({ placeId, onSuccess }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [caption, setCaption] = useState("")
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = photoFileSchema.safeParse({ type: file.type, size: file.size })
    if (!result.success) {
      toast.error(result.error.errors[0].message)
      e.target.value = ""
      return
    }

    setSelectedFile(file)
    setCaption("")
  }

  const handleSave = async () => {
    if (!selectedFile) return
    setLoading(true)

    let photoUrl: string
    try {
      photoUrl = await readAsDataUrl(selectedFile)
    } catch {
      setLoading(false)
      toast.error("No se pudo leer el archivo.")
      return
    }
    const { data, error } = await db.photos.create({
      place_id: placeId,
      photo_url: photoUrl,
      caption: caption.trim() || null,
    })

    setLoading(false)

    if (error || !data) {
      toast.error("Error al guardar la foto.")
      return
    }

    toast.success("Foto agregada.")
    setSelectedFile(null)
    setCaption("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    onSuccess(data)
  }

  return (
    <div className="mt-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      {!selectedFile ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="w-4 h-4 mr-2" />
          Agregar foto
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground truncate">{selectedFile.name}</p>
          <Input
            placeholder="Descripción (opcional, máx. 200 caracteres)"
            maxLength={200}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
