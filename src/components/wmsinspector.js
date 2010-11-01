
// Helper for building XPCOM components
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function WMSInspectorService() {
    this.wrappedJSObject = this;

    // WMSInspector class definitions module
    // This has to be loaded in the component constructor, otherwise it does not
    // get loaded in Windows
    // http://groups.google.com/group/mozilla.dev.apps.firefox/browse_thread/thread/e178d41afa2ccc87
    Components.utils.import("resource://wmsinspector/classes.js");
    Components.utils.import("resource://wmsinspector/db.js");

}

WMSInspectorService.prototype = {
    classDescription: "WMSInspector XPCOM Component",

    classID: Components.ID("{A5A55BC0-AC5B-11DF-960B-7039DFD72085}"),

    contractID: "@wmsinspector.flentic.net/wmsinspector-service;1",

    QueryInterface: XPCOMUtils.generateQI(),

    /***
     *  Public methods
     *
     */

    addService: function(service,callback){
        WMSInspectorServicePrivate.launchThreadedProcess(
            "_addService",
            {
                "service":service,
                "callback":function(result){
                    WMSInspectorServicePrivate.onThreadedProcessFinished(result)
                }
            },
            callback
            );
    },

    updateService: function(service,callback){
        WMSInspectorServicePrivate.launchThreadedProcess(
            "_updateService",
            {
                "service":service,
                "callback":function(result){
                    WMSInspectorServicePrivate.onThreadedProcessFinished(result)
                }
            },
            callback
            );
    },

    deleteService: function(id,callback){
        WMSInspectorServicePrivate.launchThreadedProcess(
            "_deleteService",
            {
                "id":id,
                "callback":function(result){
                    WMSInspectorServicePrivate.onThreadedProcessFinished(result)
                }
            },
            callback
            );
    },

    // library holds a reference to WMSInspector Library. Maybe we can avoid using it
    // when all the db related functions (add, delete...) are migrated to the component
    importServicesFromCSV: function(contents,separator,library,callback){
        WMSInspectorServicePrivate.library = library;
        WMSInspectorServicePrivate.launchThreadedProcess(
            "_importServicesFromCSV",
            {
                "contents": contents,
                "separator":separator
            },
            callback
            );
    }

}

WMSInspectorServicePrivate = {

    operationCallback: null,

    servicesQueue: [],

    servicesProcessed: 0,

    library: null,

    launchThreadedProcess: function(process,params,callback){
        var background = Components.classes["@mozilla.org/thread-manager;1"].getService().newThread(0);
        this.operationCallback = callback;
        background.dispatch(
            new this.workingThreadHandler(
                1,
                this,
                process,
                params
                ),
            Components.interfaces.nsIThread.DISPATCH_NORMAL);
    },

    onThreadedProcessFinished: function(result){
        var mainThread = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;

        mainThread.dispatch(
            new this.mainThreadHandler(
                1, this.operationCallback, result
                ),
            Components.interfaces.nsIThread.DISPATCH_NORMAL);
    },

    //Service should be a Classes.Service object
    _addService: function(args){
        try{
            var service = args.service;
            var callback = args.callback;

            var sql = "INSERT INTO services \n\
                        (title,url,version,favorite,creation_date,type) \n\
                   VALUES \n\
                        (:title,:url,:version,:favorite,strftime('%s','now'),:type)";

            var statement = DB.conn.createStatement(sql);

            DB.bindParameters(statement,{
                "title": service.title,
                "url": service.URL,
                "version": service.version,
                "favorite": (service.favorite) ? "1" : "0",
                "type": service.type
            });

            statement.execute();

            var serviceId = DB.conn.lastInsertRowID;


            if (service.tags && service.tags.length){
                return this.setTags(serviceId,service.tags,callback);
            } else {
                if (callback) callback(serviceId);
            }

            return serviceId;

        } catch (error) {
            return this.exceptionHandler(error,callback);
        }
    },

    //Service should be a Classes.Service object
    _updateService: function(args){
        try{
            var service = args.service;
            var callback = args.callback;

            //We will only update properties defined in the service object provided
            var sql = "UPDATE services";
            var sqlUpdate = [];
            var params = {};
            if (service.title) {
                sqlUpdate.push(" title = :title");
                params.title = service.title
            }
            if (service.URL) {
                sqlUpdate.push(" url = :url");
                params.url = service.URL
            }
            if (service.version) {
                sqlUpdate.push(" version = :version");
                params.version = service.version
            }
            if (service.type) {
                sqlUpdate.push(" type = :type");
                params.type = service.type
            }
            if (typeof(service.favorite) == "boolean") {
                sqlUpdate.push(" favorite = :favorite");
                params.favorite = (service.favorite) ? "1" :"0";
            }

            if (sqlUpdate.length == 0) {
                if (service.tags && service.tags.length) {
                    return this.setTags(service.id,service.tags,callback);
                } else {
                    //Nothing to update
                    if (callback) callback(false);
                    return false;
                }
            }

            sqlUpdate.push(" update_date = strftime('%s','now')");

            sql += " SET " + sqlUpdate.join(",") + " WHERE id = :id";
            params.id = service.id;

            var statement = DB.conn.createStatement(sql);

            DB.bindParameters(statement,params);

            statement.execute();

            if (service.tags && service.tags.length) {
                return this.setTags(service.id,service.tags,callback);
            } else {
                if (callback) callback(service.id);
            }

            return service.id;



        } catch (error) {
            this.exceptionHandler(error,callback);
        }
    },

    _deleteService: function(args){
        try{
            var id = args.id;
            var callback = args.callback;

            if (typeof(id) != "number") return false;

            var sql = "DELETE FROM services WHERE id = :id";
            var statement = DB.conn.createStatement(sql);

            DB.bindParameters(statement,{
                id:id
            });

            statement.execute();

            // The services_after_delete_trigger trigger will deal with the service's tags
            if (callback) callback(true);

            return true;

        } catch (error) {
            this.exceptionHandler(error,callback);
        }
    },

    /*
     * 1 - Delete previous tags from service
     * 2 - For each tag, check if exists
     *      - If exists, save the id
     *      - If not, insert tag and get new id
     * 3 - Insert records in rel_services_tag table
     */
    setTags: function(serviceId,tags,callback){

        try {
            if (typeof(serviceId) != "number" || tags.length < 0) return false;

            //Delete previous tags from service
            var sql = "DELETE FROM rel_services_tags WHERE services_id = :id";
            var statement = DB.conn.createStatement(sql);

            DB.bindParameter(statement, "id", serviceId);

            statement.execute();

            //Check if tags exist and insert new ones if not
            var tagIds = [];
            for (var i = 0; i < tags.length; i ++){
                let tagExists = false;
                let selectSql = "SELECT id FROM tags WHERE title = :tag" + i;
                let selectStatement = DB.conn.createStatement(selectSql);

                DB.bindParameter(selectStatement, "tag"+i, tags[i]);

                try {
                    while (selectStatement.step()) {
                        //Tag already exists
                        tagExists = true;
                        tagIds.push(selectStatement.row.id)
                    }
                }
                finally {
                    try{
                        selectStatement.reset();
                        if (!tagExists){
                            //Tag does not exist
                            let insertSql = "INSERT INTO tags (title) VALUES (:tag" + i+")";
                            let insertStatement = DB.conn.createStatement(insertSql);

                            DB.bindParameter(insertStatement, "tag"+i, tags[i]);

                            insertStatement.execute();

                            //Get the id of the last inserted tag
                            tagIds.push(DB.conn.lastInsertRowID);
                        }
                    } catch (error) {
                        return this.exceptionHandler(error,callback);
                    }
                }


            }

            if (tagIds.length){
                //Insert records in the services-tags relationship table
                var statements = [];

                if (DB.legacyCode){
                    for (let i = 0; i < tagIds.length; i ++){
                        let sql = "INSERT INTO rel_services_tags (services_id,tags_id) VALUES (:serviceid,:tagid" + i + ")";
                        let statement = DB.conn.createStatement(sql);
                        let params = {};
                        params.serviceid = serviceId;
                        params["tagid"+i] = tagIds[i];
                        DB.bindParameters(statement,params);

                        statements.push(statement);
                    }
                } else {
                    let sql = "INSERT INTO rel_services_tags (services_id,tags_id) VALUES (:serviceid,:tagid)";
                    let statement = DB.conn.createStatement(sql);
                    let params = statement.newBindingParamsArray();
                    for (let i = 0; i < tagIds.length; i ++){
                        bp = params.newBindingParams();
                        bp.bindByName("serviceid", serviceId);
                        bp.bindByName("tagid", tagIds[i]);
                        params.addParams(bp);
                    }
                    statement.bindParameters(params);

                    statements.push(statement);

                }

                DB.conn.executeAsync(
                    statements,
                    statements.length,
                    {

                        //error is a mozIStorageError object
                        handleError: function(error) {
                            WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                        },

                        handleCompletion: function(reason) {
                            try{
                                if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                    return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"));

                                if (callback) callback(serviceId);

                                return serviceId;

                            } catch (error){
                                WMSInspectorServicePrivate.exceptionHandler(error,callback);
                            }
                        }
                    });
            }
            return true;

        } catch (error) {
            this.exceptionHandler(error,callback);
        }
    },

    _importServicesFromCSV: function(args){
        try{

            var contents = args.contents;
            var separator = args.separator || ",";

            var columns = contents.shift().split(separator);
            this.servicesQueue = [];
            for (let i = 0; i < contents.length;i++){
                if (contents[i].length > 0){

                    let record = this.parseCSV(contents[i],separator)[0];

                    if (record.length){

                        let service = new Classes.Service();

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
        } catch (error){
            return this.exceptionHandler(error,this.onThreadedProcessFinished);
        }
    },

    addServicesIncrementally: function(){
        try{
            if (this.servicesQueue.length){
                var service = this.servicesQueue.shift();
                var parent = this;

                var add = parent._addService({
                    "service":service,
                    "callback":function(id){
                        if (id !== false){
                            parent.servicesProcessed++;
                            parent.addServicesIncrementally();
                        } else {
                            parent.onThreadedProcessFinished(false);
                        }

                    }
                });
                if (!add) this.onThreadedProcessFinished(false);
                return false;
            } else {
                //this.onServicesInserted(this.servicesProcessed);
                this.onThreadedProcessFinished(this.servicesProcessed);
                return true;

            }
        } catch (error){
            return this.exceptionHandler(error,this.onThreadedProcessFinished);
        }
    },

    exceptionHandler: function(error,callback){

        var msg = "WMSInspector - " + error.message;
        if (DB.conn.lastErrorString && DB.conn.lastErrorString != "not an error")
            msg += " - " + DB.conn.lastErrorString;
        msg += " (line " + error.lineNumber + ")"
        Components.utils.reportError(msg);

        if (callback) callback(false);
        return false;

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
     *  Threads stuff classes
     */


    workingThreadHandler: function(threadID, context, process, params) {
        this.threadID = threadID;
        this.context = context;

        this.run = function() {
            try {
                // This is where the working thread does its processing work.

                this.context[process](params);

            // The processing function is responsible of calling back to the main
            // thread to let it know it has finished.

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

    mainThreadHandler: function(threadID, callback, result) {
        this.threadID = threadID;
        this.result = result;
        this.run = function() {
            try {

                // This is where we react to the completion of the working thread.
                if (callback) callback(result);

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