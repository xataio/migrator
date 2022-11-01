var data = {
  source: {
    service: "airtable",
  },
  target: {
    service: "xata",
    workspaceId: "-- todo --",
    regionId: "eu-west-1",
    databaseName: "-- todo --",
    databaseColor: "green",
  },
  tables: [],
};

data.source.apiKey = document
  .querySelector("[data-api-key]")
  .getAttribute("data-api-key");
data.source.baseId = window.location.pathname.split("/")[1];

data.target.databaseName = camelize(
  document.querySelector(".applicationName").textContent
);

var tables = document.querySelectorAll(
  '.content [ng-repeat="table in application.tables"]'
);

for (const table of tables) {
  var t = {};
  data.tables.push(t);

  t.sourceTableName = table.querySelector(".tableName").textContent;
  t.sourceTableId = table.querySelector(".tableId").textContent;

  t.columns = [];
  var columns = table.querySelectorAll('[ng-repeat="column in table.columns"]');

  for (const column of columns) {
    var id = column.querySelector(".columnId").textContent;
    var type = column.querySelector(".type").textContent.trim();
    var description = column.querySelector(".description").textContent.trim();

    var c = {
      sourceColumnName: column.querySelector(".columnName").textContent,
      sourceColumnType: mapToAirtableType(type),
    };
    
    if(c.sourceColumnName.toLowerCase() === "id") {
      c.targetColumnName = camelize(t.sourceTableName + "Id")
    }

    if (type.includes("Lookup")) {
      continue;
    } else if (type === "Number") {
      c.targetColumnType = description.includes("integer") ? "int" : "float";
    } else if (description.includes("Computed value: LAST_MODIFIED_TIME().")) {
      c.sourceColumnType = "dateTime";
    } else if (type.includes("Rollup") || type.includes("Formula")) {
      var exampleValue = column
        .querySelector(
          '[ng-repeat="row in table.sampleRows | hasValueFor:column | limitTo:5"'
        )
        .textContent.trim();
      c.targetColumnType = exampleValue.startsWith('"') ? "string" : "float";
    } else if (type.includes("Link")) {
      c.linkSourceTableName = column.querySelector(".tableName").textContent;
      c.allowMultipleRecords = true;
    }

    t.columns.push(c);
  }
}

// Utils
function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
    if (+match === 0) return "";
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

// Map to official Airtable types (https://airtable.com/api/meta)
function mapToAirtableType(type) {
  if (type === "Attachment") return "multipleAttachments";
  if (type === "Link to another record") return "multipleRecordLinks";
  if (type === "Multiple select") return "multipleSelects";
  if (type === "Multiple collaborator") return "multipleCollaborators";
  if (type === "URL") return "url";
  if (type === "Collaborator") return "singleCollaborator";
  if (type.endsWith("time")) return "dateTime";
  if (type.endsWith("by")) return "singleCollaborator";

  return camelize(type);
}

copy(JSON.stringify(data, null, 2));
console.clear();
console.log(
  "✅ The database structure has been %ccopied to the clipboard%c.",
  "font-weight: bold",
  ""
);
console.log(
  "🦋 Go back to your xata/migrator project and %cpaste it%c into index.ts.",
  "font-weight: bold",
  ""
);
