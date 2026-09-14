/**
 * Email delivery abstraction (spec \u00a711).
 *
 * No email vendor was specified, so this ships with a "console" provider
 * (logs the message instead of sending it) and a clean seam for a real
 * one later. Callers (jury.service.js) only ever see `sendMail()` — they
 * never know or care which provider is active.
 *
 * To wire up a real provider:
 *   1. `npm install` whatever SDK you're using (Resend, SendGrid, SES, ...).
 *   2. Add a case below that calls it, reading credentials from env vars
 *      you add to .env.example.
 *   3. Set EMAIL_PROVIDER accordingly.
 * Nothing outside this file needs to change.
 */

function providerName() {
  return process.env.EMAIL_PROVIDER || "console";
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 * @returns {Promise<{ delivered: boolean, provider: string }>}
 */
async function sendMail({ to, subject, text, html }) {
  const provider = providerName();

  if (provider === "console") {
    // Safe default for local/dev and for any environment that hasn't
    // configured a real provider yet. Never throws — a missing email
    // integration must not break the magic-link request flow itself
    // (the token still exists in the DB; it just isn't emailed out).
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[email] EMAIL_PROVIDER is unset in production — "${subject}" to ${to} was NOT delivered. ` +
          "Configure a real provider in src/services/email/emailService.js."
      );
    } else {
      console.log(`[email:console] To: ${to} | Subject: ${subject}\n${text}`);
    }
    return { delivered: false, provider: "console" };
  }

  // Example shape for a real provider, once one is added:
  // if (provider === "resend") {
  //   const { Resend } = require("resend");
  //   const client = new Resend(process.env.RESEND_API_KEY);
  //   await client.emails.send({ from: process.env.EMAIL_FROM, to, subject, text, html });
  //   return { delivered: true, provider: "resend" };
  // }

  throw new Error(`Unknown EMAIL_PROVIDER "${provider}".`);
}

module.exports = { sendMail };
