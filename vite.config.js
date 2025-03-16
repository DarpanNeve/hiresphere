import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load environment variables prefixed with VITE_
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // Determine the proxy target based on VITE_ENVIRONMENT
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
          open: true,
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
              // Add origin header to the proxy request
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
    // Define a global constant __API_URL__ for use in your client code
    define: {
      __API_URL__: JSON.stringify(target),
    },
  };
});
