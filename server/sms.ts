// MSG91 SMS OTP Integration
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "505682AoN2sKMdrHlK69d2e7c5P1";
const MSG91_BASE = "https://control.msg91.com/api/v5";

export async function sendSmsOtp(mobile: string): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    // Ensure mobile has country code (default +91 for India)
    const formattedMobile = mobile.startsWith("+") ? mobile.replace("+", "") : mobile.startsWith("91") ? mobile : `91${mobile}`;

    const res = await fetch(`${MSG91_BASE}/otp`, {
      method: "POST",
      headers: {
        "authkey": MSG91_AUTH_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile: formattedMobile,
        otp_length: 6,
      }),
    });

    const data = await res.json() as { type: string; request_id?: string; message?: string };

    if (data.type === "success") {
      console.log(`[SMS] OTP sent to ${formattedMobile}, request_id: ${data.request_id}`);
      return { success: true, requestId: data.request_id };
    } else {
      console.error(`[SMS] Failed to send OTP: ${data.message}`);
      return { success: false, error: data.message || "Failed to send SMS" };
    }
  } catch (err: any) {
    console.error("[SMS] Error:", err.message);
    return { success: false, error: err.message };
  }
}

export async function verifySmsOtp(mobile: string, otp: string): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedMobile = mobile.startsWith("+") ? mobile.replace("+", "") : mobile.startsWith("91") ? mobile : `91${mobile}`;

    const res = await fetch(`${MSG91_BASE}/otp/verify?otp=${otp}&mobile=${formattedMobile}`, {
      method: "GET",
      headers: {
        "authkey": MSG91_AUTH_KEY,
      },
    });

    const data = await res.json() as { type: string; message?: string };

    if (data.type === "success") {
      console.log(`[SMS] OTP verified for ${formattedMobile}`);
      return { success: true };
    } else {
      console.error(`[SMS] Verification failed: ${data.message}`);
      return { success: false, error: data.message || "Invalid OTP" };
    }
  } catch (err: any) {
    console.error("[SMS] Verify error:", err.message);
    return { success: false, error: err.message };
  }
}

export async function resendSmsOtp(mobile: string, retryType: "text" | "voice" = "text"): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedMobile = mobile.startsWith("+") ? mobile.replace("+", "") : mobile.startsWith("91") ? mobile : `91${mobile}`;

    const res = await fetch(`${MSG91_BASE}/otp/retry?retrytype=${retryType}&mobile=${formattedMobile}`, {
      method: "GET",
      headers: {
        "authkey": MSG91_AUTH_KEY,
      },
    });

    const data = await res.json() as { type: string; message?: string };

    if (data.type === "success") {
      return { success: true };
    } else {
      return { success: false, error: data.message || "Failed to resend" };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
