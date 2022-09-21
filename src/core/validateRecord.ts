import { schemas } from "../adaptors/airtableTypes";
import { Migration } from "./types";

/**
 * Validate one record against a given schema.
 *
 * @returns
 */
export const validateRecord = ({
  table,
  record,
  columnNameFormatter,
}: {
  table: Migration["tables"][-1];
  record: { id: string; fields: Record<string, unknown> };
  columnNameFormatter: (columnName: string) => string;
}) =>
  table.columns.reduce<{
    isValid: boolean;
    record: { id: string; fields: Record<string, unknown> };
    reasons: { key: string; message: string }[];
    table: Migration["tables"][-1];
  }>(
    (mem, c) => {
      let value = record.fields[c.sourceColumnName];
      if (c.getValue) {
        value = c.getValue(record);
      }
      const schema = c.required
        ? schemas[c.sourceColumnType]
        : schemas[c.sourceColumnType].optional();
      const fieldValue = schema.safeParse(value);
      const fieldKey = c.targetColumnName
        ? c.targetColumnName
        : columnNameFormatter(c.sourceColumnName);

      if (fieldValue.success) {
        return {
          ...mem,
          record: {
            ...mem.record,
            fields: { ...mem.record.fields, [fieldKey]: fieldValue.data },
          },
        };
      } else {
        return {
          ...mem,
          isValid: false,
          reasons: [
            ...mem.reasons,
            {
              key: fieldKey,
              message: fieldValue.error.errors.map((e) => e.message).join(". "),
            },
          ],
          record: {
            ...mem.record,
            fields: {
              ...mem.record.fields,
              [fieldKey]: record.fields[c.sourceColumnName],
            },
          },
        };
      }
    },
    {
      isValid: true,
      reasons: [],
      record: { id: record.id, fields: {} },
      table,
    }
  );
