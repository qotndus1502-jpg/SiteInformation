// SSR(컨테이너 안)에서는 백엔드 컨테이너로 직접, 브라우저에서는 nginx 통해 동일
// 오리진 상대경로로. 둘 다 안 주면 로컬 dev 기본값(localhost:8001)으로 동작.
const isServer = typeof window === "undefined";
export const API_BASE = isServer
  ? (process.env.INTERNAL_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001")
  : (process.env.NEXT_PUBLIC_API_BASE ?? "");
