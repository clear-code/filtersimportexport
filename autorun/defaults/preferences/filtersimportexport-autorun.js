/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// // This is the root key. If this is false, these rules will be ignored.
// pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY", true);
// // export source
// pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.from",
//      "prettyName = /^foobar's account$/i"); // by the name
// pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.from",
//      "incomingServer.serverURI = imap://username@example.com"); // by the incoming server
// pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.from",
//      "incomingServer.serverURI = mailbox://nobody@Local%20Folders"); // local folder account
// // import target
// pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.to",
//      "incomingServer:user@example.com"); // the format is same to "from"
// // migrate action for destination folders to the source account
// // (1=migrate for the import target account, 2=as is)
// pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.migrateAction", 2);
// // results: this addon automatically saves the result as this pref.
// pref("extensions.filtersimportexport-autorun@clear-code.com.rules.KEY.done",
//      "serverkey1,serverkey2");

