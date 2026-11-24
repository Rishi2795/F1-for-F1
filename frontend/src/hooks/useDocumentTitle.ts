import { useEffect } from "react";

const SUFFIX = "F1 for F1";

/** Set the browser tab title for the current page. */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} · Formula 1 strategy analytics`;
  }, [title]);
}
