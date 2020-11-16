import * as fs from "fs";
import * as path from "path";
import * as prettier from "prettier";
import { CodeBlockWriter, FileSystemHost } from "ts-morph";

const LINE_BREAK = "REACTIVE_LINE_BREAK";

export const writeLineBreak = (writer: CodeBlockWriter) =>
  writer.write(`\n// ${LINE_BREAK}`);

let prettierConfig = {};

try {
  prettierConfig = JSON.parse(
    fs.readFileSync(path.resolve(".prettierrc")).toString("utf-8")
  );
} catch {
  // No worries, just using defaults
}

/*
	We create our own filesystem to deal with linebreaks and formatting.
	Most of the methods are unncessary, we just comply with
	the signature
*/
export class TsMorphFs implements FileSystemHost {
  private prettierConfig: any;
  constructor(prettierConfig: any) {
    this.prettierConfig = prettierConfig;
  }
  copy() {
    return Promise.resolve();
  }
  copySync() {}
  delete() {
    return Promise.resolve();
  }
  deleteSync() {}
  directoryExists(dirPath: string) {
    return new Promise<boolean>((resolve) => {
      fs.access(dirPath, (err) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
    return Promise.resolve(false);
  }
  directoryExistsSync(dirPath: string) {
    console.log("UHM?", dirPath);
    return fs.existsSync(dirPath);
  }
  fileExists(srcPath: string) {
    return fs.promises
      .lstat(srcPath)
      .then(() => true)
      .catch(() => false);
  }
  fileExistsSync(srcPath: string) {
    try {
      fs.lstatSync(srcPath);
      return true;
    } catch {
      return false;
    }
  }
  getCurrentDirectory() {
    return path.resolve();
  }
  glob() {
    return Promise.resolve([]);
  }
  globSync(glob: string[]) {
    const result = fs.readdirSync(path.resolve(glob[0]));
    return result.map((file) => path.join(glob[0], file));
  }
  isCaseSensitive() {
    return true;
  }
  mkdir(dir: string) {
    return fs.promises.mkdir(dir);
  }
  mkdirSync(dir: string) {
    try {
      fs.mkdirSync(dir);
    } catch {
      // Already exists
    }
  }
  move() {
    return Promise.resolve();
  }
  moveSync() {}
  readDirSync(dir: string) {
    return fs.readdirSync(dir);
  }
  readFile(filePath: string) {
    return fs.promises
      .readFile(filePath)
      .then((file) => file.toString("utf-8"));
  }
  readFileSync(filePath: string) {
    const result = fs.readFileSync(filePath).toString("utf-8");

    return result.replace(/^\s*\n/gm, `// ${LINE_BREAK}\n`);
  }
  realpathSync(filePath: string) {
    return path.resolve(filePath);
  }
  writeFile(filePath: string, content: string) {
    return fs.promises.writeFile(filePath, content);
  }
  writeFileSync(filePath: string, content: string) {
    return fs.writeFileSync(
      filePath,
      prettier.format(
        content.replace(new RegExp(`// ${LINE_BREAK}`, "gm"), ""),
        {
          ...this.prettierConfig,
          parser: path.extname(filePath) === ".json" ? "json" : "typescript",
        }
      )
    );
  }
}
