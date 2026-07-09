import fs from "node:fs"

// Workaround: el panel de Environment Variables de Hostinger dejó de aplicar
// cambios (borrados y adiciones no se propagan al proceso, confirmado por SSH
// inspeccionando /proc/<pid>/environ tras varios intentos). Como alternativa,
// se cargan variables adicionales desde un archivo fuera de la carpeta de
// despliegue (sobrevive a redeploys) sin pisar nada ya definido por la plataforma.
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const secretsPath = process.env.SECRETS_FILE_PATH || "/home/u896969397/secrets/cerounobikes.env"
  if (!fs.existsSync(secretsPath)) {
    console.log(`[secrets] archivo no encontrado en ${secretsPath}`)
    return
  }

  const content = fs.readFileSync(secretsPath, "utf-8")
  let loaded = 0
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (!(key in process.env)) {
      process.env[key] = value
      loaded++
    }
  }
  console.log(`[secrets] ${loaded} variable(s) cargada(s) desde ${secretsPath}`)
}
