import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public", //? Destination directory for service worker files within 'public'
  register: true, //? Automatically register the service worker
  skipWaiting: true, //? Install new service worker immediately
  disable: process.env.NODE_ENV === "development", //? Disable PWA in development mode
});

const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
