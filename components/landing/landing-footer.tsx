import Link from "next/link";
import { cacheLife } from "next/cache";

async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

/** Footer used by landing pages and the landing thank-you page (matches the original design). */
export function LandingFooter({ narrow = false, name }: { narrow?: boolean; name: string }) {
  return (
    <footer className="border-t border-[#e2e8f0] bg-[#f3f6f9] font-ui">
      <div className={`mx-auto flex ${narrow ? "max-w-[575px]" : "max-w-[940px]"} flex-col items-center justify-between gap-3 px-4 py-6 text-[12.5px] sm:flex-row`}>
        <p className="font-semibold text-[#525f73]">© <CurrentYear /> {name}. All rights reserved.</p>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[#475569]">
          <Link href="/refund-policy" className="hover:text-[#4a5bff]">Refund policy</Link>
          <Link href="/privacy-policy" className="hover:text-[#4a5bff]">Privacy policy</Link>
          <Link href="/terms-of-service" className="hover:text-[#4a5bff]">Terms of service</Link>
          <Link href="/track" className="hover:text-[#4a5bff]">Track order</Link>
          <Link href="/account" className="hover:text-[#4a5bff]">My account</Link>
        </nav>
      </div>
    </footer>
  );
}
