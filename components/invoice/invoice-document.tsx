import { INVOICE_LABELS, type InvoiceProfile } from "@/lib/invoice";
import { money } from "@/lib/format";

/** Everything an invoice shows — built from an order on the server, or from sample data in the settings preview. */
export type InvoiceData = {
  orderNo: string;
  date: string;
  customer: string;
  phone: string;
  address: string;
  area: string | null;
  items: { name: string; price: number; qty: number; total: number }[];
  subtotal: number;
  shipping: number;
  shippingLabel: string;
  discount: number;
  total: number;
  payment: { method: string; status: string; paid: boolean; trx: string | null; sender: string | null };
  note: string | null;
  extra: { label: string; value: string }[];
  source: string;
};

const PAPER = {
  a4: { box: "w-full max-w-[794px] p-10 text-[13px]", page: "inv-a4" },
  a5: { box: "w-full max-w-[560px] p-7 text-[11.5px]", page: "inv-a5" },
  pos80: { box: "w-[302px] p-3 text-[11px]", page: "inv-pos" },
} as const;

/** Print rules: every paper size gets its own named @page, so one batch can mix A4 and 80mm receipts. */
export const INVOICE_PRINT_CSS = `
@page inv-a4 { size: A4; margin: 10mm; }
@page inv-a5 { size: A5; margin: 8mm; }
@page inv-pos { size: 80mm auto; margin: 3mm; }
.inv-a4 { page: inv-a4; } .inv-a5 { page: inv-a5; } .inv-pos { page: inv-pos; }
@media print { .inv-doc { box-shadow: none !important; margin: 0 auto !important; break-after: page; } }
`;

export function InvoiceDocument({ profile: p, data: d, nameOverride, defaultLogo }: {
  profile: InvoiceProfile; data: InvoiceData; nameOverride?: string | null; defaultLogo?: string | null;
}) {
  const L = INVOICE_LABELS[p.lang];
  const paper = PAPER[p.paper];
  const pos = p.paper === "pos80";
  const logo = p.showLogo ? (p.logo ? `/media/${p.logo}` : defaultLogo ?? null) : null;
  const company = nameOverride || p.companyName;
  const contact = [p.phone, p.email, p.website].filter(Boolean);
  const amountLabel = d.payment.paid ? L.paid : L.collect;

  if (pos) {
    return (
      <article className={`inv-doc ${paper.page} ${paper.box} mx-auto bg-white font-sans text-black shadow-sm`}>
        <header className="border-b border-dashed border-black pb-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" className="mx-auto mb-1 h-10 w-auto object-contain grayscale" />}
          <p className="text-[14px] font-bold">{company}</p>
          {p.tagline && <p>{p.tagline}</p>}
          {p.address && <p>{p.address}</p>}
          {contact.length > 0 && <p>{contact.join(" · ")}</p>}
          <p className="mt-1.5 font-bold uppercase">{p.title}</p>
        </header>
        <div className="space-y-0.5 border-b border-dashed border-black py-2">
          <p className="flex justify-between"><span>{L.invoiceNo}</span><b>#{d.orderNo}</b></p>
          <p className="flex justify-between"><span>{L.date}</span><span>{d.date}</span></p>
          {p.showOrderSource && <p className="flex justify-between"><span>{L.source}</span><span>{d.source}</span></p>}
        </div>
        <div className="border-b border-dashed border-black py-2">
          <p className="font-bold">{d.customer}</p>
          <p>{d.phone}</p>
          <p>{d.address}</p>
          {d.area && <p>{d.area}</p>}
        </div>
        <table className="w-full border-b border-dashed border-black">
          <tbody>
            {d.items.map((i, k) => (
              <tr key={k} className="align-top">
                <td className="py-1 pr-1">{i.name}<br /><span className="text-[10px]">{money(i.price)} × {i.qty}</span></td>
                <td className="py-1 text-right">{money(i.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="space-y-0.5 py-2">
          <div className="flex justify-between"><dt>{L.subtotal}</dt><dd>{money(d.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>{L.delivery}</dt><dd>{money(d.shipping)}</dd></div>
          {d.discount > 0 && <div className="flex justify-between"><dt>{L.discount}</dt><dd>−{money(d.discount)}</dd></div>}
          <div className="flex justify-between border-t border-black pt-1 text-[13px] font-bold"><dt>{amountLabel}</dt><dd>{money(d.total)}</dd></div>
        </dl>
        {p.showPaymentInfo && <p className="border-t border-dashed border-black pt-1.5">{L.payment}: {d.payment.method}{d.payment.trx ? ` · ${d.payment.trx}` : ""}</p>}
        {p.showCustomerNote && d.note && <p className="mt-1">{L.note}: {d.note}</p>}
        {p.footerNote && <p className="mt-2 text-center font-semibold">{p.footerNote}</p>}
      </article>
    );
  }

  return (
    <article className={`inv-doc ${paper.page} ${paper.box} mx-auto bg-white font-sans text-slate-800 shadow-sm`}>
      <div className="h-1.5 -mx-px -mt-px mb-6 rounded-t" style={{ background: p.accent }} />
      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" className="h-12 w-auto max-w-40 object-contain" />}
          <div className="min-w-0">
            <p className="text-[1.6em] font-bold leading-tight" style={{ color: p.accent }}>{company}</p>
            {p.tagline && <p className="text-slate-500">{p.tagline}</p>}
            {p.address && <p className="text-slate-500">{p.address}</p>}
            {contact.length > 0 && <p className="text-slate-500">{contact.join(" · ")}</p>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[1.5em] font-bold uppercase tracking-wider text-slate-900">{p.title}</p>
          <p className="text-slate-600">{L.invoiceNo}: <b className="text-slate-900">#{d.orderNo}</b></p>
          <p className="text-slate-500">{L.date}: {d.date}</p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-6 rounded-lg bg-slate-50 p-4">
        <div>
          <p className="text-[0.8em] font-semibold uppercase tracking-wide text-slate-400">{L.billTo}</p>
          <p className="mt-1 text-[1.15em] font-semibold text-slate-900">{d.customer}</p>
          <p>{d.phone}</p>
          <p className="text-slate-600">{d.address}</p>
          {d.area && <p className="text-slate-600">{L.area}: {d.area}</p>}
        </div>
        <div className="text-right">
          {p.showPaymentInfo && (
            <>
              <p className="text-[0.8em] font-semibold uppercase tracking-wide text-slate-400">{L.payment}</p>
              <p className="mt-1 font-semibold text-slate-900">{d.payment.method}</p>
              <p className="text-slate-600">{L.status}: {d.payment.status}</p>
              {d.payment.trx && <p className="text-slate-600">{L.trx}: <span className="font-mono">{d.payment.trx}</span></p>}
            </>
          )}
          <p className="text-slate-600">{L.delivery}: {d.shippingLabel}</p>
          {p.showOrderSource && <p className="text-slate-600">{L.source}: {d.source}</p>}
        </div>
      </section>

      <table className="mt-6 w-full">
        <thead>
          <tr className="text-left text-white" style={{ background: p.accent }}>
            <th className="px-3 py-2 font-semibold">{L.item}</th>
            <th className="px-3 py-2 text-right font-semibold">{L.price}</th>
            <th className="px-3 py-2 text-right font-semibold">{L.qty}</th>
            <th className="px-3 py-2 text-right font-semibold">{L.total}</th>
          </tr>
        </thead>
        <tbody>
          {d.items.map((i, k) => (
            <tr key={k} className="border-b border-slate-100">
              <td className="px-3 py-2">{i.name}</td>
              <td className="px-3 py-2 text-right">{money(i.price)}</td>
              <td className="px-3 py-2 text-right">{i.qty}</td>
              <td className="px-3 py-2 text-right">{money(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-1 text-slate-600">
          {p.showExtraFields && d.extra.map((x) => <p key={x.label}><span className="text-slate-400">{x.label}:</span> {x.value}</p>)}
          {p.showCustomerNote && d.note && <p className="rounded bg-slate-50 p-2">{L.note}: {d.note}</p>}
        </div>
        <dl className="w-60 shrink-0 space-y-1">
          <div className="flex justify-between"><dt className="text-slate-500">{L.subtotal}</dt><dd>{money(d.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">{L.delivery}</dt><dd>{money(d.shipping)}</dd></div>
          {d.discount > 0 && <div className="flex justify-between"><dt className="text-slate-500">{L.discount}</dt><dd>− {money(d.discount)}</dd></div>}
          <div className="flex justify-between rounded px-2 py-1.5 text-[1.15em] font-bold text-white" style={{ background: p.accent }}>
            <dt>{amountLabel}</dt><dd>{money(d.total)}</dd>
          </div>
        </dl>
      </div>

      {(p.terms || p.showSignature) && (
        <div className="mt-8 flex items-end justify-between gap-8">
          <p className="max-w-md whitespace-pre-line text-[0.85em] text-slate-500">{p.terms}</p>
          {p.showSignature && <p className="w-44 shrink-0 border-t border-slate-400 pt-1 text-center text-[0.85em] text-slate-500">{L.signature}</p>}
        </div>
      )}
      {p.footerNote && <p className="mt-8 text-center text-[0.9em] font-medium" style={{ color: p.accent }}>{p.footerNote}</p>}
    </article>
  );
}
