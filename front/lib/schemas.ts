import { z } from "zod"

const optionalDay = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Fecha inválida")

export const tripFormSchema = z
  .object({
    name: z.string().trim().min(1, "Poné un nombre para el viaje").max(255, "Máximo 255 caracteres"),
    description: z.string().max(2000, "Máximo 2000 caracteres"),
    start_date: optionalDay,
    end_date: optionalDay,
    rating: z.number().int().min(0).max(5),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    message: "La fecha de fin no puede ser anterior al inicio",
    path: ["end_date"],
  })
  .refine((v) => !v.end_date || !!v.start_date, {
    message: "Indicá también la fecha de inicio",
    path: ["start_date"],
  })

export type TripFormValues = z.infer<typeof tripFormSchema>

export const entryFormSchema = z.object({
  trip_id: z.string().min(1, "Elegí un viaje"),
  name: z.string().trim().min(1, "Poné un título").max(255, "Máximo 255 caracteres"),
  visit_date: optionalDay,
  description: z.string().max(5000, "Máximo 5000 caracteres"),
  category: z.enum(["restaurante", "hotel", "atraccion", "museo", "naturaleza", "compras", "otros"]),
  rating: z.number().int().min(0).max(5),
  expenses: z
    .string()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), "Ingresá un monto válido"),
  latitude: z.number({ message: "Elegí dónde fue en el mapa" }).min(-90).max(90),
  longitude: z.number({ message: "Elegí dónde fue en el mapa" }).min(-180).max(180),
})

export type EntryFormValues = z.infer<typeof entryFormSchema>

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

// Cualquier imagen que el navegador pueda abrir; las que no son JPEG/PNG/WebP/GIF se convierten a JPEG
export const photoFileSchema = z.object({
  type: z.string().startsWith("image/", "Solo se pueden subir imágenes."),
})
