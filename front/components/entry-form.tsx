"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CameraPlusIcon, CrosshairIcon, MapPinIcon, SpinnerGapIcon, TrashIcon, XIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { db, type Place, type PlacePhoto } from "@/lib/api-client"
import { reverseGeocode } from "@/lib/geocoding"
import { dataUrlBytes, photoToDataUrl } from "@/lib/image"
import { entryFormSchema, MAX_PHOTO_BYTES, photoFileSchema, type EntryFormValues } from "@/lib/schemas"
import { CATEGORIES, CATEGORY_LABELS, dayOfTrip, MOODS } from "@/lib/travel"
import { cn } from "@/lib/utils"
import { useTravelData } from "@/components/travel-data-provider"
import { TravelMap } from "@/components/travel-map"
import { PlaceSearch } from "@/components/place-search"
import { TripFormDialog } from "@/components/trip-form-dialog"
import { ConfirmButton } from "@/components/confirm-button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const MAX_PHOTOS = 30

type NewPhoto = { key: string; file: File; preview: string }

interface EntryFormProps {
  /** La entrada a editar; sin ella el formulario crea una nueva. */
  place?: Place
  defaultTripId?: string
  /** Punto marcado en el mapa antes de abrir el formulario. */
  initialLocation?: { latitude: number; longitude: number }
}

export function EntryForm({ place, defaultTripId, initialLocation }: EntryFormProps) {
  const router = useRouter()
  const { trips, photos, reload } = useTravelData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([])
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      trip_id: place?.trip_id ?? defaultTripId ?? "",
      name: place?.name ?? "",
      visit_date: place?.visit_date ?? format(new Date(), "yyyy-MM-dd"),
      description: place?.description ?? "",
      category: place?.category ?? "otros",
      rating: place?.rating ?? 0,
      expenses: place?.expenses ? String(place.expenses) : "",
      latitude: place?.latitude ?? initialLocation?.latitude,
      longitude: place?.longitude ?? initialLocation?.longitude,
    },
  })

  // Los datos llegan después del primer render: elegir el viaje en curso si no vino ninguno
  const tripId = useWatch({ control: form.control, name: "trip_id" })
  useEffect(() => {
    if (!tripId && trips.length > 0) form.setValue("trip_id", defaultTripId ?? trips[0].id)
  }, [tripId, trips, defaultTripId, form])

  // Liberar las vistas previas al salir del formulario
  const previewsRef = useRef<NewPhoto[]>([])
  useEffect(() => {
    previewsRef.current = newPhotos
  }, [newPhotos])
  useEffect(() => () => previewsRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), [])

  const [latitude, longitude, visitDate] = useWatch({ control: form.control, name: ["latitude", "longitude", "visit_date"] })
  const location = latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null
  const trip = trips.find((t) => t.id === tripId)
  const day = trip && visitDate ? dayOfTrip(trip, visitDate) : null

  const keptPhotos: PlacePhoto[] = place
    ? photos.filter((ph) => ph.place_id === place.id && !removedPhotoIds.includes(ph.id))
    : []
  const photoCount = keptPhotos.length + newPhotos.length

  const setLocation = async (coords: { latitude: number; longitude: number }, name?: string) => {
    form.setValue("latitude", coords.latitude, { shouldValidate: true })
    form.setValue("longitude", coords.longitude, { shouldValidate: true })
    if (name) {
      setLocationLabel(name)
      return
    }
    setLocationLabel(null)
    const result = await reverseGeocode(coords.latitude, coords.longitude).catch(() => null)
    if (result) applySuggestion(result)
  }

  // Nombre y tipo sugeridos por OpenStreetMap, sin pisar lo que ya escribió el usuario
  function applySuggestion(result: { name: string; category: Place["category"] }) {
    setLocationLabel(result.name)
    if (!form.getValues("name")) form.setValue("name", result.name)
    if (form.getValues("category") === "otros") form.setValue("category", result.category)
  }

  useEffect(() => {
    if (!initialLocation) return
    const controller = new AbortController()
    reverseGeocode(initialLocation.latitude, initialLocation.longitude, controller.signal)
      .then((result) => result && applySuggestion(result))
      .catch(() => undefined)
    return () => controller.abort()
    // Solo una vez, para sugerir el nombre del punto marcado en el mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const locateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no permite obtener la ubicación.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      },
      () => {
        setLocating(false)
        toast.error("No pudimos obtener tu ubicación.")
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const accepted: NewPhoto[] = []
    for (const file of Array.from(files)) {
      const check = photoFileSchema.safeParse({ type: file.type })
      if (!check.success) {
        toast.error(`${file.name}: ${check.error.errors[0].message}`)
        continue
      }
      if (photoCount + accepted.length >= MAX_PHOTOS) {
        toast.error(`Podés subir hasta ${MAX_PHOTOS} fotos por entrada.`)
        break
      }
      accepted.push({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) })
    }
    setNewPhotos((prev) => [...prev, ...accepted])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeNewPhoto = (photo: NewPhoto) => {
    URL.revokeObjectURL(photo.preview)
    setNewPhotos((prev) => prev.filter((p) => p.key !== photo.key))
  }

  const uploadPhotos = async (placeId: string) => {
    let failed = 0
    for (const photo of newPhotos) {
      try {
        const dataUrl = await photoToDataUrl(photo.file)
        if (dataUrlBytes(dataUrl) > MAX_PHOTO_BYTES) throw new Error("too large")
        const { error } = await db.photos.create({ place_id: placeId, photo_url: dataUrl })
        if (error) throw new Error(error)
      } catch {
        failed++
      }
    }
    for (const id of removedPhotoIds) {
      const { error } = await db.photos.delete(id)
      if (error) failed++
    }
    return failed
  }

  const onSubmit = async (values: EntryFormValues) => {
    const body = {
      trip_id: values.trip_id,
      name: values.name.trim(),
      description: values.description.trim() || null,
      category: values.category,
      latitude: values.latitude,
      longitude: values.longitude,
      rating: values.rating || null,
      visit_date: values.visit_date || null,
      expenses: values.expenses ? Number(values.expenses) : 0,
    }
    const { data, error } = place ? await db.places.update(place.id, body) : await db.places.create(body)
    if (error || !data) {
      toast.error(error ?? "No se pudo guardar la entrada.")
      return
    }

    const failed = await uploadPhotos(data.id)
    if (failed > 0) toast.warning(`La entrada se guardó, pero ${failed === 1 ? "una foto no se pudo procesar" : `${failed} fotos no se pudieron procesar`}.`)
    else toast.success(place ? "Entrada actualizada." : "Entrada guardada.")
    await reload()
    router.push(`/dashboard/trips/${data.trip_id}`)
  }

  const handleDelete = async () => {
    if (!place) return
    const { error } = await db.places.delete(place.id)
    if (error) {
      toast.error("No se pudo eliminar la entrada.")
      return
    }
    toast.success("Entrada eliminada.")
    await reload()
    router.push(`/dashboard/trips/${place.trip_id}`)
  }

  const submitting = form.formState.isSubmitting
  const closeHref = place ? `/dashboard/trips/${place.trip_id}` : trip ? `/dashboard/trips/${trip.id}` : "/dashboard"
  const title = place ? "Editar entrada" : "Nueva entrada"

  if (trips.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="title-board text-4xl">Primero creá un viaje</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Cada entrada del diario pertenece a un viaje.</p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Volver</Link>
          </Button>
          <TripFormDialog onSaved={reload} trigger={<Button>Crear viaje</Button>} />
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-card px-3 py-3 lg:px-12">
          <div className="flex items-center gap-3">
            <Link
              href={closeHref}
              aria-label="Cerrar"
              className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted lg:border"
            >
              <XIcon className="size-5" aria-hidden />
            </Link>
            <div className="flex flex-col">
              {trip && (
                <span className="text-[13px] text-muted-foreground">
                  {trip.name}
                  {day && day > 0 ? ` · Día ${day}` : ""}
                </span>
              )}
              <h1 className="title-board text-[26px] lg:text-[32px]">{title}</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2.5 lg:flex">
            {place && <DeleteEntryButton onConfirm={handleDelete} />}
            <Button type="submit" className="h-11 rounded-xl px-5 font-bold" disabled={submitting}>
              {submitting && <SpinnerGapIcon className="animate-spin" aria-hidden />}
              {place ? "Guardar cambios" : "Guardar entrada"}
            </Button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-5 pt-5 pb-32 lg:flex-row lg:items-start lg:px-12 lg:pt-8 lg:pb-12">
          <section className="flex min-w-0 flex-col gap-5 lg:flex-1">
            <FormField
              control={form.control}
              name="trip_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Viaje</FormLabel>
                    <TripFormDialog
                      onSaved={async (created) => {
                        await reload()
                        form.setValue("trip_id", created.id)
                      }}
                      trigger={
                        <button type="button" className="label-mono font-semibold text-signal-text">
                          + Nuevo viaje
                        </button>
                      }
                    />
                  </div>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full rounded-xl bg-card">
                        <SelectValue placeholder="Elegí un viaje" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trips.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <h2 className="label-mono font-semibold">Fotos</h2>
                <span className="text-xs text-muted-foreground">
                  {photoCount} de {MAX_PHOTOS}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                id="entry-photos"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                <label
                  htmlFor="entry-photos"
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-signal-text bg-accent font-mono text-[11px] font-semibold tracking-wider text-signal-text uppercase"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    addFiles(e.dataTransfer.files)
                  }}
                >
                  <CameraPlusIcon className="size-7" aria-hidden />
                  Agregar
                </label>
                {keptPhotos.map((photo, i) => (
                  <PhotoTile
                    key={photo.id}
                    src={photo.photo_url}
                    cover={i === 0}
                    onRemove={() => setRemovedPhotoIds((prev) => [...prev, photo.id])}
                  />
                ))}
                {newPhotos.map((photo, i) => (
                  <PhotoTile
                    key={photo.key}
                    src={photo.preview}
                    cover={keptPhotos.length === 0 && i === 0}
                    pending={submitting}
                    onRemove={() => removeNewPhoto(photo)}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                La primera foto es la portada de la entrada. Las fotos grandes se achican antes de subirse.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="label-mono font-semibold">¿Dónde fue?</span>
              <PlaceSearch
                onSelectPlace={(p) => {
                  setLocation({ latitude: p.latitude, longitude: p.longitude }, p.name)
                  if (!form.getValues("name")) form.setValue("name", p.name)
                  if (form.getValues("category") === "otros") form.setValue("category", p.category)
                }}
              />
              <div className="relative h-[220px] overflow-hidden rounded-xl border lg:h-[260px]">
                <TravelMap
                  places={[]}
                  center={location ? { lat: location.latitude, lng: location.longitude } : undefined}
                  zoom={location ? 12 : 2}
                  pendingLocation={location}
                  onMapClick={setLocation}
                  pickOnClick
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5" aria-hidden />
                  {location
                    ? `${locationLabel ? `${locationLabel} · ` : ""}${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : "Buscá el lugar o tocá el mapa para marcarlo."}
                </span>
                <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={locateMe} disabled={locating}>
                  {locating ? <SpinnerGapIcon className="animate-spin" aria-hidden /> : <CrosshairIcon aria-hidden />}
                  Usar mi ubicación
                </Button>
              </div>
              {(form.formState.errors.latitude || form.formState.errors.longitude) && (
                <p className="text-sm text-destructive">Marcá en el mapa dónde fue.</p>
              )}
            </div>
          </section>

          <section className="flex min-w-0 flex-col gap-5 lg:flex-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input className="h-12 rounded-xl bg-card text-base" placeholder="ej: Laguna de los Tres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="visit_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-12 rounded-xl bg-card" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gastos</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" className="h-12 rounded-xl bg-card" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Qué pasó hoy?</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      className="rounded-xl bg-card text-[15px] leading-relaxed"
                      placeholder="Contá el día: qué hiciste, qué comiste, con quién te cruzaste…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cómo estuvo?</FormLabel>
                  <PillGroup
                    label="¿Cómo estuvo?"
                    options={MOODS.map((m) => ({ value: m.rating, label: m.label }))}
                    value={field.value}
                    onChange={(v) => field.onChange(v === field.value ? 0 : v)}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de lugar</FormLabel>
                  <PillGroup
                    label="Tipo de lugar"
                    options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormItem>
              )}
            />

            {place && (
              <div className="lg:hidden">
                <DeleteEntryButton onConfirm={handleDelete} />
              </div>
            )}
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <Button type="submit" className="h-[52px] w-full rounded-2xl text-base font-bold" disabled={submitting}>
            {submitting && <SpinnerGapIcon className="animate-spin" aria-hidden />}
            {place ? "Guardar cambios" : "Guardar entrada"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function PhotoTile({ src, cover, pending, onRemove }: { src: string; cover: boolean; pending?: boolean; onRemove: () => void }) {
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-xl bg-muted", pending && "opacity-60")}>
      <Image src={src} alt="" fill sizes="160px" className="object-cover" />
      {cover && (
        <span className="absolute bottom-2 left-2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold text-background">Portada</span>
      )}
      <button
        type="button"
        aria-label="Quitar foto"
        onClick={onRemove}
        disabled={pending}
        className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-card text-foreground shadow"
      >
        <XIcon className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

function PillGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-9 rounded-md border px-3 font-mono text-[11px] font-semibold tracking-wider uppercase transition-colors",
            option.value === value ? "border-transparent bg-signal text-signal-foreground" : "bg-card hover:bg-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function DeleteEntryButton({ onConfirm }: { onConfirm: () => Promise<void> }) {
  return (
    <ConfirmButton
      title="¿Eliminar esta entrada?"
      description="Se borran también sus fotos. No se puede deshacer."
      confirmLabel="Eliminar entrada"
      onConfirm={onConfirm}
    >
      <Button type="button" variant="outline" className="h-11 rounded-xl font-bold text-destructive hover:text-destructive">
        <TrashIcon aria-hidden />
        Eliminar
      </Button>
    </ConfirmButton>
  )
}
