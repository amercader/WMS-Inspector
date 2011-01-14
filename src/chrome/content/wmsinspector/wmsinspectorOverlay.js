
// WMSInspector namespace
var WMSInspector =  {};

Components.utils.import("resource://wmsinspector/classes.js",WMSInspector);
Components.utils.import("resource://wmsinspector/utils.js",WMSInspector);
Components.utils.import("resource://wmsinspector/db.js",WMSInspector);
Components.utils.import("resource://wmsinspector/io.js",WMSInspector);
Components.utils.import("resource://wmsinspector/requests.js",WMSInspector);
Components.utils.import("resource://wmsinspector/log.js",WMSInspector);

WMSInspector.Overlay = {
	
    currentServiceImages: false,

    currentGroupMode: 0,

    prefs: null,

    currentNameColumnText: false,

    currentNameColumnValues: false,

    noServicesFoundCellId: "wiCellNoServicesFound",

    libraryWindow: null,

    serviceTypes: [],

    wis: null,

    init: function(){

        //Set preferences object
        this.prefs = WMSInspector.Utils.getPrefs();

        //Set preferences observer
        WMSInspector.Utils.setPreferenceObserver(this.prefs,this);

        // Check if first run or upgrade actions must be performed.
        // Set up operations will be performed asynchronously on the
        // onReady method
        this.checkForUpgrades();

    },

    unload: function(){
        this.prefs.removeObserver("", this);
        if (WMSInspector.DB.conn){
            if (WMSInspector.Utils.compareFirefoxVersions(WMSInspector.Utils.currentFirefoxVersion,"4.0b")< 0){
                // FF 3.6
                WMSInspector.DB.conn.close();
            } else {
                // FF 4.0
                WMSInspector.DB.conn.asyncClose();
            }
            
        }
    },

    onReady: function(){

        // Get a WMSInspector service instance
        this.wis = WMSInspector.Utils.getWMSInspectorService();

        //Check if tmp dir exists
        WMSInspector.IO.checkWITmpDir();

        //Show/Hide Context menu
        document.getElementById("wiContextMenu").setAttribute("hidden",this.prefs.getBoolPref("hidecontextmenu"));

        this.wis.getServiceTypes(function(results){
            if (results)
                WMSInspector.Overlay.serviceTypes = results;
        });
    },

    checkForUpgrades: function(){
        var installedVersion = -1;
        var firstRun = true;

        // Starting from Firefox 4.0, Addon related functions are asynchronous
        WMSInspector.Utils.getExtensionVersion(
            function(currentVersion){
                var prefs = WMSInspector.Overlay.prefs;
                try {
                    installedVersion = prefs.getCharPref("version");
                    firstRun = prefs.getBoolPref("firstrun");
                } catch(error){
                    WMSInspector.Log.error(error);
                } finally {
                    if (firstRun){
                        prefs.setBoolPref("firstrun",false);
                        prefs.setCharPref("version",currentVersion);

                        //Code to be executed only when the extension is first installed
                        WMSInspector.Log.info("First run (version " + currentVersion + ")");

                        //Copy an empty database to the profile directory
                        WMSInspector.DB.restoreDB();

                    } else if (installedVersion != currentVersion && !firstRun) {
                        prefs.setCharPref("version",currentVersion);

                        //Code to be executed when the extension is upgraded
                        WMSInspector.Log.info("Upgrading from version " + installedVersion + " to " + currentVersion);

                        //Check if the database schema needs to be updated
                        WMSInspector.DB.checkDB();

                    } else {
                        // No first run nor upgrade

                        //This will set up the DB connection
                        WMSInspector.DB.checkDB();
                    }

                    // The overlay is ready to be loaded
                    WMSInspector.Overlay.onReady();

                }
            }
        );
    },


    observe: function(subject,topic,data){
        if (topic == "nsPref:changed" && data == "hidecontextmenu"){
            document.getElementById("wiContextMenu").setAttribute("hidden",this.prefs.getBoolPref("hidecontextmenu"));
        }
    },

    togglePanel: function(){
        var panel = document.getElementById("wiContent");
        var splitter = document.getElementById("wiContentSplitter");
        var newvalue = !panel.hidden;
        panel.setAttribute("hidden",newvalue);
        splitter.setAttribute("hidden",newvalue);
		
    },
	
    refreshServiceImages: function(){
        this.currentServiceImages = [];
        WMSInspector.ServiceImages.refreshImages();
        this.currentServiceImages = WMSInspector.ServiceImages.currentServiceImages;
        
        this.buildServiceImagesTree();
    },
	
    groupTree: function(mode){
        if (this.currentGroupMode != mode) {
            this.currentGroupMode = mode;

            this.buildServiceImagesTree();

        }
    },

    // TODO: implement this as binding?
    buildServiceImagesTree: function (){
        var t;
        var tChMain;
        var tChImage;
        var tChParams;
        var tIItem;
        var tIImage;
        var tRItem;
        var tRImage;
        var tCeItem;
        var tCeImage;
        var label;
        var value;
		
        var windowServiceImages;
        var serviceImage;
        var serviceImageParam;


        t = document.getElementById("wiTree");
        tChMain = document.getElementById("wiTreeChildren");
        if (tChMain == null){
            tChMain = document.createElement("treechildren");
            tChMain.setAttribute("id","wiTreeChildren");
        } else {
            WMSInspector.Utils.emptyElement(tChMain);
        }
        if (this.currentServiceImages.length){
            windowServiceImages = this.sortServiceImages(this.currentServiceImages,this.currentGroupMode);
            for (var i=0; i < windowServiceImages.length; i++){
                tIItem = document.createElement("treeitem");
                tIItem.setAttribute("container",true);
                tRItem = document.createElement("treerow");
                tCeItem = document.createElement("treecell");
                value = this.getTreeCellId(1,i);
                tCeItem.setAttribute("id",value);
                tCeItem.setAttribute("value",value);
                label = windowServiceImages[i].item + " (" + windowServiceImages[i].elements.length + ")";
                tCeItem.setAttribute("label",label);
                tRItem.appendChild(tCeItem);
                tIItem.appendChild(tRItem);
                tChImage = document.createElement("treechildren");
                for (var j=0; j < windowServiceImages[i].elements.length; j++){
                    serviceImage =windowServiceImages[i].elements[j];
                    tIImage = document.createElement("treeitem");
                    tIImage.setAttribute("container",true);

                    tRImage = document.createElement("treerow");
                    tCeImage = document.createElement("treecell");
                   
                    value = this.getTreeCellId(2,serviceImage.id)
                    tCeImage.setAttribute("id",value);
                    tCeImage.setAttribute("value",value);
                    tCeImage.setAttribute("label",serviceImage.src);
                    tRImage.appendChild(tCeImage);
                    tIImage.appendChild(tRImage);
                    tChParams = document.createElement("treechildren");
                    for (var k=0; k < serviceImage.params.length; k++){
                        serviceImageParam = serviceImage.getParamByIndex(k);

                        this.addParamRow(tChParams,serviceImage.id,serviceImageParam.name,serviceImageParam.value,k);

                    }
                    tIImage.appendChild(tChParams);
                    tChImage.appendChild(tIImage);
                    tIItem.appendChild(tChImage);
                }
                tChMain.appendChild(tIItem);
            }
        }
        else {
            var tI = document.createElement("treeitem");
            var tR = document.createElement("treerow");
            var tCe = document.createElement("treecell");
            tCe.setAttribute("value",this.noServicesFoundCellId);
            tCe.setAttribute("label",WMSInspector.Utils.getString("wi_tree_noserviceimagesfound"));
            tR.appendChild(tCe);
            tI.appendChild(tR);
            tChMain.appendChild(tI);
        }
        t.appendChild(tChMain);
    },


    addParamRow: function(tChParams,imageId,paramName,paramValue,index){

        var tCeParams;
        var value;

        var tIParams = document.createElement("treeitem");
        var tRParams = document.createElement("treerow");
        tCeParams = document.createElement("treecell");
        value = this.getTreeCellId(3,imageId,index);
        tCeParams.setAttribute("id",value);
        tCeParams.setAttribute("value",value);
        tCeParams.setAttribute("label",paramName);
        tRParams.appendChild(tCeParams);

        tCeParams = document.createElement("treecell");
        value = this.getTreeCellId(4,imageId,index);
        tCeParams.setAttribute("id",value);
        tCeParams.setAttribute("value",value);
        tCeParams.setAttribute("label",paramValue);
        tRParams.appendChild(tCeParams);
        tIParams.appendChild(tRParams);
        tChParams.appendChild(tIParams);

        return tChParams.childNodes.length;
    },

    sortServiceImages: function(windowServiceImages,mode){
        var criteria;
        var out = Array();
        var exists;
        var cnt = 0;
        var serviceImage;

        for (var i=0; i < windowServiceImages.length; i++){
            serviceImage = windowServiceImages[i];
            criteria = (mode == 0) ? serviceImage.server : serviceImage.request;
            exists = false;
            for (var k=0; k < out.length; k++){
                if (out[k].item == criteria) {
                    exists = true;
                    break;
                }
            }
            if (exists){
                out[k].elements[out[k].elements.length] = serviceImage;
            } else {
                cnt = out.length;
                out[cnt] = Object();
                out[cnt].item = criteria;
                out[cnt].elements = Array();
                out[cnt].elements[0] = serviceImage;
            }
        }
        return out;
    },

    getTreeCellId: function(mode,image,parameter){
        var out;
        switch (mode){
            case 1:
            case 2:
                out = "wiCe_" + mode + "_" + image;
                break;
            case 3:
            case 4:
                out = "wiCe_" + mode + "_" + image + "_" + parameter;
                break;
        }
        return out;
    },
    
    onTreeClicked: function(event){
        var t = document.getElementById("wiTree");
        
        if (t.view == null) return;

        var treeSel = this.getTreeSelectionAt(event.clientX, event.clientY, "wiTree");
        if (treeSel.row.value != -1 && treeSel.part.value != "twisty"){
            var cellValues = t.view.getCellValue(treeSel.row.value,treeSel.column.value).split("_");
            if (event.button == 0){
                if (cellValues[1] == "2"){
                    var serviceImage = this.getServiceImage(parseInt(cellValues[2]),parseInt(cellValues[3]));
                    var newSrc = serviceImage.updateSrc();

                    //TODO: reuse, errors, default page, loading, cache?
                    WMSInspector.Overlay.showURLInPreviewBrowser(newSrc);
                   
                }
            }
        }
		
    },

    onTreeDoubleClicked: function(event){

        var t = document.getElementById("wiTree");
        if (t.view == null) return;

        var treeSel = this.getTreeSelectionAt(event.clientX, event.clientY, "wiTree");

        if (treeSel.row.value != -1 && treeSel.part.value != "twisty"){
            var cellValues = t.view.getCellValue(treeSel.row.value,treeSel.column.value).split("_");

            if (cellValues[1] == "3" || cellValues[1] == "4"){
                var col = t.columns.getNamedColumn("wiTreeNameColumn");
                var cellText = t.view.getCellText(t.currentIndex,col);
                var paramName = cellText;
                col = t.columns.getNamedColumn("wiTreeValueColumn");
                var paramValue = t.view.getCellText(t.currentIndex,col);
                var dialog = window.openDialog("chrome://wmsinspector/content/editParameterDialog.xul",
                    "wiEditParameterDialog",
                    "chrome,centerscreen",
                    cellValues[2],cellValues[3],paramName,paramValue);
                dialog.focus();
            }
        }
		
    },

    onContextMenu: function(event){
        var t = document.getElementById("wiTree");
        if (t.view == null) return;
        var treeSel = this.getTreeSelectionAt(event.clientX, event.clientY, "wiTree");

        if (treeSel.row.value != -1 && treeSel.part.value != "twisty"){
            var cellValues = t.view.getCellValue(treeSel.row.value,treeSel.column.value).split("_");
            if (cellValues[1] == "1" && this.currentGroupMode == 1) {
                t.setAttribute("context","");
                this.currentNameColumnText = false;
                this.currentNameColumnValues = false;
            }
            else {
                var col = t.columns.getNamedColumn("wiTreeNameColumn");
                this.currentNameColumnText = t.view.getCellText(t.currentIndex,col);
                this.currentNameColumnValues = t.view.getCellValue(t.currentIndex,col).split("_");
                var contextMenu = (cellValues[1] == "4") ? "gtTreeContextMenuURL3" : "gtTreeContextMenuURL" + cellValues[1];
                t.setAttribute("context",contextMenu);
            }
        }
    },
    
    doContextMenuAction: function(mode,event){
        var t = document.getElementById("wiTree");

        var cellText = this.currentNameColumnText;
        var cellValues = this.currentNameColumnValues;
        if (!cellText) return;

        var serviceImage;
        switch (mode){
            case 1:
                //Copy to clipboard
                this.copyTreeItem(cellValues,cellText,t);
                break;
            case 2:
                //Open in a new tab
                this.openServiceImageInNewTab(cellText);
                break;
            case 3:
                //Edit parameter
                var col = t.columns.getNamedColumn("wiTreeValueColumn");
                var paramValue = t.view.getCellText(t.currentIndex,col);
                window.openDialog("chrome://wmsinspector/content/editParameterDialog.xul",
                    "wiEditParameterDialog",
                    "chrome,centerscreen",
                    cellValues[2],cellValues[3],cellText,paramValue);
                break;
            case 4:
                //Add parameter
                window.openDialog("chrome://wmsinspector/content/addParameterDialog.xul",
                    "wiAddParameterDialog",
                    "chrome,centerscreen",
                    cellValues[2]);
                break;
            case 5:
                //Delete parameter
                serviceImage = this.getServiceImage(cellValues[2]);
                if(serviceImage.removeParam(cellText) !== false){

                    var newURL = serviceImage.updateSrc();
                    var cell;

                    cell = document.getElementById(this.getTreeCellId(4,cellValues[2],cellValues[3]));
                    if (cell) cell.parentNode.parentNode.parentNode.removeChild(cell.parentNode.parentNode);

                    cell = document.getElementById(this.getTreeCellId(2,cellValues[2]));
                    if (cell) cell.setAttribute("label",newURL);

                    this.showURLInPreviewBrowser(newURL);

                }
                break;
            case 6:
                //Add service to Library

                let version = false;
                let url = "";
                if (cellValues[1] == "2"){
                    // Image
                    serviceImage = this.getServiceImage(cellValues[2]);
                    url = serviceImage.server;
                    let param = serviceImage.getParamByName("VERSION");
                    if (param) version = param.value;
                } else {
                    // Server
                    url = cellText.substr(0,cellText.indexOf(" "));
                }
                WMSInspector.Overlay.openAddServiceDialog(false,url,version);

                break;
        }
    },
    
    copyTreeItem: function(cellValues,cellText,tree){
        var out = false;
        switch (cellValues[1]){
            case "1":
                out = cellText.substr(0,cellText.indexOf(" "));
                break;
            case "2":
                out = cellText;
                break;
            case "3":
                out = cellText;
                if (tree){
                    var col = tree.columns.getNamedColumn("wiTreeValueColumn");
                    cellText = tree.view.getCellText(tree.currentIndex,col);
                    out = out + "=" + cellText;
                }
                break;
        }
        var clipboardService = WMSInspector.Utils.getService("@mozilla.org/widget/clipboardhelper;1","nsIClipboardHelper");
        if (out && clipboardService) clipboardService.copyString(out);
        
    },
	
    openServiceImageInNewTab: function(url){
        if (url){
            gBrowser.addTab(url);
        }
    },
	
    onParamUpdated: function(imageId,paramId,paramName,paramValue){

        if (imageId && paramId && (paramValue || paramValue === "")) {
            var serviceImage = this.getServiceImage(imageId);
            serviceImage.setParam(paramName,paramValue);
            var newURL = serviceImage.updateSrc();
            var cell;
            cell = document.getElementById(this.getTreeCellId(4,imageId,paramId));
            if (cell) cell.setAttribute("label",paramValue);
            cell = document.getElementById(this.getTreeCellId(2,imageId));
            if (cell) cell.setAttribute("label",newURL);
            
            this.showURLInPreviewBrowser(newURL);

        }
    },

    onParamAdded: function(imageId,paramName,paramValue){

        if (imageId && paramName && (paramValue || paramValue === "")) {
            var serviceImage = this.getServiceImage(imageId);
            serviceImage.addParam(paramName,paramValue);
            var newURL = serviceImage.updateSrc();

            var cell = document.getElementById(this.getTreeCellId(2,imageId));

            if (cell) cell.setAttribute("label",newURL);
            
            var tChParams = cell.parentNode.parentNode.lastChild;
            var index = tChParams.childNodes.length;
            this.addParamRow(tChParams,imageId,paramName,paramValue,index);

            this.showURLInPreviewBrowser(newURL);

        }
    },

    getServiceImage: function(imageIndex){
        if (!this.currentServiceImages) return false;
        for (var i=0;i<this.currentServiceImages.length;i++){
            if (this.currentServiceImages[i].id == imageIndex){
                return this.currentServiceImages[i];
            }
        }
        return false;
    },
	
    getTreeSelectionAt: function(x,y,id){
        var t = document.getElementById(id);
        if (t){
            var row = Object();
            var column = Object();
            var part = Object();
		  
            var boxObject = t.boxObject;
            boxObject.QueryInterface(Components.interfaces.nsITreeBoxObject);
            boxObject.getCellAt(x, y, row, column, part);

            var out = Object();
            out.row = row;
            out.column = column;
            out.part = part;
		  
            return out;
        }
        return false;
    },
    openGetCapabilitiesDialog: function(){
        var server = false;
        var version = false;
        var t = document.getElementById("wiTree");
		
        if (t.columns){
            var col = t.columns.getNamedColumn("wiTreeNameColumn");

            if ((t.view.rowCount > t.currentIndex) && t.currentIndex !== -1){
                var cellValue = t.view.getCellValue(t.currentIndex,col)
                if (cellValue){
                    var cellValues = cellValue.split("_");
		
                    if (cellValues[1] == "1"){
                        if (this.currentGroupMode == 0){
                            var cellText = t.view.getCellText(t.currentIndex,col);
                            server = cellText.substr(0,cellText.indexOf(" "));
                        }
                        for (let i=0; i < this.serviceTypes.length; i++){
                            if (this.serviceTypes[i].name == "WMS"){
                                version = this.serviceTypes[i].defaultVersion;
                            }
                        }
			
                    } else if (cellValues[1] == "2"){
                        var serviceImage = this.getServiceImage(cellValues[2]);
                        var param = serviceImage.getParamByName("VERSION");
                        if (param) version = param.value;
                        server = serviceImage.server;
                    }
                }
            }
        }

        var params = {
            inn:{
                "server":server,
                "version":version
            },
            out:null
        };
        
        window.openDialog(
            "chrome://wmsinspector/content/getCapabilitiesDialog.xul",
            "wiGetCapabilitiesDialog",
            "chrome, dialog, modal,centerscreen, resizable=yes",
            params).focus();
            
        if (params.out) {
            var url = this.getGetCapabilitiesURL(params.out.url,params.out.service,params.out.version);
            if (params.out.outputHTML){
                this.requestGetCapabilities(url);
            }
            if (params.out.outputXML){
                this.requestDocument(url,params.out.outputEditor);
            }
        }
    },

    showGetCapabilitiesReportVersion: function(xhr){

        if (xhr.responseXML || xhr.responseText) {
            var errorContents = false;
            if (xhr.responseXML){
                //Check parsing errors
                var check = WMSInspector.Overlay.checkXMLParsing(xhr.responseXML);
                if (check !== true) errorContents = check;
            } else if (xhr.responseText){
                errorContents = xhr.responseText
            }

            if (errorContents){
                var file = WMSInspector.IO.createTmpFile(WMSInspector.IO.getTmpFileName("tmp"));
                WMSInspector.IO.write(file,errorContents);
                WMSInspector.Overlay.showFileInBrowser(file);
                return false;
            }

            
        } else {
            WMSInspector.Utils.showAlert(WMSInspector.Utils.getString("wi_request_connectionerror") + ": " + WMSInspector.Utils.getString("wi_request_servernotfound"));
            return false;
        }

        var version = WMSInspector.Overlay.getWMSVersion(xhr.responseXML);
        var supportedVersions = WMSInspector.Overlay.prefs.getCharPref("reportwmsversions").split("|");
        //inArray?
        var supported = false;
        for (var i = 0; i < supportedVersions.length; i++){
            if (version == supportedVersions[i]){
                supported = true;
                break;
            }
        }
        //If no version or unsupported, try with default version
        if (!version || !supported){
            for (let i=0; i < WMSInspector.Overlay.serviceTypes.length; i++){
                if (WMSInspector.Overlay.serviceTypes[i].name == "WMS"){
                    version = WMSInspector.Overlay.serviceTypes[i].defaultVersion;
                }
            }
        }

        var processor = new XSLTProcessor();

        var xsl = document.implementation.createDocument("", "test", null);
        xsl.addEventListener("load", onXSLLoaded, false);
        xsl.load("chrome://wmsinspector/content/xsl/wms_" + version +".xsl");

        function onXSLLoaded() {
            xsl.removeEventListener("load", onXSLLoaded, false);
            processor.importStylesheet(xsl);

            var newDoc = processor.transformToDocument(xhr.responseXML);
           
            var serializer = new XMLSerializer();
            var data = serializer.serializeToString(newDoc);

            var file = WMSInspector.IO.createTmpFile(WMSInspector.IO.getTmpFileName("html"));
            WMSInspector.IO.write(file,data,"c",true);

            WMSInspector.Overlay.showFileInBrowser(file);



        }

        return true;

    },



    getWMSVersion: function(xml){

        if (xml.getElementsByTagName("WMT_MS_Capabilities")[0]){
            //WMS 1.1.1
            return xml.getElementsByTagName("WMT_MS_Capabilities")[0].getAttribute("version");
        } else if (xml.getElementsByTagName("WMS_Capabilities")[0]){
            //WMS 1.3.0
            return xml.getElementsByTagName("WMS_Capabilities")[0].getAttribute("version");
        } else {
            //Unknown version
            return false;
        }
    },

    getGetCapabilitiesURL: function(server,type,version){
        if (!server) return false;
        type = type || "WMS";
        
        if (server.substring(server.length-1) != "?" && server.indexOf("?") == -1 ) {
            server += "?";
        } else if (server.substring(server.length-1) != "?" && server.indexOf("?") !== -1 ) {
            server += "&";
        }

        var url = server + "REQUEST=GetCapabilities"
        + "&SERVICE=" + type;
        if (version) url += "&VERSION=" + version;

        return url;

    },

    requestGetCapabilities: function(url){
        new WMSInspector.Requests.GET(
            url,
            this.showGetCapabilitiesReportVersion,
            this.onRequestError
            ).send();
        
    },

    requestDocument: function(url,outputEditor){
        new WMSInspector.Requests.GET(
            url,
            function(xhr){
                var file = WMSInspector.Overlay.saveResponseToFile(xhr);
                if (outputEditor){
                    WMSInspector.Overlay.showFileInEditor(file);
                } else {
                    WMSInspector.Overlay.showFileInBrowser(file);

                }
            },
            this.onRequestError
            ).send();
    },

    saveResponseToFile: function(xhr){
        var contents, extension;
        if (xhr instanceof XMLHttpRequest){
            if (xhr.responseXML){
                var check = WMSInspector.Overlay.checkXMLParsing(xhr.responseXML);
                if (check !== true) contents = check;
                extension = "txt";
            }
                
            if (!contents) {
                contents = xhr.responseText;
                extension = WMSInspector.Overlay.getExtensionFromMimeType(xhr.getResponseHeader("Content-type"));
            }

            var file = WMSInspector.IO.createTmpFile(WMSInspector.IO.getTmpFileName(extension));

            WMSInspector.IO.write(file,contents);
            return file;
        }


        return false;

    },
    
    checkXMLParsing: function(xmlDoc){
        if (!xmlDoc.documentElement) return false;
        if (xmlDoc.documentElement.nodeName == "parsererror") {
            var contents = "";
            contents += xmlDoc.documentElement.childNodes[0].nodeValue;
            contents += "\n\n";
            contents += xmlDoc.documentElement.childNodes[1].childNodes[0].nodeValue;
            return contents;
        }
        return true;
    },

    saveURLtoFile: function(url) {
        if (!url) return false;

        var IOService = WMSInspector.Utils.getService("@mozilla.org/network/io-service;1",Components.interfaces.nsIIOService);
        
        var channel = IOService.newChannel(url, null, null);
        if (!(channel instanceof Components.interfaces.nsIHttpChannel))
            return false;

        var stream = channel.open();

        var binaryStream = WMSInspector.Utils.getInstance("@mozilla.org/binaryinputstream;1",Components.interfaces.nsIBinaryInputStream);
        binaryStream.setInputStream(stream);

        var size = 0;
        var data = "";
        while(size = binaryStream.available()) {
            data += binaryStream.readBytes(size);
        }
        
        

        var extension = this.getExtensionFromMimeType(channel.getResponseHeader("Content-type"))

        var file = WMSInspector.IO.createTmpFile(WMSInspector.IO.getTmpFileName(extension));
        WMSInspector.IO.write(file,data);

        return file;
    },

    getExtensionFromMimeType: function(mimeType){
        
        if (mimeType.indexOf(";") != -1){
            mimeType = mimeType.substring(0,mimeType.indexOf(";"))
        }
        var extension = "";
        switch (mimeType){
            case "image/png":
            case "image/gif":
            case "image/jpeg":
            case "image/tiff":
            case "text/xml":
            case "text/html":
                extension = mimeType.substring(mimeType.indexOf("/")+1);
                break;
            case "text/plain":
                extension = "txt";
                break;
            case "application/vnd.ogc.gml":
            case "application/vnd.ogc.wms_xml":
            case "application/vnd.ogc.se_xml":
                extension = "xml";
                break;
            default:
                extension = "tmp";
                break;
        }
        return extension;
    },

    onRequestError: function(xhr){
        
        if (xhr.status == 0){
            //No connection or Server not found
            WMSInspector.Utils.showAlert(WMSInspector.Utils.getString("wi_request_connectionerror") + ": " + WMSInspector.Utils.getString("wi_request_servernotfound"));
        } else if (xhr.status > 0){
            //Server returned an error code
            if ((xhr.responseText)){
                //Server returned an error page
                var file = WMSInspector.Overlay.saveResponseToFile(xhr);
                WMSInspector.Overlay.showFileInBrowser(file);
            } else {
                //Server didnt return an error page, output the error message
                WMSInspector.Utils.showAlert(WMSInspector.Utils.getString("wi_request_connectionerror") + ": " + xhr.statusText);
            }
        } else {
            //Unknown error
            WMSInspector.Utils.showAlert(WMSInspector.Utils.getString("wi_request_connectionerror") + ": " + WMSInspector.Utils.getString("wi_request_unknownerror"));
        }

    },

    showURLInPreviewBrowser: function(URL){
        var file = WMSInspector.Overlay.saveURLtoFile(URL);
        var browser = document.getElementById("wiBrowser");
        browser.loadURI(file.path);
    },

    showFileInBrowser: function(file,focus){
        var tab = gBrowser.addTab(file.path);
        if (focus !== false) gBrowser.selectedTab = tab;
    },

    showFileInEditor: function(file){
        var prefPath = WMSInspector.Overlay.prefs.getCharPref("editor");

        var viewSourceAppPath = WMSInspector.Utils.getInstance("@mozilla.org/file/local;1",Components.interfaces.nsILocalFile);
        viewSourceAppPath.initWithPath(prefPath);

        var editor = WMSInspector.Utils.getInstance('@mozilla.org/process/util;1',Components.interfaces.nsIProcess);

        editor.init(viewSourceAppPath);
        editor.run(false, [file.path], 1);
    },

    checkSelection: function(){
        var enabled = (getBrowserSelection() != "");
        document.getElementById("wiContextGetCapabilitesReport").setAttribute("disabled", !enabled );
        document.getElementById("wiContextAddToLibrary").setAttribute("disabled", !enabled );
    },

    doBrowserContextMenuAction: function(mode){
        if (mode == 1 || mode == 2){
            var url = getBrowserSelection();

            if (!WMSInspector.Utils.checkURL(url)){
                WMSInspector.Utils.showAlert(WMSInspector.Utils.getString("wi_getcapabilities_nourl"));
                return false;
            }
        }

        switch (mode){
            case 1:
                //Request getCapabilities report

                url = WMSInspector.Overlay.getGetCapabilitiesURL(url);

                WMSInspector.Overlay.requestGetCapabilities(url);
                break;
            case 2:
                //Open Add service to Library dialog
                WMSInspector.Overlay.openAddServiceDialog(false,url);
                break;
        }

        return true;
        
    },

    openOptionsDialog: function() {
        var dialog = window.openDialog("chrome://wmsinspector/content/optionsDialog.xul", "wiOptionsDialog", "chrome,centerscreen");
        dialog.focus();
    },

    openLibrary: function(){
        if (this.libraryWindow == null || this.libraryWindow.closed){
            this.libraryWindow = window.open("chrome://wmsinspector/content/library.xul", "wiLibrary", "chrome,centerscreen,resizable=yes");
        } else {
            this.libraryWindow.focus();
        }
    },

    openAddServiceDialog: function(id,url,version) {

        var params = {
            inn: {
                "id": id,
                "url":url,
                "version":version
            },
            out: false
        };

        window.openDialog(
            "chrome://wmsinspector/content/addServiceDialog.xul",
            "wiAddServiceDialog",
            "chrome,centerscreen,modal,dialog",
            params // If a service id provided, dialog will be shown in edit mode
            ).focus();

        if (params.out.service){
            if (params.out.service.id){
                this.wis.updateService(params.out.service,this.onServiceOperationFinished);
            } else {
                this.wis.addService(params.out.service,this.onServiceOperationFinished);
            }
        }

    },
    
    onServiceOperationFinished: function(result){
        if (result === false){
            //Errors were found
            WMSInspector.Utils.showAlert(WMSInspector.Utils.getString("wi_anerroroccurred"));
        } else {
            //All went good, if the library window is open, refresh the list
            if (WMSInspector.Overlay.libraryWindow)
                WMSInspector.Overlay.libraryWindow.Library.search();
        }
    }


}

window.addEventListener("load",  function(){
    WMSInspector.Overlay.init()
}, false);
window.addEventListener("unload", function(){
    WMSInspector.Overlay.unload()
}, false);