/** @type {import('next').NextConfig} */
const nextConfig = {
    output: process.env.NODE_ENV === 'development' ? undefined : (process.env.VERCEL || process.env.RENDER ? undefined : 'export'),
    images: {
        unoptimized: true,
    },
    optimizeFonts: false,
    experimental: {
        serverComponentsExternalPackages: ['mathjax-full'],
    },
};

export default nextConfig;
