/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var filtersimportexportAutorun = {
  get prefs() {
    delete this.prefs;
    var ns = {};
    Components.utils.import('resource://folderstatistics-modules/prefs.js', ns);
    return this.prefs = ns.prefs;
  },

  run: function filtersimportexportAutorun_run() {
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
      filtersimportexport.exportFilterTo(fromAccount, file);
      var converted = filtersimportexport.importFilterFrom(toAccount, file, {
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
