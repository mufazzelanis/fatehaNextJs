"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BagIcon, UserIcon } from "@/components/icons";

const TABS = [
  { href: "/account", label: "আমার অর্ডার", icon: BagIcon },
  { href: "/account/profile", label: "প্রোফাইল", icon: UserIcon },
];

export function AccountTabs() {
  const pathname = usePathname();
  return (
    <nav className="mt-6 flex gap-1 rounded-2xl bg-slate-100 p-1 sm:mt-8">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition sm:flex-none ${
              active ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
            <Icon className="size-5" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
