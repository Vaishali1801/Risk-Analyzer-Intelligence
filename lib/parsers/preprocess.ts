export function preprocessContractText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/([A-Za-z])-[ \t]*\n[ \t]*(?=[A-Za-z])/g, "$1")
    .replace(/Page\s+\d+\s+of\s+\d+/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
