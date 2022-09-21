import {
  createDatabase,
  executeBranchMigrationPlan,
  updateRecordWithID,
  upsertRecordWithID,
} from "../xata/xataComponents";
import { getXataNewTables } from "./getXataNewTables";
import { Migration } from "./types";
import dotenv from "dotenv";
import { lastValueFrom, map } from "rxjs";
import { insertRecords$ } from "./insertRecords";
import { getAllAirtableRecords$ } from "../adaptors/airtable";
import { resolveLinks } from "./resolveLinks";
import { getAllXataRecords$ } from "../adaptors/xata";

dotenv.config();

export async function migrate(migration: Migration) {
  // TODO: validate `migration` and give nice error message
  // no apiKey / baseId / workspaceId
  const newTables = getXataNewTables(migration);

  if (!migration.skipCreateTargetDatabase) {
    // Create database
    await createDatabase({
      apiKey: migration.target.apiKey,
      workspaceId: migration.target.workspaceId,
      pathParams: {
        dbName: migration.target.databaseName,
      },
      body: {
        ui: {
          color: `xata-${migration.target.databaseColor}`,
        },
      },
    });

    // Create all required tables
    await executeBranchMigrationPlan({
      apiKey: migration.target.apiKey,
      workspaceId: migration.target.workspaceId,
      body: {
        version: 0,
        migration: {
          localChanges: true,
          status: "started",
          newTables,
          newTableOrder: Object.keys(newTables),
        },
      },
      pathParams: {
        dbBranchName: `${migration.target.databaseName}:main`,
      },
    });
  }

  if (!migration.skipMigrateRecords) {
    // Insert all the records
    await lastValueFrom(
      insertRecords$({
        migration,
        getTableSourceRecords$(table) {
          return getAllAirtableRecords$({
            baseId: migration.source.baseId,
            apiKey: migration.source.apiKey,
            tableId: table.sourceTableId,
          }).pipe(map((r) => ({ ...r, table })));
        },
        upsertRecord(payload) {
          return upsertRecordWithID({
            apiKey: migration.target.apiKey,
            workspaceId: migration.target.workspaceId,
            pathParams: {
              dbBranchName: migration.target.databaseName + ":main",
              recordId: payload.id,
              tableName: payload.tableName,
            },
            body: payload.fields,
          });
        },
      })
    );
  }

  if (!migration.skipResolveLinks) {
    // Resolved link
    await lastValueFrom(
      resolveLinks({
        xataSchema: {
          tables: Object.values(newTables),
        },
        getTableTargetRecords$(tableName) {
          return getAllXataRecords$({
            workspaceId: migration.target.workspaceId,
            apiKey: migration.target.apiKey,
            branch: "main",
            databaseName: migration.target.databaseName,
            tableName,
          }).pipe(map(({ id, ...fields }) => ({ id, fields })));
        },
        updateRecord(payload) {
          return updateRecordWithID({
            apiKey: migration.target.apiKey,
            workspaceId: migration.target.workspaceId,
            pathParams: {
              dbBranchName: migration.target.databaseName + ":main",
              recordId: payload.id,
              tableName: payload.tableName,
            },
            body: payload.fields,
          });
        },
      })
    );
  }

  // Check & cleanup
  // - all links must be resolved
  // - remove all `_error` empty table
  // - report if something is wrong

  console.log(
    `Your xatabase is ready! https://app.xata.io/workspaces/${migration.target.workspaceId}/dbs/${migration.target.databaseName}`
  );
}
