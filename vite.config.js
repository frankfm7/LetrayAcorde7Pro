import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleSongRequest } from "./api/_extract.js";

// En desarrollo (npm run dev) atiende /api/song igual que lo hace Vercel en producción.
function songApiDev() {
  return {
    name: "song-api-dev",
    configureServer(server) {
      server.middlewares.use("/api/song", async (req, res) => {
        const url = new URL(req.url || "", "http://localhost").searchParams.get("url") || "";
        const out = await handleSongRequest(url);
        res.statusCode = out.status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(out.body));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), songApiDev()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
