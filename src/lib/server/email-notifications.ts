import { type SupabaseClient } from "@supabase/supabase-js";

import { sendEmail } from "@/lib/resend";

export type PendingEmailNotification = {
  id: string;
  recipient_id: string;
  title: string;
  body: string;
};

export type EmailNotificationResult = {
  id: string;
  ok: boolean;
  provider_message_id?: string;
  error?: string;
};

const PENDING_EMAIL_BATCH_SIZE = 25;

export async function processPendingEmailNotifications(
  supabase: SupabaseClient,
  limit = PENDING_EMAIL_BATCH_SIZE
): Promise<EmailNotificationResult[]> {
  const { data: pending, error: pendingError } = await supabase
    .from("notification_deliveries")
    .select("id, recipient_id, title, body")
    .eq("channel", "email")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (pendingError || !pending?.length) {
    return [];
  }

  const recipientIds = Array.from(new Set(pending.map((item) => item.recipient_id)));
  const { data: recipients, error: recipientsError } = await supabase
    .from("users")
    .select("id, email")
    .in("id", recipientIds);

  if (recipientsError) {
    return [];
  }

  const emailById = new Map((recipients ?? []).map((user) => [user.id as string, user.email as string | null]));
  const results: EmailNotificationResult[] = [];

  for (const notification of pending as PendingEmailNotification[]) {
    const recipientEmail = emailById.get(notification.recipient_id);

    if (!recipientEmail) {
      await supabase
        .from("notification_deliveries")
        .update({ status: "failed", error_message: "Recipient has no email address on file." })
        .eq("id", notification.id);

      results.push({ id: notification.id, ok: false, error: "Recipient has no email address on file." });
      continue;
    }

    const sendResult = await sendEmail({
      to: recipientEmail,
      subject: notification.title,
      body: notification.body
    });

    if (sendResult.ok) {
      await supabase
        .from("notification_deliveries")
        .update({
          status: "sent",
          provider_message_id: sendResult.providerMessageId,
          error_message: null,
          sent_at: new Date().toISOString()
        })
        .eq("id", notification.id);

      results.push({ id: notification.id, ok: true, provider_message_id: sendResult.providerMessageId });
    } else {
      await supabase
        .from("notification_deliveries")
        .update({ status: "failed", error_message: sendResult.error })
        .eq("id", notification.id);

      results.push({ id: notification.id, ok: false, error: sendResult.error });
    }
  }

  return results;
}
