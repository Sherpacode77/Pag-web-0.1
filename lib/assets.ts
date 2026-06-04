const ABSOLUTE_URL_PATTERN = /^https?:\/\//i

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "")
}

export function assetUrl(path: string | undefined | null) {
  if (!path) {
    return ""
  }

  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return path
  }

  const baseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL

  if (!baseUrl) {
    return path
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${normalizedBaseUrl}${normalizedPath}`
}

export function assetOrigin() {
  const baseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL
  if (!baseUrl) {
    return null
  }

  try {
    return new URL(baseUrl).origin
  } catch {
    return null
  }
}