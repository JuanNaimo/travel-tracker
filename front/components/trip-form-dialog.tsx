"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StarRating } from "@/components/star-rating"
import { db, type Trip } from "@/lib/api-client"
import { tripFormSchema, type TripFormValues } from "@/lib/schemas"

interface TripFormDialogProps {
  /** Con un viaje, el diálogo lo edita; sin viaje, crea uno nuevo. */
  trip?: Trip
  trigger: React.ReactNode
  onSaved?: (trip: Trip) => void
}

const toValues = (trip?: Trip): TripFormValues => ({
  name: trip?.name ?? "",
  description: trip?.description ?? "",
  start_date: trip?.start_date ?? "",
  end_date: trip?.end_date ?? "",
  rating: trip?.rating ?? 0,
})

export function TripFormDialog({ trip, trigger, onSaved }: TripFormDialogProps) {
  const [open, setOpen] = useState(false)
  const form = useForm<TripFormValues>({ resolver: zodResolver(tripFormSchema), defaultValues: toValues(trip) })

  const handleOpenChange = (next: boolean) => {
    if (next) form.reset(toValues(trip))
    setOpen(next)
  }

  const onSubmit = async (values: TripFormValues) => {
    const body = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      rating: values.rating || null,
    }
    const { data, error } = trip ? await db.trips.update(trip.id, body) : await db.trips.create(body)
    if (error || !data) {
      toast.error(error ?? "No se pudo guardar el viaje.")
      return
    }
    toast.success(trip ? "Viaje actualizado." : `"${data.name}" creado.`)
    setOpen(false)
    onSaved?.(data)
  }

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="title-board text-3xl">{trip ? "Editar viaje" : "Nuevo viaje"}</DialogTitle>
          <DialogDescription>
            {trip ? "Cambiá los datos del viaje." : "Puede ser uno que estés planeando o uno que ya hiciste."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              // El diálogo puede abrirse desde otro formulario: React propaga el submit a través del portal
              e.stopPropagation()
              form.handleSubmit(onSubmit)(e)
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="ej: Patagonia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="¿De qué se trata este viaje?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desde</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasta</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calificación</FormLabel>
                  <StarRating rating={field.value} interactive onChange={field.onChange} />
                </FormItem>
              )}
            />
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Guardando…" : trip ? "Guardar cambios" : "Crear viaje"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
