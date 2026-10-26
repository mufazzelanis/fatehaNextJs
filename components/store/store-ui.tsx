"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { buttonVars, DEFAULT_BUTTONS, type StoreButtons } from "@/lib/store-config";

const ButtonsContext = createContext<StoreButtons>(DEFAULT_BUTTONS);

/** Admin-editable button labels/layout; colours are exposed as CSS variables on the wrapper. */
export function StoreUIProvider({ buttons, children, className }: { buttons: StoreButtons; children: ReactNode; className?: string }) {
  return (
    <ButtonsContext value={buttons}>
      <div className={className} style={buttonVars(buttons) as CSSProperties}>{children}</div>
    </ButtonsContext>
  );
}

export const useButtons = () => useContext(ButtonsContext);
