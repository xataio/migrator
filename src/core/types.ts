import { AirtableColumnType } from "../adaptors/airtableTypes";
import { Column as XataColumn } from "../xataWorkspace/xataWorkspaceSchemas";

export type Migration = {
  // Source of the migration
  source: {
    service: "airtable";
    /**
     * @default process.env.AIRTABLE_API_KEY
     */
    apiKey?: string;
    baseId: string;
  };

  // Target of the migration
  target: {
    service: "xata";
    /**
     * @default process.env.XATA_API_KEY
     */
    apiKey?: string;
    workspaceId: string;
    regionId: string;
    databaseName: string;
    databaseColor:
      | "gray"
      | "orange"
      | "green"
      | "blue"
      | "cyan"
      | "purple"
      | "pink";
  };

  /**
   * Function get the name of a error table
   *
   * @default (tableName) => tableName + "_error"
   */
  getTableErrorName?: (tableName: string) => string;

  /**
   * Column name formatter to provide a default between `sourceColumnName` and `targetColumnName`
   *
   * @default case.camel
   */
  columnNameFormatter?: (columnName: string) => string;

  /**
   * Table name formatter to provide a default between `sourceTableName` and `targetTableName`
   *
   * @default case.camel
   */
  tableNameFormatter?: (tableName: string) => string;

  /**
   * Skip the database creation and its schema task (step 1)
   */
  skipCreateTargetDatabase?: boolean;

  /**
   * Skip injecting the records task (step 2)
   */
  skipMigrateRecords?: boolean;

  /**
   * Skip resolve links task (step 3)
   */
  skipResolveLinks?: boolean;

  /**
   * Skip check & clean task (step 4)
   */
  skipCheckAndClean?: boolean;

  /**
   * Tables schema definition.
   */
  tables: {
    sourceTableId: string;
    sourceTableName: string;
    /**
     * @default case.camel(sourceTableName)
     */
    targetTableName?: string;
    columns: Array<
      | ColumnProps<
          Exclude<AirtableColumnType, "multipleRecordLinks" | "formula">
        >
      | (ColumnProps<"multipleRecordLinks"> & {
          /**
           * `sourceTableName` of the linked table
           */
          linkSourceTableName: string;
          allowMultipleRecords: boolean;
        })
      | (ColumnProps<"formula"> & {
          /**
           * Target column type (need to be specified for formula)
           */
          targetColumnType: "string" | "int" | "float";
        })
    >;
  }[];
};

type ColumnProps<T> = {
  sourceColumnType: T;
  sourceColumnName: string;
  /**
   * @default case.camel(sourceColumnName)
   */
  targetColumnName?: string;
  required?: boolean;
  getValue?: (record: { id: string; fields: Record<string, unknown> }) => any;
  targetColumnType?: XataColumn["type"];
};
