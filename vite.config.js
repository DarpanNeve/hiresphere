import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  const target =
    env.VITE_ENVIRONMENT === "staging"
      ? "http://localhost:8000/api"
      : "https://hiresphere-eita.onrender.com/api";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: true,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods":
              "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers":
              "Origin, X-Requested-With, Content-Type, Accept, Authorization",
          },
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, _res) => {
              console.log("proxy error", err);
            });
            proxy.on("proxyReq", (proxyReq, req, _res) => {
              console.log(
                "Sending Request to the Target:",
                req.method,
                req.url
              );
              proxyReq.setHeader(
                "origin",
                "https://hiresphere-eita.onrender.com"
              );
            });
            proxy.on("proxyRes", (proxyRes, req, _res) => {
              console.log(
                "Received Response from the Target:",
                proxyRes.statusCode,
                req.url
              );
            });
          },
        },
      },
      cors: true,
    },
    define: {
      __API_URL__: JSON.stringify(target),
    },
    // Add this section to handle client-side routing
    preview: {
      port: 5173,
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
    },
    // Add this to handle client-side routing
    appType: "spa",
  };
});
