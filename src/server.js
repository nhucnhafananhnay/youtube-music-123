import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8000);

const vite = await createViteServer({
    configFile: false,
    root,
    server: {
        host: "127.0.0.1",
        port,
        strictPort: true,
        proxy: {
            "/api": {
                target: "https://youtube-music.f8team.dev",
                changeOrigin: true
            }
        }
    }
});

await vite.listen();
console.log(`App ready at http://localhost:${port}`);
