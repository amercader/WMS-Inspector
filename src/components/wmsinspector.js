
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
    importServicesFromCSV: function(contents,separator,callback){
        WMSInspectorServicePrivate.launchThreadedProcess(
            "_importServicesFromCSV",
            {
                "contents": contents,
                "separator":separator
            },
            callback
            );
    },

    getServiceTypes: function(callback){
        WMSInspectorServicePrivate._getServiceTypes(
        {
            "callback":callback
        }
        );
    },

    addServiceType: function(serviceType,callback){
        WMSInspectorServicePrivate.launchThreadedProcess(
            "_addServiceType",
            {
                "serviceType":serviceType,
                "callback":function(result){
                    WMSInspectorServicePrivate.onThreadedProcessFinished(result)
                }
            },
            callback
            );
    },

    updateServiceType: function(serviceType,callback){
        WMSInspectorServicePrivate.launchThreadedProcess(
            "_updateServiceType",
            {
                "serviceType":serviceType,
                "callback":function(result){
                    WMSInspectorServicePrivate.onThreadedProcessFinished(result)
                }
            },
            callback
            );
    },

    deleteServiceType: function(id,callback){
        WMSInspectorServicePrivate.launchThreadedProcess(
            "_deleteServiceType",
            {
                "id":id,
                "callback":function(result){
                    WMSInspectorServicePrivate.onThreadedProcessFinished(result)
                }
            },
            callback
            );
    }


}

WMSInspectorServicePrivate = {

    operationCallback: null,

    servicesQueue: [],

    servicesProcessed: 0,

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
                return this._setTags(serviceId,service.tags,callback);
            }
            else {
                if (callback) callback(serviceId);
            }

            return serviceId;

        } catch (error) {
            return this.exceptionHandler(error,this.onThreadedProcessFinished);
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
                    return this._setTags(service.id,service.tags,callback);
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
                return this._setTags(service.id,service.tags,callback);
            } else {
                if (callback) callback(service.id);
            }

            return service.id;

        }
        catch (error) {
            return this.exceptionHandler(error,this.onThreadedProcessFinished);
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
            return this.exceptionHandler(error,this.onThreadedProcessFinished);
        }
    },

    /*
     * 1 - Delete previous tags from service
     * 2 - For each tag, check if exists
     *      - If exists, save the id
     *      - If not, insert tag and get new id
     * 3 - Insert records in rel_services_tag table
     */
    _setTags: function(serviceId,tags,callback){

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
                }
                else {
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
                            WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),WMSInspectorServicePrivate.onThreadedProcessFinished);
                        },

                        handleCompletion: function(reason) {
                            try{
                                if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                    return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),WMSInspectorServicePrivate.onThreadedProcessFinished);

                                if (callback) callback(serviceId);

                                return serviceId;

                            } catch (error){
                                WMSInspectorServicePrivate.exceptionHandler(error,WMSInspectorServicePrivate.onThreadedProcessFinished);
                            }
                        }
                    });
            }
            return true;

        } catch (error) {
            return this.exceptionHandler(error,this.onThreadedProcessFinished);
        }
    },

    _importServicesFromCSV: function(args){
        try{

            var contents = args.contents;
            var separator = args.separator || ",";

            var columns = contents.shift().split(separator);
            this.servicesQueue = [];

            var self = this;

            // We need to get the service types list
            this._getServiceTypes({callback: function(serviceTypes){
                for (let i = 0; i < contents.length;i++){
                    if (contents[i].length > 0){

                        let record = self.parseCSV(contents[i],separator)[0];

                        if (record.length){

                            let service = new Classes.Service();

                            if (columns.indexOf("title") != -1) service.title = record[columns.indexOf("title")];
                            if (columns.indexOf("URL") != -1) service.URL = record[columns.indexOf("URL")];
                            if (columns.indexOf("favorite") != -1) service.favorite = (record[columns.indexOf("favorite")] == "1");

                            if (columns.indexOf("type") != -1) service.type = record[columns.indexOf("type")];
                            if (columns.indexOf("version") != -1) {
                                service.version = record[columns.indexOf("version")];
                            } else {
                                for (let i=0; i < serviceTypes.length; i++){
                                    if (serviceTypes[i].name == service.type){
                                        service.version = serviceTypes[i].defaultVersion;
                                        break;
                                    }
                                }
                            }

                            if (columns.indexOf("tags") != -1)
                                if (typeof(record[columns.indexOf("tags")]) != "undefined" && record[columns.indexOf("tags")].length)
                                    service.tags = record[columns.indexOf("tags")].split(",");


                            if (service.URL) {
                                self.servicesQueue.push(service);
                            }
                        }
                    }
                }
                self.servicesProcessed = 0;
                self.addServicesIncrementally();
            }})



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
                        }
                        else {
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

    _getServiceTypes: function(args){
        try{


        var callback = args.callback;

        var sql = "SELECT id,name,title,default_version,versions FROM v_service_types_versions";

        var statement = DB.conn.createStatement(sql);

        var results = [];

        statement.executeAsync({
            errorsFound: false,
            handleResult: function(resultSet) {
                try{
                    for (let row = resultSet.getNextRow();
                        row;
                        row = resultSet.getNextRow()) {

                        let serviceType = new Classes.ServiceType();
                        serviceType.id =  row.getResultByName("id"),
                        serviceType.name = row.getResultByName("name"),
                        serviceType.title = row.getResultByName("title"),
                        serviceType.defaultVersion = row.getResultByName("default_version"),
                        serviceType.versions = row.getResultByName("versions").split(",").sort()
                        results.push(serviceType)
                    }
                } catch (error) {
                    this.errorsFound = true;
                    WMSInspectorServicePrivate.exceptionHandler(error);
                }
            },

            handleError: function(error) {
                WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),WMSInspectorServicePrivate.onThreadedProcessFinished);
            },

            handleCompletion: function(reason) {
                if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                    return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),WMSInspectorServicePrivate.onThreadedProcessFinished);

                if (callback) 
                    callback((this.errorsFound ? false : results));

                return true;
            }
        });
        return true;
                } catch (error){
            return this.exceptionHandler(error,this.onThreadedProcessFinished);
        }
    },

    _addServiceType: function(args){
        try{
            var serviceType = args.serviceType;
            var callback = args.callback;
            
            var sql = "INSERT INTO service_types (name,title) VALUES (:name,:title)";

            var statement = DB.conn.createStatement(sql);

            DB.bindParameters(statement,{
                "name":serviceType.name,
                "title": serviceType.title
            });

            statement.execute();

            serviceType.id = DB.conn.lastInsertRowID;

            this._setServiceTypeVersions(serviceType,callback);

            return serviceType;

        } catch (error) {
            return this.exceptionHandler(error,this.onThreadedProcessFinished);
        }
    },

    _updateServiceType: function(args){
        try{
            var serviceType = args.serviceType;
            var callback = args.callback;
            
            //We will only update properties defined in the serviceType object provided
            var sql = "UPDATE service_types";
            var sqlUpdate = [];
            var params = {};
            if (serviceType.name) {
                sqlUpdate.push(" name = :name");
                params.name = serviceType.name
            }
            if (serviceType.title) {
                sqlUpdate.push(" title = :title");
                params.title = serviceType.title
            }

            if (sqlUpdate.length == 0) {
                if (serviceType.versions && serviceType.versions.length) {
                    return this._setServiceTypeVersions(serviceType,callback);
                } else {
                    //Nothing to update
                    if (callback) callback(false);
                    return false;
                }
            }

            sql += " SET " + sqlUpdate.join(",") + " WHERE id = :id";
            params.id = serviceType.id;

            var statement = DB.conn.createStatement(sql);

            DB.bindParameters(statement,params);

            statement.execute();

            if (serviceType.versions && serviceType.versions.length) {
                return this._setServiceTypeVersions(serviceType,callback);
            } else {
                if (callback) callback(serviceType);
            }

            return serviceType;

        } catch (error) {
            return this.exceptionHandler(error,this.onThreadedProcessFinished);
        }
    },

    _setServiceTypeVersions: function(serviceType,callback){
        try{
            //Delete previous versions from service type
            var sql = "DELETE FROM versions WHERE service_types_id = :id";
            var statement = DB.conn.createStatement(sql);

            DB.bindParameter(statement, "id", serviceType.id);

            statement.execute();

            var statements = [];

            if (DB.legacyCode){
                for (let i = 0; i < serviceType.versions.length; i ++){
                    let sql = "INSERT INTO versions (service_types_id,name,isdefault) VALUES (:servicetypeid,:name" + i + ",:isdefault" + i + ")";
                    let statement = DB.conn.createStatement(sql);
                    let params = {};
                    params.servicetypeid = serviceType.id;
                    params["name"+i] = serviceType.versions[i];
                    params["isdefault"+i] = (serviceType.versions[i] == serviceType.defaultVersion) ? 1 : 0;
                    DB.bindParameters(statement,params);

                    statements.push(statement);
                }
            } else {
                let sql = "INSERT INTO versions (service_types_id,name,isdefault) VALUES (:servicetypeid,:name,:isdefault)";
                let statement = DB.conn.createStatement(sql);
                let params = statement.newBindingParamsArray();
                for (let i = 0; i < serviceType.versions.length; i ++){
                    bp = params.newBindingParams();
                    bp.bindByName("servicetypeid", serviceType.id);
                    bp.bindByName("name", serviceType.versions[i]);
                    bp.bindByName("isdefault", (serviceType.versions[i] == serviceType.defaultVersion) ? 1 : 0);
                    params.addParams(bp);
                }
                statement.bindParameters(params);

                statements.push(statement);

            }


            DB.conn.executeAsync(
                statements,
                statements.length,
                {
                    handleError: function(error) {
                        WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),WMSInspectorServicePrivate.onThreadedProcessFinished);
                    },

                    handleCompletion: function(reason) {
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),WMSInspectorServicePrivate.onThreadedProcessFinished);

                        if (callback) callback(serviceType);
                        return true;
                    }
                });
            return true;
                
        } catch (error) {
            this.exceptionHandler(error,this.onThreadedProcessFinished);
        }
    },

    _deleteServiceType: function(args){
        try{
            var id = args.id;
            var callback = args.callback;
            
            var sql = "DELETE FROM service_types WHERE id = :id";
            var statement = DB.conn.createStatement(sql);

            DB.bindParameters(statement,{
                id:id
            });
            

            statement.execute();

            // The service_types_after_delete_trigger trigger will deal with the service type's versions

            if (callback) callback(true);

            return true;
        } catch (error) {
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

            }
            catch(err) {
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

            }
            catch(err) {
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