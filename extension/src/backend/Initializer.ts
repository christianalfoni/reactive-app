import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Backend, PackageJson } from "../types";
import { FilesManager } from "./FilesManager";

export class Initializer {
  private filesManager = new FilesManager();
  private packageJsonWatcher:
    | ((curr: fs.Stats, prev: fs.Stats) => void)
    | undefined;
  async initialize(cb: (data: Backend) => void) {
    const packageJson = this.getPackageJson();

    if (packageJson) {
      if (this.hasRequiredDependencies(packageJson)) {
        cb({
          status: "ready",
          path: this.filesManager.getWorkspacePath()!,
        });
      } else {
        this.watchPackageJson(async (updatedPackageJson, unwatch) => {
          if (
            updatedPackageJson &&
            this.hasRequiredDependencies(updatedPackageJson)
          ) {
            unwatch();
            cb({
              status: "ready",
              path: this.filesManager.getWorkspacePath()!,
            });
          }
        });
        cb({
          status: "missing-dependencies",
          path: this.filesManager.getWorkspacePath()!,
        });
      }
    } else {
      cb({
        status: "no-project",
      });
    }
  }
  private hasRequiredDependencies(packageJson: PackageJson) {
    return (
      packageJson.dependencies &&
      "mobx" in packageJson.dependencies &&
      "react" in packageJson.dependencies &&
      "mobx-react-lite" in packageJson.dependencies
    );
  }
  private watchPackageJson(
    cb: (updatedPackageJson: PackageJson | null, unwatch: () => void) => void
  ) {
    const packageJsonPath = this.filesManager.getWorkspacePath("package.json");

    if (!packageJsonPath) {
      return;
    }

    if (!this.packageJsonWatcher) {
      this.packageJsonWatcher = () => {
        cb(this.getPackageJson(), () => fs.unwatchFile(packageJsonPath));
      };
      fs.watchFile(packageJsonPath, this.packageJsonWatcher);
    }
  }
  private getPackageJson(): PackageJson | null {
    const packageJsonPath = this.filesManager.getWorkspacePath("package.json");

    if (!packageJsonPath) {
      return null;
    }

    if (fs.existsSync(packageJsonPath)) {
      return JSON.parse(fs.readFileSync(packageJsonPath).toString());
    }

    return null;
  }
}
