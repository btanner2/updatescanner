/* ***** BEGIN LICENSE BLOCK *****
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Update Scanner.
 * 
 * The Initial Developer of the Original Code is Pete Burgers.
 * Portions created by Pete Burgers are Copyright (C) 2006-2007
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.  
 * ***** END LICENSE BLOCK ***** */
 
 // Requires: rdf/rdfds.js
//           rdf/rdf.js
//           scan.js
//           fuzzy.js
//           refresh.js
//           opentopwin.js
//           updatescanoverlay.js
var numChanges;
var refresh;
var scan;

function loadUpdateScan()
{
    var tree;
    var rdffile;

    // Connect to the RDF file
    rdffile = getRDFpath();
    initRDF(getURI(rdffile));

    // link to the listbox
    tree = document.getElementById("UpdateTree");
    tree.datasources=getURI(rdffile);
    tree.onclick=treeClick;

    upgradeCheck(); // See if we need to upgrade something

    // Check for refresh requests
    refresh = new Refresher("refreshTreeRequest", refreshTree);
    refresh.start();
    refresh.request();
}

function unloadUpdateScan()
{
    refresh.stop();
}

function treeClick(event)
{
    if (getNumItems() == 0) return;

    // Code from http://xul.andreashalter.ch/
    //get original target (element user clicked on) 
    var str_OrigTarget = event.originalTarget; 
    //if target is a treechildren, we're right 
    if (str_OrigTarget.localName == "treechildren") { 
        //create storage containers for results values 
        var obj_Row = new Object; 
        var obj_Col = new Object; 
        var obj_Child = new Object; 
        //find tree holder 
        var tree = document.getElementById('UpdateTree'); 
        //get cell at x/y coords from tree 
        tree.treeBoxObject.getCellAt(event.clientX, event.clientY, obj_Row, obj_Col, obj_Child); 
        //if row < 0, we didn't find the row selected in this tree 
        if (obj_Row.value == -1) 
        {
            return; 
        }
    } 

    var id = tree.contentView.getItemAtIndex(obj_Row.value).id;

    switch (event.button) {
        case 0:
            diffItemThisWindow(id, 1);
            break;
        case 1:
            diffItemNewTab(id, 1);
            break;
    }
}

function scanButtonClick()
{
    var id;
    var filebase;
    var numitems;
    var str=document.getElementById("updatescanStrings")
    var ignoreNumbers;
    var encoding;

    showStopButton();
    
    var tree = document.getElementById("UpdateTree");

    numitems = getNumItems();
    if (numitems > 0) {
        scan = new Scanner()
        
        for (var i=0; i<numitems; i++) {
            id = tree.contentView.getItemAtIndex(i).id;
            filebase=USc_file.escapeFilename(id)
            encoding = queryRDFitem(id, "encoding", "UTF-8");
            if (queryRDFitem(id, "ignoreNumbers", "false") == "true") {
                ignoreNumbers = true;
            } else {
                ignoreNumbers = false;
            }
            scan.addURL(id, queryRDFitem(id, "title", "No Title"), 
                        queryRDFitem(id, "url", ""), 
                        USc_file.USreadFile(filebase+".new"),
                        queryRDFitem(id, "threshold", 100),
                        ignoreNumbers,
                        queryRDFitem(id, "encoding", "auto"));
        }

        setStatus(str.getString("statusScanning"));
        numChanges=0;
        scan.start(scanChangedCallback, scanFinishedCallback, showProgress,
                   scanEncodingCallback);
    } else {
        numChanges = 0;
        scanFinishedCallback(str.getString("treeEmptyAlert"));
    }
}

function scanChangedCallback(id, new_content, status, statusText, headerText)
{
    if (processScanChange(id, new_content, status, statusText, headerText)) {
        numChanges++;
    }
    refreshTree();
    refresh.request();
}

function scanEncodingCallback(id, encoding)
// Called when encoding is detected for a page marked for auto-detect encoding
{
    modifyRDFitem(id, "encoding", encoding);
}

function scanFinishedCallback()
{
    var str=document.getElementById("updatescanStrings");
    var param;

    if (numChanges == 0) {
        setStatus(str.getString("statusNoChanges"));
    } else {
        if (numChanges == 1) {
            setStatus(str.getString("statusOneChange"));
            message = str.getString("alertOneChange");
        } else {
            param = {numChanges:numChanges};
            setStatus(str.getString("statusManyChanges").supplant(param));
            message = str.getString("alertManyChanges").supplant(param);
        }
        window.openDialog("chrome://updatescan/content/alert.xul",
                  "alert:alert",
                  "chrome,dialog=yes,titlebar=no,popup=yes",
                  message);
    }
    hideProgress();
    showScanButton();
}

function stopButtonClick()
{
    var str=document.getElementById("updatescanStrings");

    if (scan != null) {
        scan.cancel();
    }
    showScanButton();
    setStatus(str.getString("statusCancel"));
}

function openNewDialog()
{
    var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow) 

    addToUpdateScan(mainWindow.document.getElementById('content'))
    refreshTree();
    refresh.request();
}

function openNewDialogNoRefresh(title, url)
{
    var id;
    var filebase;
    var args = {
        title:          title, 
        url:            url, 
        threshold:      "100",      // threshold = 100 by default
        scanRateMins:   "60",       // scan once an hour by default
        encoding:       "auto",     // Auto encoding by default
        ignoreNumbers:  "true",     // Ignore number changes by default
        advanced:       true
    };

    window.openDialog('chrome://updatescan/content/dlgnewedit.xul', 'dlgNew', 
                      'chrome,dialog,modal,centrescreen', args);
    if (args.ok) {
        id = addRDFitem();
        modifyRDFitem(id, "title", args.title);
        modifyRDFitem(id, "url", args.url);
        modifyRDFitem(id, "threshold", args.threshold);
        modifyRDFitem(id, "scanratemins", args.scanRateMins);
        modifyRDFitem(id, "encoding", args.encoding);
        modifyRDFitem(id, "ignoreNumbers", args.ignoreNumbers);

        filebase = USc_file.escapeFilename(id);
        USc_file.USwriteFile(filebase+".new", "**NEW**");

        modifyRDFitem(id, "lastscan", "");  // lastscan not defined
        modifyRDFitem(id, "changed", "0");  // not changed 
        modifyRDFitem(id, "error", "0");    // no error
        saveRDF();

    }
}

function openEditDialog()
{
    var id=getSelectedItemID();
    if (id == "") return;

    var args = {
        title:          queryRDFitem(id, "title", "No Title"),
        url:            queryRDFitem(id, "url", ""),
        threshold:      queryRDFitem(id, "threshold", "100"),
        scanRateMins:   queryRDFitem(id, "scanratemins", "0"),
        encoding:       queryRDFitem(id, "encoding", "auto"),
        ignoreNumbers:  queryRDFitem(id, "ignoreNumbers", "false"),
        // Although ignoreNumbers is true by default, behaviour of pages
        // upgraded from previous version shouldn't be modified
        advanced:       true
    }

    var oldurl = args.url;

    window.openDialog('chrome://updatescan/content/dlgnewedit.xul', 'dlgEdit', 
                      'chrome,dialog,modal,centrescreen', args);
                      
    if (args.ok) {
        modifyRDFitem(id, "title", args.title);
        modifyRDFitem(id, "url", args.url);
        modifyRDFitem(id, "threshold", args.threshold);
        modifyRDFitem(id, "scanratemins", args.scanRateMins);
        modifyRDFitem(id, "encoding", args.encoding);
        modifyRDFitem(id, "ignoreNumbers", args.ignoreNumbers);

        if (oldurl != args.url) {   // URL changed - reset all values
            filebase = USc_file.escapeFilename(id);
            USc_file.USwriteFile(filebase+".new", "**NEW**");

            modifyRDFitem(id, "lastscan", "");  // lastscan not defined
            modifyRDFitem(id, "changed", "0");  // not changed
            modifyRDFitem(id, "error", "0");    // no error
        }
        saveRDF();
    }
    refreshTree();
    refresh.request();
}

function openSelectedItem()
{
    modifyRDFitem(id, "changed", "0");
    saveRDF();
    openTopWin(queryRDFitem(id, "url"));
    refreshTree();
    refresh.request();
}

function diffItem(id, numItems)
{
    var now = new Date();
    modifyRDFitem(id, "changed", "0");
    saveRDF();

    refreshTree();
    refresh.request();
    
    var old_lastScan = queryRDFitem(id, "old_lastscan", "")
    if (old_lastScan == "") old_lastScan = "5 November 1978";
    old_lastScan = new Date(old_lastScan);
    var oldDate = dateDiffString(old_lastScan, now);

    var lastScan =queryRDFitem(id, "lastscan", "");
    if (lastScan == "") lastScan = "5 November 1978";
    lastScan = new Date(lastScan);
    var newDate = dateDiffString(lastScan, now);

    var filebase = USc_file.escapeFilename(id);
    return USc_diff.display(queryRDFitem(id, "title", "No Title"), 
            queryRDFitem(id, "url", ""), 
            USc_file.USreadFile(filebase+".old"),
            USc_file.USreadFile(filebase+".new"),
            USc_file.USreadFile(filebase+".dif"),
            oldDate, newDate, numItems);
}

function diffSelectedItemThisWindow()
{
    var item = getSelectedItemID();
    if (item == "") return;
    diffItemThisWindow(item, 1);
}

function diffItemThisWindow(id, numItems)
{
    var diffURL = diffItem(id, numItems)
    openTopWin(diffURL);
    focusTree();
}

function diffSelectedItemNewTab()
{
    var item = getSelectedItemID();
    if (item == "") return;
    diffItemNewTab(item, 1);    
}

function diffItemNewTab(id, maxItems)
{
    var mainWindow = window.QueryInterface(
    Components.interfaces.nsIInterfaceRequestor)
    .getInterface(Components.interfaces.nsIWebNavigation)
    .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
    .rootTreeItem
    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
    .getInterface(Components.interfaces.nsIDOMWindow);

    var diffURL = diffItem(id, maxItems);
    mainWindow.getBrowser().addTab(diffURL);
}

function dateDiffString(oldDate, newDate)
{
    var ret; 
    var time;
    var str=document.getElementById("updatescanStrings")

    var diff = newDate.getTime() - oldDate.getTime();
    diff = diff / 1000; // convert to seconds
    diff = diff / 60;   // minutes
    diff = diff / 60;   // hours
    if (diff < 24) {
        time = oldDate.getHours()+":";
        var mins = oldDate.getMinutes().toString();
        if (mins.length == 1) {
            mins = "0" + mins;
        }
        time += mins;

        if (oldDate.getDate() != newDate.getDate()) {
            return str.getString("yesterdayAt").supplant({time:time});
        } else {
            return str.getString("todayAt").supplant({time:time});
        }
    }

    diff = diff / 24;
    if (diff < 7) {
        diff = Math.floor(diff);
        if (diff == 1) {
            return str.getString("dayAgo");
        } else {
            return str.getString("daysAgo").supplant({numDays:diff});
        }
    }
    diff = diff / 7;
    diff = Math.floor(diff);
    if (diff == 1) {
        return str.getString("weekAgo");
    } else {
        return str.getString("weeksAgo").supplant({numWeeks:diff});
    }
}

function markAllAsVisited()
{
    var tree = document.getElementById("UpdateTree");

    var numitems = getNumItems();
    if (numitems > 0) {
        for (var i=0; i<numitems; i++) {
            var id = tree.contentView.getItemAtIndex(i).id;
            if (queryRDFitem(id, "changed") != "0") {
                modifyRDFitem(id, "changed", "0");
                refreshTree();
            }
        }
        saveRDF();
        refreshTree();
        refresh.request();
    }
}

function showAllChangesInNewTabs()
{
    var tree = document.getElementById("UpdateTree");

    var numItems = getNumItems();
    if (numItems > 0) {
        for (var i=0; i<numItems; i++) {
            var id = tree.contentView.getItemAtIndex(i).id;
            if (queryRDFitem(id, "changed") != "0") {
                diffItemNewTab(id, numItems);
            }
        }
    }
}

function sortByName()
{
    var i;
    var id;
    var item;
    var tree = document.getElementById("UpdateTree");
    var numitems = getNumItems();
    var data = new Array();
    var indexes = new Array();
    var params;
    var str=document.getElementById("updatescanStrings");

    // Get a list of ids & titles
    if (numitems > 0)
    {
        for (var i=0; i<numitems; i++)
        {
            id = tree.contentView.getItemAtIndex(i).id;
            item = {id:id, title:queryRDFitem(id, "title").toLowerCase()}
            data.push(item);
            indexes.push(i);
        }
        // Open the progress dialog and perform the sort
        params = {label:str.getString("sortLabel"), callback:sortItem, 
                  items:indexes, data:data, 
                  cancelPrompt:str.getString("sortCancel"), 
                  retVal:null, retData:null};       
        window.openDialog('chrome://updatescan/content/progress.xul', 
                          'dlgProgress', 
                          'chrome,dialog,modal,centrescreen', params);

        saveRDF();
        refreshTree();
        refresh.request();
    }
    
}

function sortItem(index, data)
// Passed the current index and the remaining items to sort.
// Finds the smallest item, moves it into position, removes it from the 
// data array.
{
    var i;
    var smallestIndex = 0;
    var smallestTitle = data[0].title;
    var count = data.length;
    for (i=1; i<count; i++) {
        if (data[i].title < smallestTitle) {
            smallestIndex = i;
            smallestTitle = data[i].title;
        }
    }
    if (smallestIndex != 0) {
        moveRDFitem(data[smallestIndex].id, index); // Move into position
    }
    data.splice(smallestIndex, 1);              // Remove from data array
    return null;    
}

function openHelp()
{
    var str=document.getElementById("updatescanStrings")
    var locale = Components.classes["@mozilla.org/preferences-service;1"].
                 getService(Components.interfaces.nsIPrefService).
                 getBranch("general.").
                 getCharPref("useragent.locale");
    var helpURL="http://updatescanner.mozdev.org/redirect.php?page=help.html&locale="+locale;
    openTopWin(helpURL);
}

function deleteSelectedItem()
{
    var str=document.getElementById("updatescanStrings")
    var id=getSelectedItemID();
    var fileBase=USc_file.escapeFilename(id)

    if (id == "") return;
    var title = queryRDFitem(id, "title", "untitled");

    if (confirm(str.getString("confirmDelete") + " " + title + "?")) {
        USc_file.USrmFile(fileBase+".old");
        USc_file.USrmFile(fileBase+".new");
        USc_file.USrmFile(fileBase+".dif");
        deleteRDFitem(id);
        saveRDF();
        refreshTree();
        refresh.request();
    }
}

function getSelectedItemID()
{
    var tree = document.getElementById("UpdateTree");
    var id;
    try {
        id = tree.contentView.getItemAtIndex(tree.currentIndex).id;
    } catch (e) {
        id = "";
    }

    return id;
}

function showStopButton()
{
    var scanbutton = document.getElementById("scanbutton");
    scanbutton.setAttribute("label", scanbutton.getAttribute("stopbuttonlabel"));
    scanbutton.setAttribute("oncommand", scanbutton.getAttribute("stopbuttoncommand"));
}

function showScanButton()
{
    var scanbutton = document.getElementById("scanbutton");
    scanbutton.setAttribute("label", scanbutton.getAttribute("scanbuttonlabel"));
    scanbutton.setAttribute("oncommand", scanbutton.getAttribute("scanbuttoncommand"));
}

function refreshTree()
{
    try {
        var tree=document.getElementById("UpdateTree");
        var savedRow = tree.currentIndex;
        var scrollRow = tree.boxObject.getFirstVisibleRow();
        tree.builder.rebuild();    
        tree.view.selection.select(savedRow);
        tree.boxObject.scrollToRow(scrollRow);
    } catch (e) {
        ;
    }
}

function focusTree()
{
    var tree=document.getElementById("UpdateTree");
    tree.focus();
}

function setStatus(status)
{
    document.getElementById("StatusText").value = status;
}

function showProgress(value, max)
{
    var progress = document.getElementById("Progress");
    progress.collapsed = false;
    progress.value = 100*value/max;
}

function hideProgress()
{   
    document.getElementById("Progress").collapsed=true;
}

function getNumItems()
{
    var tree = document.getElementById("UpdateTree");
    try {
        return tree.contentView.rowCount;
    } catch(e) {
        return 0;
    }
}
