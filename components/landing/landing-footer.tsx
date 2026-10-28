import { cacheLife } from "next/cache";

async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

/** Footer used by landing pages and the landing thank-you page — just the name, no links that lead visitors away from ordering. */
export function LandingFooter({ narrow = false, name }: { narrow?: boolean; name: string }) {
  return (
    <footer className="border-t border-[#e2e8f0] bg-[#f3f6f9] font-ui">
      <div className={`mx-auto flex ${narrow ? "max-w-[575px]" : "max-w-[940px]"} flex-col items-center justify-center px-4 py-6 text-center text-[13px]`}>
        <p className="font-semibold text-[#525f73]">© <CurrentYear /> {name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
