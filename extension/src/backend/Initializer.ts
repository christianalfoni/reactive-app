import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Backend, Class, PackageJson } from "../types";
import { FilesManager } from "./FilesManager";
import { getWorkspaceUri } from "./utils";

export class Initializer {
  private packageJsonWatcher:
    | ((curr: fs.Stats, prev: fs.Stats) => void)
    | undefined;
  async initialize(cb: (data: Backend) => void) {
    const packageJson = this.getPackageJson();

    if (packageJson) {
      if (this.hasRequiredDependencies(packageJson)) {
        cb({
          status: "ready",
          path: getWorkspaceUri()!.path,
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
              path: getWorkspaceUri()!.path,
            });
          }
        });
        cb({
          status: "missing-dependencies",
          path: getWorkspaceUri()!.path,
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
    const packageJsonUri = getWorkspaceUri("package.json");

    if (!packageJsonUri) {
      return;
    }

    if (!this.packageJsonWatcher) {
      this.packageJsonWatcher = () => {
        cb(this.getPackageJson(), () => fs.unwatchFile(packageJsonUri.path));
      };
      fs.watchFile(packageJsonUri.path, this.packageJsonWatcher);
    }
  }
  private getPackageJson(): PackageJson | null {
    const packageJsonUri = getWorkspaceUri("package.json");

    if (!packageJsonUri) {
      return null;
    }

    if (fs.existsSync(packageJsonUri.path)) {
      return JSON.parse(fs.readFileSync(packageJsonUri.path).toString());
    }

    return null;
  }
}
