/** Status bar rendering for Inco usage and credits. */

import * as vscode from "vscode";
import {
  formatUsageStatusBar,
  formatUsageTooltip,
  type IncoUsageSnapshot,
} from "./domain";

/** A quick-pick entry that maps back to a usage command action. */
export interface UsageQuickPickItem extends vscode.QuickPickItem {
  /** Action to run when the entry is picked; `undefined` for info-only rows. */
  action?: "refresh" | "openApiKeys";
}

export function renderUsageStatus(item: vscode.StatusBarItem, snapshot: IncoUsageSnapshot): void {
  item.text = formatUsageStatusBar(snapshot);
  item.tooltip = formatUsageTooltip(snapshot);
}
