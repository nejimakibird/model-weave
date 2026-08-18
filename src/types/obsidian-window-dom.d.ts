interface Window {
  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: Record<string, unknown>
  ): HTMLElementTagNameMap[K];
  createDiv(options?: Record<string, unknown>): HTMLDivElement;
  createSpan(options?: Record<string, unknown>): HTMLSpanElement;
  createSvg<K extends keyof SVGElementTagNameMap>(
    tag: K,
    options?: Record<string, unknown>
  ): SVGElementTagNameMap[K];
}
