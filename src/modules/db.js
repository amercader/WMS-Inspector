Components.utils.import("resource://wmsinspector/utils.js");
Components.utils.import("resource://wmsinspector/io.js");

var EXPORTED_SYMBOLS = ["DB"];

var DB = {
    //Database file name
    DBName: "wmsinspector.sqlite",

    // This is the latest schema version, it must match the one defined in the
    // default database (PRAGMA user_version). It must be updated at any schema
    // change and a corresponding upgradeToVXX method must be added.
    schemaVersion: 2,

    // Some classes used are not supported in Firefox 3.5.
    // Code executed under this condition should be removed when support for Firefox 3.5 is dropped
    legacyCode: (
        Utils.compareFirefoxVersions(
            Utils.getService("@mozilla.org/fuel/application;1","fuelIApplication").version,
            "3.6")
        < 0),

    storageService: Utils.getService("@mozilla.org/storage/service;1", "mozIStorageService"),

    conn: null,

    getDBConnection: function(){
        var file = IO.getProfileDir();
        file.append(this.DBName);

        return this.storageService.openDatabase(file);
    },

    checkDB: function(){
        var file = IO.getProfileDir();
        file.append(this.DBName);
        //DB does not exist, copy the default one to profile dir
        if (!file.exists()){
            this.restoreDB();
        } else {
            //DB exists, open connection
            this.conn = this.getDBConnection();

            //Check schema version
            var DBInitialized = (this.conn.schemaVersion > 0);
            if (!DBInitialized){
                //This should never happen if everything went right
                this.conn.close();
                this.restoreDB();
            } else if (this.conn.schemaVersion < this.schemaVersion) {
                //Upgrade schema version if necessary

                if (this.conn.schemaVersion < 2){
                    this.upgradeToV2();
                }

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

                handleError: function(error) {
                    Components.utils.reportError("WMSInspector - Error during database upgrade: " + error.message);
                },

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                        Components.utils.reportError("WMSInspector - DB upgrade transaction aborted or canceled");
                    } else {
                        DB.conn.createTable("services",columns);

                        var statements2 = [
                            DB.conn.createStatement("INSERT INTO services SELECT id,title,url,favorite,creation_date,update_date,type,version FROM services_backup"),
                            DB.conn.createStatement("DROP TABLE services_backup"),
                            DB.conn.createStatement("CREATE TRIGGER services_after_delete_trigger AFTER DELETE ON services FOR EACH ROW WHEN OLD.id IS NOT NULL BEGIN DELETE FROM rel_services_tags WHERE services_id = OLD.id; END;")
                        ];

                        DB.conn.executeAsync(statements2,statements2.length,DB.upgradeCallback);

                    }
                }
            }
            );

        } catch (e) {
            Components.utils.reportError(this.conn.lastErrorString);
            return false;
        }

        return true;

    },

    upgradeCallback: {
        handleResult: function(resultSet) {
        //No results should be returned during an upgrade transaction
        },

        handleError: function(error) {
            Components.utils.reportError("WMSInspector - Error during database upgrade: " + error.message);
        },

        handleCompletion: function(reason) {
            if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                Components.utils.reportError("WMSInspector - DB upgrade transaction aborted or canceled");
            }else{

                //Set new schemaVersion
                DB.conn.schemaVersion = DB.schemaVersion;

                Components.utils.reportError("WMSInspector - DB schema upgraded to version " + DB.schemaVersion);
            }
        }
    },

    restoreDB: function(){
        //Copy default database to profile folder
        var src = IO.getDefaultsDir();

        if (src){
            src.append(this.DBName);
            var dest = IO.getProfileDir();
            if (dest){
                src.copyTo(dest,"");

                //Open DB connection
                this.conn = this.getDBConnection();

                return true;
            }


        }
        return false;
    },

    bindParameter: function(statement,name,value){
        var params = {}
        params[name] = value;
        return this.bindParameters(statement, params);
    },

    /*
     * params - object with key: value pairs of parameters to bind
     */
    bindParameters: function(statement,params){
        if (this.legacyCode){
            // Asyncronous parameters binding is not supported in Firefox 3.5
            // This code should be removed when support for Firefox 3.5 is dropped

            for (let name in params)
                statement.params[name] = params[name];

        } else {
            var bpArray = statement.newBindingParamsArray();
            var bp = bpArray.newBindingParams();

            for (let name in params)
                bp.bindByName(name, params[name]);

            bpArray.addParams(bp);

            statement.bindParameters(bpArray);
        }

        return statement;
    }

}

