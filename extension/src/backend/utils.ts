import * as ts from "typescript";
import * as vscode from "vscode";
import { Injector, Observable } from "../types";

export function getClassNode(
  node: ts.SourceFile,
  name: string
): ts.ClassDeclaration {
  const classNode = node.statements.reduce<ts.ClassDeclaration | undefined>(
    (aggr, statement) => {
      if (aggr) return aggr;

      if (ts.isClassDeclaration(statement)) {
        if (statement.name && statement.name.text === name) {
          return statement;
        }
      }
    },
    undefined
  );

  if (!classNode) {
    throw new Error("Could not find a class statement");
  }

  return classNode;
}

export function getInjectors(node: ts.ClassDeclaration): Injector[] {
  return node.members.reduce<Injector[]>((aggr, member) => {
    if (ts.isPropertyDeclaration(member)) {
      const callExpression =
        member.decorators &&
        ts.isCallExpression(member.decorators[0].expression)
          ? member.decorators[0].expression
          : undefined;

      if (callExpression && ts.isIdentifier(callExpression.expression)) {
        const identifier = callExpression.expression;

        if (
          (identifier.text === "inject" ||
            identifier.text === "injectFactory") &&
          callExpression.arguments[0] &&
          ts.isStringLiteral(callExpression.arguments[0])
        ) {
          const stringLiteral = callExpression.arguments[0] as ts.StringLiteral;

          return aggr.concat({
            class: stringLiteral.text,
            name: (member.name as ts.Identifier).text,
            type: identifier.text,
          });
        }
      }
    }

    return aggr;
  }, []);
}

export function getObservables(node: ts.ClassDeclaration) {
  return node.members.reduce<Observable[]>((aggr, member) => {
    if (ts.isPropertyDeclaration(member)) {
      const identifier =
        member.decorators && ts.isIdentifier(member.decorators[0].expression)
          ? member.decorators[0].expression
          : undefined;

      if (identifier && identifier.text === "observable") {
        return aggr.concat({
          name: (member.name as ts.Identifier).text,
        });
      }
    }

    return aggr;
  }, []);
}

export function getWorkspaceUri(...subdir: string[]) {
  return (
    vscode.workspace.workspaceFolders &&
    vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, ...subdir)
  );
}

export function transformTypescript(
  code: string,
  cb: (node: ts.Node) => ts.Node | void
) {
  const node = ts.createSourceFile("temp.ts", code, ts.ScriptTarget.Latest);

  const transformer = <T extends ts.SourceFile>(
    context: ts.TransformationContext
  ) => (rootNode: T) => {
    function visit(node: ts.Node): ts.Node {
      return ts.visitEachChild(cb(node) || node, visit, context);
    }
    return ts.visitNode(rootNode, visit);
  };

  const result: ts.TransformationResult<ts.SourceFile> = ts.transform(node, [
    transformer,
  ]);

  const transformedSourceFile = result.transformed[0];

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  return printer.printFile(transformedSourceFile);
}
