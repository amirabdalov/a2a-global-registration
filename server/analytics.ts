// Google Cloud BigQuery analytics logging
// Logs every registration event to BigQuery for long-term analytics
// Uses REST API with API key to avoid heavy SDK dependency

const BQ_PROJECT = "winter-jet-492110-g9";
const BQ_DATASET = "a2a_analytics";
const BQ_TABLE = "registrations";

interface RegistrationEvent {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  referralCode: string | null;
  ipAddress: string;
  userAgent: string;
  registeredAt: string;
  emailVerified: boolean;
  source: string;
}

// Log registration to BigQuery via streaming insert
// This is fire-and-forget — failures are logged but don't block the user
export async function logRegistrationToBigQuery(event: RegistrationEvent): Promise<void> {
  try {
    // Use the GCP metadata server for auth when running on Cloud Run
    let accessToken = "";
    try {
      const tokenRes = await fetch(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        { headers: { "Metadata-Flavor": "Google" } }
      );
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json() as { access_token: string };
        accessToken = tokenData.access_token;
      }
    } catch {
      console.log("[BigQuery] Not running on GCP, skipping analytics log");
      return;
    }

    if (!accessToken) return;

    // Ensure dataset exists (idempotent)
    await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datasetReference: { datasetId: BQ_DATASET, projectId: BQ_PROJECT },
          location: "US",
        }),
      }
    ).catch(() => {}); // Ignore if already exists

    // Ensure table exists
    await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets/${BQ_DATASET}/tables`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableReference: { tableId: BQ_TABLE, datasetId: BQ_DATASET, projectId: BQ_PROJECT },
          schema: {
            fields: [
              { name: "user_id", type: "INTEGER" },
              { name: "first_name", type: "STRING" },
              { name: "last_name", type: "STRING" },
              { name: "email", type: "STRING" },
              { name: "referral_code", type: "STRING" },
              { name: "ip_address", type: "STRING" },
              { name: "user_agent", type: "STRING" },
              { name: "registered_at", type: "TIMESTAMP" },
              { name: "email_verified", type: "BOOLEAN" },
              { name: "source", type: "STRING" },
            ],
          },
        }),
      }
    ).catch(() => {}); // Ignore if already exists

    // Stream insert the event
    const insertRes = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/datasets/${BQ_DATASET}/tables/${BQ_TABLE}/insertAll`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: [
            {
              insertId: `reg-${event.userId}-${Date.now()}`,
              json: {
                user_id: event.userId,
                first_name: event.firstName,
                last_name: event.lastName,
                email: event.email,
                referral_code: event.referralCode || "",
                ip_address: event.ipAddress,
                user_agent: event.userAgent,
                registered_at: event.registeredAt,
                email_verified: event.emailVerified,
                source: event.source,
              },
            },
          ],
        }),
      }
    );

    if (insertRes.ok) {
      console.log(`[BigQuery] Registration logged: ${event.email}`);
    } else {
      const err = await insertRes.text();
      console.error(`[BigQuery] Insert failed: ${err}`);
    }
  } catch (err) {
    console.error("[BigQuery] Analytics logging error:", err);
  }
}
