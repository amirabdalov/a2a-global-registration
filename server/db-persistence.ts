// Database persistence for Cloud Run
// Cloud Run containers are ephemeral — SQLite data is lost on redeploy.
// This module backs up the SQLite database to Google Cloud Storage
// and restores it on startup.

import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data.db");
const BUCKET = "a2a-global-data";
const OBJECT = "db/data.db";
const GCS_BASE = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`;

async function getAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } }
    );
    if (res.ok) {
      const data = (await res.json()) as { access_token: string };
      return data.access_token;
    }
  } catch {
    // Not on GCP — skip persistence
  }
  return null;
}

export async function restoreDatabase(): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    console.log("[DB] Not on GCP, skipping database restore");
    return;
  }

  try {
    const encodedObject = encodeURIComponent(OBJECT);
    const res = await fetch(`${GCS_BASE}/${encodedObject}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(DB_PATH, Buffer.from(buffer));
      console.log(`[DB] Restored database from GCS (${buffer.byteLength} bytes)`);
    } else if (res.status === 404) {
      console.log("[DB] No backup found in GCS, starting with fresh database");
    } else {
      console.error(`[DB] Restore failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error("[DB] Restore error:", err);
  }
}

export async function backupDatabase(): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  if (!fs.existsSync(DB_PATH)) {
    console.log("[DB] No database file to backup");
    return;
  }

  try {
    const data = fs.readFileSync(DB_PATH);
    const encodedObject = encodeURIComponent(OBJECT);
    const res = await fetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${OBJECT}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
        },
        body: data,
      }
    );

    if (res.ok) {
      console.log(`[DB] Backed up database to GCS (${data.length} bytes)`);
    } else {
      const text = await res.text();
      console.error(`[DB] Backup failed: ${res.status} ${text}`);
    }
  } catch (err) {
    console.error("[DB] Backup error:", err);
  }
}

// Periodic backup every 5 minutes
export function startPeriodicBackup(): void {
  setInterval(() => {
    backupDatabase().catch(console.error);
  }, 5 * 60 * 1000);
  console.log("[DB] Periodic backup scheduled (every 5 minutes)");
}
