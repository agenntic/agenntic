type ExtractPlaceholders<T extends string> =
  T extends `${infer _Start}{${infer Key}}${infer Rest}`
    ? Key | ExtractPlaceholders<Rest>
    : never;

type FormatMap<T extends string> = {
  [K in ExtractPlaceholders<T>]: string | number;
};

/**
 * Fills a template string with values from an object.
 *
 */
export default function fillTemplateString<T extends string>(
  /**
   * A template string with placeholders like "{key}".
   */
  template: T,
  /**
   * An object with keys that match the placeholders in the template string.
   */
  values: FormatMap<T>
): string {
  return template.replace(/{(\w+)}/g, (_, key) => {
    return key in values
      ? String(values[key as keyof FormatMap<T>])
      : `{${key}}`;
  });
}
