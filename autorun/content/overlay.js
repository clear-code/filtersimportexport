/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var filtersimportexportAutorun = {
  ROOT: 'extensions.filtersimportexport-autorun@clear-code.com.',

  get prefs() {
    delete this.prefs;
    var ns = {};
    Components.utils.import('resource://filtersimportexport-autorun-modules/prefs.js', ns);
    return this.prefs = ns.prefs;
  },

  handleEvent: function filtersimportexportAutorun_handleEvent(event) {
    switch (event.type) {
      case 'load':
        window.removeEventListener('load', this, false);
        this.run();
        return;
    }
  },

  run: function filtersimportexportAutorun_run() {
    var requireRestart = false;

    this.prefs.getChildren(this.ROOT + 'rules.').forEach(async function(base) {
      console.log('filtersimportexportAutorun_run: ' + base);
      if (!this.prefs.getPref(base))
        return;

      var fromAccountSelector  = this.prefs.getPref(base + '.from');
      var fromAccount          = this.findAccount(fromAccountSelector);
      var toAccountSelector    = this.prefs.getPref(base + '.to');
      var toAccount            = this.findAccount(toAccountSelector);
      var migrateAction        = this.prefs.getPref(base + '.migrateAction');
      var missingDestinationAction = this.prefs.getPref(base + '.missingDestinationAction');
      if (!fromAccount || !toAccount)
        return;

      var doneAccounts = this.prefs.getPref(base + '.done') || '';
      doneAccounts = doneAccounts.split(',').filter(account => !!account);
      var accountsPair = fromAccount.key + '=>' + toAccount.key;
      console.log('filtersimportexportAutorun accountsPair: ' + accountsPair);
      if (doneAccounts.indexOf(accountsPair) > -1)
        return;

      if (!(await this.migrate(fromAccount, toAccount, migrateAction, missingDestinationAction)))
        return;

      doneAccounts.push(accountsPair);
      this.prefs.setPref(base + '.done', doneAccounts.join(','));

      requireRestart = true;
    }, this);

    if (requireRestart) {
      var nsIAppStartup = Components.interfaces.nsIAppStartup;
      Components.classes['@mozilla.org/toolkit/app-startup;1']
        .getService(nsIAppStartup)
        .quit(nsIAppStartup.eForceQuit | nsIAppStartup.eRestart);
    }
  },

  findAccount: function filtersimportexportAutorun_findAccount(selector) {
    if (!selector)
      return null;

    var propertyNamePartMatcher = /^\s*([^\s]+)\s*=\s*/;
    var propertyGetter = selector.match(propertyNamePartMatcher);
    propertyGetter = propertyGetter && propertyGetter[1];
    propertyGetter = propertyGetter.split('.');

    var value = selector.replace(propertyNamePartMatcher, '').replace(/\s+$/, '');
    var pattern = null;
    if (value.charAt(0) == '/') {
      pattern = value.replace(/^\/|\/([gim]*)?$/g, '');
      pattern = new RegExp(pattern, RegExp.$1);
      value = null;
    }

    var foundAccount;
    filtersimportexport.getAllAccounts().some(function processAccount(account) {
      var target = account;
      propertyGetter.every(function(getter) {
        return target = target[getter];
      });
      if (!target)
        return;

      if ((value && target == value) ||
          (pattern && pattern.test(target)))
        return foundAccount = account;
    }, this);
    return foundAccount;
  },

  createTemporaryFile: function filtersimportexportAutorun_createTemporaryFile(basename) {
    Components.utils.import('resource://gre/modules/FileUtils.jsm');
    var file = FileUtils.getFile('TmpD', [basename]);
    file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
    return file;
  },

  migrate: async function filtersimportexportAutorun_migrate(fromAccount, toAccount, migrateAction, missingDestinationAction) {
    var file = this.createTemporaryFile('filtersimportexport-autorun-filter');
    try {
      filtersimportexport.exportFilterTo(this.getFolder(fromAccount), file);
      var converted = await filtersimportexport.importFilterFrom(this.getFolder(toAccount), file, {
        silent: true,
        migrateAction,
        missingDestinationAction
      });
      return true;
    } catch(error) {
      Components.utils.reportError(error);
      return false;
    } finally {
      file.remove(true);
    }
  },
  getFolder: function(account) {
    var resource = filtersimportexport.gfilterImportExportRDF.GetResource(account.incomingServer.rootFolder.URI);
    var msgFolder = resource.QueryInterface(Components.interfaces.nsIMsgFolder);
    msgFolder.getFilterList(msgWindow);
    return msgFolder;
  }
};

window.addEventListener('load', filtersimportexportAutorun, false);
