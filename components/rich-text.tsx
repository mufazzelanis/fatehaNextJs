import { Fragment } from "react";

/** Renders admin-written text: keeps line breaks, turns **text** into bold and {price} into the price. */
export function RichText({ text, price }: { text: string; price?: string }) {
  const value = price ? text.replaceAll("{price}", price) : text;
  const parts = value.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <b key={i}>{part.slice(2, -2)}</b>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
