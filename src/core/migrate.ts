import dotenv from "dotenv";
import { lastValueFrom, map } from "rxjs";
import task, { TaskAPI } from "tasuku";

import {
  bulkInsertTableRecords,
  createDatabase,
  executeBranchMigrationPlan,
  updateRecordWithID,
} from "../xata/xataComponents";
import { getXataNewTables } from "./getXataNewTables";
import { Migration } from "./types";
import { insertRecords$ } from "./insertRecords";
import { getAllAirtableRecords$ } from "../adaptors/airtable";
import { resolveLinks } from "./resolveLinks";
import { getAllXataRecords$ } from "../adaptors/xata";

dotenv.config();

export async function migrate(migration: Migration) {
  // TODO: validate `migration` and give nice error message
  // no apiKey / baseId / workspaceId

  // Shared variables across steps
  const newTables = getXataNewTables(migration);
  const bulkOperations = new Map<string, Record<string, unknown>[]>();
  const subTasks: TaskAPI[] = [];

  await task(
    "Migrating date from Airtable to Xata",
    async ({ setTitle, task }) => {
      if (!migration.skipCreateTargetDatabase) {
        subTasks.push(
          await task(
            `Create "${migration.target.databaseName}" database`,
            async ({ task }) => {
              const createDbTask = await task("Create database", async () => {
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
              });

              const execMigrationTask = await task(
                "Execute migration plan",
                async () => {
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
              );

              // Collapse nested tasks on success
              createDbTask.clear();
              execMigrationTask.clear();
            }
          )
        );
      }

      if (!migration.skipMigrateRecords) {
        subTasks.push(
          await task("Migrate records", async ({ task }) => {
            const getRecordsTask = await task(
              "Retrieve & validate all records from Airtable",
              async () => {
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
                    async upsertRecord(payload) {
                      // Collect records for sending them later as bulk operation
                      const previousOperations =
                        bulkOperations.get(payload.tableName) || [];

                      bulkOperations.set(payload.tableName, [
                        ...previousOperations,
                        { id: payload.id, ...payload.fields },
                      ]);

                      return payload;
                    },
                  })
                );
              }
            );

            const insertRecordTask = await task.group((task) =>
              Array.from(bulkOperations.entries()).map(
                ([tableName, records]) => {
                  return task(`Insert records into ${tableName}`, () =>
                    bulkInsertTableRecords({
                      apiKey: migration.target.apiKey,
                      workspaceId: migration.target.workspaceId,
                      pathParams: {
                        dbBranchName: migration.target.databaseName + ":main",
                        tableName,
                      },
                      body: {
                        records,
                      },
                    })
                  );
                }
              )
            );

            // Collapse nested tasks on success
            getRecordsTask.clear();
            insertRecordTask.clear();
          })
        );
      }

      if (!migration.skipResolveLinks) {
        subTasks.push(
          await task("Resolve links between tables", async () => {
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
          })
        );
      }

      // Check & cleanup
      subTasks.push(
        await task("Check migration and cleanup", async () => {
          // - all links must be resolved
          // - remove all `_error` empty table - done
          // - report if something is wrong
          const emptyErrorTables = Object.keys(newTables).filter(
            (tableName) =>
              tableName.endsWith("_error") && !bulkOperations.has(tableName)
          );

          await executeBranchMigrationPlan({
            apiKey: migration.target.apiKey,
            workspaceId: migration.target.workspaceId,
            body: {
              version: 1,
              migration: {
                localChanges: true,
                status: "started",
                newTableOrder: Object.keys(newTables).filter(
                  (i) => !emptyErrorTables.includes(i)
                ),
                removedTables: emptyErrorTables,
              },
            },
            pathParams: {
              dbBranchName: `${migration.target.databaseName}:main`,
            },
          });
        })
      );

      subTasks.forEach((t) => t.clear());

      setTitle(
        `Your xatabase is ready! https://app.xata.io/workspaces/${migration.target.workspaceId}/dbs/${migration.target.databaseName}`
      );
    }
  );
}
