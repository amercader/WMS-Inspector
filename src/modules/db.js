Components.utils.import("resource://wmsinspector/utils.js");
Components.utils.import("resource://wmsinspector/io.js");
Components.utils.import("resource://wmsinspector/log.js");

var EXPORTED_SYMBOLS = ["DB"];

var DB = {
    //Database file name
    DBName: "wmsinspector.sqlite",

    // This is the latest schema version, it must match the one defined in the
    // default database (PRAGMA user_version). It must be updated at any schema
    // change and a corresponding upgradeToVXX method must be added.
    schemaVersion: 2,


    // Unused in this version.
    // This should only be used if backwards incompatible code must be supported
    // e.g. legacyCode: (Utils.compareFirefoxVersions(Utils.currentFirefoxVersion,"3.6")< 0),
    legacyCode: false,

    storageService: Utils.getService("@mozilla.org/storage/service;1", "mozIStorageService"),

    conn: null,

    operationCallback: false,

    getDBConnection: function(){
        var file = IO.getProfileDir();
        file.append(this.DBName);

        return this.storageService.openDatabase(file);
    },

    checkDB: function(callback){
        var file = IO.getProfileDir();
        file.append(this.DBName);

        //DB does not exist, copy the default one to profile dir
        if (!file.exists()){
            this.restoreDB(callback);
        } else {
            //DB exists, open connection
            this.conn = this.getDBConnection();

            //Check schema version
            var DBInitialized = (this.conn.schemaVersion > 0);
            if (!DBInitialized){
                //This should never happen if everything went right
                this.conn.close();
                this.restoreDB(callback);
            } else if (this.conn.schemaVersion < this.schemaVersion) {
                //Upgrade schema version if necessary
                if (callback) this.operationCallback = callback
                if (this.conn.schemaVersion < 2){
                    this.upgradeToV2();
                }

            } else {
                if (callback) callback(true);
            }
        }
    },

    upgradeToV2: function(){
        try{

            var columns = "\"id\" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n\
                        \"title\" VARCHAR(200) COLLATE NOCASE,\n\
                        \"url\" VARCHAR(300) NOT NULL COLLATE NOCASE,\n\
                        \"favorite\" INTEGER,\n\
                        \"creation_date\" INTEGER NOT NULL,\n\
                        \"update_date\" INTEGER,\n\
                        \"type\" VARCHAR(10) NOT NULL DEFAULT \"WMS\" COLLATE NOCASE,\n\
                        \"version\" VARCHAR(10)";

            this.conn.createTable("services_backup",columns);

            var statements1 = [
            this.conn.createStatement("INSERT INTO services_backup SELECT id,title,url,favorite,creation_date,update_date,type,version FROM services"),
            this.conn.createStatement("DROP TABLE services")
            ];

            this.conn.executeAsync(statements1,statements1.length,
            {
                handleResult: function(resultSet) {
                //No results should be returned during an upgrade transaction
                },

                handleError: DB.executionErrorHandler,

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                        return DB.exceptionHandler(new Error("Database upgrade transaction aborted or canceled"));
                    } else {
                        DB.conn.createTable("services",columns);

                        var statements2 = [
                        DB.conn.createStatement("INSERT INTO services SELECT id,title,url,favorite,creation_date,update_date,type,version FROM services_backup"),
                        DB.conn.createStatement("DROP TABLE services_backup"),
                        DB.conn.createStatement("CREATE TRIGGER services_after_delete_trigger AFTER DELETE ON services FOR EACH ROW WHEN OLD.id IS NOT NULL BEGIN DELETE FROM rel_services_tags WHERE services_id = OLD.id; END;")
                        ];

                        DB.conn.executeAsync(statements2,statements2.length,DB.upgradeCallback);

                        return true;
                    }
                }
            }
            );

        } catch (error) {
            DB.exceptionHandler(error);
        }

        return true;

    },

    upgradeCallback: {
        handleResult: function(resultSet) {
        //No results should be returned during an upgrade transaction
        },

        handleError: this.executionErrorHandler,

        handleCompletion: function(reason) {
            if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                return DB.exceptionHandler(new Error("Database upgrade transaction aborted or canceled"));
            }else{

                //Set new schemaVersion
                DB.conn.schemaVersion = DB.schemaVersion;

                Log.info("Database schema successfully upgraded to version " + DB.schemaVersion);

                if (DB.operationCallback) DB.operationCallback(true)

                return true;
            }
        }
    },

    executionErrorHandler: function(error) {
        return DB.exceptionHandler(new Error(error.message +" [" + error.result +"]"));
    },

    exceptionHandler: function(error,callback){

        callback = callback || DB.operationCallback;

        Log.error(error);
        if (DB.conn.lastErrorString && DB.conn.lastErrorString != "not an error")
            Log.error(DB.conn.lastErrorString);

        if (callback) callback(false);
        return false;
    },

    restoreDB: function(callback){
        try{
            //Copy default database to profile folder
            var src = IO.getDefaultsDir();
            if (src){
                src.append(this.DBName);

                var dest = IO.getProfileDir();
                if (dest){
                    if (Utils.compareFirefoxVersions(Utils.currentFirefoxVersion,"4.0b")< 0){
                        // FF 3.6
                        try {
                            src.copyTo(dest,"");
                        } catch (error) {
                            Log.error(error);
                            return false;
                        }
                        //Open DB connection
                        this.conn = this.getDBConnection();

                        Log.info("New database successfully restored (Schema version " + this.conn.schemaVersion + ")");

                        if (callback) callback(true);

                        return true;
                    } else {
                        // FF 4.X
                        // In FF 4, the extension's contents are packed inside
                        // the XPI file, we must extract the default database.

                        Components.utils.import("resource://gre/modules/AddonManager.jsm");

                        dest.append(DB.DBName);
                        AddonManager.getAddonByID("wmsinspector@flentic.net", function(addon) {
                            try{
                                var file = "defaults/" + DB.DBName;
                                var uri = addon.getResourceURI(file);

                                IO.saveURItoFile(uri, dest);

                                //Open DB connection
                                DB.conn = DB.getDBConnection();

                                Log.info("New database successfully restored (Schema version " + DB.conn.schemaVersion + ")");

                                if (callback) callback(true);
                            } catch (error){
                                Log.error(error);
                                if (callback) callback(false);
                            }

                        });
                    }
                }
            }
        } catch (error){
            Log.error(error);
            if (callback) callback(false);
        }
    },

    bindParameter: function(statement,name,value){
        statement.params[name] = value;
    },

    /*
     * params - object with key: value pairs of parameters to bind
     */
    bindParameters: function(statement,params){
        var bpArray = statement.newBindingParamsArray();
        var bp = bpArray.newBindingParams();

        for (let name in params)
            bp.bindByName(name, params[name]);

        bpArray.addParams(bp);

        statement.bindParameters(bpArray);

        return statement;
    }

}

