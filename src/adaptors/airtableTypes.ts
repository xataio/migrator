import { z } from "zod";

export const airtableColumnType = z.enum([
  "autoNumber",
  "barcode",
  "button",
  "checkbox",
  "count",
  // "createdBy", -> collaborator
  // "createdTime", -> dateTime
  "currency",
  "date",
  "dateTime",
  "duration",
  "email",
  "externalSyncSource",
  "formula",
  // "lastModifiedBy", -> collaborator
  // "lastModifiedTime", -> dateTime
  "multilineText",
  "multipleAttachments",
  "multipleCollaborators",
  "multipleLookupValues",
  "multipleRecordLinks",
  "multipleSelects",
  "number",
  "percent",
  "phoneNumber",
  "rating",
  "richText",
  "rollup",
  "longText",
  "singleCollaborator",
  "singleLineText",
  "singleSelect",
  "text",
  "url",
]);

export type AirtableColumnType = z.infer<typeof airtableColumnType>;

const thumbnailSchema = z.object({
  url: z.string(),
  width: z.number(),
  height: z.number(),
});

export const collaboratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export const schemas = {
  autoNumber: z.number(),
  barcode: z.object({
    text: z.string(),
    type: z.string().optional(),
  }),
  button: z.object({
    label: z.string(),
    url: z.string(),
  }),
  checkbox: z.boolean(),
  count: z.number(),
  createdBy: z.string(),
  createdTime: z.string(),
  currency: z.number(),
  date: z.string().transform((d) => new Date(d).toISOString()),
  dateTime: z.string(),
  duration: z.number(),
  email: z.string(),
  externalSyncSource: z.never(),
  formula: z.union([z.string(), z.number()]),
  lastModifiedBy: z.string(),
  lastModifiedTime: z.string(),
  longText: z.string(),
  multilineText: z.string(),
  multipleAttachments: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      filename: z.string(),
      type: z.string().optional(),
      size: z.number(),
      width: z.number().optional(),
      height: z.number().optional(),
      thumbnails: z.object({
        small: thumbnailSchema,
        large: thumbnailSchema,
        full: thumbnailSchema.optional(),
      }),
    })
  ),
  multipleCollaborators: z.array(collaboratorSchema),
  multipleLookupValues: z.never(),
  multipleRecordLinks: z.array(z.string()),
  multipleSelects: z.array(z.string()),
  number: z.number(),
  percent: z.number(),
  phoneNumber: z.string(),
  rating: z.number(),
  richText: z.string(),
  rollup: z.union([z.number(), z.string()]),
  singleCollaborator: collaboratorSchema,
  singleLineText: z.string(),
  singleSelect: z.string(),
  text: z.string(),
  url: z.string(),
};
