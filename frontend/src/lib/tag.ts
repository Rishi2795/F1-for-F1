/** "Lead over 2nd" -> "LEAD_OVER_2ND": the site's label style (see the landing page's REF_09.5, CAPITAL_ALLOCATION). */
export const tag = (text: string): string => text.trim().toUpperCase().replace(/\s+/g, "_");
