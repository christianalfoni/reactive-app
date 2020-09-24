import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { APP_DIR, CONFIGURATION_DIR } from "../constants";
import { join } from "path";

export class FilesManager {
  private hasAppDir = false;
  private hasConfigurationDir = false;
  private metadata: {
    [name: string]: { id: string; x: number; y: number };
  } = {};
  private async ensureAppDir() {
    if (this.hasAppDir) {
      return;
    }

    const dir = this.getWorkspacePath(APP_DIR)!;

    try {
      await fs.promises.mkdir(dir);
      this.hasAppDir = true;
    } catch {
      // Already exists
    }
  }
  private async ensureConfigurationDir() {
    if (this.hasConfigurationDir) {
      return;
    }

    const dir = this.getWorkspacePath(CONFIGURATION_DIR)!;

    try {
      await fs.promises.mkdir(dir);
      this.hasConfigurationDir = true;
    } catch {
      // Already exists
    }

    try {
      const metadata = await fs.promises.readFile(join(dir, "metadata.json"));
      this.metadata = JSON.parse(metadata.toString("utf-8"));
    } catch {
      // No file, we will write it later
    }
  }

  getWorkspacePath(...subdir: string[]) {
    return (
      vscode.workspace.workspaceFolders &&
      path.join(vscode.workspace.workspaceFolders[0].uri.path, ...subdir)
    );
  }
  async getMetadata() {
    await this.ensureConfigurationDir();

    return this.metadata;
  }
  async getClasses() {
    this.ensureAppDir();
    const appDir = this.getWorkspacePath(APP_DIR)!;
    try {
      const files = await fs.promises.readdir(appDir);
      const contents = await Promise.all(
        files
          .filter((file) => file !== "index.ts")
          .map((file) =>
            fs.promises.readFile(this.getWorkspacePath(APP_DIR, file)!)
          )
      );

      return contents.reduce<{
        [key: string]: { name: string };
      }>((aggr, content) => {
        const stringContent = content.toString();
        const nameMatch = stringContent.match(/class (.*) implements/);
        const name = nameMatch && nameMatch[1];

        if (!name) {
          return aggr;
        }

        aggr[name] = {
          name,
        };

        return aggr;
      }, {});
    } catch {
      return {};
    }
  }
  async writeMetadata({
    name,
    id,
    x,
    y,
  }: {
    name: string;
    id: string;
    x: number;
    y: number;
  }) {
    await this.ensureConfigurationDir();

    const file = this.getWorkspacePath(CONFIGURATION_DIR, "metadata.json")!;

    this.metadata[name] = {
      id,
      x,
      y,
    };
    await fs.promises.writeFile(file, JSON.stringify(this.metadata, null, 2));
  }
  async writeClass(name: string) {
    await this.ensureAppDir();

    const file = this.getWorkspacePath(APP_DIR, name + ".ts")!;

    await fs.promises.writeFile(
      file,
      `export interface I${name} {}
	  
export class ${name} implements I${name} {}`
    );
  }
  async inject({ fromName, toName }: { fromName: string; toName: string }) {
    await this.ensureAppDir();

    const file = this.getWorkspacePath(APP_DIR, toName + ".ts")!;

    await fs.promises.writeFile(
      file,
      `import { inject } from './lib';
import { I${fromName} } from './${fromName}';

export interface I${toName} {}
	  
export class ${toName} implements I${toName} {
  @inject private ${
    fromName[0].toLocaleLowerCase() + fromName.slice(1)
  }!: I${fromName}
}`
    );
  }
}
