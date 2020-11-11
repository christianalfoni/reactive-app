import * as ts from "typescript";

import { Injector, Mixin, Observable } from "../common/types";

const LINE_BREAK = "REACTIVE_LINE_BREAK";
const NEW_LINE_BREAK = "NEW_REACTIVE_LINE_BREAK";

function addLineBreak(node: ts.Node) {
  ts.setSyntheticTrailingComments(node, [
    {
      pos: -1,
      end: -1,
      text: ` ${NEW_LINE_BREAK}`,
      kind: ts.SyntaxKind.SingleLineCommentTrivia,
    },
  ]);
}

export function transformTypescript(
  code: Uint8Array,
  cb: (node: ts.Node) => ts.Node | void
) {
  const sourceNode = ts.createSourceFile(
    "temp.ts",
    new TextDecoder("utf-8")
      .decode(code)
      .replace(/^\s*\n/gm, `// ${LINE_BREAK}\n`),
    ts.ScriptTarget.Latest
  );

  const transformer = <T extends ts.SourceFile>(
    context: ts.TransformationContext
  ) => (rootNode: T) => {
    function visit(node: ts.Node): ts.Node {
      const visitedNode = cb(node) || node;

      return ts.visitEachChild(visitedNode, visit, context);
    }
    return ts.visitNode(rootNode, visit);
  };

  const result: ts.TransformationResult<ts.SourceFile> = ts.transform(
    sourceNode,
    [transformer]
  );

  const transformedSourceFile = result.transformed[0];

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  return printer
    .printFile(transformedSourceFile)
    .replace(new RegExp(`// ${NEW_LINE_BREAK}`, "gm"), "\n")
    .replace(new RegExp(`// ${LINE_BREAK}`, "gm"), "");
}

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

export function isClassNode(
  node: ts.Node,
  name: string
): node is ts.ClassDeclaration {
  return Boolean(
    ts.isClassDeclaration(node) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      node.name.text === name
  );
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
  return node.members.reduce<Observable[]>((aggr, member) => {
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
  return node.members.reduce<Observable[]>((aggr, member) => {
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
  node: ts.SourceFile,
  {
    name,
    source,
    isType = false,
  }: {
    name: string;
    source: string;
    isType: boolean;
  }
) {
  const existingImportDeclaration = node.statements.find((statement) => {
    return (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === source &&
      statement.importClause &&
      statement.importClause.isTypeOnly === isType
    );
  }) as ts.ImportDeclaration | undefined;

  const hasNamedImport = (node: ts.ImportDeclaration): boolean => {
    return (node.importClause!.namedBindings! as ts.NamedImports).elements.some(
      (element) => element.name.text === name
    );
  };

  if (existingImportDeclaration && !hasNamedImport(existingImportDeclaration)) {
    const createUpdatedImportClause = (
      existingImportClause: ts.ImportClause
    ): ts.ImportClause => {
      const elements = (existingImportClause.namedBindings! as ts.NamedImports)
        .elements;

      return ts.factory.createImportClause(
        isType,
        undefined,
        ts.factory.createNamedImports([
          ...elements,
          ts.factory.createImportSpecifier(
            undefined,
            ts.factory.createIdentifier(name)
          ),
        ])
      );
    };

    const createUpdatedImportDeclaration = () => {
      return ts.factory.createImportDeclaration(
        existingImportDeclaration.decorators,
        existingImportDeclaration.modifiers,
        createUpdatedImportClause(existingImportDeclaration.importClause!),
        existingImportDeclaration.moduleSpecifier
      );
    };
    const transformStatements = () => {
      return node.statements.map((statement) => {
        if (statement === existingImportDeclaration) {
          return createUpdatedImportDeclaration();
        }

        return statement;
      });
    };

    // When we return a new source file we loose the comments
    // @ts-ignore
    node.statements = transformStatements();

    return node;
  } else if (!existingImportDeclaration) {
    const importDeclarationCount = node.statements.filter((statement) =>
      ts.isImportDeclaration(statement)
    ).length;

    // When we return a new source file we loose the comments
    // @ts-ignore
    node.statements.splice(
      importDeclarationCount,
      0,
      ts.factory.createImportDeclaration(
        undefined,
        undefined,
        ts.factory.createImportClause(
          isType,
          undefined,
          ts.factory.createNamedImports([
            ts.factory.createImportSpecifier(
              undefined,
              ts.factory.createIdentifier(name)
            ),
          ])
        ),
        ts.factory.createStringLiteral(source)
      )
    );

    return node;
  }

  return node;
}

export function addInjectionProperty(
  node: ts.ClassDeclaration,
  name: string,
  propertyName: string,
  injectionType: "inject" | "injectFactory"
): ts.ClassDeclaration {
  const existingProperty = node.members.find((member) => {
    return (
      ts.isPropertyDeclaration(member) &&
      ts.isIdentifier(member.name) &&
      member.name.text === propertyName
    );
  }) as ts.PropertyDeclaration | undefined;

  const newProperty = ts.factory.createPropertyDeclaration(
    [
      ts.factory.createDecorator(
        ts.factory.createCallExpression(
          ts.factory.createIdentifier(injectionType),
          undefined,
          [ts.factory.createStringLiteral(name)]
        )
      ),
    ],
    [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
    ts.factory.createIdentifier(
      injectionType === "inject" ? name.toLowerCase() : `create${name}`
    ),
    undefined,
    injectionType === "inject"
      ? ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier(name),
          undefined
        )
      : ts.factory.createTypeReferenceNode("IFactory", [
          ts.factory.createTypeQueryNode(ts.factory.createIdentifier(name)),
        ]),
    undefined
  );

  addLineBreak(newProperty);

  return ts.factory.createClassDeclaration(
    node.decorators,
    node.modifiers,
    node.name,
    node.typeParameters,
    node.heritageClauses,
    existingProperty
      ? node.members.map((member) => {
          if (member === existingProperty) {
            return newProperty;
          }

          return member;
        })
      : [newProperty, ...node.members]
  );
}
