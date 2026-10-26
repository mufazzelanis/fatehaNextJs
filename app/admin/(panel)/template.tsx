/** Re-mounts on every navigation, so each admin page eases in. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
