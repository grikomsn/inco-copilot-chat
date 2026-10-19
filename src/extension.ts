import * as vscode from "vscode";
import { registerCommands } from "./commands/commands";
import { IncoProvider } from "./provider";
import { extensionUserAgent } from "./transport/protocol";
import type { IncoUsageSnapshot } from "./usage/domain";
import { renderUsageStatus } from "./usage/presentation";

/** GlobalState key holding the persisted usage snapshot. */
const USAGE_STATE_KEY = "incoCopilot.entryUsage.v1";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Inco");
  // Restore only entry-scoped inference activity.
  const initialUsage = context.globalState.get<Record<string, IncoUsageSnapshot>>(USAGE_STATE_KEY) ?? {};
  const provider = new IncoProvider(
    output,
    extensionUserAgent(context.extension.packageJSON.version, vscode.version),
    context.globalState,
    initialUsage,
  );
  const usageStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  usageStatus.name = "Inco local API activity";
  usageStatus.command = "incoCopilot.showUsage";
  renderUsageStatus(usageStatus, provider.getSelectedUsageSnapshot());
  updateUsageStatusVisibility(usageStatus);

  context.subscriptions.push(
    output,
    usageStatus,
    provider.onDidChangeUsage((usage) => {
      renderUsageStatus(usageStatus, usage);
      updateUsageStatusVisibility(usageStatus);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("incoCopilot.reasoningEffort") ||
        event.affectsConfiguration("incoCopilot.catalogCacheMinutes") ||
        event.affectsConfiguration("incoCopilot.incoServedOnly")
      ) {
        provider.fireDidChange();
      }
      if (event.affectsConfiguration("incoCopilot.showUsageStatusBar")) {
        updateUsageStatusVisibility(usageStatus);
      }
    }),
    vscode.lm.registerLanguageModelChatProvider("inco", provider),
    ...registerCommands(provider, output, usageStatus),

  );

  output.appendLine(
    `[activate] Inco for Copilot Chat ${context.extension.packageJSON.version} on VS Code ${vscode.version}`,
  );
}

/** Shows or hides the usage status bar based on the `showUsageStatusBar` setting. */
function updateUsageStatusVisibility(item: vscode.StatusBarItem): void {
  if (vscode.workspace.getConfiguration("incoCopilot").get("showUsageStatusBar", true)) item.show();
  else item.hide();
}
