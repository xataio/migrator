import { describe, it, expect } from "vitest";
import { BranchMigration } from "../xata/xataSchemas";
import { getXataNewTables } from "./getXataNewTables";
import { Migration } from "./types";

describe("getXataNewTables", () => {
  it("should create a simple table", () => {
    const migration: Migration = {
      source: {
        service: "airtable",
        apiKey: "",
        baseId: "",
      },
      target: {
        service: "xata",
        apiKey: "",
        databaseColor: "green",
        databaseName: "mydb",
        workspaceId: "myws",
      },
      tables: [
        {
          sourceTableId: "1",
          sourceTableName: "team",
          columns: [
            { sourceColumnName: "name", sourceColumnType: "text" },
            { sourceColumnName: "age", sourceColumnType: "number" },
            { sourceColumnName: "email", sourceColumnType: "email" },
          ],
        },
      ],
    };

    const expected: BranchMigration["newTables"] = {
      team: {
        name: "team",
        columns: [
          {
            name: "name",
            type: "text",
          },
          { name: "age", type: "int" },
          { name: "email", type: "email" },
        ],
      },
      team_error: {
        name: "team_error",
        columns: [
          { name: "__reasons", type: "text" },
          {
            name: "name",
            type: "text",
          },
          { name: "age", type: "text" },
          { name: "email", type: "text" },
        ],
      },
    };
    expect(getXataNewTables(migration)).toStrictEqual(expected);
  });

  it("should deal with links (multiple = false)", () => {
    const migration: Migration = {
      source: {
        service: "airtable",
        apiKey: "",
        baseId: "",
      },
      target: {
        service: "xata",
        apiKey: "",
        databaseColor: "pink",
        databaseName: "mydb",
        workspaceId: "myws",
      },
      tables: [
        {
          sourceTableId: "1",
          sourceTableName: "Team member",
          columns: [
            { sourceColumnName: "name", sourceColumnType: "text" },
            { sourceColumnName: "age", sourceColumnType: "number" },
            { sourceColumnName: "email", sourceColumnType: "email" },
            {
              sourceColumnName: "team",
              sourceColumnType: "multipleRecordLinks",
              allowMultipleRecords: false,
              linkSourceTableName: "Team",
            },
          ],
        },
        {
          sourceTableId: "2",
          sourceTableName: "Team",
          columns: [{ sourceColumnName: "name", sourceColumnType: "text" }],
        },
      ],
    };

    const expected: BranchMigration["newTables"] = {
      teamMember: {
        name: "teamMember",
        columns: [
          {
            name: "name",
            type: "text",
          },
          { name: "age", type: "int" },
          { name: "email", type: "email" },
          { name: "team_unresolved", type: "string" },
          {
            name: "team",
            type: "link",
            link: {
              table: "team",
            },
          },
        ],
      },
      teamMember_error: {
        name: "teamMember_error",
        columns: [
          { name: "__reasons", type: "text" },
          {
            name: "name",
            type: "text",
          },
          { name: "age", type: "text" },
          { name: "email", type: "text" },
          { name: "team", type: "text" },
        ],
      },
      team: {
        name: "team",
        columns: [
          {
            name: "name",
            type: "text",
          },
        ],
      },
      team_error: {
        name: "team_error",
        columns: [
          { name: "__reasons", type: "text" },
          {
            name: "name",
            type: "text",
          },
        ],
      },
    };

    expect(getXataNewTables(migration)).toStrictEqual(expected);
  });

  it("should deal with links (multiple = true)", () => {
    const migration: Migration = {
      source: {
        service: "airtable",
        apiKey: "",
        baseId: "",
      },
      target: {
        service: "xata",
        apiKey: "",
        databaseColor: "pink",
        databaseName: "mydb",
        workspaceId: "myws",
      },
      tables: [
        {
          sourceTableId: "1",
          sourceTableName: "Team member",
          columns: [
            { sourceColumnName: "name", sourceColumnType: "text" },
            { sourceColumnName: "age", sourceColumnType: "number" },
            { sourceColumnName: "email", sourceColumnType: "email" },
            {
              sourceColumnName: "team",
              sourceColumnType: "multipleRecordLinks",
              allowMultipleRecords: true,
              linkSourceTableName: "Team",
            },
          ],
        },
        {
          sourceTableId: "2",
          sourceTableName: "Team",
          columns: [{ sourceColumnName: "name", sourceColumnType: "text" }],
        },
      ],
    };

    const expected: BranchMigration["newTables"] = {
      teamMember: {
        name: "teamMember",
        columns: [
          {
            name: "name",
            type: "text",
          },
          { name: "age", type: "int" },
          { name: "email", type: "email" },
        ],
      },
      teamMember_error: {
        name: "teamMember_error",
        columns: [
          { name: "__reasons", type: "text" },
          {
            name: "name",
            type: "text",
          },
          { name: "age", type: "text" },
          { name: "email", type: "text" },
          { name: "team", type: "text" },
        ],
      },
      teamMember_team: {
        name: "teamMember_team",
        columns: [
          { name: "teamMember", type: "link", link: { table: "teamMember" } },
          { name: "teamMember_unresolved", type: "string" },
          { name: "team", type: "link", link: { table: "team" } },
          { name: "team_unresolved", type: "string" },
        ],
      },
      team: {
        name: "team",
        columns: [
          {
            name: "name",
            type: "text",
          },
        ],
      },
      team_error: {
        name: "team_error",
        columns: [
          { name: "__reasons", type: "text" },
          {
            name: "name",
            type: "text",
          },
        ],
      },
    };

    expect(getXataNewTables(migration)).toStrictEqual(expected);
  });

  it("should deal with attachments", () => {
    const migration: Migration = {
      source: {
        service: "airtable",
        apiKey: "",
        baseId: "",
      },
      target: {
        service: "xata",
        apiKey: "",
        databaseColor: "pink",
        databaseName: "mydb",
        workspaceId: "myws",
      },
      tables: [
        {
          sourceTableId: "1",
          sourceTableName: "users",
          columns: [
            { sourceColumnName: "name", sourceColumnType: "text" },
            {
              sourceColumnName: "profile picture",
              sourceColumnType: "multipleAttachments",
            },
          ],
        },
      ],
    };

    const expected: BranchMigration["newTables"] = {
      attachments: {
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
      },
      users: {
        name: "users",
        columns: [{ name: "name", type: "text" }],
      },
      users_error: {
        name: "users_error",
        columns: [
          { name: "__reasons", type: "text" },
          { name: "name", type: "text" },
          { name: "profilePicture", type: "text"}
        ],
      },
      users_profilePicture: {
        name: "users_profilePicture",
        columns: [
          { name: "users", type: "link", link: { table: "users" } },
          { name: "users_unresolved", type: "string" },
          { name: "attachments", type: "link", link: { table: "attachments" } },
          { name: "attachments_unresolved", type: "string" },
        ],
      },
    };

    expect(getXataNewTables(migration)).toStrictEqual(expected);
  });

  it("should deal with collaborator", () => {
    const migration: Migration = {
      source: {
        service: "airtable",
        apiKey: "",
        baseId: "",
      },
      target: {
        service: "xata",
        apiKey: "",
        databaseColor: "pink",
        databaseName: "mydb",
        workspaceId: "myws",
      },
      tables: [
        {
          sourceTableName: "todolist",
          sourceTableId: "todolist",
          columns: [
            { sourceColumnName: "note", sourceColumnType: "richText" },
            {
              sourceColumnName: "assignee",
              sourceColumnType: "singleCollaborator",
            },
          ],
        },
      ],
    };

    const expected: BranchMigration["newTables"] = {
      todolist: {
        name: "todolist",
        columns: [
          { name: "note", type: "text" },
          {
            name: "assignee_unresolved",
            type: "string",
          },
          {
            name: "assignee",
            type: "link",
            link: {
              table: "collaborators",
            },
          },
        ],
      },
      collaborators: {
        name: "collaborators",
        columns: [
          { name: "email", type: "email" },
          { name: "name", type: "string" },
        ],
      },
      todolist_error: {
        name: "todolist_error",
        columns: [
          { name: "__reasons", type: "text" },
          { name: "note", type: "text" },
          {
            name: "assignee",
            type: "text",
          },
        ],
      },
    };

    expect(getXataNewTables(migration)).toEqual(expected);
  });

  it("should deal with multiple collaborators", () => {
    const migration: Migration = {
      source: {
        service: "airtable",
        apiKey: "",
        baseId: "",
      },
      target: {
        service: "xata",
        apiKey: "",
        databaseColor: "pink",
        databaseName: "mydb",
        workspaceId: "myws",
      },
      tables: [
        {
          sourceTableName: "todolist",
          sourceTableId: "todolist",
          columns: [
            { sourceColumnName: "note", sourceColumnType: "richText" },
            {
              sourceColumnName: "assignees",
              sourceColumnType: "multipleCollaborators",
            },
          ],
        },
      ],
    };

    const expected: BranchMigration["newTables"] = {
      todolist: {
        name: "todolist",
        columns: [{ name: "note", type: "text" }],
      },
      todolist_error: {
        name: "todolist_error",
        columns: [
          { name: "__reasons", type: "text" },
          { name: "note", type: "text" },
          { name: "assignees", type: "text"}
        ],
      },
      todolist_assignees: {
        name: "todolist_assignees",
        columns: [
          {
            name: "todolist",
            type: "link",
            link: {
              table: "todolist",
            },
          },
          {
            name: "todolist_unresolved",
            type: "string",
          },
          {
            name: "collaborators",
            type: "link",
            link: {
              table: "collaborators",
            },
          },
          {
            name: "collaborators_unresolved",
            type: "string",
          },
        ],
      },
      collaborators: {
        name: "collaborators",
        columns: [
          { name: "email", type: "email" },
          { name: "name", type: "string" },
        ],
      },
    };

    expect(getXataNewTables(migration)).toEqual(expected);
  });

  it("should deal with object types", () => {
    const migration: Migration = {
      source: {
        service: "airtable",
        apiKey: "",
        baseId: "",
      },
      target: {
        service: "xata",
        apiKey: "",
        databaseColor: "pink",
        databaseName: "mydb",
        workspaceId: "myws",
      },
      tables: [
        {
          sourceTableName: "objects",
          sourceTableId: "objects",
          columns: [
            {
              sourceColumnName: "barcode",
              sourceColumnType: "barcode",
            },
            {
              sourceColumnName: "button",
              sourceColumnType: "button",
            },
          ],
        },
      ],
    };

    const expected: BranchMigration["newTables"] = {
      objects: {
        name: "objects",
        columns: [
          {
            name: "barcode",
            type: "object",
            columns: [
              { name: "text", type: "string" },
              {
                name: "type",
                type: "string",
              },
            ],
          },
          {
            name: "button",
            type: "object",
            columns: [
              { name: "label", type: "string" },
              { name: "url", type: "string" },
            ],
          },
        ],
      },
      objects_error: {
        name: "objects_error",
        columns: [
          { name: "__reasons", type: "text" },
          {
            name: "barcode",
            type: "text",
          },
          {
            name: "button",
            type: "text",
          },
        ],
      },
    };

    expect(getXataNewTables(migration)).toEqual(expected);
  });
});
