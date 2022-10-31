import {
  generateSchemaTypes,
  generateFetchers,
  renameComponent,
} from "@openapi-codegen/typescript";
import { defineConfig } from "@openapi-codegen/cli";
import { Context } from "@openapi-codegen/cli/lib/types";

export default defineConfig({
  // Workspace API  https://xata.io/docs/web-api/contexts#workspace-api
  xataWorkspace: {
    from: {
      source: "github",
      owner: "xataio",
      ref: "main",
      repository: "xata",
      specPath: "openapi/bundled/xata_sh.yaml",
    },
    outputDir: "src/xataWorkspace",
    to: async (context) => {
      const filenamePrefix = "xataWorkspace";

      // Avoid conflict with typescript `Record<>` type helper
      context.openAPIDocument = renameComponent({
        openAPIDocument: context.openAPIDocument,
        from: "#/components/schemas/Record",
        to: "#/components/schemas/XataRecord",
      });

      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateFetchers(context, {
        filenamePrefix,
        schemasFiles,
      });
    },
  },

  // Core API https://xata.io/docs/web-api/contexts#core-api
  xataCore: {
    from: {
      source: "github",
      owner: "xataio",
      ref: "main",
      repository: "xata",
      specPath: "openapi/bundled/api_xata_io.yaml",
    },
    outputDir: "./src/xataCore",
    to: async (context) => {
      const filenamePrefix = "xataCore";

      context.openAPIDocument = removeDraftPaths({
        openAPIDocument: context.openAPIDocument,
      });

      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateFetchers(context, {
        filenamePrefix,
        schemasFiles,
      });
    },
  },
});

function removeDraftPaths({
  openAPIDocument,
}: {
  openAPIDocument: Context["openAPIDocument"];
}) {
  const paths = Object.fromEntries(
    Object.entries(openAPIDocument.paths).map(([route, verbs]) => {
      const updatedVerbs = Object.entries(verbs).reduce(
        (acc, [verb, operation]) => {
          if (isVerb(verb) && isDraft(operation)) {
            return acc;
          }

          return { ...acc, [verb]: operation };
        },
        {}
      );

      return [route, updatedVerbs];
    })
  );

  return { ...openAPIDocument, paths };
}

const isVerb = (
  verb: string
): verb is "get" | "post" | "patch" | "put" | "delete" =>
  ["get", "post", "patch", "put", "delete"].includes(verb);

const isDraft = (operation: unknown) => {
  if (!operation || typeof operation !== "object") {
    return false;
  }

  return (operation as Record<string, unknown>)["x-draft"] === true;
};
