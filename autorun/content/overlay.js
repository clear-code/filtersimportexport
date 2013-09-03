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
  }
};
