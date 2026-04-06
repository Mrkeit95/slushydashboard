export default async function handler(req, res) {
  const SHEETS = {
    chatstars: "1kUqGtf_Oc8HNOai1U8ZXey0oKw7Oj36R0RJNdFCSkn8",
    slushy: "1RWIYfuSKC8hb6DvVoDx3cw0gtLNL68uOYcMUpDvg-pM",
  };
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sid = url.searchParams.get("sid") || "slushy";
  const sheet = url.searchParams.get("sheet");
  const gid = url.searchParams.get("gid");
  const sheetId = SHEETS[sid];
  if (!sheetId) return res.status(400).json({ error: "Unknown sheet" });
  let target;
  if (sheet) target = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  else if (gid) target = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  else target = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
  try {
    const r = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return res.status(502).json({ error: "Sheet fetch failed" });
    const csv = await r.text();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
}
