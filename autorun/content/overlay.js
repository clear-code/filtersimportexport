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

    this.prefs.getChildren(this.ROOT + 'rules.').forEach(function(base) {
      if (!this.prefs.getPref(base))
        return;

      var fromAccountSelector  = this.prefs.getPref(base + '.from');
      var fromAccount          = this.findAccount(fromAccountSelector);
      var toAccountSelector    = this.prefs.getPref(base + '.to');
      var toAccount            = this.findAccount(toAccountSelector);
      var migrateAction        = this.prefs.getPref(base + '.migrateAction');
      if (!fromAccount || !toAccount)
        return;

      var doneAccounts = this.prefs.getPref(base + '.done') || '';
      doneAccounts = doneAccounts.split(',');
      var accountsPair = fromAccount.key + '=>' + toAccount.key;
      if (doneAccounts.indexOf(accountsPair) > -1)
        return;

//alert('filtersimportexportAutorun: ' + accountsPair);
      if (!this.migrate(fromAccount, toAccount, migrateAction))
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
      pattern = value.replace(/^\/|\/([gim]*)$/, '');
      pattern = new RegExp(pattern, RegExp.$1);
      value = null;
    }

    var foundAccount;
    filtersimportexport.getAllAccounts().some(function processAccount(account) {
      var target = account;
      propertyGetter.forEach(function(getter) {
        target = target[getter];
      });
      if (!target)
        return;

      if ((value && target == value) ||
          (pattern && pattern.test(value)))
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

  migrate: function filtersimportexportAutorun_migrate(fromAccount, toAccount, migrateAction) {
    var file = this.createTemporaryFile('filtersimportexport-autorun-filter');
    try {
      filtersimportexport.exportFilterTo(fromAccount.rootFolder, file);
      var converted = filtersimportexport.importFilterFrom(toAccount.rootFolder, file, {
        silent: true,
        migrateAction: migrateAction
      });
      return true;
    } catch(error) {
      return false;
    } finally {
      filter.remove(true);
    }
  }
};

window.addEventListener('load', filtersimportexportAutorun, false);
