

//WMSInspector namespace
var WMSInspector = {};


WMSInspector.Utils = {

    //Extension id for WMSInspector
    extensionId: "wmsinspector@flentic.net",
    
    //Preferences branch for WMSInspector stuff
    prefBranch: "extensions.wmsinspector.",

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
        getBranch(this.prefBranch);
    },

    setPreferenceObserver: function(prefs,observer){

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

    showAlert: function(text,title,checkText,check){
        if (checkText && check){
            return this.showPrompt("alertCheck", text, title, checkText, check);
        } else {
            return this.showPrompt("alert", text, title);
        }
    },

    showConfirm: function(text,title,checkText,check){
        if (checkText && check){
            return this.showPrompt("confirmCheck", text, title, checkText, check);
        } else {
            return this.showPrompt("confirm", text, title);
        }
    },
    // Helper functions showAlert and showConfirm should be used instead of this one
    // See https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsIPromptService
    showPrompt: function(type,text,title,checkText,check){
        var prompts = this.getService("@mozilla.org/embedcomp/prompt-service;1","nsIPromptService");
        title = title || this.getString("wi_extension_name");
        var prompt = null;
        if (type == "alert"){
            prompt = prompts.alert(null, title, text);
        } else if (type == "alertCheck"){
            prompt = prompts.alertCheck(null, title, text, checkText, check);
        } else if (type == "confirm"){
            prompt = prompts.confirm(null, title, text);
        } else if (type == "confirmCheck"){
            prompt = prompts.confirmCheck(null, title, text, checkText, check);
        }
        return prompt;
    },
    checkURL: function(URL){
        if (URL.length == 0) return false;
        return (URL.toLowerCase().substr(0,5) === "http:" || URL.toLowerCase().substr(0,6) === "https:");
    },
    compareFirefoxVersions:function(a,b){
        var comparator = this.getService("@mozilla.org/xpcom/version-comparator;1","nsIVersionComparator");
        return comparator.compare(a,b);
    }



}
