import * as vscode from "vscode";

export function getWorkspaceUri(...subdir: string[]) {
  return (
    vscode.workspace.workspaceFolders &&
    vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, ...subdir)
  );
}
