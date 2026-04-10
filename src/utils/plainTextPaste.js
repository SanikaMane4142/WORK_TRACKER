export const normalizePastedText = (text) => {
  if (typeof text !== "string") return "";
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\u00a0/g, " ");
};

export const getPlainTextFromPasteEvent = (event) => {
  const clipboard =
    event?.clipboardData ||
    event?.nativeEvent?.clipboardData ||
    globalThis?.clipboardData;
  const text = clipboard?.getData?.("text/plain");
  return normalizePastedText(text);
};

export const applyPasteToValue = ({ value, pasteText, selectionStart, selectionEnd }) => {
  const safeValue = typeof value === "string" ? value : "";
  const safePaste = typeof pasteText === "string" ? pasteText : "";
  const length = safeValue.length;

  const start = Math.min(Math.max(Number(selectionStart ?? length), 0), length);
  const end = Math.min(Math.max(Number(selectionEnd ?? start), start), length);

  const nextValue = safeValue.slice(0, start) + safePaste + safeValue.slice(end);
  const nextCursor = start + safePaste.length;

  return { nextValue, nextCursor };
};

