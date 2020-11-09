import * as fs from "fs";
import * as path from "path";
import { Backend, Class, PackageJson } from "../common/types";

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
          path: path.resolve(),
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
              path: path.resolve(),
            });
          }
        });
        cb({
          status: "missing-dependencies",
          path: path.resolve(),
        });
      }
    } else {
      cb({
        status: "no-project",
      });
    }
  }
  private hasRequiredDependencies(packageJson: PackageJson) {
    return true;
    /*
    return (
      packageJson.dependencies &&
      "mobx" in packageJson.dependencies &&
      "react" in packageJson.dependencies &&
      "mobx-react-lite" in packageJson.dependencies
		);
		*/
  }
  private watchPackageJson(
    cb: (updatedPackageJson: PackageJson | null, unwatch: () => void) => void
  ) {
    const packageJsonPath = path.resolve("package.json");

    if (!this.packageJsonWatcher) {
      this.packageJsonWatcher = () => {
        cb(this.getPackageJson(), () => fs.unwatchFile(packageJsonPath));
      };
      fs.watchFile(packageJsonPath, this.packageJsonWatcher);
    }
  }
  private getPackageJson(): PackageJson | null {
    const packageJsonPath = path.resolve("package.json");

    if (fs.existsSync(packageJsonPath)) {
      return JSON.parse(fs.readFileSync(packageJsonPath).toString());
    }

    return null;
  }
}
