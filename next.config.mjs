const allowedOrigins = ['localhost:3000']

for (const candidate of [process.env.APP_URL, process.env.RENDER_EXTERNAL_URL, process.env.RENDER_EXTERNAL_HOSTNAME]) {
  if (!candidate) continue

  try {
    const host = candidate.startsWith('http') ? new URL(candidate).host : candidate
    if (host && !allowedOrigins.includes(host)) {
      allowedOrigins.push(host)
    }
  } catch {
    if (!allowedOrigins.includes(candidate)) {
      allowedOrigins.push(candidate)
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
}

export default nextConfig
