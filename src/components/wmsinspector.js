
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
        return WMSInspectorServicePrivate._addService(service,callback);
    },

    updateService: function(service,callback){
        return WMSInspectorServicePrivate._updateService(service,callback);
    },

    deleteService: function(id,callback){
        return WMSInspectorServicePrivate._deleteService(id,callback);
    },

    importServicesFromCSV: function(contents,separator,callback){
        return WMSInspectorServicePrivate._importServicesFromCSV(contents,separator,callback);
    },

    getTags: function(callback){
        return WMSInspectorServicePrivate._getTags(callback);
    },

    getServiceTypes: function(callback){
        return WMSInspectorServicePrivate._getServiceTypes(callback);
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

    lastServiceId: null,

    lastTagId: null,

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

    _getLastServiceId: function(callback){
        return this._getLastId("services",callback);
    },

    _getLastTagId: function(callback){
        return this._getLastId("tags",callback);
    },

    _getLastId: function(table,callback){
        if (table != "services" && table != "tags") return false;

        var sql = "SELECT max(id) AS id FROM " + table;
        var statement = DB.conn.createStatement(sql);
        statement.executeAsync({
            id: null,
            handleResult: function(resultSet) {
                let row = resultSet.getNextRow();
                this.id = row.getResultByName("id");
            },

            handleError: function(error) {
                WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),WMSInspectorServicePrivate.onThreadedProcessFinished);
            },

            handleCompletion: function(reason) {
                try{
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                        return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),WMSInspectorServicePrivate.onThreadedProcessFinished);

                    if (this.id === null){
                        // Still no records in the table
                        this.id = 0;
                    }

                    if (table == "services"){
                        WMSInspectorServicePrivate.lastServiceId = this.id;
                    } else if (table == "tags"){
                        WMSInspectorServicePrivate.lastTagId = this.id;
                    }

                    if (callback) callback(this.id);

                    return true;
                } catch (error) {
                    return WMSInspectorServicePrivate.exceptionHandler(error,callback);
                }
            }
        });
        return true;
    },

    _addService: function(service,callback){
        try{

            // As we can not run threaded code anymore (Bug #608142), we need to
            // know beforehand the id of the new service to be able to run async
            // queries (i.e. tags need to know the new service id)

            if (this.lastServiceId === null){
                this._getLastServiceId(function(){
                    WMSInspectorServicePrivate._addService(service,callback)
                });
                return null;
            }

            var sql = "INSERT INTO services \n\
                        (id,title,url,version,favorite,creation_date,type) \n\
                   VALUES \n\
                        (:id,:title,:url,:version,:favorite,strftime('%s','now'),:type)";

            var statement = DB.conn.createStatement(sql);

            DB.bindParameters(statement,{
                "id": this.lastServiceId + 1,
                "title": service.title,
                "url": service.URL,
                "version": service.version,
                "favorite": (service.favorite) ? "1" : "0",
                "type": service.type
            });

            statement.executeAsync({
                handleError: function(error) {
                    WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    try{
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),callback);

                        // If everything went right, update the service id
                        // counter
                        WMSInspectorServicePrivate.lastServiceId++;

                        if (service.tags && service.tags.length) {
                            return WMSInspectorServicePrivate._setTags(WMSInspectorServicePrivate.lastServiceId,service.tags,callback);
                        } else {
                            if (callback) callback(this.serviceId);
                        }

                        return true;
                    } catch (error) {
                        return WMSInspectorServicePrivate.exceptionHandler(error,callback);
                    }
                }
            });

            return true;

        } catch (error) {
            return WMSInspectorServicePrivate.exceptionHandler(error,callback);
        }
    },

    //Service should be a Classes.Service object
    _updateService: function(service,callback){
        try{

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
                if (service.tags !== null) {
                    // If service.tags is null, the current tags won't be
                    // modified. If service.tags is an empty array, the current
                    // service tags will be deleted
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

            statement.executeAsync({

                handleError: function(error) {
                    WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"));
                },

                handleCompletion: function(reason) {
                    try{
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),callback);
                        
                        // If service.tags is null, the current tags won't be
                        // modified. If service.tags is an empty array, the current
                        // service tags will be deleted
                        if (service.tags !== null) {
                            WMSInspectorServicePrivate._setTags(service.id,service.tags,callback);
                        } else {
                            if (callback) callback(service.id);
                        }

                        return true;
                    } catch (error){
                        return WMSInspectorServicePrivate.exceptionHandler(error,callback);
                    }
                }
            });

            return true;

        }
        catch (error) {
            return this.exceptionHandler(error,callback);
        }
    },

    _deleteService: function(id,callback){
        try{

            if (typeof(id) != "number") return false;

            var sql = "DELETE FROM services WHERE id = :id";
            var statement = DB.conn.createStatement(sql);

            DB.bindParameter(statement,"id",id);

            statement.executeAsync({

                handleError: function(error) {
                    WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"));
                },

                handleCompletion: function(reason) {
                    try{
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),callback);

                        // The services_after_delete_trigger trigger will deal with the service's tags

                        if (callback) callback(true);

                        return true;
                    } catch (error){
                        return WMSInspectorServicePrivate.exceptionHandler(error,callback);
                    }
                }
            });

            return true;

        } catch (error) {
            return WMSInspectorServicePrivate.exceptionHandler(error,callback);
        }
    },

    _setTags: function(serviceId,tags,callback){

        try {
            if (this.lastTagId === null){
                this._getLastTagId(function(){
                    WMSInspectorServicePrivate._setTags(serviceId,tags,callback)
                });
                return false;
            }

            //Delete previous tags from service
            var sql = "DELETE FROM rel_services_tags WHERE services_id = :id";
            var statement = DB.conn.createStatement(sql);

            DB.bindParameter(statement, "id", serviceId);

            statement.executeAsync({
                handleError: function(error) {
                    WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    try{
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),callback);

                        // If no tags defined, we don't need to do anything else
                        if (tags.length == 0){
                            if (callback) callback(serviceId);
                            return true;
                        }

                        //Check if tags exist and insert new ones if not
                        var selectSql = "SELECT id,title FROM tags WHERE";
                        for (let i = 0; i < tags.length; i++){
                            if (i > 0 ) selectSql += " OR";
                            selectSql += " title LIKE :tag" + i;
                        }

                        var selectStatement = DB.conn.createStatement(selectSql);
                        var params = {};
                        for (let j = 0; j < tags.length; j++){
                            params["tag"+j] = tags[j];
                        }
                        DB.bindParameters(selectStatement,params);

                        selectStatement.executeAsync({
                            errorsFound: false,
                            foundTagsIds: [],
                            foundTagsTitles: [],
                            handleResult: function(resultSet) {
                                try{
                                    for (let row = resultSet.getNextRow();
                                        row;
                                        row = resultSet.getNextRow()) {
                                        this.foundTagsIds.push(row.getResultByName("id"));
                                        this.foundTagsTitles.push(row.getResultByName("title"));
                                    }
                                } catch (error) {
                                    this.errorsFound = true;
                                    WMSInspectorServicePrivate.exceptionHandler(error);
                                }
                            },
                            handleError: function(error) {
                                WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                            },

                            handleCompletion: function(reason) {
                                try{
                                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                        return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),callback);

                                    var statements = [];

                                    for (let i = 0; i < tags.length; i++) {
                                        let tagId = null;
                                        let index = this.foundTagsTitles.indexOf(tags[i]);
                                        if (index === -1){
                                            // Tag does not exist

                                            // Increase the Tag id counter
                                            WMSInspectorServicePrivate.lastTagId++;

                                            // Create a statement to insert a record in the tags table
                                            let sqlTag = "INSERT INTO tags (id,title) VALUES (:id,:tag)";
                                            let insertTag = DB.conn.createStatement(sqlTag);
                                            DB.bindParameters(insertTag,{"id":  WMSInspectorServicePrivate.lastTagId,"tag": tags[i]});
                                            statements.push(insertTag)

                                            tagId = WMSInspectorServicePrivate.lastTagId;

                                        } else {
                                            // Tag already exists
                                            tagId = this.foundTagsIds[index];
                                        }

                                        // Create a statement to insert a record in the tags-services relation table
                                        let sqlRelation = "INSERT INTO rel_services_tags (services_id,tags_id) VALUES (:serviceid,:tagid)";
                                        let insertRelation = DB.conn.createStatement(sqlRelation);
                                        DB.bindParameters(insertRelation,{"serviceid": serviceId,"tagid": tagId});
                                        statements.push(insertRelation);
                                    }

                                    // Execute the statements collection
                                    DB.conn.executeAsync(
                                        statements,
                                        statements.length,
                                        {
                                            handleError: function(error) {
                                                WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                                            },

                                            handleCompletion: function(reason) {
                                                try{
                                                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                                        return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),callback);

                                                    if (callback) callback(serviceId);

                                                    return true;
                                                } catch (error){
                                                    return WMSInspectorServicePrivate.exceptionHandler(error,callback);
                                                }
                                            }
                                        });

                                    return true;

                                } catch (error){
                                    return WMSInspectorServicePrivate.exceptionHandler(error,callback);
                                }
                            }
                        });

                        return true;

                    } catch (error) {
                        return WMSInspectorServicePrivate.exceptionHandler(error,callback);
                    }
                }
            });

            return true;

        } catch (error) {
            return WMSInspectorServicePrivate.exceptionHandler(error,callback);
        }
    },

    _importServicesFromCSV: function(contents, separator, callback){
        try{
            separator = separator || ",";
            this.operationCallback = callback;

            var columns = contents.shift().split(separator);
            this.servicesQueue = [];

            var self = this;

            // We need to get the service types list
            this._getServiceTypes({
                callback: function(serviceTypes){
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
                }
            })

            return true;
        } catch (error){
            return this.exceptionHandler(error,this.operationCallback);
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
                            if (parent.operationCallback) parent.operationCallback(false);
                        }

                    }
                });
                if (add === false && this.operationCallback) this.operationCallback(false);
                return false;
            } else {
                if (this.operationCallback) this.operationCallback(this.servicesProcessed);
                return true;

            }
        } catch (error){
            return this.exceptionHandler(error,this.operationCallback);
        }
    },

    _getServiceTypes: function(callback){
        try{

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
                        WMSInspectorServicePrivate.exceptionHandler(error,callback);
                    }
                },

                handleError: function(error) {
                    WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                        return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),callback);

                    if (callback)
                        callback((this.errorsFound ? false : results));

                    return true;
                }
            });
            return true;
        } catch (error){
            return this.exceptionHandler(error,callback);
        }
    },

    _getTags: function(callback){
        try{

            var sql = "SELECT title FROM tags ORDER BY title";

            var statement = DB.conn.createStatement(sql);

            var results = [];

            statement.executeAsync({
                errorsFound: false,
                handleResult: function(resultSet) {
                    try{
                        for (let row = resultSet.getNextRow();
                            row;
                            row = resultSet.getNextRow()) {
                            results.push(row.getResultByName("title"));
                        }
                    } catch (error) {
                        this.errorsFound = true;
                        WMSInspectorServicePrivate.exceptionHandler(error,callback);
                    }
                },

                handleError: function(error) {
                    WMSInspectorServicePrivate.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                        return WMSInspectorServicePrivate.exceptionHandler(new Error("Transaction aborted or canceled"),callback);

                    if (callback)
                        callback((this.errorsFound ? false : results));

                    return true;
                }
            });
            return true;
        } catch (error){
            return this.exceptionHandler(error,callback);
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