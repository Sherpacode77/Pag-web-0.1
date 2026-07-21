// Paleta curada para elegir el tono más parecido al crear una variante de
// color personalizada en el panel admin. Los primeros 6 son los presets
// rápidos (5 originales + Morado); el resto amplía las familias de color.

export interface PaletteColor {
  slug: string
  name: string
  hex: string
}

export const QUICK_PRESET_COLORS: PaletteColor[] = [
  { slug: "negro", name: "Negro", hex: "#1F2937" },
  { slug: "rojo", name: "Rojo", hex: "#EF4444" },
  { slug: "naranja", name: "Naranja", hex: "#F97316" },
  { slug: "verde", name: "Verde", hex: "#10B981" },
  { slug: "azul", name: "Azul", hex: "#3B82F6" },
  { slug: "morado", name: "Morado", hex: "#7C3AED" },
]

// Hex de respaldo para variantes antiguas guardadas sin `colorHex` explícito.
export const LEGACY_COLOR_HEX: Record<string, string> = Object.fromEntries(
  QUICK_PRESET_COLORS.map((c) => [c.slug, c.hex])
)

export const COLOR_PALETTE: PaletteColor[] = [
  ...QUICK_PRESET_COLORS,
  { slug: "gris-carbon", name: "Gris Carbón", hex: "#374151" },
  { slug: "gris", name: "Gris", hex: "#6B7280" },
  { slug: "gris-claro", name: "Gris Claro", hex: "#D1D5DB" },
  { slug: "blanco", name: "Blanco", hex: "#F9FAFB" },
  { slug: "rojo-vino", name: "Rojo Vino", hex: "#7F1D1D" },
  { slug: "rosa", name: "Rosa", hex: "#EC4899" },
  { slug: "fucsia", name: "Fucsia", hex: "#DB2777" },
  { slug: "ambar", name: "Ámbar", hex: "#F59E0B" },
  { slug: "amarillo", name: "Amarillo", hex: "#EAB308" },
  { slug: "verde-oliva", name: "Verde Oliva", hex: "#4D7C0F" },
  { slug: "verde-musgo", name: "Verde Musgo", hex: "#365314" },
  { slug: "verde-menta", name: "Verde Menta", hex: "#34D399" },
  { slug: "celeste", name: "Celeste", hex: "#38BDF8" },
  { slug: "azul-marino", name: "Azul Marino", hex: "#1E3A8A" },
  { slug: "azul-acero", name: "Azul Acero", hex: "#0EA5E9" },
  { slug: "lavanda", name: "Lavanda", hex: "#A78BFA" },
  { slug: "indigo", name: "Índigo", hex: "#4F46E5" },
  { slug: "marron", name: "Marrón", hex: "#78350F" },
  { slug: "beige", name: "Beige", hex: "#D6C7B0" },
  { slug: "arena", name: "Arena", hex: "#E7D8B1" },
]

export function slugifyColorName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
