// Standalone DB restore script — runs before the main app
import fs from "fs";

const BUCKET = "a2a-global-data";
const OBJECT_KEY = "db/data.db";
const DB_PATH = "data.db";

async function main() {
  let token;
  try {
    const r = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
    });
    if (!r.ok) { console.log("[RESTORE] Not on GCP"); return; }
    const d = await r.json();
    token = d.access_token;
  } catch { console.log("[RESTORE] Not on GCP, skip"); return; }

  try {
    const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(OBJECT_KEY)}?alt=media`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 100) {
        fs.writeFileSync(DB_PATH, buf);
        console.log(`[RESTORE] OK: ${buf.length} bytes`);
      }
    } else if (res.status === 404) {
      console.log("[RESTORE] No backup found");
    } else {
      console.log(`[RESTORE] HTTP ${res.status}`);
    }
  } catch (e) { console.log("[RESTORE] Error:", e.message); }
}

main();
