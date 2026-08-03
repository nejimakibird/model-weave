import { App, ButtonComponent, DropdownComponent, Modal, Notice } from "obsidian";
import type { ModelWeaveTranslator, ModelWeaveUiLanguage } from "../i18n/messages";
import {
  filterVaultDiagnostics,
  formatVaultDiagnosticsAsMarkdown,
  getVaultDiagnosticCodes,
  presentVaultDiagnostic,
  type VaultDiagnosticsFilter,
  type VaultDiagnosticsResult
} from "../core/vault-diagnostics";
import type { ValidationWarning } from "../types/models";

export interface VaultDiagnosticsModalOptions {
  t: ModelWeaveTranslator;
  language: ModelWeaveUiLanguage;
  onRecheck: () => Promise<VaultDiagnosticsResult>;
  onOpenDiagnostic: (filePath: string, diagnostic: ValidationWarning) => void;
}

export class VaultDiagnosticsModal extends Modal {
  private result: VaultDiagnosticsResult | null = null;
  private filter: VaultDiagnosticsFilter = { severity: "all", code: "all" };
  private loading = false;
  private error: string | null = null;

  constructor(app: App, private readonly options: VaultDiagnosticsModalOptions) {
    super(app);
  }

  onOpen(): void {
    this.render();
  }

  setLoading(): void {
    this.loading = true;
    this.error = null;
    this.render();
  }

  setResult(result: VaultDiagnosticsResult): void {
    this.result = result;
    this.loading = false;
    this.error = null;
    this.filter = { severity: "all", code: "all" };
    this.render();
  }

  setError(error: unknown): void {
    this.loading = false;
    this.error = error instanceof Error ? error.message : String(error);
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    const t = this.options.t;
    contentEl.empty();
    contentEl.addClass("model-weave-vault-diagnostics-modal");
    contentEl.createEl("h2", { text: t("vaultDiagnostics.title") });

    if (this.loading) {
      contentEl.createEl("p", { text: t("vaultDiagnostics.loading") });
      return;
    }

    if (this.error) {
      contentEl.createEl("p", { text: t("vaultDiagnostics.error", { message: this.error }), cls: "mod-warning" });
      this.renderActions(contentEl);
      return;
    }

    if (!this.result) {
      this.renderActions(contentEl);
      return;
    }

    this.renderSummary(contentEl, this.result);
    this.renderFilters(contentEl, this.result);
    this.renderActions(contentEl);

    const files = filterVaultDiagnostics(this.result, this.filter);
    if (files.length === 0) {
      contentEl.createEl("p", { text: t("vaultDiagnostics.empty") });
      return;
    }

    const list = contentEl.createDiv({ cls: "model-weave-vault-diagnostics-list" });
    for (const file of files) {
      const group = list.createDiv({ cls: "model-weave-vault-diagnostics-file" });
      const label = file.modelId
        ? file.filePath + " (" + file.modelId + ")"
        : file.filePath;
      group.createEl("h3", { text: label });
      for (const diagnostic of file.diagnostics) {
        const presentation = presentVaultDiagnostic(diagnostic, { t, language: this.options.language });
        const button = group.createEl("button", {
          cls: "model-weave-vault-diagnostics-item",
          text: "[" + presentation.severityLabel + "] " + diagnostic.code + ": " + presentation.message
        });
        button.type = "button";
        button.setAttribute("aria-label", t("vaultDiagnostics.openDiagnostic", { path: file.filePath }));
        button.addEventListener("click", () => this.options.onOpenDiagnostic(file.filePath, diagnostic));
      }
    }
  }

  private renderSummary(container: HTMLElement, result: VaultDiagnosticsResult): void {
    const t = this.options.t;
    const summary = container.createDiv({ cls: "model-weave-vault-diagnostics-summary" });
    summary.createSpan({ text: t("vaultDiagnostics.checkedFiles", { count: result.checkedFileCount }) });
    summary.createSpan({ text: t("vaultDiagnostics.filesWithDiagnostics", { count: result.filesWithDiagnostics }) });
    summary.createSpan({ text: t("diagnostics.errors") + ": " + String(result.errorCount), cls: "is-error" });
    summary.createSpan({ text: t("diagnostics.warnings") + ": " + String(result.warningCount), cls: "is-warning" });
    summary.createSpan({ text: t("diagnostics.notes") + ": " + String(result.noteCount) });
  }

  private renderFilters(container: HTMLElement, result: VaultDiagnosticsResult): void {
    const t = this.options.t;
    const filters = container.createDiv({ cls: "model-weave-vault-diagnostics-filters" });
    filters.createSpan({ text: t("vaultDiagnostics.filterSeverity") });
    const severity = new DropdownComponent(filters);
    severity
      .addOption("all", t("vaultDiagnostics.filterAll"))
      .addOption("error", t("diagnostics.severity.error"))
      .addOption("warning", t("diagnostics.severity.warning"))
      .addOption("info", t("diagnostics.severity.note"))
      .setValue(this.filter.severity)
      .onChange((value) => {
        this.filter = { ...this.filter, severity: value as VaultDiagnosticsFilter["severity"] };
        this.render();
      });

    filters.createSpan({ text: t("vaultDiagnostics.filterCode") });
    const code = new DropdownComponent(filters);
    code.addOption("all", t("vaultDiagnostics.filterAll"));
    for (const diagnosticCode of getVaultDiagnosticCodes(result)) {
      code.addOption(diagnosticCode, diagnosticCode);
    }
    code.setValue(this.filter.code).onChange((value) => {
      this.filter = { ...this.filter, code: value };
      this.render();
    });
  }

  private renderActions(container: HTMLElement): void {
    const t = this.options.t;
    const actions = container.createDiv({ cls: "model-weave-vault-diagnostics-actions" });
    new ButtonComponent(actions)
      .setButtonText(t("vaultDiagnostics.recheck"))
      .setCta()
      .onClick(() => {
        void this.recheck();
      });
    if (this.result) {
      new ButtonComponent(actions)
        .setButtonText(t("vaultDiagnostics.copyAll"))
        .onClick(() => {
          void navigator.clipboard?.writeText(formatVaultDiagnosticsAsMarkdown(this.result!, undefined, { t, language: this.options.language }));
          new Notice(t("vaultDiagnostics.copied"));
        });
    }
  }

  private async recheck(): Promise<void> {
    this.setLoading();
    try {
      this.setResult(await this.options.onRecheck());
    } catch (error) {
      this.setError(error);
    }
  }

}
