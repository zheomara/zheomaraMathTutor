/** @type {import('next').NextConfig} */
const nextConfig = {
    output: process.env.NODE_ENV === 'development' ? undefined : (process.env.VERCEL ? undefined : 'export'),
    images: {
        unoptimized: true,
    },
    optimizeFonts: false,
};

export default nextConfig;
