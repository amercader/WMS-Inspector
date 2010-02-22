
WI.GetCapabilitiesDialog = {
    prefs: null,
	
    init: function(){
        this.prefs = WI.Utils.getPrefs();
        
        var button = document.documentElement.getButton("extra2");
        button.setAttribute("label", WI.Utils.getString("wi_getcapabilities_request"));
        button.addEventListener("command", WI.GetCapabilitiesDialog.onAccept, false);
  
        var server = window.arguments[0];
        var version = window.arguments[1];

        if (server) document.getElementById("wiTextServer").value = server;

        document.getElementById("wiGetcapabilitiesOutputOptionsBox").setAttribute("collapsed",!document.getElementById("wiGetcapabilitiesOutputXML").checked);
        
        document.getElementById("wiGetcapabilitiesOutputEditor").setAttribute("disabled",this.prefs.getCharPref("editor") == "");
        
        
		
        var versions = this.prefs.getCharPref("wmsversions").split("|");
        var defVersion = this.prefs.getCharPref("wmsversion");
		
        var menuList = document.getElementById("wiVersionMenu");
        var item;
		
        for (var i=0; i < versions.length; i++){
            item = menuList.appendItem(versions[i],i);
            if ((version && (versions[i] == version)) || (!version && (versions[i] == defVersion)))  menuList.selectedItem = item;
        }
    },
	
    onAccept: function(){
        var outputHTML = document.getElementById("wiGetcapabilitiesOutputHTML").checked;
        var outputXML = document.getElementById("wiGetcapabilitiesOutputXML").checked;


        if(!outputHTML && !outputXML){
            alert(WI.Utils.getString("wi_getcapabilities_selectoutputformat"));
            return false;
        }

        var server = document.getElementById("wiTextServer").value;
        var service = document.getElementById("wiServiceTypeMenu").selectedItem.getAttribute("label");
        var version = document.getElementById("wiVersionMenu").selectedItem.getAttribute("label");
        
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
            + "&SERVICE=" + service
            + "&VERSION=" + version;
            
            if (outputXML){
                var outputEditor = (document.getElementById("wiGetcapabilitiesOutputEditor").selected);
                window.opener.WI.Overlay.requestDocument(url,outputEditor);
            }
            if (outputHTML){
                window.opener.WI.Overlay.requestGetCapabilities(url);
            }
            
            window.close();
            return true;
        }
    },

    updateOutputRadios: function(){
        
        //The click event fires before changing the checkbox value
        var disabled = document.getElementById("wiGetcapabilitiesOutputXML").checked;
        document.getElementById("wiGetcapabilitiesOutputOptionsBox").setAttribute("collapsed",disabled);
        
    },

    getBrowser: function(){
        return window.opener.getBrowser();
    }

	
}
