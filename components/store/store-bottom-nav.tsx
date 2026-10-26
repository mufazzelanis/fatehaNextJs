"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openDrawer, useCart, useWishlist } from "./cart-store";
import { BagIcon, GridIcon, HeartIcon, HomeIcon, UserIcon } from "../icons";

/** App-style tab bar for phones. */
export function StoreBottomNav() {
  const pathname = usePathname();
  const { count } = useCart();
  const wish = useWishlist();
  const tab = (active: boolean) =>
    `relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition active:scale-95 ${active ? "text-fb-700" : "text-slate-600"}`;
  const items = [
    { href: "/", label: "Home", icon: HomeIcon, active: pathname === "/" },
    { href: "/shop", label: "Shop", icon: GridIcon, active: pathname.startsWith("/shop") },
    { href: "/wishlist", label: "Wishlist", icon: HeartIcon, active: pathname === "/wishlist", badge: wish.length },
    { href: "/account", label: "Account", icon: UserIcon, active: pathname.startsWith("/account") },
  ];

  return (
    <nav aria-label="Store" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(15_23_42/0.06)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.slice(0, 2).map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} className={tab(active)} aria-current={active ? "page" : undefined}>
            <Icon className="size-6" />{label}
          </Link>
        ))}
        <button type="button" onClick={openDrawer} className="relative -mt-5 flex flex-col items-center gap-0.5 text-[11px] font-medium text-slate-600">
          <span className="relative grid size-14 place-items-center rounded-full bg-fb-500 text-white shadow-lg shadow-fb-500/40 ring-4 ring-white">
            <BagIcon className="size-6" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold">{count}</span>}
          </span>
          Cart
        </button>
        {items.slice(2).map(({ href, label, icon: Icon, active, badge }) => (
          <Link key={href} href={href} className={tab(active)} aria-current={active ? "page" : undefined}>
            <span className="relative">
              <Icon className="size-6" />
              {!!badge && <span className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{badge}</span>}
            </span>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
