import dotenv from "dotenv";
import { bufferCount, catchError, from, lastValueFrom, map, tap } from "rxjs";
import task, { TaskAPI } from "tasuku";

import {
  bulkInsertTableRecords,
  createDatabase,
  executeBranchMigrationPlan,
  queryTable,
} from "../xata/xataComponents";
import { getXataNewTables } from "./getXataNewTables";
import { Migration } from "./types";
import { insertRecords$ } from "./insertRecords";
import { getAllAirtableRecords$ } from "../adaptors/airtable";
import { resolveLinks } from "./resolveLinks";
import { getAllXataRecords$ } from "../adaptors/xata";
import { verifyLinksMigration } from "./verifyLinksMigration";

dotenv.config();

export async function migrate(migration: Migration) {
  let diagnostic = "";

  const sourceAPIKey = migration.source.apiKey ?? process.env.AIRTABLE_API_KEY;

  const targetAPIKey = migration.target.apiKey ?? process.env.XATA_API_KEY;

  if (!sourceAPIKey) {
    throw new Error(
      `${migration.source.service}'s apiKey is missing, please check https://support.airtable.com/docs/how-do-i-get-my-api-key`
    );
  }

  if (!migration.source.baseId) {
    throw new Error(
      `${migration.source.service}'s baseId is missing, you can find it in the base documentation https://airtable.com/api`
    );
  }

  if (!migration.target.workspaceId) {
    throw new Error(
      `${migration.target.service}'s workspaceId is missing, you can learn how to create a workspace https://xata.io/docs/concepts/workspaces`
    );
  }

  if (!targetAPIKey) {
    throw new Error(
      `${migration.target.service}'s apiKey is missing, please check https://xata.io/docs/concepts/api-keys`
    );
  }

  // Shared variables across steps
  const newTables = getXataNewTables(migration);
  const migrateRecordsOperations = new Map<string, Record<string, unknown>[]>();
  const resolveLinksOperations = new Map<string, Record<string, unknown>[]>();
  const subTasks: TaskAPI[] = [];

  await task(
    "Migrating date from Airtable to Xata",
    async ({ setTitle, task }) => {
      // Create the database and its schema
      if (!migration.skipCreateTargetDatabase) {
        subTasks.push(
          await task(
            `Create "${migration.target.databaseName}" database`,
            async ({ task }) => {
              const createDbTask = await task("Create database", async () => {
                await createDatabase({
                  apiKey: targetAPIKey,
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
                    apiKey: targetAPIKey,
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

      // Migrate all records (with unresolved links)
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
                        apiKey: sourceAPIKey,
                        tableId: table.sourceTableId,
                      }).pipe(map((r) => ({ ...r, table })));
                    },
                    async upsertRecord(payload) {
                      // Collect records for sending them later as bulk operation
                      const previousOperations =
                        migrateRecordsOperations.get(payload.tableName) || [];

                      migrateRecordsOperations.set(payload.tableName, [
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
              Array.from(migrateRecordsOperations.entries()).map(
                ([tableName, records]) => {
                  return task(`Insert records into ${tableName}`, () =>
                    bulkInsertTableRecords({
                      apiKey: targetAPIKey,
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

      // Resolve all the links
      if (!migration.skipResolveLinks) {
        subTasks.push(
          await task(
            "Resolve links between tables",
            async ({ task, setStatus }) => {
              let recordsCount = 0;
              await lastValueFrom(
                resolveLinks({
                  xataSchema: {
                    tables: Object.values(newTables),
                  },
                  getTableTargetRecords$(tableName) {
                    return getAllXataRecords$({
                      workspaceId: migration.target.workspaceId,
                      apiKey: targetAPIKey,
                      branch: "main",
                      databaseName: migration.target.databaseName,
                      tableName,
                    }).pipe(
                      tap(() => setStatus(++recordsCount + " links found")),
                      map(({ id, ...fields }) => ({ id, fields }))
                    );
                  },
                  async updateRecord(payload) {
                    // Collect records for sending them later as bulk operation
                    const previousOperations =
                      resolveLinksOperations.get(payload.tableName) || [];

                    resolveLinksOperations.set(payload.tableName, [
                      ...previousOperations,
                      { id: payload.id, ...payload.fields },
                    ]);

                    return payload;
                  },
                })
              );

              const resolveLinksTask = await task.group((task) =>
                Array.from(resolveLinksOperations.entries()).map(
                  ([tableName, records]) => {
                    return task(`Resolve ${tableName} links`, () =>
                      lastValueFrom(
                        from(records).pipe(
                          bufferCount(100),
                          map((records) =>
                            bulkInsertTableRecords({
                              apiKey: targetAPIKey,
                              workspaceId: migration.target.workspaceId,
                              pathParams: {
                                dbBranchName:
                                  migration.target.databaseName + ":main",
                                tableName,
                              },
                              body: {
                                records,
                              },
                            })
                          ),
                          catchError(async (err) => {
                            console.log(err);
                          })
                        )
                      )
                    );
                  }
                )
              );

              // Collapse nested tasks on success
              resolveLinksTask.clear();
            }
          )
        );
      }

      // Check & cleanup
      if (!migration.skipCheckAndClean) {
        subTasks.push(
          await task("Check migration and cleanup", async () => {
            const emptyErrorTables = Object.keys(newTables).filter(
              (tableName) =>
                tableName.endsWith("_error") &&
                !migrateRecordsOperations.has(tableName)
            );

            // Add error tables in the log file
            Object.keys(newTables)
              .filter(
                (tableName) =>
                  tableName.endsWith("_error") &&
                  migrateRecordsOperations.has(tableName)
              )
              .forEach((tableName) => {
                diagnostic += `[migration error] Some errors founds in "${tableName}". See: https://app.xata.io/workspaces/${migration.target.workspaceId}/dbs/${migration.target.databaseName}/branches/main/tables/${tableName}\n`;
              });

            const links = await verifyLinksMigration({
              tables: newTables,
              async hasUnresolvedLinks(tableName, linkColumns) {
                let result = false;
                for (const column of linkColumns) {
                  const { records } = await queryTable({
                    apiKey: targetAPIKey,
                    workspaceId: migration.target.workspaceId,
                    pathParams: {
                      dbBranchName: `${migration.target.databaseName}:main`,
                      tableName,
                    },
                    body: {
                      filter: {
                        $existsNot: `${column}.id`,
                        $exists: `${column}_unresolved`,
                      },
                    },
                  });

                  if (records.length > 0) {
                    result = true;
                  }
                }
                return result;
              },
            });

            links.errorTables.forEach((t) => {
              diagnostic += `[unresolved links] Some links can't be resolve in "${t}". See: https://app.xata.io/workspaces/${migration.target.workspaceId}/dbs/${migration.target.databaseName}/branches/main/tables/${t}\n`;
            });

            await executeBranchMigrationPlan({
              apiKey: targetAPIKey,
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
                  tableMigrations: links.migration,
                },
              },
              pathParams: {
                dbBranchName: `${migration.target.databaseName}:main`,
              },
            });
          })
        );
      }

      subTasks.forEach((t) => t.clear());

      setTitle(
        `Your xatabase is ready! https://app.xata.io/workspaces/${migration.target.workspaceId}/dbs/${migration.target.databaseName}`
      );

      console.log(diagnostic);
    }
  );
}
