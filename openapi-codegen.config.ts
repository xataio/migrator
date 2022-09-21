import {
  generateFetchers,
  generateSchemaTypes,
  renameComponent,
} from "@openapi-codegen/typescript";
import { defineConfig } from "@openapi-codegen/cli";
export default defineConfig({
  xata: {
    from: {
      source: "url",
      url: "https://docs.xata.io/api/openapi",
    },
    outputDir: "src/xata",
    to: async (context) => {
      // Avoid conflict with typescript `Record<>` type helper
      context.openAPIDocument = renameComponent({
        openAPIDocument: context.openAPIDocument,
        from: "#/components/schemas/Record",
        to: "#/components/schemas/XataRecord",
      });

      const filenamePrefix = "xata";

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
