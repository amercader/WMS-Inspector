//Preferences branch for WMSInspector stuff
const wiPrefBranch = "extensions.wmsinspector.";

//WMSInspector namespace
var WI = {};


WI.Utils = {

    //String properties
    getString: function(id){
        var out = false;
        if (id) {
            var stringBundle = document.getElementById("wiStringBundle");
            if (stringBundle) out = stringBundle.getString(id);
        }
        return out;
    },
    
    getPrefs: function() {
        return Components.classes["@mozilla.org/preferences-service;1"].
        getService(Components.interfaces.nsIPrefService).
        getBranch(wiPrefBranch);
    },

    setPreferenceObserver: function(prefs,observer){
        //var prefs = this.getPrefs()

        //This will allow us to use the methods of the nsIPrefBranch2
        prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
        
        //First parameter is preference domain, but we don't need to set it
        //because it has already been set in the getPrefs method
        prefs.addObserver("",observer,false);
    },    

    getSelectedBrowser: function(){
        return window.top.getBrowser().selectedBrowser;
    },


    getContentWindow: function(){
        return this.getSelectedBrowser().contentWindow;
    },


    getContentDocument: function(){
        return this.getSelectedBrowser().contentDocument;
    },

    getService: function(className, interfaceName) {
        var c = Components.classes[className];
        var i = Components.interfaces[interfaceName];
        if (!c || !i) return null;
        return c.getService(i);
    },

    getInstance: function(className, interfaceName) {
        var c = Components.classes[className];
        var i = Components.interfaces[interfaceName];
        if (!c || !i) return null;
        return c.createInstance(i);
    },
    showAlert: function(text,title){
        var prompts = this.getService("@mozilla.org/embedcomp/prompt-service;1",Components.interfaces.nsIPromptService);
        title = title || this.getString("wi_extension_name")
        prompts.alert(null, title, text);

    }



}