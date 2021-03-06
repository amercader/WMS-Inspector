Components.utils.import("resource://wmsinspector/utils.js");

var GetCapabilitiesDialog = {
    prefs: null,

    serviceTypes:[],

    init: function(){

        // Get a WMSInspector service instance
        this.wis = Utils.getWMSInspectorService();

        this.prefs = Utils.getPrefs();
        Utils.setPreferenceObserver(this.prefs,this);

        var params = (window.arguments[0]) ? window.arguments[0].inn : false;
     
        var server = (params) ? params.server : false;
        var version = (version) ? params.version : false;

        if (server) document.getElementById("wiTextServer").value = server;

        var outputPref = this.prefs.getCharPref("getcapabilitiesoutput");

        document.getElementById("wiGetcapabilitiesOutputHTML").checked = (outputPref == "html" || outputPref == "both");
        document.getElementById("wiGetcapabilitiesOutputXML").checked = (outputPref == "xml" || outputPref == "both");
        document.getElementById("wiGetcapabilitiesOutputOptionsBox").collapsed = !document.getElementById("wiGetcapabilitiesOutputXML").checked;
        
        document.getElementById("wiGetcapabilitiesOutputEditor").disabled = (this.prefs.getCharPref("editor") == "");
        

        //Get the service types and versions from the DB.
        this.wis.getServiceTypes(function(results){
            if (results){
                GetCapabilitiesDialog.serviceTypes = results;

                var typesList = document.getElementById("wiServiceTypeMenu");

                for (let i = 0;i<results.length;i++)
                    typesList.appendItem(results[i].name,results[i].name);
                typesList.selectedIndex = 0;

            }
        });

        if (version){
            var versionsList = document.getElementById("wiVersionMenu");
            for (let i=0; i < versionsList.itemCount; i++){
                let item = versionsList.getItemAtIndex(i);
                if (item.getAttribute("label") == version) {
                    versionsList.selectedItem = item;
                    break;
                }
            }
        }

    },
    
    setVersionsList: function(){

        var serviceTypes = GetCapabilitiesDialog.serviceTypes;
        var selectedType = document.getElementById("wiServiceTypeMenu").selectedItem.value;

        for (let i=0; i < serviceTypes.length; i++){
            if (serviceTypes[i].name == selectedType){
                var versionsList = document.getElementById("wiVersionMenu");
                versionsList.removeAllItems()
                for (let j=0; j < serviceTypes[i].versions.length; j++){
                    versionsList.appendItem(serviceTypes[i].versions[j],serviceTypes[i].versions[j]);
                    if (serviceTypes[i].versions[j] == serviceTypes[i].defaultVersion)
                        versionsList.selectedIndex = j;
                }
                if (versionsList.selectedIndex == -1) versionsList.selectedIndex = 0;
                break;
            }

        }

        //Disable HTML output option for non WMS services
        var html =  (selectedType == "WMS");
        document.getElementById("wiGetcapabilitiesOutputHTML").disabled = !html
        if (!html){
            document.getElementById("wiGetcapabilitiesOutputXML").checked = true;
            GetCapabilitiesDialog.updateOutputRadios();
        }
   

    },

    onAccept: function(){
        var outputHTML = document.getElementById("wiGetcapabilitiesOutputHTML").checked && !document.getElementById("wiGetcapabilitiesOutputHTML").disabled;
        var outputXML = document.getElementById("wiGetcapabilitiesOutputXML").checked;


        if(!outputHTML && !outputXML){
            Utils.showAlert(Utils.getString("wi_getcapabilities_selectoutputformat"));
            return false;
        }

        var url = document.getElementById("wiTextServer").value;
        var service = document.getElementById("wiServiceTypeMenu").selectedItem.getAttribute("label");
        var version = document.getElementById("wiVersionMenu").selectedItem.getAttribute("label");
        
        if (!Utils.checkURL(url)){
            Utils.showAlert(Utils.getString("wi_getcapabilities_nourl"));
            return false;

        } else {
            
            var outputEditor = (document.getElementById("wiGetcapabilitiesOutputEditor").selected);

            window.arguments[0].out = {
                "url":url,
                "service":service,
                "version":version,
                "outputHTML":outputHTML,
                "outputXML":outputXML,
                "outputEditor":outputEditor
            }

            return true;
        }
    },

    updateOutputRadios: function(){
        document.getElementById("wiGetcapabilitiesOutputOptionsBox").collapsed = !document.getElementById("wiGetcapabilitiesOutputXML").checked;
    },


    observe: function(subject,topic,data){

        if (topic == "nsPref:changed" && data == "editor"){
            var radio = document.getElementById("wiGetcapabilitiesOutputEditor");
            var editor = this.prefs.getCharPref("editor");
            
            if (radio.getAttribute("selected") && editor == "") {
                radio.setAttribute("selected",false);
                document.getElementById("wiGetcapabilitiesOutputBrowser").setAttribute("selected",true);
            }
            radio.setAttribute("disabled", editor == "");
        }
    },
    
    shutdown: function(){

        var html = document.getElementById("wiGetcapabilitiesOutputHTML").checked;
        var xml = document.getElementById("wiGetcapabilitiesOutputXML").checked;
        var value = (html && xml) ? "both" : (xml) ? "xml" : "html";
        this.prefs.setCharPref("getcapabilitiesoutput",value);


        this.prefs.removeObserver("", this);
    }


	
}
