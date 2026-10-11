/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Make sure the logo in /assets is bundled with the serverless PDF functions on Vercel
    outputFileTracingIncludes: {
      "/api/**/*": ["./assets/**/*"],
    },
  },
};

export default nextConfig;
