// TODO guess rollup type with example
var data = {
  source: {
    service: "airTable",
  },
  target: {
    service: "xata",
    workspaceId: "-- todo --",
    apiKey: "-- todo --",
    databaseName: "-- todo --",
    databaseColor: "green",
  },
  tables: [],
};

data.source.apiKey = document
  .querySelector("[data-api-key]")
  .getAttribute("data-api-key");
data.source.baseId = window.location.pathname.split("/")[1];

data.target.databaseName = document
  .querySelector(".applicationName")
  .textContent.toLowerCase()
  .replace(/ /, "-");

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
    var c = {};
    c.sourceColumnName = column.querySelector(".columnName").textContent;
    var id = column.querySelector(".columnId").textContent;
    var type = column.querySelector(".type").textContent.trim();

    if (type.includes("Lookup")) {
      continue;
    } else if (type.includes("Link")) {
      c.sourceColumnType = mapToAirtableType(type);
      c.linkSourceTableName = column.querySelector(".tableName").textContent;
      c.allowMultipleRecords = true;
    } else {
      c.sourceColumnType = mapToAirtableType(type);
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
  if (type === "URL") return "url";

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
  "🦋 Go back to Xata and %cpaste it%c to start the import.",
  "font-weight: bold",
  ""
);
