import { camel } from "case";
import { AirtableColumnType } from "../adaptors/airtableTypes";
import { Column as XataColumn, Table } from "../xata/xataSchemas";
import { Migration } from "./types";

type XataTableName = string;
export type XataTables = Record<
  XataTableName,
  { name: string; columns: XataColumn[] }
>;

export const getXataNewTables = (migration: Migration) => {
  const tableNameFormatter = migration.tableNameFormatter ?? camel;
  const columnNameFormatter = migration.columnNameFormatter ?? camel;
  const getTableErrorName =
    migration.getTableErrorName ??
    ((tableName: string) => tableName + "_error");

  const tables: XataTables = {};
  migration.tables.forEach((table) => {
    const tableName =
      table.targetTableName ?? tableNameFormatter(table.sourceTableName);

    // success table
    tables[tableName] = {
      name: tableName,
      columns: table.columns.reduce((mem, column) => {
        const columnName =
          column.targetColumnName ??
          columnNameFormatter(column.sourceColumnName);

        // Links
        if (column.sourceColumnType === "multipleRecordLinks") {
          const linkedTable: Migration["tables"][-1] | undefined =
            migration.tables.find(
              (t) => t.sourceTableName === column.linkSourceTableName
            );

          if (!linkedTable) {
            throw new Error(
              `${column.linkSourceTableName} link table not found!`
            );
          }
          const linkedTableName =
            linkedTable.targetTableName ??
            tableNameFormatter(linkedTable.sourceTableName);

          if (column.allowMultipleRecords) {
            // n-n relationship - we are creating a link table
            tables[`${tableName}_${columnName}`] = {
              name: `${tableName}_${columnName}`,
              columns: [
                { name: tableName, type: "link", link: { table: tableName } },
                { name: tableName + "_unresolved", type: "string" },
                {
                  name: linkedTableName,
                  type: "link",
                  link: { table: linkedTableName },
                },
                {
                  name: linkedTableName + "_unresolved",
                  type: "string",
                },
              ],
            };
            return mem;
          } else {
            return [
              ...mem,
              {
                name: columnName + "_unresolved",
                type: "string",
              },
              {
                name: columnName,
                type: "link",
                link: {
                  table: linkedTableName,
                },
              },
            ];
          }
        }

        // Attachments
        if (column.sourceColumnType === "multipleAttachments") {
          tables.attachments = attachmentsTable;

          tables[`${tableName}_${columnName}`] = {
            name: `${tableName}_${columnName}`,
            columns: [
              { name: tableName, type: "link", link: { table: tableName } },
              { name: tableName + "_unresolved", type: "string" },
              {
                name: "attachments",
                type: "link",
                link: { table: "attachments" },
              },
              {
                name: "attachments_unresolved",
                type: "string",
              },
            ],
          };
          return mem;
        }

        return [
          ...mem,
          {
            name: columnName,
            type:
              column.targetColumnType ??
              airtableToXataColumnType(column.sourceColumnType),
          },
        ];
      }, [] as XataColumn[]),
    };

    // error table
    tables[getTableErrorName(tableName)] = {
      name: getTableErrorName(tableName),
      columns: tables[tableName].columns
        .filter((i) => i.type !== "link")
        .map((i) => ({
          name: i.name,
          type: "string",
        })),
    };
  });

  return tables;
};

const airtableToXataColumnType = (
  type: AirtableColumnType
): XataColumn["type"] => {
  switch (type) {
    case "autoNumber":
    case "barcode":
    case "count":
    case "number":
    case "rating":
      return "int";

    case "currency":
    case "duration":
    case "percent":
      return "float";

    case "email":
      return "email";
    case "checkbox":
      return "bool";

    case "date":
    case "dateTime":
      return "datetime";

    case "text":
    case "longText":
    case "richText":
      return "text";

    case "multipleSelects":
      return "multiple";
  }

  return "string";
};

const attachmentsTable: Table = {
  name: "attachments",
  columns: [
    { name: "url", type: "string" },
    { name: "filename", type: "string" },
    { name: "size", type: "int" },
    { name: "width", type: "int" },
    { name: "height", type: "int" },
    { name: "type", type: "string" },
    {
      name: "thumbnails",
      type: "object",
      columns: [
        {
          name: "small",
          type: "object",
          columns: [
            { name: "url", type: "string" },
            { name: "height", type: "int" },
            { name: "width", type: "int" },
          ],
        },
        {
          name: "large",
          type: "object",
          columns: [
            { name: "url", type: "string" },
            { name: "height", type: "int" },
            { name: "width", type: "int" },
          ],
        },
        {
          name: "full",
          type: "object",
          columns: [
            { name: "url", type: "string" },
            { name: "height", type: "int" },
            { name: "width", type: "int" },
          ],
        },
      ],
    },
  ],
};
