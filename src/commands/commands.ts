import * as vscode from "vscode";
import type { IncoProvider } from "../provider";
import { messageOf } from "../errors";
import { API_BASE } from "../transport/protocol";
import { formatUsageRows } from "../usage/domain";

const DASHBOARD = "https://platform.inco.ai";

export function registerCommands(
  provider: IncoProvider,
  output: vscode.OutputChannel,
  _status: vscode.StatusBarItem,
): vscode.Disposable[] {
  const command = (name: string, run: () => Promise<unknown>): vscode.Disposable =>
    vscode.commands.registerCommand(`incoCopilot.${name}`, async () => {
      try { await run(); } catch (error) { void vscode.window.showErrorMessage(messageOf(error)); }
    });
  return [
    command("manage", async () => {
      await vscode.commands.executeCommand("workbench.action.chat.manageLanguageModels");
    }),
    command("refreshModels", async () => {
      const models = await provider.refreshModels();
      void vscode.window.showInformationMessage(`Inco: refreshed ${models.length} models.`);
    }),
    command("testConnection", async () => {
      const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Testing Inco inference" },
        () => provider.testConnection());
      void vscode.window.showInformationMessage(`Inco connection verified using ${result.model}.`);
    }),
    command("openApiKeys", async () => vscode.env.openExternal(vscode.Uri.parse(`${DASHBOARD}/keys`))),
    command("openUsage", async () => vscode.env.openExternal(vscode.Uri.parse(`${DASHBOARD}/usage`))),
    command("showUsage", async () => {
      const rows = formatUsageRows(provider.getSelectedUsageSnapshot());
      const items = [...rows.map((row) => ({ label: row.label, description: row.description, detail: row.detail, action: "" })),
        { label: "Open Inco dashboard usage", description: "Authoritative balance and billing", detail: undefined, action: "dashboard" },
        { label: "Reset local usage", description: "Resets this entry's device-local counters", detail: undefined, action: "reset" }];
      const selected = await vscode.window.showQuickPick(items, { title: "Inco usage", matchOnDescription: true });
      if (selected?.action === "dashboard") await vscode.env.openExternal(vscode.Uri.parse(`${DASHBOARD}/usage`));
      if (selected?.action === "reset") provider.clearUsage();
    }),
    command("diagnostics", async () => {
      output.appendLine(`[diagnostics] endpoint=${API_BASE} configured=${Boolean(provider.getFeatureApiKey())}`);
      output.show(true);
    }),
  ];
}
