# Thunderbird Message Filter Import/Export Autorun

This is an helper addon for the Thunderbird Message Filter Import/Export Enhanced, to migrate filters from an account to another automatically.
This will help you to migrate an mail account to different type, for example: from POP3 to IMAP.

Basically this is designed Thunderbird managed via MCD (autoconfig.cfg). You need to set configurations via MCD configuration file, like following:

```javascript
// This is the root key. If this is false, these rules will be ignored.
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY", true);
// export source
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.from",
     "incomingServer.prettyName = /^foobar's account$/i"); // by the name
//pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.from",
//     "incomingServer.serverURI = imap://username@example.com"); // by the incoming server
//pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.from",
//     "incomingServer.serverURI = mailbox://nobody@Local%20Folders"); // local folder account
// import target
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.to",
     "incomingServer.prettyName = user@example.com"); // the format is same to "from"
// migrate action for destination folders to the source account
// (1=migrate for the import target account, 2=as is)
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.migrateAction", 2);
// (1=create missing folder, 2=as is)
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.missingDestinationAction", 2);
```

For example:

```javascript
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.Gmail", true);
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.Gmail.from",
     "incomingServer.serverURI = /^mailbox://[^@]+@gmail.com");
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.Gmail.to",
     "incomingServer.serverURI = /^imap://[^@]+@gmail.com");
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.Gmail.migrateAction", 1);
pref("extensions.filtersimportexport-autorun@clear-code.com.rules.Gmail.missingDestinationAction", 1);
```

If you want to run the migration again, clear the preference `extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.done`.
