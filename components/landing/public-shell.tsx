import type { ReactNode } from "react";
import { StoreShell } from "../store/store-shell";

/** Account, tracking and policy pages use the FatehaBD storefront chrome. */
export async function PublicShell({ children }: { children: ReactNode }) {
  return <StoreShell>{children}</StoreShell>;
}
