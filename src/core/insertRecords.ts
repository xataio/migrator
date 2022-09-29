import { camel } from "case";
import { from, mergeMap, Observable, filter, map } from "rxjs";
import { Migration } from "./types";
import { validateRecord } from "./validateRecord";
import omit from "lodash.omit";
import { collaboratorSchema } from "../adaptors/airtableTypes";

export type SourceRecord = {
  table: Migration["tables"][-1];
  id: string;
  fields: Record<string, unknown>;
};

interface InsertRecordsOptions {
  getTableSourceRecords$: (
    table: Migration["tables"][-1]
  ) => Observable<SourceRecord>;
  upsertRecord: (payload: {
    tableName: string;
    id: string;
    fields: Record<string, unknown>;
  }) => Promise<unknown>;
  migration: Migration;
}

export function insertRecords$({
  migration,
  upsertRecord,
  getTableSourceRecords$,
}: InsertRecordsOptions) {
  const getTableErrorName =
    migration.getTableErrorName ??
    ((tableName: string) => tableName + "_error");
  const tableNameFormatter = migration.tableNameFormatter ?? camel;
  const columnNameFormatter = migration.columnNameFormatter ?? camel;

  return from(migration.tables).pipe(
    // Get records stream
    mergeMap(getTableSourceRecords$),

    // Filter empty records
    filter(({ table, fields }) =>
      table.columns.reduce((mem, i) => {
        return mem || typeof fields[i.sourceColumnName] !== "undefined";
      }, false)
    ),

    // Validate records
    map(({ table, ...record }) =>
      validateRecord({
        table,
        record,
        columnNameFormatter,
      })
    ),

    // Insert the records in the appropriate table
    mergeMap(async ({ table, record, isValid, reasons }) => {
      if (isValid) {
        // Create n-n records (links & attachments)
        const { fields, linkedRecords } = processLinks({
          columnNameFormatter,
          tableNameFormatter,
          fields: record.fields,
          table,
          id: record.id,
        });

        if (linkedRecords.length > 0) {
          await Promise.all(linkedRecords.map((r) => upsertRecord(r)));
        }

        return upsertRecord({
          tableName:
            table.targetTableName ?? tableNameFormatter(table.sourceTableName),
          id: record.id,
          fields,
        });
      } else {
        // TODO: insert `reasons`
        console.log(reasons);
        return upsertRecord({
          tableName: getTableErrorName(
            table.targetTableName ?? tableNameFormatter(table.sourceTableName)
          ),
          id: record.id,
          fields: Object.entries(record.fields).reduce(
            (mem, [key, value]) => ({
              ...mem,
              [key]:
                typeof value === "undefined"
                  ? undefined
                  : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value),
            }),
            {}
          ),
        });
      }
    })
  );
}

function processLinks({
  table,
  fields,
  id,
  columnNameFormatter,
  tableNameFormatter,
}: {
  table: Migration["tables"][-1];
  id: string;
  fields: Record<string, unknown>;
  columnNameFormatter: (columnName: string) => string;
  tableNameFormatter: (tableName: string) => string;
}) {
  const toSkip = new Set<string>();
  const toSuffix = new Set<string>();
  const linkedRecords = new Array<
    Parameters<InsertRecordsOptions["upsertRecord"]>[0]
  >();

  table.columns.forEach((c) => {
    const isLink =
      c.sourceColumnType === "multipleRecordLinks" &&
      c.allowMultipleRecords === false;

    const isMultipleLinks =
      c.sourceColumnType === "multipleRecordLinks" &&
      c.allowMultipleRecords === true;

    const isAttachments = c.sourceColumnType === "multipleAttachments";
    const isCollaborator = c.sourceColumnType === "singleCollaborator";
    const isMultipleCollaborators =
      c.sourceColumnType === "multipleCollaborators";

    const columnName =
      c.targetColumnName ?? columnNameFormatter(c.sourceColumnName);

    if (isLink) {
      toSuffix.add(columnName);
    }

    if (isCollaborator) {
      toSuffix.add(columnName);
      const value = collaboratorSchema.parse(fields[columnName]);

      linkedRecords.push({
        tableName: "collaborators",
        id: value.id,
        fields: omit(value, "id"),
      });
    }

    if (isMultipleLinks || isAttachments || isMultipleCollaborators) {
      const linkedTableName = isAttachments
        ? "attachments"
        : isMultipleCollaborators
        ? "collaborators"
        : c.sourceColumnType === "multipleRecordLinks"
        ? c.linkSourceTableName
        : null;

      if (linkedTableName === null) {
        throw new Error(
          "No linked table name defined for " + c.sourceColumnType
        );
      }

      toSkip.add(columnName);

      const values = fields[columnName];

      if (Array.isArray(values) && values.length > 0) {
        values.forEach((value) => {
          // Add attachment / collaborator
          if (isAttachments || isMultipleCollaborators) {
            linkedRecords.push({
              tableName: linkedTableName,
              id: value.id,
              fields: omit(value, "id"),
            });
          }

          // Add record into the n-n table
          linkedRecords.push({
            tableName: `${
              table.targetTableName ?? tableNameFormatter(table.sourceTableName)
            }_${c.targetColumnName ?? columnNameFormatter(c.sourceColumnName)}`,
            id: `${id}_${typeof value === "string" ? value : value.id}`,
            fields: {
              [(table.targetTableName ??
                tableNameFormatter(table.sourceTableName)) + "_unresolved"]: id,
              [tableNameFormatter(linkedTableName) + "_unresolved"]:
                typeof value === "string" ? value : value.id,
            },
          });
        });
      }
    }
  });

  return {
    linkedRecords,
    fields: Object.entries(fields).reduce((mem, [fieldKey, fieldValue]) => {
      if (toSkip.has(fieldKey)) return mem;
      if (toSuffix.has(fieldKey))
        return {
          ...mem,
          [fieldKey + "_unresolved"]:
            Array.isArray(fieldValue) && fieldValue.length === 1
              ? fieldValue[0]
              : typeof fieldValue === "object" &&
                fieldValue !== null &&
                "id" in fieldValue
              ? (fieldValue as { id: string }).id
              : fieldValue,
        };
      return {
        ...mem,
        [fieldKey]: fieldValue,
      };
    }, {}),
  };
}
