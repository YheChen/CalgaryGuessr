/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Lint runs as its own step; keep a lint error from failing the deploy build.
  // Type errors are NOT ignored: `ignoreBuildErrors` was hiding whatever
  // `strict: true` in tsconfig.json would otherwise have caught.
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
