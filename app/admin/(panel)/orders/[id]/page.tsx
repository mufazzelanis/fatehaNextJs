import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { can, requirePermission } from "@/lib/auth";
import { getOrderById, parseCustomFields, previousOrdersByPhone, zoneLabel } from "@/lib/data/orders";
import { readLanding } from "@/lib/data/landings";
import { query, queryOne } from "@/lib/db";
import { dateTime, money, STATUS_META } from "@/lib/format";
import { deleteOrder } from "@/app/actions/admin";
import { PageHeader, PanelSkeleton, StatusBadge } from "@/components/admin/ui";
import { AlertIcon, ChevronLeftIcon, PhoneIcon, PrinterIcon, WhatsappIcon } from "@/components/icons";
import { DeleteOrderButton, OrderDetailsForm, ResendPurchaseButton, StatusForm } from "./order-forms";
import { getMarketingConfig } from "@/lib/meta/config";
import { isPaymentMethod, PAYMENT_LABEL, PAYMENT_STATUS_META, type PaymentStatus } from "@/lib/payments";
import { PaymentForm } from "./payment-form";

export const metadata = { title: "Order details" };

export default function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <OrderView params={params} />
    </Suspense>
  );
}

async function OrderView({ params }: Pick<PageProps<"/admin/orders/[id]">, "params">) {
  const admin = await requirePermission("orders.view");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const order = await getOrderById(id);
  if (!order) notFound();
  const [previous, blocked, marketing, landing, activity] = await Promise.all([
    previousOrdersByPhone(order.phone, order.id),
    queryOne<{ reason: string | null }>("SELECT reason FROM blocked_phones WHERE phone = ?", [order.phone]),
    getMarketingConfig(),
    order.landing_id ? readLanding(order.landing_id) : Promise.resolve(null),
    can(admin, "logs.view")
      ? query<{ id: number; user_name: string | null; description: string; created_at: Date }>(
          "SELECT id, user_name, description, created_at FROM activity_logs WHERE entity_type = 'order' AND entity_id = ? ORDER BY id DESC LIMIT 15",
          [String(order.id)],
        )
      : Promise.resolve(null),
  ]);
  const canEdit = can(admin, "orders.edit");
  const customFields = parseCustomFields(order.custom_fields);
  const prevCancelled = previous.filter((p) => p.status === "cancelled" || p.status === "returned").length;
  const prevDelivered = previous.filter((p) => p.status === "delivered").length;
  const waPhone = `88${order.phone}`;
  const payStatus: PaymentStatus = (order.payment_status as PaymentStatus) in PAYMENT_STATUS_META ? (order.payment_status as PaymentStatus) : "unpaid";
  const payLabel = isPaymentMethod(order.payment_method) ? PAYMENT_LABEL[order.payment_method] : order.payment_method;
  const area = order.district_id
    ? await queryOne<{ district: string; thana: string | null; union_name: string | null }>(
        `SELECT d.name AS district, t.name AS thana, u.name AS union_name FROM districts d
         LEFT JOIN thanas t ON t.id = ? LEFT JOIN unions u ON u.id = ? WHERE d.id = ?`,
        [order.thana_id, order.union_id, order.district_id],
      )
    : null;

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ChevronLeftIcon className="size-4" /> Back to orders
      </Link>
      <PageHeader
        title={`Order #${order.order_no}`}
        description={`Placed ${dateTime(order.created_at)} · Last updated ${dateTime(order.updated_at)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            {can(admin, "orders.export") && <a href={`/admin/invoice?ids=${order.id}`} target="_blank" className="a-btn-outline"><PrinterIcon className="size-4" /> Invoice</a>}
            {can(admin, "orders.delete") && <DeleteOrderButton id={order.id} action={deleteOrder} />}
          </>
        }
      />

      {(blocked || prevCancelled > 0) && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertIcon className="mt-0.5 size-5 shrink-0" />
          <div>
            {blocked && <p><strong>This phone number is blocked.</strong> {blocked.reason}</p>}
            {prevCancelled > 0 && <p>This customer has <strong>{prevCancelled}</strong> cancelled/returned order(s) before — call to confirm.</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="a-card overflow-hidden">
            <h2 className="border-b border-slate-100 px-5 py-4 font-medium text-slate-900">Items</h2>
            <ul className="divide-y divide-slate-100 sm:hidden">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-sans font-medium text-slate-900">{item.product_name}</p>
                    <p className="text-xs text-slate-500 tabular-nums">{money(item.unit_price)} × {item.quantity}</p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">{money(item.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-2.5 font-medium">Product</th><th className="px-3 py-2.5 text-right font-medium">Price</th><th className="px-3 py-2.5 text-right font-medium">Qty</th><th className="px-5 py-2.5 text-right font-medium">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 font-sans font-medium text-slate-900">{item.product_name}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(item.unit_price)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">× {item.quantity}</td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">{money(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto max-w-xs space-y-1.5 border-t border-slate-100 px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="tabular-nums">{money(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Shipping ({zoneLabel(order)})</dt><dd className="tabular-nums">{money(order.shipping_charge)}</dd></div>
              {Number(order.discount) > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd className="tabular-nums">− {money(order.discount)}</dd></div>}
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-base font-semibold"><dt>Total ({isPaymentMethod(order.payment_method) && order.payment_method !== "cod" ? payLabel : "COD"})</dt><dd className="tabular-nums">{money(order.total)}</dd></div>
            </dl>
          </section>

          <section className="a-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium text-slate-900">Customer & delivery</h2>
              <div className="flex gap-2">
                <a href={`tel:${order.phone}`} className="a-btn-outline py-1.5"><PhoneIcon className="size-4" /> Call</a>
                <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="a-btn-outline py-1.5 text-emerald-700"><WhatsappIcon className="size-4" /> WhatsApp</a>
              </div>
            </div>
            {order.source !== "store" && (
              <p className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-slate-500">From landing page:</span>
                {landing ? <Link href={`/admin/landings/${landing.id}`} className="rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-800 hover:underline">{landing.name}</Link> : <span className="text-slate-400">—</span>}
                {landing && <a href={`/${landing.slug}`} target="_blank" className="font-mono text-xs text-slate-400 hover:text-brand-700">/{landing.slug}</a>}
              </p>
            )}
            {area && (
              <p className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-slate-500">Area:</span>
                {[area.district, area.thana, area.union_name].filter(Boolean).map((x, i) => (
                  <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800">{x}</span>
                ))}
                <span className="text-xs text-slate-400">· Main site order</span>
              </p>
            )}
            {order.note && (
              <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"><span className="font-medium">Customer note:</span> <span className="font-sans">{order.note}</span></div>
            )}
            {customFields.length > 0 && (
              <dl className="mb-4 grid gap-2 rounded-lg border border-sky-100 bg-sky-50/60 p-3 text-sm sm:grid-cols-2">
                {customFields.map((cf) => (
                  <div key={cf.label}><dt className="text-xs text-slate-500">{cf.label}</dt><dd className="font-sans font-medium text-slate-900">{cf.value}</dd></div>
                ))}
              </dl>
            )}
            <OrderDetailsForm readOnly={!canEdit} zones={landing?.checkout.zones ?? []} order={{
              id: order.id, customer_name: order.customer_name, phone: order.phone, address: order.address,
              shipping_zone: order.shipping_zone, shipping_label: zoneLabel(order), shipping_charge: Number(order.shipping_charge),
              discount: Number(order.discount), admin_note: order.admin_note ?? "", subtotal: Number(order.subtotal),
            }} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="a-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium text-slate-900">Payment</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_STATUS_META[payStatus].className}`}>{PAYMENT_STATUS_META[payStatus].label}</span>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Method</dt><dd className="font-medium text-slate-900">{payLabel}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Amount</dt><dd className="font-medium tabular-nums text-slate-900">{money(order.total)}</dd></div>
              {order.payment_sender && <div className="flex justify-between gap-3"><dt className="text-slate-500">Sent from</dt><dd className="font-mono text-slate-900">{order.payment_sender}</dd></div>}
              {order.payment_trx && <div className="flex justify-between gap-3"><dt className="text-slate-500">Transaction ID</dt><dd className="select-all break-all font-mono font-semibold text-slate-900">{order.payment_trx}</dd></div>}
            </dl>
            <PaymentForm id={order.id} status={payStatus} wallet={isPaymentMethod(order.payment_method) && order.payment_method !== "cod"} readOnly={!canEdit} />
          </section>

          <section className="a-card p-5">
            <h2 className="mb-4 font-medium text-slate-900">Update status</h2>
            <StatusForm id={order.id} status={order.status} readOnly={!canEdit} />
          </section>

          <section className="a-card p-5">
            <h2 className="mb-4 font-medium text-slate-900">Timeline</h2>
            <ol className="relative space-y-5 border-l-2 border-slate-100 pl-5">
              {[...order.history].reverse().map((h) => (
                <li key={h.id} className="relative">
                  <span className={`absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-white ${STATUS_META[h.status]?.dot ?? "bg-slate-400"}`} />
                  <p className="text-sm font-medium text-slate-900">{STATUS_META[h.status]?.label ?? h.status}</p>
                  {h.note && <p className="font-sans text-sm text-slate-600">{h.note}</p>}
                  <p className="text-xs text-slate-400">{dateTime(h.created_at)}{h.changed_by_name ? ` · ${h.changed_by_name}` : " · Customer"}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="a-card p-5">
            <h2 className="font-medium text-slate-900">Customer history</h2>
            <p className="mt-1 text-sm text-slate-500">{previous.length} other order(s) · {prevDelivered} delivered · {prevCancelled} cancelled/returned</p>
            {previous.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100">
                {previous.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/orders/${p.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-brand-700">
                      <span>#{p.order_no} <span className="text-xs text-slate-400">{dateTime(p.created_at)}</span></span>
                      <StatusBadge status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {activity && (
            <section className="a-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-slate-900">Activity</h2>
                <Link href={`/admin/activity?entity=order&id=${order.id}`} className="text-xs font-medium text-brand-700 hover:underline">Full log</Link>
              </div>
              {activity.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No staff activity yet.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {activity.map((a) => (
                    <li key={a.id} className="text-sm">
                      <p className="font-sans text-slate-700">{a.description}</p>
                      <p className="text-xs text-slate-400">{a.user_name ?? "Customer"} · {dateTime(a.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="a-card p-5 text-xs text-slate-500">
            <h2 className="mb-2 text-sm font-medium text-slate-900">Technical</h2>
            <p>IP: <span className="font-mono">{order.ip_address ?? "—"}</span></p>
            <p className="mt-1 break-all">Device: {order.user_agent ?? "—"}</p>
            <p className="mt-1">Account: {order.user_id ? `Registered customer #${order.user_id}` : "Guest checkout"}</p>
            <p className="mt-1">Facebook click ID: {order.fbc ? "yes (from ad)" : "—"} · Browser ID: {order.fbp ? "yes" : "—"}</p>
          </section>

          <section className="a-card p-5">
            <h2 className="text-sm font-medium text-slate-900">Facebook Purchase event</h2>
            <p className="mt-1 text-sm">
              {order.pixel_purchase_sent_at
                ? <span className="text-emerald-700">Sent {dateTime(order.pixel_purchase_sent_at)}</span>
                : <span className="text-slate-500">Not sent{marketing.capiEnabled && marketing.purchaseTrigger !== "placed" ? ` — will be sent when the order is ${marketing.purchaseTrigger}` : ""}</span>}
            </p>
            {marketing.capiEnabled && can(admin, "marketing.manage")
              ? <ResendPurchaseButton id={order.id} sent={!!order.pixel_purchase_sent_at} />
              : <p className="mt-1 text-xs text-slate-400">Conversions API is off — set it up under Facebook Pixel.</p>}
          </section>
        </div>
      </div>
    </>
  );
}

