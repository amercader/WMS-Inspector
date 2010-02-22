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
    }



}