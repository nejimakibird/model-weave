const DISPLAY_TEXT_ESCAPES: Record<string, string> = {
  "|": "|",
  "[": "[",
  "]": "]",
  "\"": "\"",
  "\\": "\\"
};

export function decodeEscapedDisplayText(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/\\([|[\]"\\])/g, (match, escaped: string) =>
    DISPLAY_TEXT_ESCAPES[escaped] ?? match
  );
}
