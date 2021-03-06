

var filtersimportexport = {
    gfilterImportExportRDF : Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService),
    RootFolderUriMark : "RootFolderUri",
    MailnewsTagsMark : "MailnewsTagsUri",
    filterMailnewsHeaders : "mailnews.customHeaders",
    TagSep : ":==:", // Cannot simply use "=" because a tag's name could have an equals which would then cause problems.
    CurrentVersion : "1.3.7.6",
    strbundle: null,
    gFilterListMsgWindow : null,
    /** if the selected server cannot have filters, get the default server
 * if the default server cannot have filters, check all accounts
 * and get a server that can have filters.
 */
    getServerThatCanHaveFilters : function () {
        var firstItem = null;
        var accountManager
        = Components.classes["@mozilla.org/messenger/account-manager;1"].
        getService(Components.interfaces.nsIMsgAccountManager);
        var defaultAccount = accountManager.defaultAccount;
        var defaultIncomingServer = defaultAccount.incomingServer;
        // check to see if default server can have filters
        if (defaultIncomingServer.canHaveFilters) {
            firstItem = defaultIncomingServer.serverURI;
        }
        // if it cannot, check all accounts to find a server
        // that can have filters
        else {
            var allServers = accountManager.allServers;
            var numServers = allServers.Count();
            var index = 0;
            for (index = 0; index < numServers; index++) {
                var currentServer
                = allServers.GetElementAt(index).QueryInterface(Components.interfaces.nsIMsgIncomingServer);
                if (currentServer.canHaveFilters) {
                    firstItem = currentServer.serverURI;
                    break;
                }
            }
        }
        return firstItem;
    },
    TrimImpl : function(s)
    {
        return s.replace(/(^\s*)|(\s*$)/g, "");
    },
    onLoad: function() {
        // initialization code
        this.initialized = true;
        
    },
    alert : function(title, message)
    {
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Components.interfaces.nsIPromptService);
        prompts.alert(window, title, message);
    },
    confirm: function(title, message)
    {
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Components.interfaces.nsIPromptService);
        return prompts.confirm(window, title, message);
    },
    getString:function (name)
    {
        try{
        
            if (this.strbundle == null)
                this.strbundle = document.getElementById("filtersimportexportStrings");
            return this.strbundle.getString(name);
        }catch(e)
        {
            alert(name + " " + e);
            return "";
        }
    },
    getFormattedString:function (name, args)
    {
        try{
        
            if (this.strbundle == null)
                this.strbundle = document.getElementById("filtersimportexportStrings");
            return this.strbundle.getFormattedString(name, args);
        }catch(e)
        {
            alert(name + " " + e);
            return "";
        }
    },
    onAccountLoad: function() {
        // initialization code
        var firstItem = filtersimportexport.getServerThatCanHaveFilters();
        
        if (firstItem) {
            var serverMenu = document.getElementById("serverMenu");
            //alert(firstItem);
            serverMenu.selectedItem = document.getElementById(firstItem);
            
        }
        filtersimportexport.gFilterListMsgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"].createInstance(Components.interfaces.nsIMsgWindow);
        filtersimportexport.gFilterListMsgWindow.domWindow = window;
        filtersimportexport.gFilterListMsgWindow.rootDocShell.appType = Components.interfaces.nsIDocShell.APP_TYPE_MAIL;
        
    },
    
    onFilterServerClick: function(selection) {
        //alert(selection.tagName);
        var itemURI = selection.getAttribute('id');
        var serverMenu = document.getElementById("serverMenu");
        //alert(itemURI);
        serverMenu.setAttribute("value",itemURI);
        //alert(itemURI)
    },
    onMenuItemCommand: function() {
        window.open("chrome://filtersimportexport/content/FilterImEx.xul", "", "chrome,centerscreen");
    },
    getCurrentFolder : function() {
        var msgFolder = null;
        if (typeof gCurrentFolder != "undefined" &&  gCurrentFolder)
            msgFolder = gCurrentFolder;
        else
        {
            var serverMenu = document.getElementById("serverMenu");
            var msgFilterURL=serverMenu.selectedItem.getAttribute("id");
            //alert(msgFilterURL);
            var resource = filtersimportexport.gfilterImportExportRDF.GetResource(msgFilterURL);
            msgFolder = resource.QueryInterface(Components.interfaces.nsIMsgFolder);
            //Calling getFilterList will detect any errors in rules.dat, backup the file, and alert the user
            //we need to do this because gFilterTree.setAttribute will cause rdf to call getFilterList and there is
            //no way to pass msgWindow in that case.
            if (msgFolder &&
                ((typeof gFilterListMsgWindow !=  "undefined" && gFilterListMsgWindow) ||
                 (typeof msgWindow != "undefined" && msgWindow)))
                msgFolder.getFilterList(gFilterListMsgWindow || msgWindow);
            
        }
        // this will get the deferred to account root folder, if server is deferred
        //msgFolder = msgFolder.server.rootMsgFolder;
        return msgFolder;
    },
    onImportFilter: async function() {
        try{
        var msgFolder = filtersimportexport.getCurrentFolder();
        var file = await this.selectFile(Components.interfaces.nsIFilePicker.modeOpen);
        var result = await this.importFilterFrom(msgFolder, file);
        if (!(result & this.IMPORT_SUCCEEDED))
          return;
        this.onImportFiltersFinish(result);
        }
        catch(e){
            console.log(e);
            throw e;
        }
    },
    onImportFiltersFinish: function(result) {
        var confirmStr = "";
        if (result & this.IMPORT_CONVERTED)
            confirmStr = this.getString("finishwithwarning");
        else
            confirmStr = this.getString("importfinish");
    
        if (this.confirm(this.getString("restartconfrimTitle"), confirmStr + this.getString("restartconfrim")))
        {
            var nsIAppStartup = Components.interfaces.nsIAppStartup;
            Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(nsIAppStartup).quit(nsIAppStartup.eForceQuit | nsIAppStartup.eRestart);
        }
        else
            this.alert(this.getString("restartreminderTitle"), this.getString("restartreminder"));
    },
    IMPORT_CANCELED: 0,
    IMPORT_SUCCEEDED: 1,
    IMPORT_CONVERTED: 2,
    importFilterFrom: async function(msgFolder, file, options = {}) {
        console.log('importFilterFrom ', msgFolder, file, options);
        var msgFilterURL = msgFolder.URI;
        
        var filterList = this.currentFilterList(msgFolder,msgFilterURL);
        filterList.saveToDefaultFile();
        console.log('filterList saved: ', filterList);
        
        var tagsAndFilterStr = this.readTagsAndFiltersFile(file, options.silent);
        console.log('tagsAndFilterStr: ', tagsAndFilterStr);
        
        // read all tags line-by-line and save them.
        var filterStr = this.tryImportTags(tagsAndFilterStr);
        if (filterStr === null ||
            filterStr.substr(0,filtersimportexport.RootFolderUriMark.length) != filtersimportexport.RootFolderUriMark)
        {
            if (silent)
                Components.utils.reportError(new Error(this.getString("importfailed")));
            else
                this.alert(this.getString("importfailedTitle"), this.getString("importfailed"));
            console.log('import canceled');
            return this.IMPORT_CANCELED;
        }
        var oldFolderRoot = filterStr.substr(filtersimportexport.RootFolderUriMark.length + 1,filterStr.indexOf("\n") - filterStr.indexOf("=") -1);
        
        // skip the RootFolderUri=xxxx line and move to the filters.
        filterStr = this.consumeLine(filterStr);
        //deal with mailnews.customHeaders
        if (filterStr.substr(0,filtersimportexport.filterMailnewsHeaders.length) == filtersimportexport.filterMailnewsHeaders)
        {
            var mailheaders = filterStr.substr(filtersimportexport.filterMailnewsHeaders.length + 1,filterStr.indexOf("\n") - filterStr.indexOf("=") -1);
            filterStr = this.consumeLine(filterStr);
            this.mergeHeaders(mailheaders);
        }
        console.log('headers merged');

        var outFilterStr = this.getOutFilter(filterStr, oldFolderRoot, msgFilterURL, options);
        console.log('outFilterStr: ', outFilterStr);
        var filtersImportability;
        if (!options.silent ||
            'missingDestinationAction' in options && options.missingDestinationAction > 0) {
            filtersImportability = this.checkFiltersImportbility(outFilterStr, msgFolder, options);
            console.log('filtersImportability: ', filtersImportability);
            if (!filtersImportability.canImport) {
                console.log('import canceled: impossible to setup folders');
                return this.IMPORT_CANCELED;
            }
         }

        filterList.saveToDefaultFile();
        if (filterList.defaultFile.nativePath)
            var stream = this.createFile(filterList.defaultFile.nativePath);
        else
            var stream = this.createFile(filterList.defaultFile.path);
                  
        var filterService = Components.classes["@mozilla.org/messenger/services/filters;1"]
        .getService(Components.interfaces.nsIMsgFilterService);                  
        
        //close the filter list
        if (filterService && filterService.CloseFilterList)
            filterService.CloseFilterList(filterList);
        
        var UConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        UConv.charset = "UTF-8";
        outFilterStr = UConv.ConvertFromUnicode(outFilterStr);
        stream.write(outFilterStr, outFilterStr.length);
        stream.close();
        
        //reopen filter list
        filterList = this.currentFilterList(msgFolder,msgFilterURL);

        var result = this.IMPORT_SUCCEEDED;
        if (oldFolderRoot != msgFilterURL && outFilterStr != filterStr) {
          result |= this.IMPORT_CONVERTED;
          console.log('filters are successfully imported');
        }
        else {
          console.log('there is no change from old filters');
        }

        if (filtersImportability && filtersImportability.setupTask) {
            console.log('trying to prepare folders');
            var progressWindow = openDialog(
                "chrome://filtersimportexport/content/setupProgress.xul",
                "_blank",
                "chrome,dialog=no,centerscreen=yes,dependent=yes,minimizable=no," +
                  "fullscreen=no,titlebar=no,alwaysRaised=yes,close=no"
              );
            return new Promise((resolve, reject) => {
                filtersImportability.setupTask.start({
                    onFinish: () => {
                        progressWindow.close();
                        console.log('folders are prepared');
                        resolve(result);
                    },
                    onError: (failedTask) => {
                        progressWindow.close();
                        if (!options.silent) {
                            this.alert("Failed to create folder",
                                       "failed to create "+failedTask.folderName);
                        }
                        reject(new Error("failed to create "+failedTask.folderName));
                    },
                    onProgress: (progress) => {
                        console.log('progress: ', progress);
                        var bar = progressWindow.document.getElementById("progressbar");
                        if (bar)
                            bar.value = progress;
                    }
                });
            });
        }
        return result;
    },
    readTagsAndFiltersFile: function(file) {
        var inputStream = this.openFile(file.path);
        var converterStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                .createInstance(Components.interfaces.nsIConverterInputStream);
        var buffer = inputStream.available();
        converterStream.init(inputStream, "UTF-8", buffer, converterStream.DEFAULT_REPLACEMENT_CHARACTER);
        var out = { value : null };
        converterStream.readString(inputStream.available(), out);
        converterStream.close();
        var tagsAndFilterStr = out.value;
        return tagsAndFilterStr;
    },
    tryImportTags: function(str) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService);
        var root = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
        
        var line = this.getLine(str);
        if (line.substr(0,filtersimportexport.MailnewsTagsMark.length) == filtersimportexport.MailnewsTagsMark)
        {
            str = this.consumeLine(str);
            line = this.getLine(str);
            while (line.substr(0,filtersimportexport.RootFolderUriMark.length) != filtersimportexport.RootFolderUriMark)
            {
                //using indexes instead of split because of the possibility 
                //that a tag name has an equals character
                //ignore lines not start with mailnews.tags
                if (line.indexOf("mailnews.tags")==0)
                {
                    var key = line.substr(0, line.indexOf(filtersimportexport.TagSep));
                    var tagvalue = line.substr(key.length + filtersimportexport.TagSep.length, line.length);
                    try { root.setCharPref(key, tagvalue); } // set the pref
                    catch (e) { return null; }
                }
                str = this.consumeLine(str);
                line = this.getLine(str);
            }
            // save changes to preference file
            prefs.savePrefFile(null);
        }
        return str;
    },
    getOutFilter: function(filterStr, oldFolderRoot, newFolderRoot, options) {
        options = options || {};
        var ruleMatcher = oldFolderRoot.replace(/\(/g, "\\(").replace(/\)/g, "\\)") + "([^\"]*)";
        var ruleMatcher = new RegExp(ruleMatcher, "gm");
        if (oldFolderRoot == newFolderRoot ||
            !ruleMatcher.test(filterStr))
            return filterStr;

        var useGivenOption = 'migrateAction' in options;
        var migrateAction = useGivenOption ? options.migrateAction : this.getMyPref().getIntPref(".migrateAction");
        switch (migrateAction) {
          case 0: // show confirmation
            if (!useGivenOption &&
                !this.confirm(this.getString("confirmMigrateActionsTitle"), this.getString("confirmMigrateActions")))
                break;
          case 1: // migrate
            if (!useGivenOption && migrateAction == 1)
                this.alert(this.getString("trymigrationTitle"), this.getString("trymigration"));
            var self = this;
            var oldIsImap = oldFolderRoot.indexOf('imap:') == 0;
            var newIsImap = newFolderRoot.indexOf('imap:') == 0;
            filterStr = filterStr.replace(ruleMatcher, function(matched) {
              var parts = matched.split(oldFolderRoot);
              var path = parts[1];
              if (oldIsImap != newIsImap) {
                if (oldIsImap) {
                  path = self.convertIMAPPathToLocalPath(path);
                } else {
                  path = self.convertLocalPathToIMAPPath(path);
                }
              } else {
                if (oldIsImap) {
                  path = self.sanitizeIMAPPath(path);
                } else {
                  path = self.sanitizeLocalPath(path);
                }
              }
              var migrated = newFolderRoot + path;
              if (matched != migrated)
                console.log("migrate\n" + matched + "\n" + migrated);
              return migrated;
            });
          default:
            break;
        }

        return filterStr;
    },
    checkFiltersImportbility: function(filterStr, msgFolder, options = {}) {
        var dangerousFiltersByURL = this.collectFilterNamesForURLs(filterStr);

        var allNames = dangerousFiltersByURL.all;
        delete dangerousFiltersByURL.all;

        function checkFolders(folders, root) {
            if (!folders)
                return;
            try {
                var folder;
                while (folders.hasMoreElements()) {
                    folder = folders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
                    checkFolder(folder, root);
                }
            } catch(error) {
                Components.utils.reportError(error);
            }
        }

        function checkFolder(folder, root) {
            var url = unescape(folder.folderURL);
            if (root && root in serverRoots)
                url = url.replace(root, serverRoots[root]);
            // console.log('folderURL = '+url);
            if (url in dangerousFiltersByURL)
                delete dangerousFiltersByURL[url];
            checkFolders(folder.subFolders, root);
        }

        var serverRoots = {};
        this.getAllAccounts().forEach(function processAccount(account) {
            var server = account.incomingServer;
            var type = server.type;
            if (/^(pop3|imap|none)$/.test(type)) {
                var root;
                try {
                    try {
                        root = unescape(server.rootFolder.folderURL);
                    } catch(error) {
                        var firstChild = server.rootFolder.subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
                        root = unescape(firstChild.folderURL.replace(/[^\/]+\/?$/, ''));
                    }
                    serverRoots[root] = unescape(server.serverURI) + '/';
                    // console.log(root+' => '+serverRoots[root]);
                } catch(error) {
                    Components.utils.reportError(server.serverURI + '\n' + error);
                }
                checkFolders(server.rootFolder.subFolders, root);
            }
        }, this);

        var dangerousFilters = {};
        Object.keys(dangerousFiltersByURL).forEach(function(url) {
            // console.log('DANGEROUS \n'+url);
            dangerousFiltersByURL[url].forEach(function(filterName) {
                dangerousFilters[filterName] = true;
            });
        });
        dangerousFilters = allNames.filter(function(name) {
            return name in dangerousFilters;
        });

        var result = {
            canImport: false,
            setupTask: null
        };
        if (!dangerousFilters.length) {
            result.canImport = true;
            return result;
        }

        result.canImport = false;
        if ('missingDestinationAction' in options && options.missingDestinationAction > 0) {
          result.canImport = options.missingDestinationAction == 1;
        }
        else {
        window.openDialog(
          "chrome://filtersimportexport/content/confirmImportMissingDestinations.xul",
          "_blank",
          "chrome,all,dialog,modal,centerscreen",
          this.getMyPref().getIntPref(".missingDestinationAction"),
          dangerousFilters.join("\n"),
          function() {
            result.canImport = true;
          }
        );
        }
        if (result.canImport) {
            result.setupTask = this.setupFolderCreatorFromURLs(
                Object.keys(dangerousFiltersByURL).sort().reverse(),
                this.getAllExistingFolders()
            );
        }
        return result;
    },
    collectFilterNamesForURLs: function(filterStr) {
        var filterNamesForURLs = {};
        var allNames = [];

        var nameLineMatcher = /^name=["'](.+)["']$/;
        var actionValueLineMatcher = /^actionValue=["']((?:imap|mailbox):.+)["']$/;
        var lastFilterName;
        filterStr.split(/[\r\n]+/).forEach(function(line) {
            var nameLineMatchResult = line.match(nameLineMatcher);
            if (nameLineMatchResult) {
                lastFilterName = nameLineMatchResult[1];
                allNames.push(lastFilterName);
                return;
            }
            var actionValueLineMatchResult = line.match(actionValueLineMatcher);
            if (actionValueLineMatchResult) {
                var url = actionValueLineMatchResult[1];
                url = unescape(url);
                filterNamesForURLs[url] = filterNamesForURLs[url] || [];
                filterNamesForURLs[url].push(lastFilterName);
                return;
            }
        });

        filterNamesForURLs.all = allNames;
        return filterNamesForURLs;
    },
    getAllAccounts: function() {
        var accountManager = Components.classes['@mozilla.org/messenger/account-manager;1']
        .getService(Components.interfaces.nsIMsgAccountManager);
        var accounts = accountManager.accounts;
        var accountsArray = [];
        if (Components.interfaces.nsISupportsArray&& accounts instanceof Components.interfaces.nsISupportsArray) {
            for (var i = 0, maxi = accounts.Count(), account; i < maxi; i++) {
                account = accounts.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgAccount);
                accountsArray.push(account);
            }
        } else if (Components.interfaces.nsIArray && accounts instanceof Components.interfaces.nsIArray) {
            for (var i = 0, maxi = accounts.length, account; i < maxi; i++) {
                account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
                accountsArray.push(account);
            }
        }
        return accountsArray;
    },
    getAllExistingFolders: function() {
        var accounts = this.getAllAccounts();
        var folders = {};
        accounts.forEach(function(account) {
          var root = account.incomingServer.rootFolder;
          folders[unescape(root.URI)] = root;

          var descendants;
          var folder;
          if ('descendants' in root) { // Thunderbird 24
            descendants = root.descendants;
            for (var i = 0, maxi = descendants.length; i < maxi; i++) {
              folder = descendants.queryElementAt(i, Components.interfaces.nsIMsgFolder);
              folders[unescape(folder.URI)] = folder;
            }
          } else { // Thunderbird 17 or olders
            descendants = Components.classes['@mozilla.org/supports-array;1']
                            .createInstance(Components.interfaces.nsISupportsArray);
            root.ListDescendents(descendants);
            for (var i = 0, maxi = descendants.Count(); i < maxi; i++) {
              folder = descendants.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgFolder);
              folders[unescape(folder.URI)] = folder;
            }
          }
        });
        return folders;
    },
    getLine: function(str) {
        return str.substr(0, str.indexOf("\n"));
    },
    consumeLine: function(str) {
        return str.substr(str.indexOf("\n")+1);
    },
    setupFolderCreatorFromURLs: function(urls, existingFolders) {
        var tasks = [];
        urls.forEach(function(url) {
            tasks = tasks.concat(this.createFolderFromURL(url, existingFolders));
        }, this);

        var manager = {
            tasks: tasks,
            totalTasksCount: tasks.length,
            interval: 100,
            canStart() {
                return this.tasks.length > 0;
            },
            async start(callbacks) {
                callbacks = callbacks || {};
                if (typeof callbacks.onFinish == 'function')
                    this.onFinish = callbacks.onFinish;
                if (typeof callbacks.onError == 'function')
                    this.onError = callbacks.onError;
                if (typeof callbacks.onProgress == 'function')
                    this.onProgress = callbacks.onProgress;
                while (true) {
                    const succeeded = await this.process();
                    if (!succeeded)
                        break;
                }
            },
            stop() {
                if (this.currentTask) {
                    this.currentTask.cancelled = true;
                }
            },
            async process() {
                if (!this.tasks.length) {
                    this.stop();
                    this.onFinish();
                    return false;
                }
                var progress = 100 - Math.round(this.tasks.length / this.totalTasksCount * 100);
                this.onProgress(progress);
                this.currentTask = this.tasks.shift();
                var succeeded = false;
                try {
                    succeeded = await this.currentTask();
                } catch(error) {
                    Components.utils.reportError(error);
                }
                this.currentTask = null;
                return succeeded;
            },
            onError(failedTask) {},
            onFinish() {},
            onProgress(progress) {}
        };
        return manager;
    },
    convertIMAPPathToLocalPath: function(path) {
        var parts = path.split('/');
        return parts.map(function(part) {
            return this.encodeLocalPathPart(this.decodeIMAPPathPart(part));
        }, this).join('/');
    },
    sanitizeIMAPPath: function(path) {
        var parts = path.split('/');
        return parts.map(function(part) {
            // Don't decode non-encoded string! decodeIMAPPartPath can break non-ASCII Unicode strings.
            if (/&[^-]+-/.test(part))
              part = this.decodeIMAPPathPart(part);
            return this.encodeIMAPPathPart(part);
        }, this).join('/');
    },
    convertLocalPathToIMAPPath: function(path) {
        var parts = path.split('/');
        return parts.map(function(part) {
            return this.encodeIMAPPathPart(this.decodeLocalPathPart(part));
        }, this).join('/');
    },
    sanitizeLocalPath: function(path) {
        var parts = path.split('/');
        return parts.map(function(part) {
            return this.encodeLocalPathPart(this.decodeLocalPathPart(part));
        }, this).join('/');
    },
    encodeIMAPPathPart: function(part) {
        try { // on Thunderbird 56 and later
            return Components.classes['@mozilla.org/charset-converter-manager;1']
                             .getService(Components.interfaces.nsICharsetConverterManager)
                             .unicodeToMutf7(part);
        }
        catch(e) {
        }
        var UConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                              .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        UConv.isInternal = true; // required to use x-imap4-modified-utf7
        UConv.charset = "x-imap4-modified-utf7";
        var padding = " "; // this is required to finish non-ASCII string completely!
        part = UConv.ConvertFromUnicode(part + padding);
        part = part.substring(0, part.length - padding.length);
        return part;
    },
    decodeIMAPPathPart: function(part) {
        try { // on Thunderbird 56 and later
            return Components.classes['@mozilla.org/charset-converter-manager;1']
                             .getService(Components.interfaces.nsICharsetConverterManager)
                             .mutf7ToUnicode(part);
        }
        catch(e) {
        }
        var UConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                              .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        UConv.isInternal = true; // required to use x-imap4-modified-utf7
        UConv.charset = "x-imap4-modified-utf7";
        return UConv.ConvertToUnicode(part);
    },
    encodeLocalPathPart: function(part) {
        var UConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                              .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        UConv.charset = "UTF-8";
        part = UConv.ConvertFromUnicode(part);
        return escape(part);
    },
    decodeLocalPathPart: function(part) {
        part = unescape(part);
        var UConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                              .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        UConv.charset = "UTF-8";
        return UConv.ConvertToUnicode(part);
    },
    createFolderFromURL: function(url, existingFolders) {
      var tasks = [];
      try {
        var parentURL = url.split('/');
        var name = parentURL.pop();
        parentURL = parentURL.join('/');

        if (/&[^-]+-/.test(name)) {
            name = this.decodeIMAPPathPart(name);
        } else {
            name = this.decodeLocalPathPart(name);
        }

        if (parentURL && !(parentURL in existingFolders))
            tasks = tasks.concnat(this.createFolderFromURL(parentURL, existingFolders));

        console.log('reserve to create "' + url + '"');
        // create folders asynchronously, because synchronous operations can fail on IMAP servers.
        var task = async () => {
            var existingFolder = this.findFolderFromURL(url, existingFolders);
            if (existingFolder)
                return;

            console.log('creating "' + name + '" in "' + parentURL + '"');
            var start = Date.now();
            const parent = this.findFolderFromURL(parentURL, existingFolders);
            do {
                parent.createSubfolder(name, filtersimportexport.gFilterListMsgWindow || msgWindow);
                await new Promise((resolve, reject) => { setTimeout(resolve, 100); });
                if (!this.findFolderFromURL(url, existingFolders) &&
                    Date.now() - start < 1000 &&
                    !task.canceled) {
                    console.log('retrying to create "' + name + '" in "' + parentURL + '"');
                    continue;
                }
                return !!parent;
            } while (true);
        };
        task.folderName = name;
        task.url = url;
        task.canceled = false;
        tasks.push(task);
      } catch(e) {
        Components.utils.reportError(url+' / '+e);
      }
      return tasks;
    },
    findFolderFromURL: function(url, parent) {
        var unescapedURL = unescape(url);
        if (!(parent instanceof Components.interfaces.nsIMsgFolder)) {
          var existingFolders = parent;
          var root;
          Object.keys(existingFolders).some(function(folderURL) {
            if (unescapedURL.indexOf(folderURL) == 0) {
              root = existingFolders[folderURL];
              return true;
            }
            return false;
          });
          parent = root;
        }

        if (unescape(parent.URI) == unescapedURL)
            return parent;
        try {
            var folder;
            var found;
            var folders = parent.subFolders;
            while (folders.hasMoreElements()) {
                folder = folders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
                found = this.findFolderFromURL(url, folder);
                if (found)
                    return found;
            }
        } catch(error) {
            Components.utils.reportError(error);
        }
        return null;
    },
    onExportFilter: async function() {
        var msgFolder = filtersimportexport.getCurrentFolder();

        var now = new Date();
        var defaultFileName;
        try {
          defaultFileName = this.getMyPref()
              .getComplexValue(".export.defaultFileName", Components.interfaces.nsIPrefLocalizedString)
              .data;
        } catch(e) {
          defaultFileName = this.getMyPref()
              .getComplexValue(".export.defaultFileName", Components.interfaces.nsISupportsString)
              .data;
        }
        defaultFileName = defaultFileName
            .replace(/\%account/gi, msgFolder.prettyName)
            .replace(/\%yyyy/gi, now.getFullYear())
            .replace(/\%mm/gi, ('0' + (now.getMonth() + 1)).slice(-2))
            .replace(/\%dd/gi, ('0' + now.getDate()).slice(-2));

        var file = await this.selectFile(Components.interfaces.nsIFilePicker.modeSave, defaultFileName);
        this.exportFilterTo(msgFolder, file);
        this.alert(this.getString("exportfinishTitle"), this.getFormattedString("exportfinish", [file.path]));
    },
    exportFilterTo: function(msgFolder, file) {
        var msgFilterURL = msgFolder.URI;
        var    filterList = this.currentFilterList(msgFolder, msgFilterURL);
        filterList.saveToDefaultFile();
        //   for (var i = 0; i < filterList.filterCount; i++)
        //      alert (filterList.getFilterAt(i).filterName);
        var data = "";
        data = this.tryExportTags(data);
        
        data += "RootFolderUri=" + msgFilterURL + "\n";
        data += filtersimportexport.filterMailnewsHeaders + "=" + this.getHeaders() + "\n";
        
        var stream = this.createFile(file.path);
        var path = file.path;
        if (filterList.defaultFile.nativePath)
            var inputStream = this.openFile(filterList.defaultFile.nativePath);
        else
            var inputStream = this.openFile(filterList.defaultFile.path);
        
        var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
        .createInstance(Components.interfaces.nsIScriptableInputStream);
        sstream.init(inputStream);
        
        var str = sstream.read(4096);
        while (str.length > 0) {
            data += str;
            str = sstream.read(4096);
        }
        
        sstream.close();
        inputStream.close();
        
        //alert(data);
        stream.write(data,data.length);
        stream.close();
    },
    tryExportTags:function (filtersStr) {
        filtersStr += filtersimportexport.MailnewsTagsMark + "=\n";
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService);
        var branch = prefs.getBranch("mailnews.tags.");
        var children = branch.getChildList("", {});
        var hasCustomizedTag = false;
        for (index in children) {
            try {
                var tag = children[index];
                if (tag.indexOf("$")==0) //skip the default tags
                    continue;
                var value = branch.getCharPref(tag);
                filtersStr += "mailnews.tags." + tag + filtersimportexport.TagSep + value + "\n";
                hasCustomizedTag = true;
            }
            catch (e) {
                if (e.name != "NS_ERROR_UNEXPECTED" || tag != "version")
                    alert("Uh oh, not able to save a tag.");
            }
        }
        if (hasCustomizedTag)
            return filtersStr;
        else
            return "";
    },
    selectFile: function (mode, defaultFileName) {
        var fp = Components.classes["@mozilla.org/filepicker;1"]
        .createInstance(Components.interfaces.nsIFilePicker);
        
        
        var title = this.getString("exporttitle");
        if (mode == Components.interfaces.nsIFilePicker.modeOpen)
            title = this.getString("importtitle");
        if (defaultFileName)
            fp.defaultString = defaultFileName;
        fp.init(window, title, mode);
        fp.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
        
        return new Promise((resolve, reject) => {
            fp.open((ret) => {
                if (ret == Components.interfaces.nsIFilePicker.returnOK ||
                    ret == Components.interfaces.nsIFilePicker.returnReplace) {
                    resolve(fp.file);
                }
                else {
                    resolve(null);
                }
            });
        });
    },
    createFile :function (aPath) {
       // if (! netscape.security.PrivilegeManager) return null;
       // netscape.security.PrivilegeManager
       // .enablePrivilege("UniversalFileAccess UniversalXPConnect");
        
        var file=Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
        file.initWithPath(aPath);
        
        var fileStream = Components.classes['@mozilla.org/network/file-output-stream;1']
        .createInstance(Components.interfaces.nsIFileOutputStream);
        fileStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
        return fileStream;
    },
    openFile :function (aPath) {
       // if (! netscape.security.PrivilegeManager) return null;
       // netscape.security.PrivilegeManager
       // .enablePrivilege("UniversalFileAccess UniversalXPConnect");
        
        var file=Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
        file.initWithPath(aPath);
        
        var fileStream = Components.classes['@mozilla.org/network/file-input-stream;1']
        .createInstance(Components.interfaces.nsIFileInputStream);
        fileStream.init(file, 0x01, 0664, 0);
        return fileStream;
    },
    currentFilterList: function(msgFolder,serverUri) {
        if (typeof gCurrentFilterList != "undefined" && gCurrentFilterList)
            return gCurrentFilterList;
        // note, serverUri might be a newsgroup
        var filterList = null;
        if (filtersimportexport.gFilterListMsgWindow || msgWindow)
            filterList = msgFolder.getFilterList(filtersimportexport.gFilterListMsgWindow || msgWindow);
        if (!filterList)
            filterList = filtersimportexport.gfilterImportExportRDF.GetResource(serverUri).GetDelegate("filter", Components.interfaces.nsIMsgFilterList);
        return filterList;
    },
    overlayDialog:function() {
        window.removeEventListener("load", filtersimportexport.overlayDialog, false);
        
        var exportButton = document.getElementById("exportBurron");
        var importButton = document.getElementById("importButton");
        var vboxElement = document.getElementById("newButton").parentNode;
        // Append them to the end of the button box
        vboxElement.appendChild(exportButton);
    //    vboxElement.appendChild(importButton);
    },
    getMyPref: function()
    {
        var myPrefs = Components.classes["@mozilla.org/preferences-service;1"].
        getService(Components.interfaces.nsIPrefService).getBranch("extensions.FiltersImportExport@mozilla.org");
        try{
            myPrefs = myPrefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
        }catch(e){}
        return myPrefs;
    },
    getPref: function()
    {
        var mailPrefs = Components.classes["@mozilla.org/preferences-service;1"].
        getService(Components.interfaces.nsIPrefService).getBranch("mailnews");
        try{
            mailPrefs = mailPrefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
        }catch(e){}
        return mailPrefs;
    },
    getHeaders: function()
    {
        return this.getPref().getCharPref(".customHeaders");
    },
    setHeader: function(header)
    {
        this.getPref().setCharPref(".customHeaders",header);
    },
    mergeHeaders : function (headers)
    {
        var currHeaders = this.getHeaders().split(":");
        var addHeaders = headers.split(":");
        var newHeaders = currHeaders;
        for(var i=0;i<addHeaders.length;++i)
        {
            var found = false;
            for(var j=0;j<newHeaders.length;j++)
            {
                if (filtersimportexport.TrimImpl(addHeaders[i]) == filtersimportexport.TrimImpl(newHeaders[j]))
                {
                    found = true;
                    break;
                }
            }
            if (!found)
                newHeaders.push(addHeaders[i])
        }
        var newStr = "";
        for (var i=0;i<newHeaders.length;++i)
        {
            if (newStr != "")
                newStr = newStr + ": " + newHeaders[i];
            else
                newStr = newHeaders[i];
        }
        this.setHeader(newStr);
    },
    checkUpdate:function () {
        var filterHome = "http://www.example.com/";
        var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        var prefBranch = prefService.getBranch("filterimportexport.");
        if (!prefBranch.prefHasUserValue("last_version")) {  // new user
            prefBranch.setCharPref("last_version", filtersimportexport.CurrentVersion);
            this.openURL(filterHome,null);
        } else { // check for upgrade
            var lastVersion = prefBranch.getCharPref("last_version");
            if (lastVersion != filtersimportexport.CurrentVersion)
            {
                prefBranch.setCharPref("last_version", filtersimportexport.CurrentVersion);
                this.openURL(filterHome,null);
            //addfilterButton();
            }
        }
    }
    ,
    openURL: function(url, param)
    {
        try{
            //window.open(url,param);
            var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
            .getService(Components.interfaces.nsIExternalProtocolService);
            var uri = Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService)
            .newURI(url, null, null);
            protocolSvc.loadUrl(uri);
        } catch (ex) {
            alert(ex);
        }
    }

};
//filtersimportexport.checkUpdate();
//window.addEventListener("load", function(e) { filtersimportexport.onLoad(e); }, false); 
