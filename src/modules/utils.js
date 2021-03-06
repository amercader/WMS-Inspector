
var EXPORTED_SYMBOLS = ["Utils"];

var Utils = {

    //Extension id for WMSInspector
    extensionId: "wmsinspector@flentic.net",

    // Extension current Version
    // (We can not use this.getService, as it's not yet defined)
    currentFirefoxVersion: Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication)
    .version,


    //Preferences branch for WMSInspector stuff
    prefBranch: "extensions.wmsinspector.",

    //String bundle for localized strings
    stringBundle: null,

    //String properties
    getString: function(name){
        var out = false;
        if (name) {
            if (this.stringBundle === null)
                this.stringBundle = this.getService("@mozilla.org/intl/stringbundle;1", "nsIStringBundleService")
                .createBundle("chrome://wmsinspector/locale/wmsinspector.properties");
            out = this.stringBundle.GetStringFromName(name);
        }
        return out;
    },

    getPrefs: function() {
        return this.getService("@mozilla.org/preferences-service;1","nsIPrefService")
        .getBranch(this.prefBranch);
    },

    setPreferenceObserver: function(prefs,observer){

        //This will allow us to use the methods of the nsIPrefBranch2
        prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);

        //First parameter is preference domain, but we don't need to set it
        //because it has already been set in the getPrefs method
        prefs.addObserver("",observer,false);

    },

    getWindow: function(){
        return this.getService(
            "@mozilla.org/appshell/window-mediator;1",
            "nsIWindowMediator")
        .getMostRecentWindow('navigator:browser');
    },

    getBrowser: function(){
        return this.getWindow().gBrowser;
    },

    getSelectedBrowser: function(){
        return this.getWindow().top.getBrowser().selectedBrowser;
    },


    getContentWindow: function(){
        return this.getBrowser().contentWindow;
    },


    getContentDocument: function(){
        return this.getBrowser().contentDocument;
    },

    getWMSInspectorService: function(){
        return this.getService("@wmsinspector.flentic.net/wmsinspector-service;1").wrappedJSObject;
    },

    getService: function(className, interfaceName) {
        var c = Components.classes[className];
        if (!c) return null;

        return (interfaceName) ?
        c.getService(Components.interfaces[interfaceName]) :
        c.getService();
    },

    getInstance: function(className, interfaceName) {
        var c = Components.classes[className];
        if (!c) return null;

        return (interfaceName) ?
        c.createInstance(Components.interfaces[interfaceName]) :
        c.createInstance();
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
        try{
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
        } catch (error){
            return null;
        }
    },

    checkURL: function(URL){
        if (URL.length == 0) return false;
        return (URL.toLowerCase().substr(0,5) === "http:" || URL.toLowerCase().substr(0,6) === "https:");
    },

    compareFirefoxVersions:function(a,b){
        var comparator = this.getService("@mozilla.org/xpcom/version-comparator;1","nsIVersionComparator");
        return comparator.compare(a,b);
    },

    getExtensionVersion:function(callback){
        var version = null;
        try{
            // Get an instance of the addon manager, depending on the Firefox version
            // This should be removed when support for FF 3.6 is dropped
            if (this.compareFirefoxVersions(this.currentFirefoxVersion,"4.0b")< 0){
                // FF 3.6
                version = this.getService("@mozilla.org/extensions/manager;1", "nsIExtensionManager")
                                           .getItemForID(this.extensionId)
                                           .version;
                callback(version);
            } else {
                // FF 4.x
                // Starting on Firefox 4.0, Addon related functions are asynchronous
                Components.utils.import("resource://gre/modules/AddonManager.jsm");
                AddonManager.getAddonByID(this.extensionId,function(addon){
                    callback(addon.version)
                });
                
            }
        } catch (error){
            return error;
        }

        return false;


    },

    emptyElement: function(element){
        if (element.firstChild)
            while(element.firstChild) element.removeChild(element.firstChild);
    },

    //http://mxr.mozilla.org/mozilla-central/source/browser/components/places/content/editBookmarkOverlay.js#1006
    getValuesFromCSVTextbox: function(element) {
        // we don't require the leading space (after each comma)
        var tags = element.value.split(",");
        for (var i=0; i < tags.length; i++) {
            // remove trailing and leading spaces
            tags[i] = tags[i].replace(/^\s+/, "").replace(/\s+$/, "");

            // remove empty entries from the array.
            if (tags[i] == "") {
                tags.splice(i, 1);
                i--;
            }
        }
        return tags;
    },

    openWindow: function(windowType, url, features, params){
        var wm = this.getService("@mozilla.org/appshell/window-mediator;1","nsIWindowMediator");
        var win = windowType ? wm.getMostRecentWindow(windowType) : null;
        if (win) {
          if ("initWithParams" in win)
            win.initWithParams(params);
          win.focus();
        }
        else {
          var winFeatures = "resizable,dialog=no,centerscreen" + (features != "" ? ("," + features) : "");
          var window = this.getWindow();
          var parentWindow = (!window.opener || window.opener.closed) ? window : window.opener;
          win = parentWindow.openDialog(url, "_blank", winFeatures, params);
        }
        return win;
    }

}


