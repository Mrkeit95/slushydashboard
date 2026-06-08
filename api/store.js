// Shared key-value store for tasks / notes / actions so they persist server-side
// and sync across the whole team. Backed by Vercel KV / Upstash Redis (REST API).
// Falls back gracefully ({ok:false}) when no store is configured yet, so the app
// keeps working off localStorage until you enable storage in Vercel.

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!REST_URL || !REST_TOKEN) return res.status(200).json({ ok: false, reason: "no-store" });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const name = (url.searchParams.get("key") || "tasks").replace(/[^a-z0-9_-]/gi, "");
  const key = "slushy:" + name;
  const auth = { Authorization: `Bearer ${REST_TOKEN}` };

  try {
    if (req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const r = await fetch(`${REST_URL}/set/${encodeURIComponent(key)}`, { method: "POST", headers: auth, body });
      if (!r.ok) return res.status(200).json({ ok: false, reason: "set-failed" });
      return res.status(200).json({ ok: true });
    }
    // GET
    const r = await fetch(`${REST_URL}/get/${encodeURIComponent(key)}`, { headers: auth });
    const j = await r.json();
    let value = null;
    if (j && j.result != null) { try { value = JSON.parse(j.result); } catch (e) { value = null; } }
    return res.status(200).json({ ok: true, value });
  } catch (e) {
    return res.status(200).json({ ok: false, reason: e.message });
  }
}
