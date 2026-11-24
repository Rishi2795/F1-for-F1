import type { SyntheticEvent } from "react";

/** For third-party images we do not control: if one fails (blocked hotlink, 404), hide it
 *  instead of showing the browser's broken-image icon and alt text. */
export function hideBroken(event: SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.style.display = "none";
}
