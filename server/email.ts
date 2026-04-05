import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_PrjaSqsY_fdEew3xntXPQsouj46kysKRF");

const FROM_EMAIL = "A2A Global <noreply@a2a.global>";
const LOGO_URL = "https://a2a.global/icons/a2a-blue-logo.svg";
const FOOTER_TEXT = "A2A Global Inc is a US based technology platform that enables Indian freelancers to generate payment links and receive cross border payments from the US via licensed payment partners.";
const FOOTER_LEGAL = "\u00a9 2026 A2A Global Inc. All rights reserved. File number 10050200, Newark, Delaware, United States.";

function emailHeader(): string {
  return `
        <tr>
          <td style="background:linear-gradient(135deg,#0F3DD1 0%,#171717 100%);padding:24px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="A2A Global" height="36" style="height:36px;width:auto;" />
          </td>
        </tr>`;
}

function emailFooter(): string {
  return `
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 12px;font-size:11px;color:#6b7280;line-height:1.6;text-align:center;">
              ${FOOTER_TEXT}
            </p>
            <p style="margin:0;font-size:10px;color:#9ca3af;line-height:1.5;text-align:center;">
              ${FOOTER_LEGAL}
            </p>
          </td>
        </tr>`;
}

function otpEmailHtml(firstName: string, otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:460px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        ${emailHeader()}
        <tr>
          <td style="padding:36px 32px 20px;">
            <p style="margin:0 0 8px;font-size:15px;color:#374151;">Hi ${firstName},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.5;">Use the verification code below to complete your registration on A2A Global.</p>
            <div style="background:#f0f4ff;border:1px solid #d4deff;border-radius:8px;padding:20px;text-align:center;margin:0 0 28px;">
              <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0F3DD1;font-family:monospace;">${otp}</span>
            </div>
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">If you didn't request this code, you can safely ignore this email.</p>
          </td>
        </tr>
        ${emailFooter()}
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
        ${emailHeader()}
        <tr>
          <td style="padding:36px 32px 20px;">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;">Welcome, ${firstName}!</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.5;">Your email has been verified and your A2A Global account is ready. Here's what to do next:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr><td style="padding:8px 0;font-size:14px;color:#374151;">1. Complete your profile and add your skills</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#374151;">2. Add and verify your mobile number to unlock premium tasks</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#374151;">3. Submit KYC documents to start receiving payments</td></tr>
            </table>

          </td>
        </tr>
        ${emailFooter()}
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

export async function sendAdminNotificationWithReport(
  newUser: { firstName: string; lastName: string; email: string },
  totalUsers: number,
  reportBuffer: Buffer
): Promise<boolean> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ["oleg@a2a.global", "amir@a2a.global"],
      subject: `New Freelancer: ${newUser.firstName} ${newUser.lastName} — Total: ${totalUsers}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:460px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        ${emailHeader()}
        <tr>
          <td style="padding:36px 32px 20px;">
            <h2 style="margin:0 0 20px;font-size:18px;color:#0F3DD1;">New Freelancer Registration</h2>
            <table style="border-collapse:collapse;margin:0 0 20px;width:100%;">
              <tr><td style="padding:8px 16px 8px 0;color:#6b7280;font-size:14px;">Name:</td><td style="padding:8px 0;font-weight:600;font-size:14px;color:#374151;">${newUser.firstName} ${newUser.lastName}</td></tr>
              <tr><td style="padding:8px 16px 8px 0;color:#6b7280;font-size:14px;">Email:</td><td style="padding:8px 0;font-weight:600;font-size:14px;color:#374151;">${newUser.email}</td></tr>
              <tr><td style="padding:8px 16px 8px 0;color:#6b7280;font-size:14px;">Total Users:</td><td style="padding:8px 0;font-weight:700;font-size:22px;color:#0F3DD1;">${totalUsers}</td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#6b7280;">Full user registry and analytics dashboard attached as Excel report.</p>
          </td>
        </tr>
        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
      attachments: [
        {
          filename: `A2A_Global_Users_${date}.xlsx`,
          content: reportBuffer,
        },
      ],
    });
    if (error) { console.error("Admin notification error:", error); return false; }
    console.log(`Admin notification sent with Excel report (${totalUsers} users)`);
    return true;
  } catch (err) {
    console.error("Failed to send admin notification:", err);
    return false;
  }
}
