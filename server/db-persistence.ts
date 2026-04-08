import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data.db");
const BUCKET = "a2a-global-data";
const OBJECT_KEY = "db/data.db";

async function getGcpToken(): Promise<string | null> {
  try {
    const r = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { access_token: string };
    return d.access_token;
  } catch {
    return null;
  }
}

export async function restoreDatabase(): Promise<void> {
  const token = await getGcpToken();
  if (!token) { console.log("[DB] Not on GCP, skipping restore"); return; }

  try {
    const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(OBJECT_KEY)}?alt=media`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 100) { // Valid SQLite file is at least 100 bytes
        fs.writeFileSync(DB_PATH, buf);
        console.log(`[DB] Restored ${buf.length} bytes from GCS`);
      }
    } else if (res.status === 404) {
      console.log("[DB] No backup in GCS, starting fresh");
    } else {
      console.error(`[DB] Restore failed: HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.error("[DB] Restore error:", err.message);
  }
}

let backupInProgress = false;

export async function backupDatabase(): Promise<void> {
  if (backupInProgress) return; // Prevent concurrent backups
  backupInProgress = true;

  const token = await getGcpToken();
  if (!token) { backupInProgress = false; return; }

  try {
    if (!fs.existsSync(DB_PATH)) { backupInProgress = false; return; }
    
    // Use WAL checkpoint to flush all changes to main DB file
    const data = fs.readFileSync(DB_PATH);
    
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${OBJECT_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
      body: data,
    });

    if (res.ok) {
      console.log(`[DB] Backed up ${data.length} bytes to GCS`);
    } else {
      console.error(`[DB] Backup failed: HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.error("[DB] Backup error:", err.message);
  } finally {
    backupInProgress = false;
  }
}

export function startPeriodicBackup(): void {
  // Backup every 1 minute (more frequent)
  setInterval(() => backupDatabase().catch(console.error), 1 * 60 * 1000);
  console.log("[DB] Periodic backup every 1 minute");
}
