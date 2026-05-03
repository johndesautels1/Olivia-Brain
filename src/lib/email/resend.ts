import { Resend } from "resend";

/**
 * Escape HTML special characters to prevent XSS in email templates.
 * All user-generated content must be passed through this function.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Resend client — initialised once.
 * Requires RESEND_API_KEY in environment variables.
 * If the key is missing, emails will be skipped (logged to console).
 */
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS || "Clues London <noreply@clueslondon.com>";

const OLIVIA_FROM_ADDRESS =
  process.env.RESEND_OLIVIA_FROM_ADDRESS || "Olivia <olivia@clueslondon.com>";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://clueslondon.com";

/* ─── Package Sent ─── */

interface PackageSentEmailParams {
  recipientEmail: string;
  recipientName: string | null;
  packageName: string;
  shareToken: string;
  personalMessage?: string | null;
}

export async function sendPackageEmail({
  recipientEmail,
  recipientName,
  packageName,
  shareToken,
  personalMessage,
}: PackageSentEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", recipientEmail);
    return { success: false, error: "Email service not configured" };
  }

  const shareUrl = `${SITE_URL}/presentation/${shareToken}`;
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:12px;border:1px solid #1f2937;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:4px;">Clues London</div>
          <div style="font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">London Tech Map</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="color:#e5e7eb;font-size:15px;line-height:1.6;margin:0 0 16px;">
            ${escapeHtml(greeting)}
          </p>
          <p style="color:#e5e7eb;font-size:15px;line-height:1.6;margin:0 0 16px;">
            A package has been shared with you: <strong style="color:#ffffff;">${escapeHtml(packageName)}</strong>
          </p>
          ${personalMessage ? `<div style="margin:16px 0;padding:16px;background-color:#1f2937;border-radius:8px;border-left:3px solid #6366f1;"><p style="color:#d1d5db;font-size:14px;line-height:1.5;margin:0;font-style:italic;">${escapeHtml(personalMessage)}</p></div>` : ""}
          <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background-color:#4f46e5;border-radius:8px;padding:14px 32px;">
              <a href="${shareUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
                View Package
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
            Or copy this link: <a href="${shareUrl}" style="color:#818cf8;text-decoration:underline;">${shareUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #1f2937;">
          <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0;text-align:center;">
            Sent via <a href="${SITE_URL}" style="color:#818cf8;text-decoration:none;">Clues London</a> &mdash; London Tech Map
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipientEmail,
      subject: `${packageName} — Shared with you`,
      html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return { success: false, error: String(err) };
  }
}

/* ─── Olivia Conversation Transcript ─── */

interface ConversationEmailParams {
  recipientEmail: string;
  conversationTitle: string;
  messages: Array<{ speaker: string; text: string }>;
  conversationDate: string;
}

export async function sendConversationEmail({
  recipientEmail,
  conversationTitle,
  messages,
  conversationDate,
}: ConversationEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", recipientEmail);
    return { success: false, error: "Email service not configured" };
  }

  const messagesHtml = messages
    .map((m) => {
      const isOlivia = m.speaker === "olivia";
      return `
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:600;color:${isOlivia ? "#c4a96a" : "#818cf8"};margin-bottom:4px;">
            ${isOlivia ? "Olivia" : "You"}
          </div>
          <div style="color:#e5e7eb;font-size:14px;line-height:1.6;padding-left:12px;border-left:2px solid ${isOlivia ? "#c4a96a" : "#818cf8"};">
            ${escapeHtml(m.text)}
          </div>
        </div>
      `;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:12px;border:1px solid #1f2937;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:4px;">Clues London</div>
          <div style="font-size:12px;color:#c4a96a;letter-spacing:1px;text-transform:uppercase;">Olivia Conversation Transcript</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">
            ${conversationDate}
          </p>
          <h2 style="color:#ffffff;font-size:18px;font-weight:600;margin:0 0 24px;">
            ${escapeHtml(conversationTitle)}
          </h2>
          <div style="background-color:#1f2937;border-radius:8px;padding:20px;">
            ${messagesHtml}
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #1f2937;">
          <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0;text-align:center;">
            Sent via <a href="${SITE_URL}" style="color:#c4a96a;text-decoration:none;">Clues London</a> &mdash; Your AI Assistant Olivia
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    const { error } = await resend.emails.send({
      from: OLIVIA_FROM_ADDRESS,
      to: recipientEmail,
      subject: `Olivia Conversation: ${conversationTitle}`,
      html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return { success: false, error: String(err) };
  }
}

/* ─── Olivia Custom Email ─── */

interface OliviaEmailParams {
  recipientEmail: string;
  subject: string;
  message: string;
  includeSignature?: boolean;
}

export async function sendOliviaEmail({
  recipientEmail,
  subject,
  message,
  includeSignature = true,
}: OliviaEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", recipientEmail);
    return { success: false, error: "Email service not configured" };
  }

  const signature = includeSignature
    ? `<p style="color:#c4a96a;font-size:13px;margin-top:24px;padding-top:16px;border-top:1px solid #374151;">— Olivia, your Chief of Staff<br/><span style="color:#9ca3af;">London Tech Map</span></p>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:12px;border:1px solid #1f2937;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:4px;">Clues London</div>
          <div style="font-size:12px;color:#c4a96a;letter-spacing:1px;text-transform:uppercase;">Message from Olivia</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <div style="color:#e5e7eb;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(message)}</div>
          ${signature}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #1f2937;">
          <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0;text-align:center;">
            Sent via <a href="${SITE_URL}" style="color:#c4a96a;text-decoration:none;">Clues London</a> &mdash; Your AI Assistant Olivia
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    const { error } = await resend.emails.send({
      from: OLIVIA_FROM_ADDRESS,
      to: recipientEmail,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send Olivia email:", err);
    return { success: false, error: String(err) };
  }
}

/* ─── Confirmation to Sender ─── */

interface SenderConfirmationParams {
  senderEmail: string;
  packageName: string;
  recipientCount: number;
  recipientNames: string[];
}

export async function sendSenderConfirmation({
  senderEmail,
  packageName,
  recipientCount,
  recipientNames,
}: SenderConfirmationParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation to", senderEmail);
    return { success: false, error: "Email service not configured" };
  }

  const recipientList = recipientNames
    .map((n) => `<li style="color:#d1d5db;font-size:14px;padding:4px 0;">${escapeHtml(n)}</li>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:12px;border:1px solid #1f2937;">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:4px;">Clues London</div>
          <div style="font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">Send Confirmation</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="margin-bottom:20px;padding:16px;background-color:#064e3b;border-radius:8px;border:1px solid #065f46;">
            <p style="color:#34d399;font-size:15px;font-weight:600;margin:0;">
              Package sent successfully
            </p>
          </div>
          <p style="color:#e5e7eb;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Your package <strong style="color:#ffffff;">${escapeHtml(packageName)}</strong> has been sent to
            <strong style="color:#ffffff;">${recipientCount}</strong> recipient${recipientCount !== 1 ? "s" : ""}:
          </p>
          <ul style="margin:0 0 16px;padding-left:20px;">${recipientList}</ul>
          <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
            You can track delivery status and engagement from your
            <a href="${SITE_URL}/packages" style="color:#818cf8;text-decoration:underline;">Packages dashboard</a>.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #1f2937;">
          <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0;text-align:center;">
            Sent via <a href="${SITE_URL}" style="color:#818cf8;text-decoration:none;">Clues London</a> &mdash; London Tech Map
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: senderEmail,
      subject: `Confirmation: ${packageName} sent to ${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`,
      html,
    });

    if (error) {
      console.error("[email] Resend confirmation error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send confirmation:", err);
    return { success: false, error: String(err) };
  }
}
