import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_PrjaSqsY_fdEew3xntXPQsouj46kysKRF");

const FROM_EMAIL = "A2A Global <noreply@a2a.global>";

function otpEmailHtml(firstName: string, otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:460px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0F3DD1 0%,#171717 100%);padding:28px 32px;text-align:center;">
            <span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.3px;">A2A Global</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 20px;">
            <p style="margin:0 0 8px;font-size:15px;color:#374151;">Hi ${firstName},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.5;">Use the verification code below to complete your registration on A2A Global.</p>
            <!-- OTP Code -->
            <div style="background:#f0f4ff;border:1px solid #d4deff;border-radius:8px;padding:20px;text-align:center;margin:0 0 28px;">
              <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0F3DD1;font-family:monospace;">${otp}</span>
            </div>
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">If you didn't request this code, you can safely ignore this email.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;text-align:center;">
              A2A Global Inc &middot; File No. 10050200 &middot; Newark, Delaware, United States<br>
              <a href="https://a2a.global" style="color:#0F3DD1;text-decoration:none;">a2a.global</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeEmailHtml(firstName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:460px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0F3DD1 0%,#171717 100%);padding:28px 32px;text-align:center;">
            <span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.3px;">A2A Global</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 20px;">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;">Welcome, ${firstName}!</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.5;">Your email has been verified and your A2A Global account is ready. Here's what to do next:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr><td style="padding:8px 0;font-size:14px;color:#374151;">1. Complete your profile and add your skills</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#374151;">2. Add and verify your mobile number to unlock premium tasks</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#374151;">3. Submit KYC documents to start receiving payments</td></tr>
            </table>
            <div style="text-align:center;margin:0 0 20px;">
              <a href="https://a2a.global/auth" style="display:inline-block;background:linear-gradient(135deg,#0F3DD1,#171717);color:#ffffff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Go to Dashboard</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;text-align:center;">
              A2A Global Inc &middot; File No. 10050200 &middot; Newark, Delaware, United States<br>
              <a href="https://a2a.global" style="color:#0F3DD1;text-decoration:none;">a2a.global</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOtpEmail(to: string, firstName: string, otp: string): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your verification code — ${otp}`,
      html: otpEmailHtml(firstName, otp),
    });
    if (error) {
      console.error("Resend error:", error);
      return false;
    }
    console.log(`OTP email sent to ${to}, id: ${data?.id}`);
    return true;
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, firstName: string): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to A2A Global — Your account is ready",
      html: welcomeEmailHtml(firstName),
    });
    if (error) {
      console.error("Resend error:", error);
      return false;
    }
    console.log(`Welcome email sent to ${to}, id: ${data?.id}`);
    return true;
  } catch (err) {
    console.error("Failed to send welcome email:", err);
    return false;
  }
}

export async function sendAdminDigest(totalUsers: number, newToday: number): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ["oleg@a2a.global", "amir@a2a.global"],
      subject: `A2A Global — ${newToday} New Registration${newToday !== 1 ? "s" : ""} (Total: ${totalUsers})`,
      html: `
        <div style="font-family:sans-serif;padding:20px;">
          <h2 style="color:#0F3DD1;">A2A Global — Registration Digest</h2>
          <p><strong>New registrations today:</strong> ${newToday}</p>
          <p><strong>Cumulative total:</strong> ${totalUsers}</p>
          <p style="color:#666;font-size:13px;margin-top:20px;">This is an automated digest from A2A Global registration system.</p>
        </div>
      `,
    });
    if (error) { console.error("Digest error:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send digest:", err);
    return false;
  }
}
