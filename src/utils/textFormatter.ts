/**
 * Cleans up markdown formatting from AI responses
 * @param text The text to clean
 * @returns Cleaned text without markdown formatting
 */
export function cleanMarkdownFormatting(text: string): string {
  // Remove bold/italic markdown
  let cleaned = text.replace(/\*\*(.*?)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*(.*?)\*/g, "$1");

  // Remove headers
  cleaned = cleaned.replace(/#{1,6}\s+/g, "");

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`(.*?)`/g, "$1");

  // Remove bullet points
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");

  // Remove numbered lists
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

  return cleaned.trim();
}

export function cleanJsonBlock(raw: string): string {
  return raw
    .trim()
    .replace(/^```(json)?\s*/i, "") // remove opening ```
    .replace(/\s*```$/, ""); // remove closing ```
}
