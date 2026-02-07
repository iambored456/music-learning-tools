/**
 * Strip HTML tags from text, returning plain text content.
 * Uses a temporary DOM element to properly handle entities and nested tags.
 */
export function stripHtml(html: string): string {
  const tempElem = document.createElement("div");
  tempElem.innerHTML = html;
  return tempElem.textContent || tempElem.innerText || "";
}

/**
 * Split text into sentence-like chunks for sequential speaking.
 * Splits on sentence-ending punctuation followed by whitespace.
 */
export function splitIntoSentenceChunks(text: string): string[] {
  // Normalize whitespace
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  // Split on sentence-ending punctuation followed by whitespace
  // This regex splits after . ! ? when followed by space or end of string
  const chunks = normalized
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  return chunks.length > 0 ? chunks : [normalized];
}
