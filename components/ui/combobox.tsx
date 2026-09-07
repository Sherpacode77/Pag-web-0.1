"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

interface ComboboxProps {
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  emptyText?: string
  error?: boolean
  className?: string
}

// Filtro simple por substring (contiene las letras escritas, en cualquier
// parte, sin importar mayusculas/acentos de entrada) -- a proposito no se usa
// el fuzzy-match por defecto de cmdk, que puede coincidir con letras salteadas
// y confundir al cliente al buscar una ciudad.
function containsFilter(itemValue: string, search: string): number {
  return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  emptyText = "Sin resultados.",
  error,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-between px-3 py-2 bg-background border rounded-md text-sm text-left focus:outline-none focus:ring-1 focus:ring-primary",
            error ? "border-destructive" : "border-input",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={containsFilter}>
          <CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("h-4 w-4", value === option ? "opacity-100" : "opacity-0")} />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
