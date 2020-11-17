import {
  CallExpression,
  SourceFile,
  ArrayLiteralExpression,
  ExpressionStatement,
} from "ts-morph";
import * as ts from "typescript";
import { MIXINS_IMPORT } from "../common/constants";

import { Action, Computed, Injector, Mixin, Observable } from "../common/types";
import { writeLineBreak } from "./TsMorphFs";

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

export function getClassMixins(node: ts.SourceFile, classId: string): Mixin[] {
  const mixins: Mixin[] = [];

  node.statements.forEach((statement) => {
    if (
      ts.isInterfaceDeclaration(statement) &&
      statement.name.escapedText === classId &&
      statement.heritageClauses &&
      statement.heritageClauses[0]
    ) {
      statement.heritageClauses[0].types.forEach((heritageType) => {
        if (
          ts.isIdentifier(heritageType.expression) &&
          (heritageType.expression.escapedText as string) in Mixin
        ) {
          mixins.push(heritageType.expression.escapedText as Mixin);
        }
      });
    }
  });

  return mixins;
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
            classId: stringLiteral.text,
            propertyName: (member.name as ts.Identifier).text,
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

export function getComputed(node: ts.ClassDeclaration) {
  return node.members.reduce<Computed[]>((aggr, member) => {
    if (ts.isGetAccessor(member)) {
      const identifier =
        member.decorators && ts.isIdentifier(member.decorators[0].expression)
          ? member.decorators[0].expression
          : undefined;

      if (identifier && identifier.text === "computed") {
        return aggr.concat({
          name: (member.name as ts.Identifier).text,
        });
      }
    }

    return aggr;
  }, []);
}

export function getActions(node: ts.ClassDeclaration) {
  return node.members.reduce<Action[]>((aggr, member) => {
    if (ts.isMethodDeclaration(member)) {
      const identifier =
        member.decorators && ts.isIdentifier(member.decorators[0].expression)
          ? member.decorators[0].expression
          : undefined;

      if (identifier && identifier.text === "action") {
        return aggr.concat({
          name: (member.name as ts.Identifier).text,
        });
      }
    }

    return aggr;
  }, []);
}

export function addImportDeclaration(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  namedImport: string,
  isTypeOnly = false
) {
  const existingImportDeclaration = sourceFile.getImportDeclaration(
    (importDeclaration) => {
      return (
        importDeclaration.getModuleSpecifier().getLiteralText() ===
        moduleSpecifier
      );
    }
  );

  if (
    existingImportDeclaration &&
    !existingImportDeclaration
      .getNamedImports()
      .find((namedImportItem) => namedImportItem.getText() === namedImport)
  ) {
    existingImportDeclaration.addNamedImport(namedImport);
  } else if (!existingImportDeclaration) {
    sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: [namedImport],
      isTypeOnly,
    });
  }
}

export function toggleImportDeclaration(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  namedImport: string
) {
  const hasExistingDeclaration = sourceFile.getImportDeclaration(
    (importDeclaration) =>
      Boolean(
        importDeclaration.getModuleSpecifier().getLiteralText() ===
          moduleSpecifier &&
          importDeclaration
            .getNamedImports()
            .find((namedImportItem) =>
              namedImportItem.getName().match(namedImport)
            )
      )
  );

  if (hasExistingDeclaration) {
    removeImportDeclaration(sourceFile, moduleSpecifier, namedImport);
  } else {
    addImportDeclaration(sourceFile, moduleSpecifier, namedImport);
  }
}

export function removeImportDeclaration(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  namedImport?: string
) {
  const existingImportDeclaration = sourceFile.getImportDeclaration(
    (importDeclaration) =>
      importDeclaration.getModuleSpecifier().getLiteralText() ===
      moduleSpecifier
  )!;

  if (!namedImport) {
    existingImportDeclaration.remove();
    return;
  }

  if (existingImportDeclaration.getNamedImports().length > 1) {
    existingImportDeclaration
      .getNamedImports()
      .find(
        (namedImportItem) =>
          namedImportItem.getName().toString() === namedImport
      )
      ?.remove();
  } else {
    existingImportDeclaration.remove();
  }
}

export function toggleMixinInterface(
  sourceFile: SourceFile,
  interfaceName: string,
  type: string
) {
  const mixinInterface = sourceFile.getInterface(interfaceName);

  if (!mixinInterface) {
    sourceFile.addInterface({
      name: interfaceName,
      extends: [type],
      isExported: true,
      trailingTrivia: writeLineBreak,
    });
    return;
  }

  const mixinTypeIndex = mixinInterface
    .getExtends()
    .findIndex((typeArgument) => typeArgument.getText().match(type));
  const hasMixin = mixinTypeIndex >= 0;

  if (hasMixin && mixinInterface.getExtends().length === 1) {
    mixinInterface.remove();
  } else if (hasMixin) {
    mixinInterface.removeExtends(mixinTypeIndex);
  } else {
    mixinInterface.addExtends([type]);
  }
}

export function toggleMixin(
  sourceFile: SourceFile,
  target: string,
  mixin: string
) {
  const callExpression = sourceFile.getStatement((statement) => {
    if (statement.getKind() === ts.SyntaxKind.ExpressionStatement) {
      const callExpression = statement.getFirstDescendantByKind(
        ts.SyntaxKind.CallExpression
      );

      if (
        callExpression &&
        callExpression.getExpression().getText() === "applyMixins"
      ) {
        return true;
      }
    }

    return false;
  }) as ExpressionStatement | undefined;
  const args = callExpression
    ? ((callExpression.getExpression() as CallExpression).getArguments()[1] as ArrayLiteralExpression)
    : undefined;
  const mixinIndex = args
    ? args.getElements().findIndex((element) => element.getText() === mixin)
    : -1;

  if (args && mixinIndex >= 0) {
    args.removeElement(mixinIndex);
    if (args.getElements().length === 0) {
      callExpression?.remove();
      removeImportDeclaration(sourceFile, MIXINS_IMPORT);
    }
  } else if (args) {
    args.addElement(mixin);
  } else {
    sourceFile.addStatements([`applyMixins(${target}, [${mixin}])`]);
  }
}
