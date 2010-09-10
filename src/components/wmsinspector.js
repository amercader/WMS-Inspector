
// Helper for building XPCOM components
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");



function WMSInspectorService() {
    this.wrappedJSObject = this;

    // WMSInspector class definitions module
    // This has to be loaded in the component constructor, otherwise it does not
    // get loaded in Windows
    // http://groups.google.com/group/mozilla.dev.apps.firefox/browse_thread/thread/e178d41afa2ccc87
    Components.utils.import("resource://wmsinspector/classes.js");

}

WMSInspectorService.prototype = {
    classDescription: "WMSInspector XPCOM Component",

    classID: Components.ID("{A5A55BC0-AC5B-11DF-960B-7039DFD72085}"),

    contractID: "@wmsinspector.flentic.net/wmsinspector-service;1",
    
    QueryInterface: XPCOMUtils.generateQI(),
  
    importCallback: null,

    servicesQueue: [],

    servicesProcessed: 0,

    library: null,

    // library holds a reference to WMSInspector Library. Maybe we can avoid using it
    // when all the db related functions (add, delete...) are migrated to the component
    importServicesFromCSV: function(contents,library,callback){
        this.library = library;
        this.importCallback = callback;

        // Importing services to the DB is a heavy task. We will create a background thread
        // to perform the process.
        var background = Components.classes["@mozilla.org/thread-manager;1"].getService().newThread(0);

        background.dispatch(new this.workingThread(1,this,contents), Components.interfaces.nsIThread.DISPATCH_NORMAL);

    },

    // Don't call this method from the app! Use the public method importServicesFromCSV
    _importServicesFromCSV: function(contents){
        try{

            var separator = this.library.prefs.getCharPref("exportseparator");

            var columns = contents.shift().split(separator);
            this.servicesQueue = [];
            for (let i = 0; i < contents.length;i++){
                if (contents[i].length > 0){

                    let record = this.parseCSV(contents[i],separator)[0];

                    if (record.length){

                        let service = new WMSInspectorClasses.Service();

                        if (columns.indexOf("title") != -1) service.title = record[columns.indexOf("title")];
                        if (columns.indexOf("URL") != -1) service.URL = record[columns.indexOf("URL")];
                        if (columns.indexOf("favorite") != -1) service.favorite = (record[columns.indexOf("favorite")] == "1");

                        if (columns.indexOf("type") != -1) service.type = record[columns.indexOf("type")];
                        if (columns.indexOf("version") != -1) {
                            service.version = record[columns.indexOf("version")];
                        } else {
                            for (let i=0; i < this.library.serviceTypes.length; i++){
                                if (this.library.serviceTypes[i].name == service.type){
                                    service.version = this.library.serviceTypes[i].defaultVersion;
                                    break;
                                }
                            }
                        }

                        if (columns.indexOf("tags") != -1)
                            if (typeof(record[columns.indexOf("tags")]) != "undefined" && record[columns.indexOf("tags")].length)
                                service.tags = record[columns.indexOf("tags")].split(",");


                        if (service.URL) {
                            this.servicesQueue.push(service);
                        }
                    }
                }
            }
            this.servicesProcessed = 0;
            this.addServicesIncrementally();

            return true;
        } catch (e){
            Components.utils.reportError(e);
            return false;
        }
    },

    addServicesIncrementally: function(){
        try{
            if (this.servicesQueue.length){
                var service = this.servicesQueue.shift();
                var parent = this;
                 
                var add = this.library.addService(service,function(id){
                    if (id !== false){
                        parent.servicesProcessed++;
                        parent.addServicesIncrementally();
                    } else {
                        parent.onServicesInserted(false);
                    }

                });
                if (!add) this.onServicesInserted(false);
                return false;
            } else {
                this.onServicesInserted(this.servicesProcessed);
                return true;
                
            }
        } catch (e){
            Components.utils.reportError(e);
            return false;
        }
    },

    onServicesInserted:function(result){
        this.main.dispatch(new this.mainThread(this.workingThread.threadID, result ,this),
            Components.interfaces.nsIThread.DISPATCH_NORMAL);
    },

    // See the following for details
    // http://www.bennadel.com/blog/504-Ask-Ben-Parsing-CSV-Strings-With-Javascript-Exec-Regular-Expression-Command.htm
    parseCSV: function(string, delimiter){

        delimiter = delimiter || ",";

        var pattern = new RegExp(
            (
                // Delimiters.
                "(\\" + delimiter + "|\\r?\\n|\\r|^)" +
                // Quoted fields.
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
                // Standard fields.
                "([^\"\\" + delimiter + "\\r\\n]*))"
                ),"gi"
            );

        var data = [[]];
        var matches = null;
        var matchedValue = "";

        while (matches = pattern.exec( string )){

            var matchedDelimiter = matches[1];

            if (matchedDelimiter.length && (matchedDelimiter != delimiter)){
                data.push( [] );
            }

            if (matches[2]){
                matchedValue = matches[2].replace(new RegExp( "\"\"", "g" ),"\"");
            } else {
                matchedValue = matches[3];
            }

            data[ data.length - 1 ].push( matchedValue );
        }

        return data ;

    },

    /*
     *  Threads stuff
     *  TODO: make generic
     */

    main: Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread,

    workingThread: function(threadID, parent, contents) {
        this.threadID = threadID;
        this.parent = parent;
        this.result = 0;
        this.run = function() {
            try {
                // This is where the working thread does its processing work.
                this.parent._importServicesFromCSV(contents);

            // onServicesImported will call back to the main thread to let it know
            // we're finished.

            } catch(err) {
                Components.utils.reportError(err);
            }
        }

        this.QueryInterface =  function(iid) {
            if (iid.equals(Components.interfaces.nsIRunnable) ||
                iid.equals(Components.interfaces.nsISupports)) {
                return this;
            }
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
    },

    mainThread: function(threadID, result, parent) {
        this.threadID = threadID;
        this.result = result;
        this.parent = parent;
        this.run = function() {
            try {
                // This is where we react to the completion of the working thread.
                
                if (this.parent.importCallback) this.parent.importCallback(result);

            } catch(err) {
                Components.utils.reportError(err);
            }
        };

        this.QueryInterface = function(iid) {
            if (iid.equals(Components.interfaces.nsIRunnable) ||
                iid.equals(Components.interfaces.nsISupports)) {
                return this;
            }
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
    }

};

var components = [WMSInspectorService];

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory){
    var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
} else {
    var NSGetModule = XPCOMUtils.generateNSGetModule(components);
}
