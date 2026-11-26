/** "Monte Carlo" -> "monte-carlo": the same rule the pipeline uses for circuit addresses. */
export const slugify = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
