import { Resend } from "resend";

let resendClient: Resend | null = null;

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Resend is not configured. Add RESEND_API_KEY for server-side email delivery.");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type SendEmailResult = { ok: true; providerMessageId: string } | { ok: false; error: string };

export async function sendEmail({ to, subject, body }: SendEmailInput): Promise<SendEmailResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    return { ok: false, error: "RESEND_FROM_EMAIL is not configured." };
  }

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      text: body
    });

    if (error || !data?.id) {
      return { ok: false, error: error?.message ?? "Resend returned no message id." };
    }

    return { ok: true, providerMessageId: data.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown Resend error." };
  }
}
