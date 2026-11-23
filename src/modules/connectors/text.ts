import { decode as decodeHtml } from "he";

export function cleanText(value: string) {
  let text = value;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const decoded = decodeHtml(text);
    if (decoded === text) break;
    text = decoded;
  }
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}
