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
          {
            name: "name",
            type: "string",
          },
          { name: "age", type: "string" },
          { name: "email", type: "string" },
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
          {
            name: "name",
            type: "string",
          },
          { name: "age", type: "string" },
          { name: "email", type: "string" },
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
          {
            name: "name",
            type: "string",
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
          {
            name: "name",
            type: "string",
          },
          { name: "age", type: "string" },
          { name: "email", type: "string" },
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
          {
            name: "name",
            type: "string",
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
        columns: [{ name: "name", type: "string" }],
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
});
