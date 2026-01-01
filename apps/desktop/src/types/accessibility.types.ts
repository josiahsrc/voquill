/**
 * Accessibility information about the currently focused text field.
 * Retrieved via platform-specific accessibility APIs.
 */
export type AccessibilityInfo = {
  /** Current cursor position (index) in the text field. Null if not available. */
  cursorPosition: number | null;
  /** Number of characters currently selected. Null if not available. */
  selectionLength: number | null;
  /** Full text content of the focused text field. Null if not available. */
  textContent: string | null;
};
