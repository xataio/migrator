# Airtable to Xata

![01ac6b3a-edf8-4ff0-b74d-6c4b295eacfa](https://user-images.githubusercontent.com/1761469/192961850-fe11c4dc-3885-4a6e-b701-4f8115e47542.gif)

Migrate any Airtable base to a Xata database.

## Getting started

### Install the dependencies

```sh
$ npm install
```

### Run `scripts/airtable-schema-extractor.js`

Unfortunately, the metadata API from Airtable is currently in closed beta. Due to this you will need to run a custom script in your browser console to retrieve your airtable base metadata.

Steps to follow:

- download/clone this repo locally
- create an API key in Airtable (see **Setup your credentials** section below)
- Go to https://airtable.com/api
- Click on the base you want to migrate
- Open the DevTools (Chrome: https://developer.chrome.com/docs/devtools/open/ | Firefox: https://firefox-source-docs.mozilla.org/devtools-user/web_console/index.html)
- Paste the content of `scripts/airtable-schema-extractor.js` into the console
- Press `Enter` to execute the script
- Open `src/index.ts`
- Paste the content inside the `migrate()` function

⚠️ The `apiKey` for Airtable is part of the output script, if you want to version control safely this script, you can move this value to `.env` with the `XATA_API_KEY` key.

### Setup your credentials

Before migrating data from Airtable to Xata, the script needs to have the respective `apiKey`.

You can find more information about creating API keys in each platfom in the respective documentation:

- Airtable api key: https://support.airtable.com/docs/how-do-i-get-my-api-key
- Xata api key: https://xata.io/docs/concepts/api-keys

You need to add a file at the root called `.env` with the following format:

```
XATA_API_KEY=xau_...
AIRTABLE_API_KEY=key...
```

### Fine-tune your migration

Fill in the required configuration fields in `src/index.ts`:
- source.apiKey: your Airtable API key
- target.workspaceID: you can find it in the workspace configuration tab. The workspace ID is part of the `Workspace API base URL` => `https://{workspaceId}.{regionId}.xata.sh/db/{database}`
- target.regionId: the region where you would like your Xata database created
- target.databaseName: the name of your database that will be created in Xata

You can choose any `databaseName` and `databaseColor` that you want, but note that the database name must not exist already. The migrator will create the Xata database for you.

### Advanced

If needed, you can tweak every `table` and `column` definition:

- You can rename a table by providing a `targetTableName` value
- You can rename a column by providing a `targetColumnName` value
- You can add a `required` to flag to any column

For further customization, please refer to `src/types.ts`.

### Run the script

Now that everything is setup, it's time to run the script to import your data into Xata. Please note that your current data in Airtable will not be affected by this migrator tool since it is read-only and as it strictly works by creating a new database in Xata, this will not affect your other databases! In case something didn't go as planned (incorrect data type, or a name that you dislike), you can easily delete the created database and re-run the script.  
If you need help running this migration tool or have questions, you can contact support@xata.io

```sh
$ npm start
```

### Enjoy your new Xatabase

If everything went well, the script will print out the URL address of your new Xatabase.

To learn more about using Xata, please refer to our documentation https://xata.io/docs/getting-started
