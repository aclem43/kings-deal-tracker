import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// In dev, serve the data that scraper/build.py wrote to ../_site.
function siteData(): Plugin {
  const site = fileURLToPath(new URL("../_site", import.meta.url));
  return {
    name: "site-data",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url || "").split("?")[0].replace(/^\//, "");
        if (name !== "data.json" && name !== "feed.xml") return next();
        const file = path.join(site, name);
        if (!fs.existsSync(file)) {
          res.statusCode = 404;
          return res.end("Run python3 scraper/build.py first");
        }
        res.setHeader("Content-Type", name.endsWith(".json") ? "application/json" : "application/rss+xml");
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [vue(), tailwindcss(), siteData()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
