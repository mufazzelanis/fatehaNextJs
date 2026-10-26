"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  BagIcon, BellIcon, BoxIcon, BriefcaseIcon, CartIcon, ChevronDownIcon, ChevronsLeftIcon, ClockIcon, EditIcon, ExternalIcon, GridIcon, MenuIcon,
  PanelLeftIcon, PrinterIcon, SearchIcon, SettingsIcon, ShieldIcon, StoreIcon, TagIcon, TargetIcon, UserIcon, UsersIcon, WalletIcon, XIcon,
} from "../icons";

type NavItem = { href: string; label: string; short: string; icon: typeof GridIcon; exact?: boolean; group: string; keywords?: string };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", short: "Home", icon: GridIcon, exact: true, group: "", keywords: "home overview sales report" },
  { href: "/admin/orders", label: "Orders", short: "Orders", icon: BagIcon, group: "Sales", keywords: "order invoice courier delivery cod" },
  { href: "/admin/customers", label: "Customers", short: "Customers", icon: UsersIcon, group: "Sales", keywords: "customer phone block" },
  { href: "/admin/dealers", label: "Dealers", short: "Dealers", icon: BriefcaseIcon, group: "Sales", keywords: "dealer business target district thana union" },
  { href: "/admin/products", label: "Products", short: "Products", icon: BoxIcon, group: "Main site", keywords: "product stock price image" },
  { href: "/admin/categories", label: "Categories", short: "Categories", icon: TagIcon, group: "Main site", keywords: "category" },
  { href: "/admin/storefront", label: "Main Site Settings", short: "Site", icon: StoreIcon, group: "Main site", keywords: "storefront banner slider button color delivery charge announcement" },
  { href: "/admin/payments", label: "Payments", short: "Payments", icon: WalletIcon, group: "Main site", keywords: "bkash nagad rocket bank cod payment" },
  { href: "/admin/landings", label: "Landing Pages", short: "Landings", icon: EditIcon, group: "Landing pages", keywords: "landing page url content checkout form" },
  { href: "/admin/landing-settings", label: "Landing Settings", short: "Landing", icon: CartIcon, group: "Landing pages", keywords: "landing footer whatsapp call prefix" },
  { href: "/admin/notifications", label: "Email, SMS & OTP", short: "Notify", icon: BellIcon, group: "System", keywords: "smtp email sms otp gateway bulksms alert two factor 2fa sign-in code" },
  { href: "/admin/invoice-settings", label: "Invoice Settings", short: "Invoice", icon: PrinterIcon, group: "System", keywords: "invoice print pdf logo receipt" },
  { href: "/admin/pixel", label: "Facebook Pixel", short: "Pixel", icon: TargetIcon, group: "System", keywords: "facebook pixel conversion api capi meta" },
  { href: "/admin/users", label: "Users & Roles", short: "Users", icon: ShieldIcon, group: "System", keywords: "staff user role permission" },
  { href: "/admin/activity", label: "Activity Log", short: "Activity", icon: ClockIcon, group: "System", keywords: "log history audit" },
  { href: "/admin/settings", label: "General Settings", short: "Settings", icon: SettingsIcon, group: "System", keywords: "policy blocked number refund privacy terms" },
];

/** Items shown in the mobile bottom bar; the rest live in the "More" drawer. */
const BOTTOM = ["/admin", "/admin/orders", "/admin/products", "/admin/landings"];

const isActive = (pathname: string, href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

// ───────────── small client stores (shared by the desktop rail and the mobile drawer)

function createStore<T>(read: () => T, server: T) {
  const listeners = new Set<() => void>();
  let cache: { v: T } | null = null;
  return {
    subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; },
    get: () => (cache ??= { v: read() }).v,
    server: () => server,
    set(v: T) { cache = { v }; listeners.forEach((l) => l()); },
  };
}
function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

/** Desktop rail collapsed? Mirrors <html data-sb>, which an inline script sets before first paint. */
const collapsedStore = createStore(() => document.documentElement.dataset.sb === "collapsed", false);
export function setCollapsed(v: boolean) {
  if (v) document.documentElement.dataset.sb = "collapsed";
  else delete document.documentElement.dataset.sb;
  safe(() => localStorage.setItem("fb_sb", v ? "1" : "0"), undefined);
  collapsedStore.set(v);
}
const useCollapsed = () => useSyncExternalStore(collapsedStore.subscribe, collapsedStore.get, collapsedStore.server);

const EMPTY: string[] = [];
const groupsStore = createStore<string[]>(() => safe(() => JSON.parse(localStorage.getItem("fb_sb_groups") || "[]") as string[], EMPTY), EMPTY);
function toggleGroup(g: string) {
  const cur = groupsStore.get();
  const next = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
  safe(() => localStorage.setItem("fb_sb_groups", JSON.stringify(next)), undefined);
  groupsStore.set(next);
}
const useClosedGroups = () => useSyncExternalStore(groupsStore.subscribe, groupsStore.get, groupsStore.server);

type Badge = { count: number; tone: "rose" | "amber" | "slate"; title: string };
const NO_BADGES: Record<string, Badge> = {};
const badgeStore = createStore<Record<string, Badge>>(() => NO_BADGES, NO_BADGES);
let lastFetch = 0;
async function refreshBadges(force = false) {
  if (!force && Date.now() - lastFetch < 4000) return;
  lastFetch = Date.now();
  try {
    const r = await fetch("/admin/badges", { cache: "no-store" });
    if (r.ok) badgeStore.set(await r.json());
  } catch {}
}
/** Counts refresh on every page change, every minute and when the tab comes back into view. */
function useBadges() {
  const pathname = usePathname();
  const badges = useSyncExternalStore(badgeStore.subscribe, badgeStore.get, badgeStore.server);
  useEffect(() => { refreshBadges(); }, [pathname]);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) refreshBadges(true); }, 60_000);
    const onVis = () => { if (!document.hidden) refreshBadges(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return badges;
}

const TONE = {
  rose: "bg-rose-500 text-white",
  amber: "bg-amber-400 text-amber-950",
  slate: "bg-white/20 text-white",
} as const;

const norm = (s: string) => s.toLowerCase().trim();
const matches = (n: NavItem, q: string) => !q || norm(`${n.label} ${n.group} ${n.keywords ?? ""}`).includes(q);

// ───────────── pieces

/** Small spinner shown inside a link while its route is loading. */
function PendingDot({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={`size-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent transition-opacity ${
      pending ? "animate-spin opacity-70" : "opacity-0"} ${className}`} />
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex min-w-0 items-center gap-3 px-1.5 sb-mini:justify-center sb-mini:px-0">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-lg shadow-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon.webp" alt="" className="size-8 object-contain" />
      </span>
      <span className="min-w-0 font-ui leading-tight sb-mini:hidden">
        <span className="block truncate text-[15px] font-semibold text-white">FatehaBD</span>
        <span className="block truncate text-xs text-brand-200/70">Admin Console</span>
      </span>
    </Link>
  );
}

function NavItemLink({ item, active, badge, onNavigate }: { item: NavItem; active: boolean; badge?: Badge; onNavigate?: () => void }) {
  const Icon = item.icon;
  const count = badge ? (badge.count > 99 ? "99+" : String(badge.count)) : "";
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} title={badge ? `${item.label} — ${badge.count} ${badge.title.toLowerCase()}` : item.label}
      className={`group/item relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 sb-mini:justify-center sb-mini:px-0 ${
        active ? "bg-white/10 text-white shadow-inner" : "text-brand-100/70 hover:bg-white/5 hover:text-white"}`}>
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-300" />}
      <span className="relative shrink-0">
        <Icon className={`size-5 transition ${active ? "text-brand-300" : "text-brand-100/50 group-hover/item:text-brand-200"}`} />
        {badge && (
          <span className={`absolute -right-2.5 -top-2 hidden h-4 min-w-4 place-items-center rounded-full px-1 text-[9.5px] font-bold leading-none ring-2 ring-brand-950 sb-mini:grid ${TONE[badge.tone]}`}>
            {count}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate whitespace-nowrap sb-mini:hidden">{item.label}</span>
      {badge && <span className={`rounded-full px-2 py-px text-[11px] font-bold tabular-nums sb-mini:hidden ${TONE[badge.tone]}`}>{count}</span>}
      <PendingDot className="text-brand-200 sb-mini:hidden" />
    </Link>
  );
}

function NavLinks({ onNavigate, allowed, query }: { onNavigate?: () => void; allowed: string[]; query: string }) {
  const pathname = usePathname();
  const closed = useClosedGroups();
  const badges = useBadges();
  const q = norm(query);
  const items = NAV.filter((n) => allowed.includes(n.href) && matches(n, q));
  const groups = [...new Set(items.map((n) => n.group))];

  if (!items.length) return <p className="px-3 py-6 text-center text-xs text-brand-100/50 sb-mini:hidden">No menu item matches “{query}”.</p>;

  return (
    <nav className="space-y-0.5" aria-label="Admin menu">
      {groups.map((g) => {
        const list = items.filter((n) => n.group === g);
        const hasActive = list.some((n) => isActive(pathname, n.href, n.exact));
        // The group with the current page, and every group while searching, stays open.
        const open = !g || !!q || hasActive || !closed.includes(g);
        const waiting = open ? 0 : list.reduce((s, n) => s + (badges[n.href]?.count ?? 0), 0);
        return (
          <div key={g || "top"}>
            {g && (
              <>
                <button type="button" onClick={() => { if (!hasActive && !q) toggleGroup(g); }} aria-expanded={open}
                  title={hasActive ? "This section is open because you are on one of its pages" : open ? `Hide ${g}` : `Show ${g}`}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-brand-200/45 transition hover:text-brand-100 sb-mini:hidden">
                  <span className="flex-1 truncate">{g}</span>
                  {waiting > 0 && <span className="rounded-full bg-rose-500/90 px-1.5 text-[10px] font-bold normal-case tracking-normal text-white">{waiting}</span>}
                  <ChevronDownIcon className={`size-3.5 transition-transform duration-300 ${open ? "" : "-rotate-90"} ${hasActive ? "opacity-30" : ""}`} />
                </button>
                <div className="mx-2 my-2 hidden h-px bg-white/10 sb-mini:block" />
              </>
            )}
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out sb-mini:grid-rows-[1fr] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="min-h-0 space-y-0.5 overflow-hidden">
                {list.map((n) => (
                  <NavItemLink key={n.href} item={n} active={isActive(pathname, n.href, n.exact)} badge={badges[n.href]} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function StaticNav({ allowed }: { allowed: string[] }) {
  return (
    <nav className="space-y-0.5">
      {NAV.filter((n) => allowed.includes(n.href)).map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-100/70 sb-mini:justify-center sb-mini:px-0">
          <Icon className="size-5 shrink-0 text-brand-100/50" />
          <span className="truncate sb-mini:hidden">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MenuSearch({ value, onChange, onEnter, inputRef }: {
  value: string; onChange: (v: string) => void; onEnter: () => void; inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-100/40 sb-mini:left-1/2 sb-mini:-translate-x-1/2" />
      <input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} type="search" aria-label="Search the menu" placeholder="Search menu…"
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onEnter(); }
          if (e.key === "Escape") { onChange(""); e.currentTarget.blur(); }
        }}
        className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-14 text-sm text-white outline-none transition placeholder:text-brand-100/40 focus:border-brand-300/50 focus:bg-white/10 sb-mini:cursor-pointer sb-mini:px-0 sb-mini:text-transparent sb-mini:placeholder:text-transparent [&::-webkit-search-cancel-button]:hidden" />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/15 px-1.5 py-0.5 font-sans text-[10px] text-brand-100/50 lg:block sb-mini:hidden">Ctrl K</kbd>
    </div>
  );
}

function SidebarBody({ onNavigate, footer, allowed, rail = false, searchRef }: {
  onNavigate?: () => void; footer: ReactNode; allowed: string[]; rail?: boolean; searchRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const collapsed = useCollapsed();
  const first = useMemo(() => {
    const q = norm(query);
    return q ? NAV.find((n) => allowed.includes(n.href) && matches(n, q)) : undefined;
  }, [query, allowed]);
  const footLink = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-100/70 transition hover:bg-white/5 hover:text-white sb-mini:justify-center sb-mini:px-0";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 pb-4 pt-4 sb-mini:px-2">
        <div className="min-w-0 flex-1"><Brand /></div>
        {rail && (
          <button type="button" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Keep the menu open (Ctrl+B)" : "Collapse the menu (Ctrl+B)"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-pressed={collapsed}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-brand-100/50 transition hover:bg-white/10 hover:text-white sb-mini:hidden">
            <ChevronsLeftIcon className={`size-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      <div className="px-4 pb-3 sb-mini:px-3">
        <MenuSearch value={query} onChange={setQuery} inputRef={searchRef}
          onEnter={() => { if (first) { router.push(first.href); setQuery(""); searchRef?.current?.blur(); onNavigate?.(); } }} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 scrollbar-thin sb-mini:px-3">
        <Suspense fallback={<StaticNav allowed={allowed} />}>
          <NavLinks onNavigate={() => { setQuery(""); onNavigate?.(); }} allowed={allowed} query={query} />
        </Suspense>
      </div>
      <div className="space-y-0.5 border-t border-white/10 px-4 py-3 sb-mini:px-3">
        <Link href="/admin/account" onClick={onNavigate} title="My account" className={footLink}>
          <UserIcon className="size-5 shrink-0 text-brand-100/50" /> <span className="truncate sb-mini:hidden">My account</span>
        </Link>
        <a href="/" target="_blank" title="View store" className={footLink}>
          <ExternalIcon className="size-5 shrink-0 text-brand-100/50" /> <span className="truncate sb-mini:hidden">View store</span>
        </a>
        {footer}
        {rail && (
          <button type="button" onClick={() => setCollapsed(false)} className={`${footLink} hidden w-full sb-collapsed:flex`} title="Keep the menu open (Ctrl+B)">
            <PanelLeftIcon className="size-5 shrink-0 text-brand-100/50" /> <span className="truncate sb-mini:hidden">Keep menu open</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Ctrl/⌘+B toggles the rail, Ctrl/⌘+K jumps to the menu search (desktop). */
function useShortcuts(searchRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      if (!window.matchMedia("(min-width: 64rem)").matches) return;
      const key = e.key.toLowerCase();
      if (key === "b" && !(e.target as HTMLElement | null)?.isContentEditable) {
        e.preventDefault();
        setCollapsed(!collapsedStore.get());
      } else if (key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchRef]);
}

export function AdminSidebar({ footer, allowed }: { footer: ReactNode; allowed: string[] }) {
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcuts(searchRef);
  return (
    <aside aria-label="Sidebar"
      className="sb-rail no-print fixed inset-y-0 left-0 z-30 hidden overflow-hidden bg-brand-950 bg-[radial-gradient(120%_60%_at_0%_0%,rgb(18_184_107/0.18),transparent)] lg:block">
      <div className="h-full w-64 sb-mini:w-full">
        <SidebarBody footer={footer} allowed={allowed} rail searchRef={searchRef} />
      </div>
    </aside>
  );
}

/** Header button (desktop) that collapses / expands the sidebar. */
export function SidebarToggle() {
  const collapsed = useCollapsed();
  return (
    <button type="button" onClick={() => setCollapsed(!collapsed)} aria-pressed={collapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`}
      className="hidden size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-xs transition hover:border-slate-300 hover:text-slate-900 active:scale-95 lg:grid">
      <PanelLeftIcon className="size-4.5" />
    </button>
  );
}

const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

/** Slide-in drawer, portalled to <body> so no ancestor (e.g. a blurred header) can clip it. */
function Drawer({ open, onClose, footer, allowed }: { open: boolean; onClose: () => void; footer: ReactNode; allowed: string[] }) {
  const mounted = useMounted();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={onClose}
        className={`absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      <aside role="dialog" aria-modal="true" aria-label="Admin menu"
        className={`absolute inset-y-0 left-0 w-[82%] max-w-72 bg-brand-950 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? "translate-x-0" : "-translate-x-full"}`}>
        <button type="button" onClick={onClose} aria-label="Close menu"
          className="absolute right-3 top-4 z-10 grid size-9 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white">
          <XIcon className="size-5" />
        </button>
        <SidebarBody onNavigate={onClose} footer={footer} allowed={allowed} />
      </aside>
    </div>,
    document.body,
  );
}

export function MobileNav({ footer, allowed }: { footer: ReactNode; allowed: string[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu"
        className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition active:scale-95 lg:hidden">
        <MenuIcon className="size-5" />
      </button>
      <Drawer open={open} onClose={close} footer={footer} allowed={allowed} />
      <Suspense>
        <BottomBar onMore={() => setOpen(true)} allowed={allowed} />
      </Suspense>
    </>
  );
}

/** App-style tab bar for phones. */
function BottomBar({ onMore, allowed }: { onMore: () => void; allowed: string[] }) {
  const pathname = usePathname();
  const mounted = useMounted();
  const badges = useBadges();
  // Preferred tabs the user may open, topped up with their other sections.
  const permitted = NAV.filter((n) => allowed.includes(n.href));
  const items = [...permitted.filter((n) => BOTTOM.includes(n.href)), ...permitted.filter((n) => !BOTTOM.includes(n.href))].slice(0, 4);
  const moreActive = !items.some((n) => isActive(pathname, n.href, n.exact));
  const moreBadge = permitted.some((n) => !items.includes(n) && badges[n.href]);
  if (!mounted) return null;

  const tab = (active: boolean) =>
    `relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition active:scale-95 ${active ? "text-brand-700" : "text-slate-500"}`;
  const bar = (active: boolean) =>
    `absolute top-0 h-0.5 w-8 rounded-full bg-brand-600 transition-all duration-300 ${active ? "opacity-100" : "scale-x-0 opacity-0"}`;
  const pill = (active: boolean) => `relative grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? "bg-brand-50" : ""}`;

  return createPortal(
    <nav aria-label="Admin sections"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(15_23_42/0.06)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, short, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          const b = badges[href];
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={tab(active)}>
              <span className={bar(active)} />
              <span className={pill(active)}>
                <Icon className="size-5" />
                {b && (
                  <span className={`absolute -top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9.5px] font-bold leading-none ring-2 ring-white ${TONE[b.tone === "slate" ? "amber" : b.tone]}`}>
                    {b.count > 99 ? "99+" : b.count}
                  </span>
                )}
              </span>
              {short}
            </Link>
          );
        })}
        <button type="button" onClick={onMore} className={tab(moreActive)}>
          <span className={bar(moreActive)} />
          <span className={pill(moreActive)}>
            <MenuIcon className="size-5" />
            {moreBadge && <span className="absolute -top-0.5 right-2.5 size-2 rounded-full bg-rose-500 ring-2 ring-white" />}
          </span>
          More
        </button>
      </div>
    </nav>,
    document.body,
  );
}

/** Current section name for the mobile header. */
export function SectionTitle() {
  const pathname = usePathname();
  const item = [...NAV].sort((a, b) => b.href.length - a.href.length).find((n) => isActive(pathname, n.href, n.exact));
  return <span className="truncate text-[15px] font-semibold text-slate-900">{item?.label ?? "Admin"}</span>;
}
