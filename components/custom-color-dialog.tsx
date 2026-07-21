"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { COLOR_PALETTE } from "@/lib/color-palette"

interface CustomColorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string, hex: string) => void
}

export function CustomColorDialog({ open, onOpenChange, onConfirm }: CustomColorDialogProps) {
  const [name, setName] = useState("")
  const [selectedHex, setSelectedHex] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName("")
      setSelectedHex(null)
    }
    onOpenChange(next)
  }

  function handleConfirm() {
    if (!name.trim() || !selectedHex) return
    onConfirm(name.trim(), selectedHex)
    setName("")
    setSelectedHex(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Color personalizado</DialogTitle>
          <DialogDescription>
            Ponle un nombre y elige el tono de la paleta que más se parezca.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-1.5">
              Nombre del color
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Morado Lavanda"
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-1.5">
              Tono más parecido
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PALETTE.map((c) => {
                const isSelected = selectedHex === c.hex
                return (
                  <button
                    key={c.slug}
                    type="button"
                    title={c.name}
                    onClick={() => setSelectedHex(c.hex)}
                    className={`relative h-9 w-9 rounded-full border-2 shadow-sm transition-transform ${
                      isSelected ? "border-primary scale-110" : "border-white hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!name.trim() || !selectedHex}>
            Agregar color
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
