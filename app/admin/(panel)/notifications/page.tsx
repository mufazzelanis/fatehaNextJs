import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { readNotifyConfig } from "@/lib/notify";
import { publicNotifyConfig } from "@/lib/notify-config";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { NotificationSettings } from "./notification-settings";

export const metadata = { title: "Email, SMS & OTP" };

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <View />
    </Suspense>
  );
}

async function View() {
  const admin = await requirePermission("settings.manage");
  const [cfg, log, stats] = await Promise.all([
    readNotifyConfig(),
    query<{ id: number; channel: string; recipient: string; subject: string | null; purpose: string; status: string; error: string | null; created_at: Date }>(
      "SELECT * FROM message_log ORDER BY id DESC LIMIT 40",
    ),
    queryOne<{ email: number; sms: number; failed: number }>(
      `SELECT SUM(channel = 'email' AND status = 'sent') AS email, SUM(channel = 'sms' AND status = 'sent') AS sms, SUM(status = 'failed') AS failed
       FROM message_log WHERE created_at >= NOW() - INTERVAL 30 DAY`,
    ),
  ]);
  return (
    <>
      <PageHeader title="Email, SMS & OTP" description="Connect your email (SMTP) and SMS gateway, turn on sign-in codes, and choose who gets order alerts." />
      <NotificationSettings
        config={publicNotifyConfig(cfg)} adminEmail={admin.email}
        stats={{ email: Number(stats?.email ?? 0), sms: Number(stats?.sms ?? 0), failed: Number(stats?.failed ?? 0) }}
        log={log.map((l) => ({ ...l, created_at: new Date(l.created_at).toISOString() }))} />
    </>
  );
}
