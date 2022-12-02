import { EMPTY, lastValueFrom, Observable } from "rxjs";
import { describe, it, expect, vi } from "vitest";
import { insertRecords$, SourceRecord } from "./insertRecords";
import { Migration } from "./types";

const source: Migration["source"] = {
  apiKey: "",
  baseId: "",
  service: "airtable",
};

const target: Migration["target"] = {
  apiKey: "",
  databaseColor: "gray",
  databaseName: "myDb",
  service: "xata",
  workspaceId: "myWorkspace",
  regionId: "my-region",
};

describe("insertRecords", () => {
  it("should filter empty records", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "team",
        sourceTableId: "team",
        columns: [
          { sourceColumnName: "name", sourceColumnType: "text" },
          { sourceColumnName: "age", sourceColumnType: "number" },
          { sourceColumnName: "isCool", sourceColumnType: "checkbox" },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});
    const getTableSourceRecords$ = () =>
      new Observable<SourceRecord>((s) => {
        s.next({
          table: tables[0],
          id: "1-empty",
          fields: {},
        });

        s.next({
          table: tables[0],
          id: "2-empty",
          fields: { notInTheSchema: "you should not care" },
        });

        return s.complete();
      });

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    ).catch((e) => {
      expect(e.message).toBe("no elements in sequence");
    });

    expect(upsertRecord).not.toBeCalled();
  });

  it("should insert record in the success table", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "team",
        sourceTableId: "team",
        columns: [
          { sourceColumnName: "name", sourceColumnType: "text" },
          { sourceColumnName: "age", sourceColumnType: "number" },
          { sourceColumnName: "isCool", sourceColumnType: "checkbox" },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});
    const getTableSourceRecords$ = () =>
      new Observable<SourceRecord>((s) => {
        s.next({
          table: tables[0],
          id: "1-success",
          fields: {
            name: "fabien",
            age: 33,
          },
        });

        s.next({
          table: tables[0],
          id: "2-success",
          fields: {
            name: "tejas",
            isCool: true,
          },
        });

        return s.complete();
      });

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    );

    expect(upsertRecord).toBeCalledWith({
      tableName: "team",
      id: "1-success",
      fields: {
        name: "fabien",
        age: 33,
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "team",
      id: "2-success",
      fields: {
        name: "tejas",
        isCool: true,
      },
    });
  });

  it("should process the column names", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "team",
        sourceTableId: "team",
        columns: [
          // should be `name`
          { sourceColumnName: "Name", sourceColumnType: "text" },
          // should be `age`
          {
            sourceColumnName: "How old are you?",
            targetColumnName: "age",
            sourceColumnType: "number",
          },
          { sourceColumnName: "isCool", sourceColumnType: "checkbox" },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});
    const getTableSourceRecords$ = () =>
      new Observable<SourceRecord>((s) => {
        s.next({
          table: tables[0],
          id: "1-success",
          fields: {
            Name: "fabien",
            ["How old are you?"]: 33,
          },
        });

        s.next({
          table: tables[0],
          id: "2-success",
          fields: {
            Name: "tejas",
            isCool: true,
          },
        });

        return s.complete();
      });

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    );

    expect(upsertRecord).toBeCalledWith({
      tableName: "team",
      id: "1-success",
      fields: {
        name: "fabien",
        age: 33,
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "team",
      id: "2-success",
      fields: {
        name: "tejas",
        isCool: true,
      },
    });
  });

  it("should insert record in the error table", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "team",
        sourceTableId: "team",
        columns: [
          {
            sourceColumnName: "name",
            sourceColumnType: "text",
            required: true,
          },
          { sourceColumnName: "age", sourceColumnType: "number" },
          { sourceColumnName: "isCool", sourceColumnType: "checkbox" },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});

    const getTableSourceRecords$ = () =>
      new Observable<SourceRecord>((s) => {
        s.next({
          table: tables[0],
          id: "1-error",
          fields: {
            // no name? 🤔
            age: 33,
          },
        });

        s.next({
          table: tables[0],
          id: "2-error",
          fields: {
            name: "tejas",
            isCool: "of course!", // not a boolean
          },
        });

        return s.complete();
      });

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    );

    expect(upsertRecord).toBeCalledWith({
      tableName: "team_error",
      id: "1-error",
      fields: {
        age: "33",
        __reasons: '[{"key":"name","message":"Required"}]',
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "team_error",
      id: "2-error",
      fields: {
        name: "tejas",
        __reasons:
          '[{"key":"isCool","message":"Expected boolean, received string"}]',
        isCool: "of course!",
      },
    });
  });

  it("should deal with link (multiple = false)", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "Team",
        sourceTableId: "team",
        columns: [
          {
            sourceColumnName: "name",
            sourceColumnType: "text",
          },
        ],
      },
      {
        sourceTableName: "Team member",
        sourceTableId: "team_member",
        columns: [
          {
            sourceColumnName: "name",
            sourceColumnType: "text",
          },
          {
            sourceColumnName: "Team",
            sourceColumnType: "multipleRecordLinks",
            allowMultipleRecords: false,
            linkSourceTableName: "Team",
          },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});
    const getTableSourceRecords$ = (table: Migration["tables"][-1]) => {
      if (table.sourceTableId === "team")
        return new Observable<SourceRecord>((s) => {
          s.next({
            table: tables[0],
            id: "1-team",
            fields: {
              name: "devrel",
            },
          });
          return s.complete();
        });

      if (table.sourceTableId === "team_member")
        return new Observable<SourceRecord>((s) => {
          s.next({
            table: tables[1],
            id: "1-team-member",
            fields: {
              name: "tejas",
              Team: ["1-team"],
            },
          });

          s.next({
            table: tables[1],
            id: "2-team-member",
            fields: {
              name: "fabien",
              Team: ["1-team"],
            },
          });

          s.next({
            table: tables[1],
            id: "3-team-member",
            fields: {
              name: "atila",
              Team: ["1-team"],
            },
          });

          return s.complete();
        });

      return EMPTY;
    };

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    );

    expect(upsertRecord).toBeCalledWith({
      tableName: "team",
      id: "1-team",
      fields: {
        name: "devrel",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "teamMember",
      id: "1-team-member",
      fields: {
        name: "tejas",
        team_unresolved: "1-team",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "teamMember",
      id: "2-team-member",
      fields: {
        name: "fabien",
        team_unresolved: "1-team",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "teamMember",
      id: "3-team-member",
      fields: {
        name: "atila",
        team_unresolved: "1-team",
      },
    });
  });

  it("should deal with link (multiple = true)", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "Team",
        sourceTableId: "team",
        columns: [
          {
            sourceColumnName: "name",
            sourceColumnType: "text",
          },
        ],
      },
      {
        sourceTableName: "Team member",
        sourceTableId: "team_member",
        columns: [
          {
            sourceColumnName: "name",
            sourceColumnType: "text",
          },
          {
            sourceColumnName: "Team",
            sourceColumnType: "multipleRecordLinks",
            allowMultipleRecords: true,
            linkSourceTableName: "Team",
          },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});
    const getTableSourceRecords$ = (table: Migration["tables"][-1]) => {
      if (table.sourceTableId === "team")
        return new Observable<SourceRecord>((s) => {
          s.next({
            table: tables[0],
            id: "1-team",
            fields: {
              name: "devrel",
            },
          });
          return s.complete();
        });

      if (table.sourceTableId === "team_member")
        return new Observable<SourceRecord>((s) => {
          s.next({
            table: tables[1],
            id: "1-team-member",
            fields: {
              name: "tejas",
              Team: ["1-team"],
            },
          });

          s.next({
            table: tables[1],
            id: "2-team-member",
            fields: {
              name: "fabien",
              Team: ["1-team"],
            },
          });

          s.next({
            table: tables[1],
            id: "3-team-member",
            fields: {
              name: "atila",
              Team: ["1-team"],
            },
          });

          return s.complete();
        });

      return EMPTY;
    };

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    );

    // team table
    expect(upsertRecord).toHaveBeenCalledWith({
      tableName: "team",
      id: "1-team",
      fields: {
        name: "devrel",
      },
    });

    // teamMember_team table
    expect(upsertRecord).toBeCalledWith({
      tableName: "teamMember_team",
      id: "1-team-member_1-team",
      fields: {
        teamMember_unresolved: "1-team-member",
        team_unresolved: "1-team",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "teamMember_team",
      id: "2-team-member_1-team",
      fields: {
        teamMember_unresolved: "2-team-member",
        team_unresolved: "1-team",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "teamMember_team",
      id: "3-team-member_1-team",
      fields: {
        teamMember_unresolved: "3-team-member",
        team_unresolved: "1-team",
      },
    });

    // teamMember table
    expect(upsertRecord).toBeCalledWith({
      tableName: "teamMember",
      id: "1-team-member",
      fields: {
        name: "tejas",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "teamMember",
      id: "2-team-member",
      fields: {
        name: "fabien",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "teamMember",
      id: "3-team-member",
      fields: {
        name: "atila",
      },
    });
  });

  it("should deal with attachment", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "team",
        sourceTableId: "team",
        columns: [
          { sourceColumnName: "name", sourceColumnType: "text" },
          {
            sourceColumnName: "profile picture",
            sourceColumnType: "multipleAttachments",
          },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});

    const { id, ...img } = {
      id: "attPYLJXtmYqR1k5E",
      width: 1280,
      height: 720,
      url: "https://dl.airtable.com/.attachments/54638b76b24edc9bf315fc5c83ec8846/c699c25d/webcam-919202242749PM.png",
      filename: "webcam-9/19/2022, 4:27:49 PM.png",
      size: 484374,
      type: "image/png",
      thumbnails: {
        small: {
          url: "https://dl.airtable.com/.attachmentThumbnails/0b0eaf08d64b13f6293ab793e7e91e0b/833eb787",
          width: 64,
          height: 36,
        },
        large: {
          url: "https://dl.airtable.com/.attachmentThumbnails/cfed81c89849ae68170bb4362f3befcc/2b2a08b1",
          width: 910,
          height: 512,
        },
        full: {
          url: "https://dl.airtable.com/.attachmentThumbnails/85bf08f479369a6456fe3669f628f6ae/e2b818e3",
          width: 3000,
          height: 3000,
        },
      },
    };

    const getTableSourceRecords$ = () =>
      new Observable<SourceRecord>((s) => {
        s.next({
          table: tables[0],
          id: "1-success",
          fields: {
            name: "fabien",
            ["profile picture"]: [{ id, ...img }],
          },
        });

        return s.complete();
      });

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    );

    expect(upsertRecord).toBeCalledWith({
      tableName: "attachments",
      id: id,
      fields: img,
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "team_profilePicture",
      id: "1-success_" + id,
      fields: {
        team_unresolved: "1-success",
        attachments_unresolved: id,
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "team",
      id: "1-success",
      fields: {
        name: "fabien",
      },
    });
  });

  it("should deal with single collaborator", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "todo",
        sourceTableId: "todo",
        columns: [
          { sourceColumnName: "description", sourceColumnType: "text" },
          {
            sourceColumnName: "assignee",
            sourceColumnType: "singleCollaborator",
          },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});

    const getTableSourceRecords$ = () =>
      new Observable<SourceRecord>((s) => {
        s.next({
          table: tables[0],
          id: "1-success",
          fields: {
            description: "Finish Airtable migrator",
            assignee: {
              id: "fafa",
              name: "Fabien Bernard",
              email: "fabien0102@xata.io",
            },
          },
        });

        return s.complete();
      });

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    );

    expect(upsertRecord).toBeCalledWith({
      tableName: "todo",
      id: "1-success",
      fields: {
        description: "Finish Airtable migrator",
        assignee_unresolved: "fafa",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "collaborators",
      id: "fafa",
      fields: {
        name: "Fabien Bernard",
        email: "fabien0102@xata.io",
      },
    });
  });

  it("should deal with single collaborator (undefined)", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "todo",
        sourceTableId: "todo",
        columns: [
          { sourceColumnName: "description", sourceColumnType: "text" },
          {
            sourceColumnName: "assignee",
            sourceColumnType: "singleCollaborator",
          },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});

    const getTableSourceRecords$ = () =>
      new Observable<SourceRecord>((s) => {
        s.next({
          table: tables[0],
          id: "1-success",
          fields: {
            description: "Finish Airtable migrator",
          },
        });

        return s.complete();
      });

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    );

    expect(upsertRecord).toBeCalledWith({
      tableName: "todo",
      id: "1-success",
      fields: {
        description: "Finish Airtable migrator",
      },
    });
  });

  it("should deal with multiple collaborators", async () => {
    const tables: Migration["tables"] = [
      {
        sourceTableName: "todo",
        sourceTableId: "todo",
        columns: [
          { sourceColumnName: "description", sourceColumnType: "text" },
          {
            sourceColumnName: "assignees",
            sourceColumnType: "multipleCollaborators",
          },
        ],
      },
    ];

    const upsertRecord = vi.fn(async () => {});

    const getTableSourceRecords$ = () =>
      new Observable<SourceRecord>((s) => {
        s.next({
          table: tables[0],
          id: "1-success",
          fields: {
            description: "Finish Airtable migrator",
            assignees: [
              {
                id: "fafa",
                name: "Fabien Bernard",
                email: "fabien0102@xata.io",
              },
              {
                id: "tejas",
                name: "Tejas Kumar",
                email: "tejas@xata.io",
              },
            ],
          },
        });

        return s.complete();
      });

    await lastValueFrom(
      insertRecords$({
        migration: {
          tables,
          source,
          target,
        },
        getTableSourceRecords$,
        upsertRecord,
      })
    );

    expect(upsertRecord).toBeCalledWith({
      tableName: "todo",
      id: "1-success",
      fields: {
        description: "Finish Airtable migrator",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "todo_assignees",
      id: "1-success_fafa",
      fields: {
        collaborators_unresolved: "fafa",
        todo_unresolved: "1-success",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "todo_assignees",
      id: "1-success_tejas",
      fields: {
        collaborators_unresolved: "tejas",
        todo_unresolved: "1-success",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "collaborators",
      id: "fafa",
      fields: {
        name: "Fabien Bernard",
        email: "fabien0102@xata.io",
      },
    });

    expect(upsertRecord).toBeCalledWith({
      tableName: "collaborators",
      id: "tejas",
      fields: {
        name: "Tejas Kumar",
        email: "tejas@xata.io",
      },
    });
  });
});
