const wiCellNoServicesFound = "wiCellNoServicesFound";

window.addEventListener("load", wiLoad, false);
window.addEventListener("unload", wiUnload, false);


function wiLoad(){
    WI.Overlay.initWI();
}

function wiUnload(){
    WI.Overlay.unloadWI();
}



WI.Overlay = {
	
    currentServiceImages: false,

    currentGroupMode: 0,

    prefs: null,

    currentNameColumnText: false,

    currentNameColumnValues: false,
	
    initWI: function(){
		
        this.prefs = WI.Utils.getPrefs();

        WI.IO.checkWITmpDir();

    /*
		var browser = document.getElementById("wiBrowser");
		browser.addProgressListener(wiProgressListener,Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
         */
    },
	
    unloadWI: function(){
    /*
		var browser = document.getElementById("wiBrowser");
		browser.removeProgressListener(wiProgressListener);		
         */
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
        WIImages.refreshImages();
        this.currentServiceImages = WIImages.currentServiceImages;
        
        this.buildServiceImagesTree();
    },
	
    groupTree: function(mode){
        if (this.currentGroupMode != mode) {
            this.currentGroupMode = mode;

            this.buildServiceImagesTree();

        }
    },
	
    buildServiceImagesTree: function (){
        var t;
        var tChMain;
        var tChImage;
        var tChParams;
        var tIItem;
        var tIImage;
        var tIParams;
        var tRItem;
        var tRImage;
        var tRParams;
        var tCeItem;
        var tCeImage;
        var tCeParams;
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
            this.clearServiceImagesTree(tChMain);
        }
        if (this.currentServiceImages.length){
            windowServiceImages = sortServiceImages(this.currentServiceImages,this.currentGroupMode);
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
                    for (var k=0; k < serviceImage.params.count; k++){
                        serviceImageParam = serviceImage.getParamByIndex(k);
                        tIParams = document.createElement("treeitem");
                        tRParams = document.createElement("treerow");
                        tCeParams = document.createElement("treecell");
                        value = this.getTreeCellId(3,serviceImage.id,k);
                        tCeParams.setAttribute("id",value);
                        tCeParams.setAttribute("value",value);
                        tCeParams.setAttribute("label",serviceImageParam.name);
                        tRParams.appendChild(tCeParams);
                        tCeParams = document.createElement("treecell");
                        value = this.getTreeCellId(4,serviceImage.id,k);
                        tCeParams.setAttribute("id",value);
                        tCeParams.setAttribute("value",value);
                        tCeParams.setAttribute("label",serviceImageParam.value);
                        tRParams.appendChild(tCeParams);
                        tIParams.appendChild(tRParams);
                        tChParams.appendChild(tIParams);
                    }
                    tIImage.appendChild(tChParams);
                    tChImage.appendChild(tIImage);
                    tIItem.appendChild(tChImage);
                }
                tChMain.appendChild(tIItem);
            }
        } else {
            tI = document.createElement("treeitem");
            tR = document.createElement("treerow");
            tCe = document.createElement("treecell");
            tCe.setAttribute("value",wiCellNoServicesFound);
            tCe.setAttribute("label",WI.Utils.getString("wi_tree_noserviceimagesfound"));
            tR.appendChild(tCe);
            tI.appendChild(tR);
            tChMain.appendChild(tI);
        }
        t.appendChild(tChMain);
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


    clearServiceImagesTree: function(obj){
        while(obj.firstChild) obj.removeChild(obj.firstChild);
    },


    onTreeClicked: function(event){
        var t = document.getElementById("wiTree");
        
        if (t.view == null) return;

        var treeSel = this.getTreeSelectionAt(event.clientX, event.clientY, "wiTree");
        //alert(t.currentIndex);
        if (treeSel.row.value != -1 && treeSel.part.value != "twisty"){
            var cellValues = t.view.getCellValue(treeSel.row.value,treeSel.column).split("_");
            if (event.button == 0){
                if (cellValues[1] == "2"){
                    var serviceImage = this.getServiceImage(parseInt(cellValues[2]),parseInt(cellValues[3]));
                    var newSrc = serviceImage.updateSrc();

                    //TODO: reuse, errors, default page, loading, cache?

                    var file = WI.Overlay.saveURLtoFile(newSrc);
                    var browser = document.getElementById("wiBrowser");
                    browser.loadURI(file.path);
                   
                }
            }
        }
		
    },

    onTreeDoubleClicked: function(event){
        var t = document.getElementById("wiTree");
        if (t.view == null) return;
      
        var treeSel = this.getTreeSelectionAt(event.clientX, event.clientY, "wiTree");

        if (treeSel.row.value != -1 && treeSel.part.value != "twisty"){
            var cellValues = t.view.getCellValue(treeSel.row.value,treeSel.column).split("_");
            if (cellValues[1] == "3"){
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
            var cellValues = t.view.getCellValue(treeSel.row.value,treeSel.column).split("_");
            if (cellValues[1] == "1" && this.currentGroupMode == 1) {
                t.setAttribute("context","");
                this.currentNameColumnText = false;
                this.currentNameColumnValues = false;
            } else {
                var col = t.columns.getNamedColumn("wiTreeNameColumn");
                this.currentNameColumnText = t.view.getCellText(t.currentIndex,col);
                this.currentNameColumnValues = t.view.getCellValue(t.currentIndex,col).split("_");
                var contextMenu = "gtTreeContextMenuURL" + cellValues[1];
                t.setAttribute("context",contextMenu);
            }
        }
    },
    
    doContextMenuAction: function(mode,event){
        var t = document.getElementById("wiTree");

        var cellText = this.currentNameColumnText;
        var cellValues = this.currentNameColumnValues;
        if (!cellText) return;
        switch (mode){
            case 1:
                this.copyTreeItem(cellValues,cellText,t);
                break;
            case 2:
                this.openServiceImageInNewTab(cellText);
                break;
            case 3:
                var paramName = cellText;
                var col = t.columns.getNamedColumn("wiTreeValueColumn");
                var paramValue = t.view.getCellText(t.currentIndex,col);
                window.openDialog("chrome://wmsinspector/content/editParameterDialog.xul",
                    "wiEditParameterDialog",
                    "chrome,centerscreen",
                    cellValues[2],cellValues[3],cellValues[4],paramName,paramValue);
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
                    col = tree.columns.getNamedColumn("wiTreeValueColumn");
                    cellText = tree.view.getCellText(tree.currentIndex,col);
                    out = out + "=" + cellText;
                }
                break;
        }
        var clipboardService = WI.Utils.getService("@mozilla.org/widget/clipboardhelper;1","nsIClipboardHelper");
        if (out && clipboardService) clipboardService.copyString(out);
        
    },
	
    openServiceImageInNewTab: function(url){
        if (url){
            gBrowser.addTab(url);
        }
    },
	
    onParamUpdated: function(imageId,paramId,paramName,paramValue){

        if (imageId && paramId && paramValue) {
            var serviceImage = this.getServiceImage(imageId);
            var newParam = serviceImage.setParam(paramName,paramValue);
            var newUrl = serviceImage.updateSrc();
            var id;
            var cell;
            id = this.getTreeCellId(4,imageId,paramId);
            cell = document.getElementById(id);
            if (cell) cell.setAttribute("label",paramValue);
            id = this.getTreeCellId(2,imageId);
            cell = document.getElementById(id);
            if (cell) cell.setAttribute("label",newUrl);

            var file = WI.Overlay.saveURLtoFile(newUrl);
            var browser = document.getElementById("wiBrowser");
            browser.loadURI(file.path);
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
                        version = this.prefs.getCharPref("wmsversion");
			
                    } else if (cellValues[1] == "2"){
                        var serviceImage = this.getServiceImage(cellValues[2]);
                        var param = serviceImage.getParamByName("VERSION");
                        if (param) version = param.value;
                        server = serviceImage.server;
                    }
                }
            }
        }

        var dialog = window.openDialog("chrome://wmsinspector/content/getCapabilitiesDialog.xul",
            "wiGetCapabilitiesDialog",
            "chrome,centerscreen",
            server,version);
        dialog.focus();
    },

    showGetCapabilitiesReportVersion: function(xhr){

        var version;
        if (xhr.responseXML){
            version = WI.Overlay.getWMSVersion(xhr.responseXML);
        } else if (xhr.responseText) {
            var file = WI.IO.createTmpFile(WI.IO.getTmpFileName("tmp"));
            WI.IO.write(file,xhr.responseText);
            WI.Overlay.showFileInBrowser(file);
            return false;
        } else {
            alert("Error: No s'ha rebut cap resposta del servidor");
            return false;
        }
		
        var supportedVersions = WI.Overlay.prefs.getCharPref("reportwmsversions").split("|");
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
            version = WI.Overlay.prefs.getCharPref("wmsversion");
        }
		
		
        /*
		alert(version);
return;
         */
        //TODO: FILTER errrors
        //alert(xhr.getResponseHeader("Content-Type"));
        var processor = new XSLTProcessor();

        var xsl = document.implementation.createDocument("", "test", null);
        xsl.addEventListener("load", onXSLLoaded, false);
        xsl.load("chrome://wmsinspector/content/xsl/wms_" + version +".xsl");
        //xsl.load("chrome://wmsinspector/content/xsl/wms_1.3.0.xsl");
        //xsl.load("chrome://wmsinspector/content/xsl/wms_common.xsl");

        function onXSLLoaded() {
            xsl.removeEventListener("load", onXSLLoaded, false);
            processor.importStylesheet(xsl);

            var newDoc = processor.transformToDocument(xhr.responseXML);
           
            var serializer = new XMLSerializer();
            var data = serializer.serializeToString(newDoc);

            var file = WI.IO.createTmpFile("report2.html");
            WI.IO.write(file,data,"c",true);

            WI.Overlay.showFileInBrowser(file);



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

    requestGetCapabilities: function(url){
        var request = new wiGET(url,
            this.showGetCapabilitiesReportVersion,
            this.requestError);
        request.send();
    },

    requestDocument: function(url,outputEditor){
        var request = new wiGET(url,
            function(xhr){
                var file = WI.Overlay.saveResponseToFile(xhr);
                if (outputEditor){
                    WI.Overlay.showFileInEditor(file);
                } else {
                    WI.Overlay.showFileInBrowser(file);

                }
            },
            this.requestError);
        request.send();
    },
    //TODO: check encoding
    saveResponseToFile: function(xhr){
        if (xhr instanceof XMLHttpRequest){
            var extension = WI.Overlay.getExtensionFromMimeType(xhr.getResponseHeader("Content-type"))
            var file = WI.IO.createTmpFile(WI.IO.getTmpFileName(extension));
            WI.IO.write(file,xhr.responseText);
            return file;
        }

        return false;

    },

    saveURLtoFile: function(url) {
        if (!url) return false;

        var IOService = WI.Utils.getService("@mozilla.org/network/io-service;1",Components.interfaces.nsIIOService);
        
        var channel = IOService.newChannel(url, null, null);
        if (!(channel instanceof Components.interfaces.nsIHttpChannel))
            return false;

        var stream = channel.open();

        var binaryStream = WI.Utils.getInstance("@mozilla.org/binaryinputstream;1",Components.interfaces.nsIBinaryInputStream);
        binaryStream.setInputStream(stream);

        var size = 0;
        var data = "";
        while(size = binaryStream.available()) {
            data += binaryStream.readBytes(size);
        }
        
        

        var extension = this.getExtensionFromMimeType(channel.getResponseHeader("Content-type"))

        var file = WI.IO.createTmpFile(WI.IO.getTmpFileName(extension));
        WI.IO.write(file,data);

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

    requestError: function(xhr){
        //TODO
        alert(xhr);
        alert(xhr.status);
        alert(xhr.responseText);
    },

    showFileInBrowser: function(file,focus){
        var tab = gBrowser.addTab(file.path);
        if (focus !== false) gBrowser.selectedTab = tab;
    },

    showFileInEditor: function(file){
        var prefPath = WI.Overlay.prefs.getCharPref("editor");

        var viewSourceAppPath = WI.Utils.getInstance("@mozilla.org/file/local;1",Components.interfaces.nsILocalFile);
        viewSourceAppPath.initWithPath(prefPath);

        var editor = WI.Utils.getInstance('@mozilla.org/process/util;1',Components.interfaces.nsIProcess);

        editor.init(viewSourceAppPath);
        editor.run(false, [file.path], 1);
    },

    checkSelection: function(){
        var enabled = (getBrowserSelection() != "");
        document.getElementById("wiContextGetCapabilitesReport").setAttribute("disabled", !enabled );
    },

    checkGetCapabilities: function(server){

        if (server == null){
            server = getBrowserSelection();
        }

        if (!server.length || (server.indexOf("http://") == -1 && server.indexOf("HTTP://") == -1)){
            var msg = WI.Utils.getString("wi_getcapabilities_nourl");
            alert(msg);
            return false;

        } else {

            var url = server;
            if (url.substring(url.length-1) != "?" && url.indexOf("?") == -1 ) {
                url += "?";
            } else if (url.substring(url.length-1) != "?" && url.indexOf("?") !== -1 ) {
                url += "&";
            }

            url += "REQUEST=GetCapabilities"
            + "&SERVICE=WMS"
            + "&VERSION=1.1.1";

        

            /*
            if (outputXML){
                window.opener.WI.Overlay.requestDocument(url);
            }
             */
            
            WI.Overlay.requestGetCapabilities(url);
            

            //window.close();
            return true;
        }
    },

    openOptionsDialog: function(tab) {
        var dialog = window.openDialog("chrome://wmsinspector/content/optionsDialog.xul", "wiOptionsDialog", "chrome,centerscreen", tab);
        dialog.focus();
    }


}
