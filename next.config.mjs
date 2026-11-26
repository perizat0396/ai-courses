/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_BUILD: String(Date.now()) },
  async headers() {
    return [{ source: '/slides/:path*', headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }] }];
  },
  experimental: { serverActions: { bodySizeLimit: '50mb' } },
};
export default nextConfig;
