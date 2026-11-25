import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "out");
const port = Number(process.env.PORT || 4183);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
};

async function resolveFile(urlPath) {
  const clean = urlPath.split("?")[0].split("#")[0];
  let target = normalize(join(root, decodeURIComponent(clean)));
  if (!target.startsWith(root)) return null;

  let info = await stat(target).catch(() => null);
  if (info?.isDirectory()) {
    target = join(target, "index.html");
    info = await stat(target).catch(() => null);
  }
  if (!info && !extname(target)) {
    // 无扩展名且目录形式失败时，尝试 .html
    const asHtml = `${target}.html`;
    const htmlInfo = await stat(asHtml).catch(() => null);
    if (htmlInfo) return { path: asHtml, status: 200 };
  }
  return info ? { path: target, status: 200 } : null;
}

createServer(async (req, res) => {
  const found = await resolveFile(req.url || "/");
  if (!found) {
    const fallback = join(root, "404.html");
    const body = await readFile(fallback).catch(() => Buffer.from("404"));
    res.writeHead(404, { "content-type": TYPES[".html"], "cache-control": "no-store" });
    res.end(body);
    return;
  }
  const body = await readFile(found.path).catch(() => null);
  if (!body) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("read failed");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[extname(found.path)] || "application/octet-stream",
    "content-length": body.length,
    "cache-control": "no-store",
  });
  res.end(body);
}).listen(port, "127.0.0.1", () => {
  console.log(`静态预览 → http://127.0.0.1:${port}`);
});
