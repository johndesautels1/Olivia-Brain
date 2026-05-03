// mobile-keyboard.ts — Global utilities to tame the mobile keyboard
// Call dismissKeyboard() after form submits, picker opens, etc.
// Call isMobile() to conditionally skip autoFocus.

export function dismissKeyboard() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

export function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}
