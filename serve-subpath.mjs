import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const root = join(process.cwd(), "out");
const prefix = "/xuyu-chuanxin";
const port = 4184;
const TYPES = { ".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".mp3":"audio/mpeg",".ico":"image/x-icon",".txt":"text/plain; charset=utf-8" };
createServer(async (req, res) => {
  let url = decodeURIComponent((req.url || "/").split("?")[0]);
  if (!url.startsWith(prefix)) { res.writeHead(404).end("expect " + prefix); return; }
  url = url.slice(prefix.length) || "/";
  let path = normalize(join(root, url));
  if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
  let info = await stat(path).catch(() => null);
  if (info?.isDirectory()) { path = join(path, "index.html"); info = await stat(path).catch(() => null); }
  if (!info) { res.writeHead(404).end("nf"); return; }
  const body = await readFile(path);
  res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream", "content-length": body.length });
  res.end(body);
}).listen(port, "127.0.0.1", () => console.log(`subpath preview → http://127.0.0.1:${port}${prefix}/`));
