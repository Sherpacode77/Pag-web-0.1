// Parser minimo de la estructura de cajas MP4 (ISO BMFF) para leer el fourCC
// del codec de video desde moov > trak > mdia > minf > stbl > stsd, sin
// depender de ffprobe ni ninguna libreria externa.
const CONTAINER_BOXES = new Set(["moov", "trak", "mdia", "minf", "stbl"])

const HEVC_CODECS = new Set(["hev1", "hvc1", "hev2", "hvc2"])

function readFourCC(bytes: Uint8Array, offset: number): string {
  let s = ""
  for (let i = 0; i < 4; i++) s += String.fromCharCode(bytes[offset + i])
  return s
}

export function detectMp4VideoCodec(bytes: Uint8Array): string | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  function walk(offset: number, end: number): string | null {
    while (offset + 8 <= end) {
      let size = view.getUint32(offset)
      const type = readFourCC(bytes, offset + 4)
      let headerSize = 8

      if (size === 1) {
        if (offset + 16 > end) break
        const high = view.getUint32(offset + 8)
        const low = view.getUint32(offset + 12)
        size = high * 2 ** 32 + low
        headerSize = 16
      } else if (size === 0) {
        size = end - offset
      }

      if (size < headerSize || offset + size > end) break

      if (type === "stsd") {
        // stsd: version+flags (4 bytes) + entry_count (4 bytes) + entries
        const entryStart = offset + headerSize + 8
        if (entryStart + 8 <= end) {
          return readFourCC(bytes, entryStart + 4)
        }
      } else if (CONTAINER_BOXES.has(type)) {
        const found = walk(offset + headerSize, offset + size)
        if (found) return found
      }

      offset += size
    }
    return null
  }

  return walk(0, bytes.byteLength)
}

export function isHevcCodec(codec: string | null): boolean {
  return codec !== null && HEVC_CODECS.has(codec)
}

export const HEVC_ERROR_MESSAGE =
  "Este video usa el codec HEVC (H.265), que no es compatible con la mayoría de navegadores web. Vuelve a exportarlo con codec H.264 y sube de nuevo."
