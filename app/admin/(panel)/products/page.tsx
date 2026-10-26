import Link from "next/link";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { mediaUrl } from "@/lib/data/catalog";
import { bdt } from "@/lib/store-config";
import { toggleProductFlag } from "@/app/actions/catalog";
import { EmptyState, PageHeader, Pagination, PanelSkeleton } from "@/components/admin/ui";
import { EditIcon, ExternalIcon, PlusIcon, SearchIcon, StarIcon } from "@/components/icons";

export const metadata = { title: "Products" };

const PER_PAGE = 25;
const VIEWS = [
  { key: "", label: "All" },
  { key: "live", label: "On store" },
  { key: "hidden", label: "Hidden" },
  { key: "featured", label: "Featured" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
] as const;

type Row = {
  id: number; name: string; slug: string; image: string | null; price: number; regular_price: number | null; stock: number;
  brand: string | null; sku: string | null; is_active: number; in_store: number; is_featured: number; category: string | null; sold: number;
};

export default function ProductsPage(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Products {...props} />
    </Suspense>
  );
}

async function Products({ searchParams }: PageProps<"/admin/products">) {
  await requirePermission("products.manage");
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = one("q").trim().slice(0, 80);
  const view = one("view");
  const cat = Number(one("category")) || 0;
  const page = Math.min(Math.max(1, Math.trunc(Number(one("page"))) || 1), 10000);

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (q) {
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (cat) { where.push("p.category_id = ?"); args.push(cat); }
  if (view === "live") where.push("p.is_active = 1 AND p.in_store = 1");
  if (view === "hidden") where.push("(p.is_active = 0 OR p.in_store = 0)");
  if (view === "featured") where.push("p.is_featured = 1");
  if (view === "low") where.push("p.stock BETWEEN 1 AND 5");
  if (view === "out") where.push("p.stock <= 0");
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows, total, cats, stats, landing] = await Promise.all([
    query<Row>(
      `SELECT p.id, p.name, p.slug, p.image, p.price, p.regular_price, p.stock, p.brand, p.sku, p.is_active, p.in_store, p.is_featured,
         c.name AS category,
         (SELECT COALESCE(SUM(i.quantity),0) FROM order_items i JOIN orders o ON o.id = i.order_id
           WHERE i.product_id = p.id AND o.status NOT IN ('cancelled','returned')) AS sold
       FROM products p LEFT JOIN categories c ON c.id = p.category_id ${w}
       ORDER BY p.sort_order, p.id DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`,
      args,
    ),
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM products p ${w}`, args),
    query<{ id: number; name: string }>("SELECT id, name FROM categories ORDER BY sort_order, name"),
    queryOne<{ total: number; live: number; low: number; out: number; value: number }>(
      `SELECT COUNT(*) AS total, SUM(is_active = 1 AND in_store = 1) AS live, SUM(stock BETWEEN 1 AND 5) AS low,
         SUM(stock <= 0) AS \`out\`, COALESCE(SUM(GREATEST(stock,0) * price),0) AS value FROM products`,
    ),
    query<{ product_id: number; n: number }>("SELECT product_id, COUNT(*) AS n FROM landing_pages WHERE product_id IS NOT NULL AND status <> 'archived' GROUP BY product_id"),
  ]);
  const onLanding = (id: number) => Number(landing.find((l) => Number(l.product_id) === id)?.n ?? 0);
  const pages = Math.max(1, Math.ceil(Number(total?.n ?? 0) / PER_PAGE));
  const href = (patch: Record<string, string | number>) => {
    const u = new URLSearchParams();
    const merged = { q, view, category: cat || "", page: 1, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1)) u.set(k, String(v));
    const s = u.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  const tiles = [
    { label: "Products", value: Number(stats?.total ?? 0), view: "" },
    { label: "Live on store", value: Number(stats?.live ?? 0), view: "live" },
    { label: "Low stock (≤5)", value: Number(stats?.low ?? 0), view: "low", warn: true },
    { label: "Out of stock", value: Number(stats?.out ?? 0), view: "out", warn: true },
  ];

  return (
    <>
      <PageHeader title="Products" description={`Stock value ${bdt(Number(stats?.value ?? 0))} · changes go live on the store instantly.`}
        actions={<Link href="/admin/products/new" className="a-btn"><PlusIcon className="size-4" /> Add product</Link>} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={href({ view: t.view })}
            className={`a-card p-4 transition hover:-translate-y-0.5 hover:shadow-md ${view === t.view ? "ring-2 ring-brand-500/40" : ""}`}>
            <p className="text-xs font-medium text-slate-500">{t.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${t.warn && t.value > 0 ? "text-amber-600" : "text-slate-900"}`}>{t.value}</p>
          </Link>
        ))}
      </div>

      <div className="a-card overflow-hidden">
        <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3 sm:p-4" action="/admin/products">
          <div className="relative min-w-0 flex-1 basis-56">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search name, SKU or brand…" className="a-input pl-9" />
          </div>
          <select name="category" defaultValue={cat || ""} className="a-input w-auto" aria-label="Category">
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="view" defaultValue={view} className="a-input w-auto" aria-label="Show">
            {VIEWS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
          </select>
          <button className="a-btn-outline">Filter</button>
          {(q || view || cat) ? <Link href="/admin/products" className="text-sm text-slate-500 hover:text-slate-900">Clear</Link> : null}
        </form>

        {rows.length === 0 ? (
          <EmptyState title="No products found" text="Try a different search or filter."
            action={<Link href="/admin/products/new" className="a-btn"><PlusIcon className="size-4" /> Add product</Link>} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Sold</th>
                    <th className="px-4 py-3 text-center">On store</th>
                    <th className="px-4 py-3 text-center">Featured</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((p) => (
                    <tr key={p.id} className="transition hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mediaUrl(p.image)} alt="" className="size-12 shrink-0 rounded-lg border border-slate-100 bg-white object-contain p-1" />
                          <div className="min-w-0">
                            <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium text-slate-900 hover:text-brand-700">{p.name}</Link>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                              {p.category ?? <span className="text-amber-600">No category</span>}
                              {p.brand && <span>· {p.brand}</span>}
                              {onLanding(p.id) > 0 && <span className="rounded bg-brand-50 px-1.5 py-px font-medium text-brand-700">{onLanding(p.id)} landing page{onLanding(p.id) > 1 ? "s" : ""}</span>}
                              {!p.is_active && <span className="rounded bg-rose-50 px-1.5 py-px font-medium text-rose-700">Disabled</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-medium text-slate-900">{bdt(p.price)}</span>
                        {p.regular_price && p.regular_price > p.price ? <span className="ml-1.5 text-xs text-slate-400 line-through">{bdt(p.regular_price)}</span> : null}
                      </td>
                      <td className="px-4 py-3"><StockPill stock={p.stock} /></td>
                      <td className="px-4 py-3 text-slate-600">{Number(p.sold)}</td>
                      <td className="px-4 py-3 text-center"><Toggle id={p.id} flag="in_store" on={!!p.in_store} label="Show on store" /></td>
                      <td className="px-4 py-3 text-center"><Toggle id={p.id} flag="is_featured" on={!!p.is_featured} label="Featured" star /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <a href={`/products/${p.slug}`} target="_blank" className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="View on store"><ExternalIcon className="size-4" /></a>
                          <Link href={`/admin/products/${p.id}`} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-700" aria-label="Edit"><EditIcon className="size-4" /></Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((p) => (
                <li key={p.id} className="flex gap-3 p-3">
                  <Link href={`/admin/products/${p.id}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(p.image)} alt="" className="size-16 rounded-xl border border-slate-100 bg-white object-contain p-1" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${p.id}`} className="line-clamp-2 text-sm font-medium leading-snug text-slate-900">{p.name}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{bdt(p.price)}</span>
                      <StockPill stock={p.stock} />
                      {onLanding(p.id) > 0 && <span className="rounded bg-brand-50 px-1.5 py-px font-medium text-brand-700">Landing</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">Store <Toggle id={p.id} flag="in_store" on={!!p.in_store} label="Show on store" /></span>
                      <span className="flex items-center gap-1.5">Featured <Toggle id={p.id} flag="is_featured" on={!!p.is_featured} label="Featured" star /></span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{Number(total?.n ?? 0)} product(s)</span>
          <Pagination page={page} pages={pages} href={(n) => href({ page: n })} />
        </div>
      </div>
    </>
  );
}

function StockPill({ stock }: { stock: number }) {
  const cls = stock <= 0 ? "bg-rose-50 text-rose-700 ring-rose-200" : stock <= 5 ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>{stock <= 0 ? "Out" : `${stock} in stock`}</span>;
}

function Toggle({ id, flag, on, label, star }: { id: number; flag: string; on: boolean; label: string; star?: boolean }) {
  return (
    <form action={toggleProductFlag} className="inline-flex">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="flag" value={flag} />
      {star ? (
        <button aria-pressed={on} aria-label={label} title={label}
          className={`grid size-8 place-items-center rounded-lg transition hover:bg-amber-50 ${on ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}>
          <StarIcon className="size-[18px]" />
        </button>
      ) : (
        <button role="switch" aria-checked={on} aria-label={label} title={label}
          className={`relative inline-flex h-6 w-10 items-center rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
          <span className={`size-5 rounded-full bg-white shadow transition ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
        </button>
      )}
    </form>
  );
}
