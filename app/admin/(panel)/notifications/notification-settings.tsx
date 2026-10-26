"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  saveAlertSettings, saveEmailSettings, saveSecuritySettings, saveSmsSettings, sendTestEmailAction, sendTestSmsAction,
} from "@/app/actions/notify";
import { initialState } from "@/lib/action-state";
import { fillTemplate, smsParts, SMS_PROVIDERS, type PublicNotifyConfig, type SmsProvider } from "@/lib/notify-config";
import { FieldError, FormAlert, keepValuesOnSubmit, SubmitButton } from "@/components/form-bits";
import { BellIcon, CheckCircleIcon, KeyIcon, MailIcon, MessageIcon, ShieldIcon } from "@/components/icons";

type Log = { id: number; channel: string; recipient: string; subject: string | null; purpose: string; status: string; error: string | null; created_at: string };

const PRESETS = [
  { name: "Hostinger", host: "smtp.hostinger.com", port: 465, security: "ssl" },
  { name: "Gmail", host: "smtp.gmail.com", port: 465, security: "ssl" },
  { name: "Zoho", host: "smtp.zoho.com", port: 465, security: "ssl" },
  { name: "Brevo", host: "smtp-relay.brevo.com", port: 587, security: "starttls" },
] as const;

function Card({ icon, title, text, status, children }: { icon: ReactNode; title: string; text: string; status?: ReactNode; children: ReactNode }) {
  return (
    <section className="a-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{text}</p>
        </div>
        {status}
      </div>
      {children}
    </section>
  );
}

function Pill({ on, label }: { on: boolean; label: string }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${on ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>{label}</span>;
}

function Switch({ name, defaultChecked, disabled, label, text }: { name: string; defaultChecked: boolean; disabled?: boolean; label: string; text: ReactNode }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition has-checked:border-brand-300 has-checked:bg-brand-50/40 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="mt-0.5 size-4 accent-brand-700" />
      <span className="text-sm"><span className="font-medium text-slate-900">{label}</span><span className="block text-xs text-slate-500">{text}</span></span>
    </label>
  );
}

export function NotificationSettings({ config: c, adminEmail, stats, log }: { config: PublicNotifyConfig; adminEmail: string; stats: { email: number; sms: number; failed: number }; log: Log[] }) {
  const emailReady = c.email.enabled && !!c.email.verifiedAt;
  const smsReady = c.sms.enabled && !!c.sms.verifiedAt;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Email (SMTP)" value={emailReady ? "Connected" : c.email.enabled ? "Not tested" : "Off"} good={emailReady} />
        <Tile label="SMS gateway" value={smsReady ? "Connected" : c.sms.enabled ? "Not tested" : "Off"} good={smsReady} />
        <Tile label="Admin sign-in code" value={c.security.adminOtp ? "On" : "Off"} good={c.security.adminOtp} />
        <Tile label="Sent · 30 days" value={`${stats.email} email · ${stats.sms} SMS`} sub={stats.failed ? `${stats.failed} failed` : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <EmailCard c={c} adminEmail={adminEmail} />
        <SmsCard c={c} />
        <SecurityCard c={c} emailReady={emailReady} smsReady={smsReady} />
        <AlertsCard c={c} />
      </div>
      <LogTable log={log} />
    </div>
  );
}

function Tile({ label, value, good, sub }: { label: string; value: string; good?: boolean; sub?: string }) {
  return (
    <div className="a-card p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-lg font-semibold ${good ? "text-emerald-700" : "text-slate-900"}`}>{good && <CheckCircleIcon className="mr-1 inline size-4 align-[-2px]" />}{value}</p>
      {sub && <p className="text-xs font-medium text-rose-600">{sub}</p>}
    </div>
  );
}

function EmailCard({ c, adminEmail }: { c: PublicNotifyConfig; adminEmail: string }) {
  const [state, action, pending] = useActionState(saveEmailSettings, initialState);
  const [test, testAction, testPending] = useActionState(sendTestEmailAction, initialState);
  const [host, setHost] = useState(c.email.host);
  const [port, setPort] = useState(String(c.email.port));
  const [security, setSecurity] = useState<string>(c.email.security);
  const fe = state.fieldErrors ?? {};
  return (
    <Card icon={<MailIcon className="size-5" />} title="Email (SMTP)" text="Sends sign-in codes, password-reset links and order alerts."
      status={<Pill on={c.email.enabled && !!c.email.verifiedAt} label={c.email.enabled ? (c.email.verifiedAt ? "Connected" : "Not tested") : "Off"} />}>
      <form onSubmit={keepValuesOnSubmit(action)} className="space-y-3">
        <Switch name="enabled" defaultChecked={c.email.enabled} label="Send emails" text="Turn off to stop every email from the site." />
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500">Quick fill:</span>
          {PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => { setHost(p.host); setPort(String(p.port)); setSecurity(p.security); }}
              className="rounded-full border border-slate-200 px-2.5 py-1 font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700">{p.name}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_6rem_8rem]">
          <label className="block"><span className="a-label">SMTP host</span><input name="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.hostinger.com" className="a-input font-mono" aria-invalid={!!fe.host} /><FieldError message={fe.host} /></label>
          <label className="block"><span className="a-label">Port</span><input name="port" value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" className="a-input font-mono" /></label>
          <label className="block"><span className="a-label">Encryption</span>
            <select name="security" value={security} onChange={(e) => setSecurity(e.target.value)} className="a-input">
              <option value="ssl">SSL (465)</option><option value="starttls">STARTTLS (587)</option><option value="none">None</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="a-label">Username</span><input name="user" defaultValue={c.email.user} autoComplete="off" placeholder="noreply@fatehabd.com" className="a-input" /></label>
          <label className="block"><span className="a-label">Password</span>
            <input name="pass" type="password" autoComplete="new-password" placeholder={c.email.hasPass ? "•••••••• saved — leave empty to keep" : "Mailbox / app password"} className="a-input" />
          </label>
          <label className="block"><span className="a-label">Sender name</span><input name="fromName" defaultValue={c.email.fromName} className="a-input" /></label>
          <label className="block"><span className="a-label">Sender email</span><input name="fromEmail" type="email" defaultValue={c.email.fromEmail} placeholder="noreply@fatehabd.com" className="a-input" aria-invalid={!!fe.fromEmail} /><FieldError message={fe.fromEmail} /></label>
        </div>
        <label className="block"><span className="a-label">Send the test email to</span><input name="testTo" type="email" defaultValue={adminEmail} className="a-input" /></label>
        <p className="text-xs text-slate-500">Gmail needs an <b>App Password</b> (Google Account → Security → 2-Step Verification → App passwords), not your normal password. The password is stored encrypted.</p>
        <FormAlert error={state.error} message={state.message} />
        <SubmitButton className="a-btn w-full" pendingText="Saving & testing…" pending={pending}>Save & send test email</SubmitButton>
      </form>
      {c.email.host && (
        <form action={testAction} className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <input name="testTo" type="email" defaultValue={adminEmail} className="a-input min-w-0 flex-1" aria-label="Test recipient" />
          <SubmitButton className="a-btn-outline" pendingText="Sending…" pending={testPending}>Send test</SubmitButton>
          <div className="basis-full"><FormAlert error={test.error} message={test.message} /></div>
        </form>
      )}
    </Card>
  );
}

function SmsCard({ c }: { c: PublicNotifyConfig }) {
  const [state, action, pending] = useActionState(saveSmsSettings, initialState);
  const [test, testAction, testPending] = useActionState(sendTestSmsAction, initialState);
  const [provider, setProvider] = useState<SmsProvider>(c.sms.provider);
  const fe = state.fieldErrors ?? {};
  return (
    <Card icon={<MessageIcon className="size-5" />} title="SMS gateway" text="Phone verification codes and order-confirmation SMS (Bangladeshi gateways)."
      status={<Pill on={c.sms.enabled && !!c.sms.verifiedAt} label={c.sms.enabled ? (c.sms.verifiedAt ? "Connected" : "Not tested") : "Off"} />}>
      <form onSubmit={keepValuesOnSubmit(action)} className="space-y-3">
        <Switch name="enabled" defaultChecked={c.sms.enabled} label="Send SMS" text="Each SMS costs money on your gateway account (about ৳0.25–0.35)." />
        <label className="block"><span className="a-label">Company</span>
          <select name="provider" value={provider} onChange={(e) => setProvider(e.target.value as SmsProvider)} className="a-input">
            {(Object.keys(SMS_PROVIDERS) as SmsProvider[]).map((p) => <option key={p} value={p}>{SMS_PROVIDERS[p].name}</option>)}
          </select>
          <span className="mt-1 block text-xs text-slate-400">{SMS_PROVIDERS[provider].help}</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="a-label">API key</span>
            <input name="apiKey" type="password" autoComplete="new-password" placeholder={c.sms.hasApiKey ? "•••••••• saved — leave empty to keep" : "API key"} className="a-input" aria-invalid={!!fe.apiKey} />
            <FieldError message={fe.apiKey} />
          </label>
          <label className="block"><span className="a-label">Sender ID {provider === "smsnetbd" && <span className="font-normal text-slate-400">(optional)</span>}</span><input name="senderId" defaultValue={c.sms.senderId} className="a-input" /></label>
        </div>
        {provider === "custom" && (
          <>
            <label className="block"><span className="a-label">Send URL</span>
              <input name="customUrl" defaultValue={c.sms.customUrl} placeholder="https://api.example.com/send?key={api_key}&to={to}&msg={message}&from={sender}" className="a-input font-mono text-xs" aria-invalid={!!fe.customUrl} />
              <FieldError message={fe.customUrl} />
            </label>
            <label className="block"><span className="a-label">Success text in the reply (optional)</span><input name="customSuccess" defaultValue={c.sms.customSuccess} placeholder="e.g. SUCCESS or 202" className="a-input" /></label>
          </>
        )}
        <FormAlert error={state.error} message={state.message} />
        <SubmitButton className="a-btn w-full" pendingText="Saving…" pending={pending}>Save SMS settings</SubmitButton>
      </form>
      <form action={testAction} className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <input name="testPhone" inputMode="tel" placeholder="01XXXXXXXXX" className="a-input min-w-0 flex-1 font-mono" aria-label="Test phone number" />
        <SubmitButton className="a-btn-outline" pendingText="Sending…" pending={testPending}>Send test SMS</SubmitButton>
        <div className="basis-full"><FormAlert error={test.error} message={test.message} /></div>
      </form>
    </Card>
  );
}

function SecurityCard({ c, emailReady, smsReady }: { c: PublicNotifyConfig; emailReady: boolean; smsReady: boolean }) {
  const [state, action, pending] = useActionState(saveSecuritySettings, initialState);
  return (
    <Card icon={<ShieldIcon className="size-5" />} title="Sign-in security (OTP)" text="One-time codes make stolen passwords useless.">
      <form onSubmit={keepValuesOnSubmit(action)} className="space-y-3">
        <Switch name="adminOtp" defaultChecked={c.security.adminOtp} disabled={!emailReady && !c.security.adminOtp}
          label="Email code at admin sign-in"
          text={emailReady || c.security.adminOtp ? "After the password, staff enter a 6-digit code sent to their email." : "Connect and test email first."} />
        <label className="block"><span className="a-label">“Trust this device” lasts</span>
          <select name="trustDays" defaultValue={String(c.security.trustDays)} className="a-input">
            <option value="0">Never — ask every time</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option>
          </select>
        </label>
        <Switch name="customerOtp" defaultChecked={c.security.customerOtp} disabled={!smsReady && !c.security.customerOtp}
          label="Verify customers by SMS"
          text={smsReady || c.security.customerOtp ? "New accounts confirm their phone with a code; customers can reset the password or sign in with a code." : "Connect and test the SMS gateway first."} />
        <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <KeyIcon className="mt-0.5 size-4 shrink-0" />
          Locked out because email stopped working? On the server run <code className="rounded bg-white px-1">npm run admin:otp-off</code> to turn the admin code off.
        </p>
        <FormAlert error={state.error} message={state.message} />
        <SubmitButton className="a-btn w-full" pendingText="Saving…" pending={pending}>Save security settings</SubmitButton>
      </form>
    </Card>
  );
}

function AlertsCard({ c }: { c: PublicNotifyConfig }) {
  const [state, action, pending] = useActionState(saveAlertSettings, initialState);
  const [otp, setOtp] = useState(c.templates.otpSms);
  const [order, setOrder] = useState(c.templates.orderSms);
  const fe = state.fieldErrors ?? {};
  const counter = (t: string) => { const p = smsParts(t); return `${p.length} characters · ${p.parts} SMS${p.unicode ? " (Bangla)" : ""}`; };
  return (
    <Card icon={<BellIcon className="size-5" />} title="Alerts & message text" text="Who hears about new orders, and what customers receive.">
      <form onSubmit={keepValuesOnSubmit(action)} className="space-y-3">
        <label className="block"><span className="a-label">Admin emails for alerts (comma separated)</span>
          <textarea name="adminEmails" rows={2} defaultValue={c.alerts.adminEmails.join(", ")} placeholder="owner@fatehabd.com, orders@fatehabd.com" className="a-input" />
        </label>
        <Switch name="newOrder" defaultChecked={c.alerts.newOrder} label="Email me every new order" text="Shop and landing-page orders, with a link to open the order." />
        <Switch name="dealerApplication" defaultChecked={c.alerts.dealerApplication} label="Email me new dealer applications" text="With a link to review the documents." />
        <Switch name="orderSms" defaultChecked={c.alerts.orderSms} label="SMS the customer when they order" text="Uses the order message below. Needs the SMS gateway." />
        <label className="block"><span className="a-label">Verification code SMS — must contain {"{code}"}</span>
          <textarea name="otpSms" rows={2} value={otp} onChange={(e) => setOtp(e.target.value)} className="a-input font-sans" aria-invalid={!!fe.otpSms} />
          <span className="mt-1 flex justify-between text-xs text-slate-400"><FieldError message={fe.otpSms} /><span className="ml-auto">{counter(fillTemplate(otp, { code: "123456" }))}</span></span>
        </label>
        <label className="block"><span className="a-label">Order SMS — {"{name}"}, {"{order}"}, {"{total}"}</span>
          <textarea name="orderSms_t" rows={3} value={order} onChange={(e) => setOrder(e.target.value)} className="a-input font-sans" />
          <span className="mt-1 block text-right text-xs text-slate-400">{counter(fillTemplate(order, { name: "রহিম", order: "FB10025", total: "3,310" }))}</span>
        </label>
        <p className="rounded-lg bg-slate-50 p-3 font-sans text-xs text-slate-600"><b>Preview:</b> {fillTemplate(order, { name: "রহিম", order: "FB10025", total: "3,310" })}</p>
        <FormAlert error={state.error} message={state.message} />
        <SubmitButton className="a-btn w-full" pendingText="Saving…" pending={pending}>Save alerts & messages</SubmitButton>
      </form>
    </Card>
  );
}

function LogTable({ log }: { log: Log[] }) {
  return (
    <section className="a-card overflow-hidden">
      <h2 className="border-b border-slate-100 px-5 py-4 font-medium text-slate-900">Message log <span className="text-sm font-normal text-slate-400">· last 40</span></h2>
      {log.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">Nothing sent yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-2.5">When</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">To</th><th className="px-3 py-2.5">What</th><th className="px-5 py-2.5">Result</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-5 py-2.5 text-slate-500">{new Date(l.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" })}</td>
                  <td className="px-3 py-2.5">{l.channel === "email" ? "Email" : "SMS"}</td>
                  <td className="max-w-48 truncate px-3 py-2.5 font-mono text-xs">{l.recipient}</td>
                  <td className="max-w-64 px-3 py-2.5"><span className="block truncate text-slate-800">{l.purpose.startsWith("otp.") ? "Verification code" : l.subject ?? l.purpose}</span><span className="text-xs text-slate-400">{l.purpose}</span></td>
                  <td className="px-5 py-2.5">
                    {l.status === "sent" ? <span className="text-emerald-700">Sent</span> : <span className="text-rose-700" title={l.error ?? ""}>Failed<span className="block max-w-64 truncate text-xs text-rose-500">{l.error}</span></span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
