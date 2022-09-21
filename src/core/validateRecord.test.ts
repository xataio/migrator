import { camel, snake } from "case";
import { describe, it, expect } from "vitest";
import { validateRecord } from "./validateRecord";
import { Migration } from "./types";

describe("validateRecord", () => {
  it("should return a simple valid record", () => {
    const record = {
      id: "1",
      fields: {
        ["a string"]: "this is a string",
        ["a number"]: 42,
      },
    };

    const table: Migration["tables"][-1] = {
      sourceTableName: "foo",
      sourceTableId: "foo",
      columns: [
        { sourceColumnName: "a string", sourceColumnType: "text" },
        { sourceColumnName: "a number", sourceColumnType: "number" },
      ],
    };

    expect(
      validateRecord({ table, record, columnNameFormatter: camel })
    ).toEqual({
      isValid: true,
      table,
      reasons: [],
      record: {
        id: "1",
        fields: {
          aString: "this is a string",
          aNumber: 42,
        },
      },
    });
  });

  it("should allow optional field", () => {
    const record = {
      id: "1",
      fields: {
        ["a number"]: 42,
      },
    };

    const table: Migration["tables"][-1] = {
      sourceTableName: "foo",
      sourceTableId: "foo",
      columns: [
        { sourceColumnName: "a string", sourceColumnType: "text" },
        { sourceColumnName: "a number", sourceColumnType: "number" },
      ],
    };

    expect(
      validateRecord({ table, record, columnNameFormatter: camel })
    ).toEqual({
      isValid: true,
      table,
      reasons: [],
      record: {
        id: "1",
        fields: {
          aNumber: 42,
        },
      },
    });
  });

  it("should return an invalid record", () => {
    const record = {
      id: "1",
      fields: {
        ["a string"]: "this is a string",
        ["a number"]: "this is not a number",
      },
    };

    const table: Migration["tables"][-1] = {
      sourceTableId: "foo",
      sourceTableName: "foo",
      columns: [
        { sourceColumnName: "a string", sourceColumnType: "text" },
        { sourceColumnName: "a number", sourceColumnType: "number" },
        {
          sourceColumnName: "required field",
          sourceColumnType: "number",
          required: true,
        },
      ],
    };

    expect(
      validateRecord({ table, record, columnNameFormatter: camel })
    ).toEqual({
      isValid: false,
      reasons: [
        {
          key: "aNumber",
          message: "Expected number, received string",
        },
        {
          key: "requiredField",
          message: "Required",
        },
      ],
      table,
      record: {
        id: "1",
        fields: {
          aString: "this is a string",
          aNumber: "this is not a number",
          requiredField: undefined,
        },
      },
    });
  });

  it("should deal with getValue", () => {
    const record = {
      id: "1",
      fields: {
        custom: {
          foo: "string",
          bar: 42,
        },
      },
    };

    const table: Migration["tables"][-1] = {
      sourceTableId: "foo",
      sourceTableName: "foo",
      columns: [
        {
          sourceColumnName: "custom.foo",
          sourceColumnType: "text",
          getValue(record) {
            return (record.fields as any).custom.foo;
          },
        },
        {
          sourceColumnName: "custom.bar",
          sourceColumnType: "number",
          getValue(record) {
            return (record.fields as any).custom.bar;
          },
        },
      ],
    };

    expect(
      validateRecord({ table, record, columnNameFormatter: camel })
    ).toEqual({
      isValid: true,
      reasons: [],
      table,
      record: {
        id: "1",
        fields: { customBar: 42, customFoo: "string" },
      },
    });
  });

  it("should apply targetColumnName", () => {
    const record = {
      id: "1",
      fields: { ["a string"]: "this is a string", ["a number"]: 42 },
    };

    const table: Migration["tables"][-1] = {
      sourceTableId: "foo",
      sourceTableName: "foo",
      columns: [
        {
          sourceColumnName: "a string",
          sourceColumnType: "text",
          targetColumnName: "foo",
        },
        {
          sourceColumnName: "a number",
          sourceColumnType: "number",
          targetColumnName: "bar",
        },
      ],
    };

    expect(
      validateRecord({ table, record, columnNameFormatter: camel })
    ).toEqual({
      isValid: true,
      reasons: [],
      table,
      record: {
        id: "1",
        fields: { foo: "this is a string", bar: 42 },
      },
    });
  });

  it("should use an external columnNameFormatter", () => {
    const record = {
      id: "1",
      fields: { ["a string"]: "this is a string", ["a number"]: 42 },
    };

    const table: Migration["tables"][-1] = {
      sourceTableId: "foo",
      sourceTableName: "foo",
      columns: [
        { sourceColumnName: "a string", sourceColumnType: "text" },
        { sourceColumnName: "a number", sourceColumnType: "number" },
      ],
    };

    expect(
      validateRecord({ table, record, columnNameFormatter: snake })
    ).toEqual({
      isValid: true,
      reasons: [],
      table,
      record: {
        id: "1",
        fields: { a_string: "this is a string", a_number: 42 },
      },
    });
  });

  it("should refine date", () => {
    const record = {
      id: "1",
      fields: {
        ["a date"]: "2019-09-20",
      },
    };

    const table: Migration["tables"][-1] = {
      sourceTableId: "foo",
      sourceTableName: "foo",
      columns: [
        {
          sourceColumnName: "a date",
          sourceColumnType: "date",
        },
      ],
    };

    expect(
      validateRecord({ table, record, columnNameFormatter: camel })
    ).toEqual({
      isValid: true,
      reasons: [],
      table,
      record: {
        id: "1",
        fields: { aDate: "2019-09-20T00:00:00.000Z" },
      },
    });
  });
});
