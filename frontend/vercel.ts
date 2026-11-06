const backendOrigin = process.env.BACKEND_ORIGIN?.trim();
if (!backendOrigin) {
  throw new Error('Vercel 환경변수 BACKEND_ORIGIN에 Render HTTPS 주소를 설정하세요.');
}
const backend = new URL(backendOrigin);
if (
  backend.protocol !== 'https:' ||
  backend.username || backend.password ||
  backend.pathname !== '/' || backend.search || backend.hash
) {
  throw new Error('BACKEND_ORIGIN에는 경로·쿼리·인증정보 없는 HTTPS 원본 주소만 허용됩니다.');
}

export const config = {
  framework: 'vite',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  rewrites: [
    { source: '/api/:path*', destination: `${backend.origin}/api/:path*` },
    { source: '/(.*)', destination: '/index.html' },
  ],
  headers: [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'x-vercel-enable-rewrite-caching', value: '0' },
      ],
    },
  ],
};
