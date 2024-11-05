const JSON_STRING_PREFIX =
  "A JSON object according to the description below. Do not use code block characters (```) or label it as `json`. Only return the raw JSON response without any extra characters:\n\n";

export function _JSON(
  value: any,
  description: string,
  customPrefix?: string
): string {
  const prefix = customPrefix || JSON_STRING_PREFIX;

  const desc = description ? `${description}\n\n` : "";

  // Try to stringify the value, ensuring valid JSON structure
  let example: string;
  try {
    example = `Example:\n\n${JSON.stringify(value)}`; // Adding indentation for readability
  } catch (error) {
    throw new Error("Invalid JSON object provided.");
  }

  return `${prefix}${desc}${example}`;
}
