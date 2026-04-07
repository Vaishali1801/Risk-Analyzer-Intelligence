export function preprocessContractText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/Page\s+\d+\s+of\s+\d+/gi, "")
    .trim();
}
