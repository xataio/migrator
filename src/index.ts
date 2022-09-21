import { migrate } from "./core/migrate";

migrate({
  skipCreateTargetDatabase: true,
  skipMigrateRecords: true,
  source: {
    service: "airTable",
    apiKey: process.env.AIRTABLE_API_KEY ?? "",
    baseId: "appRHjzIC1lSNmXVv",
  },
  target: {
    service: "xata",
    workspaceId: "fabien-ph3r1h",
    apiKey: process.env.XATA_API_KEY ?? "",
    databaseName: "product-catalog-22",
    databaseColor: "orange",
  },
  tables: [
    {
      sourceTableName: "Furniture",
      sourceTableId: "tblCwx27FN0zjO8P7",
      columns: [
        {
          sourceColumnName: "Name",
          sourceColumnType: "text",
        },
        {
          sourceColumnName: "Type",
          sourceColumnType: "singleSelect",
        },
        {
          sourceColumnName: "Images",
          sourceColumnType: "multipleAttachments",
        },
        {
          sourceColumnName: "Vendor",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Vendors",
          allowMultipleRecords: true,
        },
        {
          sourceColumnName: "In stock",
          sourceColumnType: "checkbox",
        },
        {
          sourceColumnName: "Unit cost",
          sourceColumnType: "currency",
        },
        {
          sourceColumnName: "Size (WxLxH)",
          sourceColumnType: "text",
        },
        {
          sourceColumnName: "Materials",
          sourceColumnType: "multipleSelects",
        },
        {
          sourceColumnName: "Color",
          sourceColumnType: "multipleSelects",
        },
        {
          sourceColumnName: "Settings",
          sourceColumnType: "multipleSelects",
        },
        {
          sourceColumnName: "Schematic",
          sourceColumnType: "multipleAttachments",
        },
        {
          sourceColumnName: "Designer",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Designers",
          allowMultipleRecords: true,
        },
        {
          sourceColumnName: "Description",
          sourceColumnType: "longText",
        },
        {
          sourceColumnName: "Link",
          sourceColumnType: "url",
        },
        {
          sourceColumnName: "Notes",
          sourceColumnType: "longText",
        },
        {
          sourceColumnName: "Orders",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Order line items",
          allowMultipleRecords: true,
        },
        {
          sourceColumnName: "Total units sold",
          sourceColumnType: "rollup",
          targetColumnType: "int",
        },
        {
          sourceColumnName: "Gross sales",
          sourceColumnType: "rollup",
          targetColumnType: "float",
        },
      ],
    },
    {
      sourceTableName: "Vendors",
      sourceTableId: "tblGVDRBMBnry7UFh",
      columns: [
        {
          sourceColumnName: "Name",
          sourceColumnType: "text",
        },
        {
          sourceColumnName: "Logo",
          sourceColumnType: "multipleAttachments",
        },
        {
          sourceColumnName: "Notes",
          sourceColumnType: "longText",
        },
        {
          sourceColumnName: "Closest showroom",
          sourceColumnType: "longText",
        },
        {
          sourceColumnName: "Phone number",
          sourceColumnType: "phoneNumber",
        },
        {
          sourceColumnName: "Sales contact",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Vendor contacts",
          allowMultipleRecords: true,
        },
        {
          sourceColumnName: "Catalog link",
          sourceColumnType: "url",
        },
        {
          sourceColumnName: "Furniture",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Furniture",
          allowMultipleRecords: true,
        },
      ],
    },
    {
      sourceTableName: "Clients",
      sourceTableId: "tblFhx25tS5AeQ5Se",
      columns: [
        {
          sourceColumnName: "Name",
          sourceColumnType: "text",
        },
        {
          sourceColumnName: "Photos of space",
          sourceColumnType: "multipleAttachments",
        },
        {
          sourceColumnName: "Client orders",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Client orders",
          allowMultipleRecords: true,
        },
        {
          sourceColumnName: "Billing address",
          sourceColumnType: "longText",
        },
      ],
    },
    {
      sourceTableName: "Client orders",
      sourceTableId: "tblj0GYBzg2XbL1Nu",
      columns: [
        {
          sourceColumnName: "Name",
          sourceColumnType: "formula",
          targetColumnType: "string",
        },
        {
          sourceColumnName: "Client",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Clients",
          allowMultipleRecords: true,
        },
        {
          sourceColumnName: "Order no.",
          sourceColumnType: "number",
        },
        {
          sourceColumnName: "Fulfill by",
          sourceColumnType: "date",
        },
        {
          sourceColumnName: "Status",
          sourceColumnType: "singleSelect",
        },
        {
          sourceColumnName: "Order line items",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Order line items",
          allowMultipleRecords: true,
        },
        {
          sourceColumnName: "Total order cost",
          sourceColumnType: "rollup",
          targetColumnType: "float",
        },
        {
          sourceColumnName: "Invoice",
          sourceColumnType: "multipleAttachments",
        },
      ],
    },
    {
      sourceTableName: "Order line items",
      sourceTableId: "tblHok3aqQ5E5VcGc",
      columns: [
        {
          sourceColumnName: "Name",
          sourceColumnType: "formula",
          targetColumnType: "string",
        },
        {
          sourceColumnName: "Furniture item",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Furniture",
          allowMultipleRecords: true,
        },
        {
          sourceColumnName: "Quantity",
          sourceColumnType: "number",
        },
        {
          sourceColumnName: "Total cost",
          sourceColumnType: "formula",
          targetColumnType: "float",
        },
        {
          sourceColumnName: "Belongs to order",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Client orders",
          allowMultipleRecords: true,
        },
      ],
    },
    {
      sourceTableName: "Designers",
      sourceTableId: "tbl9y3TQehzdLWjUW",
      columns: [
        {
          sourceColumnName: "Name",
          sourceColumnType: "text",
        },
        {
          sourceColumnName: "Photo",
          sourceColumnType: "multipleAttachments",
        },
        {
          sourceColumnName: "Bio",
          sourceColumnType: "longText",
        },
        {
          sourceColumnName: "Furniture",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Furniture",
          allowMultipleRecords: true,
        },
      ],
    },
    {
      sourceTableName: "Vendor contacts",
      sourceTableId: "tblvnx9t6ev57AJUj",
      columns: [
        {
          sourceColumnName: "Name",
          sourceColumnType: "text",
        },
        {
          sourceColumnName: "Vendors",
          sourceColumnType: "multipleRecordLinks",
          linkSourceTableName: "Vendors",
          allowMultipleRecords: true,
        },
        {
          sourceColumnName: "Phone number",
          sourceColumnType: "phoneNumber",
        },
        {
          sourceColumnName: "Email",
          sourceColumnType: "email",
        },
      ],
    },
  ],
}).catch((e) => console.log(e));
