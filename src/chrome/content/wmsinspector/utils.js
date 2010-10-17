
//Temporary, until we migrate utils to a module
if (typeof(WMSInspector) == "undefined") WMSInspector = {};

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
            Components.utils.reportError(error);
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

    // https://developer.mozilla.org/en/nsICryptoHash#Computing_the_Hash_of_a_String
    getHash: function(string,algorithm){

        var converter = this.getInstance("@mozilla.org/intl/scriptableunicodeconverter", "nsIScriptableUnicodeConverter")
        converter.charset = "UTF-8";
        // result is an out parameter,
        // result.value will contain the array length
        var result = {};
        // data is an array of bytes
        var data = converter.convertToByteArray(string, result);

        var ch = this.getInstance("@mozilla.org/security/hash;1","nsICryptoHash");

        algorithm = algorithm || ch.MD5;
        ch.init(algorithm);
        ch.update(data, data.length);
        var hash = ch.finish(false);

        // return the two-digit hexadecimal code for a byte
        function toHexString(charCode) {
            return ("0" + charCode.toString(16)).slice(-2);
        }

        // convert the binary hash data to a hex string.
        var s = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");

        return s;

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
    }



}
