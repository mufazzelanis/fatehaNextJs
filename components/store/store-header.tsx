"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { openDrawer, useCart, useWishlist } from "./cart-store";
import { bdt } from "@/lib/store-config";
import { sized } from "@/lib/media";
import { BagIcon, ChevronRightIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon, XIcon } from "../icons";

type Cat = { name: string; slug: string; products: number };
type Suggestion = { id: number; name: string; slug: string; price: number; image: string; category: string | null };

function SearchBox({ autoFocus = false, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const term = q.trim();
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      if (term.length < 2) { setItems([]); return; }
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json()).then((d: Suggestion[]) => { setItems(d); setActive(-1); }).catch(() => {});
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (href: string) => { setOpen(false); onDone?.(); router.push(href); };

  return (
    <div ref={box} className="relative w-full">
      <form role="search" onSubmit={(e) => { e.preventDefault(); const it = items[active]; go(it ? `/products/${it.slug}` : `/shop?q=${encodeURIComponent(q.trim())}`); }}
        className="flex h-11 overflow-hidden rounded-xl border-2 border-fb-500 bg-white transition focus-within:shadow-[0_0_0_4px_rgb(18_179_184/0.15)]">
        <input value={q} autoFocus={autoFocus} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search in Fatehabd" aria-label="Search products" role="combobox" aria-expanded={open && items.length > 0} aria-controls={listId} aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-ink outline-none placeholder:text-slate-400" />
        <button type="submit" aria-label="Search" className="grid w-14 place-items-center bg-fb-500 text-white transition hover:bg-fb-600">
          <SearchIcon className="size-5" />
        </button>
      </form>
      {open && q.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 animate-fade-in">
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-600">No products found for “{q.trim()}”</p>
          ) : (
            <ul role="listbox" id={listId}>
              {items.map((it, i) => (
                <li key={it.id} role="option" aria-selected={i === active}>
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/products/${it.slug}`)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${i === active ? "bg-fb-50" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sized(it.image, 96)} alt="" width={44} height={44} className="size-11 shrink-0 rounded-lg bg-slate-50 object-contain" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-medium text-ink">{it.name}</span>
                      <span className="text-xs text-slate-600">{it.category}</span>
                    </span>
                    <span className="text-sm font-semibold text-fb-700">{bdt(it.price)}</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)}
                  className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-fb-700 hover:bg-fb-50">
                  See all results <ChevronRightIcon className="size-4" />
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function StoreHeader({ categories, announcement }: { categories: Cat[]; announcement: string }) {
  const { count, subtotal } = useCart();
  const wish = useWishlist();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menu]);

  return (
    <>
      {announcement && (
        <div className="bg-ink text-center text-[12.5px] text-white/85">
          <p className="mx-auto max-w-7xl truncate px-4 py-1.5">{announcement}</p>
        </div>
      )}
      <header className={`sticky top-0 z-40 bg-white transition-shadow ${scrolled ? "shadow-lg shadow-slate-900/5" : ""}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 lg:h-[76px]">
          <button type="button" onClick={() => setMenu(true)} className="grid size-10 place-items-center rounded-lg text-ink lg:hidden" aria-label="Open menu">
            <MenuIcon className="size-6" />
          </button>
          <Link href="/" className="shrink-0" aria-label="Fatehabd home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/fatehabd-logo.webp" alt="FatehaBD" width={729} height={121} className="h-7 w-auto sm:h-9" />
          </Link>
          <div className="hidden flex-1 md:block lg:mx-6">
            <SearchBox />
          </div>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link href="/wishlist" className="relative hidden size-11 place-items-center rounded-xl text-ink transition hover:bg-slate-100 sm:grid" aria-label={`Wishlist (${wish.length})`}>
              <HeartIcon className="size-6" />
              {wish.length > 0 && <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{wish.length}</span>}
            </Link>
            <button type="button" onClick={openDrawer} className="relative flex h-11 items-center gap-2 rounded-xl px-2 text-ink transition hover:bg-slate-100 sm:px-3">
              <span className="relative">
                <span className="sr-only lg:hidden">Cart</span>
                <BagIcon className="size-6" aria-hidden />
                {count > 0 && <span key={count} className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-fb-500 px-1 text-[10px] font-bold text-white animate-fade-in">{count}</span>}
              </span>
              <span className="hidden text-left leading-tight lg:block">
                <span className="block text-[11px] text-slate-600">My cart</span>
                <span className="block text-sm font-semibold">{bdt(subtotal)}</span>
              </span>
            </button>
            <Link href="/account" className="hidden h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-ink transition hover:bg-slate-100 sm:flex" aria-label="My account">
              <UserIcon className="size-6" /><span className="hidden xl:inline">Account</span>
            </Link>
          </nav>
        </div>
        <div className="px-4 pb-3 md:hidden"><SearchBox /></div>
        <div className="hidden bg-fb-500 lg:block">
          <div className="mx-auto flex h-11 max-w-7xl items-center gap-1 px-4 text-[13.5px] font-semibold text-white">
            <Link href="/shop" className={`rounded-md px-3 py-1.5 transition hover:bg-white/15 ${pathname === "/shop" ? "bg-white/20" : ""}`}>All Products</Link>
            {categories.map((c) => {
              const href = `/shop/category/${c.slug}`;
              return (
                <Link key={c.slug} href={href} className={`rounded-md px-3 py-1.5 transition hover:bg-white/15 ${pathname === href ? "bg-white/20" : ""}`}>{c.name}</Link>
              );
            })}
            <div className="ml-auto flex items-center gap-1">
              <Link href="/track" className="rounded-md px-3 py-1.5 transition hover:bg-white/15">Track Order</Link>
              <Link href="/business" className="rounded-md px-3 py-1.5 transition hover:bg-white/15">Become a Dealer</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-50 lg:hidden ${menu ? "" : "pointer-events-none"}`} inert={!menu}>
        <div onClick={() => setMenu(false)} className={`absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 ${menu ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute inset-y-0 left-0 flex w-[84%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${menu ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/fatehabd-logo.webp" alt="FatehaBD" width={729} height={121} className="h-7 w-auto" />
            <button type="button" onClick={() => setMenu(false)} className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Close menu">
              <XIcon className="size-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3" onClick={() => setMenu(false)}>
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Shop</p>
            <Link href="/shop" className="flex items-center justify-between rounded-xl px-3 py-3 font-medium text-ink hover:bg-fb-50">All Products <ChevronRightIcon className="size-4 text-slate-400" /></Link>
            {categories.map((c) => (
              <Link key={c.slug} href={`/shop/category/${c.slug}`} className="flex items-center justify-between rounded-xl px-3 py-3 font-medium text-ink hover:bg-fb-50">
                {c.name} <span className="text-xs text-slate-400">{c.products}</span>
              </Link>
            ))}
            <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Help</p>
            {[["/track", "Track your order"], ["/wishlist", "Wishlist"], ["/account", "My account"], ["/business", "Become a dealer"], ["/faq", "FAQ"], ["/contact", "Contact us"]].map(([href, label]) => (
              <Link key={href} href={href} className="flex items-center justify-between rounded-xl px-3 py-3 text-ink hover:bg-fb-50">{label} <ChevronRightIcon className="size-4 text-slate-400" /></Link>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
