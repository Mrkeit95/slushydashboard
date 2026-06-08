// Shared, persistent store for tasks / notes / actions so they survive refreshes
// and sync across the whole team. Backed by a PRIVATE Vercel Blob store.
// Returns {ok:false} when no store is configured, so the app stays local-only.
import { put, head } from "@vercel/blob";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(200).json({ ok: false, reason: "no-store" });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const name = (url.searchParams.get("key") || "tasks").replace(/[^a-z0-9_-]/gi, "");
  const pathname = "slushy/" + name + ".json";

  try {
    if (req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      await put(pathname, body || "null", {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
        token,
      });
      return res.status(200).json({ ok: true });
    }
    // GET — read the current value (private blob: fetch its URL with the token)
    let meta;
    try {
      meta = await head(pathname, { token });
    } catch (e) {
      return res.status(200).json({ ok: true, value: null }); // not created yet
    }
    const r = await fetch(meta.url, { headers: { Authorization: "Bearer " + token }, cache: "no-store" });
    if (!r.ok) return res.status(200).json({ ok: true, value: null });
    const text = await r.text();
    let value = null;
    try { value = JSON.parse(text); } catch (e) {}
    return res.status(200).json({ ok: true, value });
  } catch (e) {
    return res.status(200).json({ ok: false, reason: e.message });
  }
}
