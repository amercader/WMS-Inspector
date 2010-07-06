WMSInspector.DB = {
    //Database file name
    DBName: "wmsinspector.sqlite",

    // This is the latest schema version, it must match the one defined in the
    // default database (PRAGMA user_version). It must be updated at any schema
    // change and a corresponding upgradeToVXX method must be added.
    schemaVersion: 1,
    
    storageService: WMSInspector.Utils.getService("@mozilla.org/storage/service;1", "mozIStorageService"),

    conn: null,

    getDBConnection: function(){
        var file = WMSInspector.IO.getProfileDir();
        file.append(this.DBName);

        return this.storageService.openDatabase(file);
    },

    checkDB: function(){
        var file = WMSInspector.IO.getProfileDir();
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
                /*
                 * TODO: Implement when necessary
                if (this.conn.schemaVersion < 2){
                    this.upgradeToV2();
                }
                */
                
                //Set new schemaVersion
                this.conn.schemaVersion = this.schemaVersion;
                //TODO: message

            }

        }
    },

/*
 *
 * Dummy method to test DB upgrades
    upgradeToV2: function(){
        try{

            this.conn.createTable("test_table","id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title VARCHAR(45) NOT NULL");

            var statement = this.conn.createStatement("INSERT INTO test_table (title) VALUES (:title)");
            var params = statement.newBindingParamsArray();
            var bp;
            for (var i = 0; i < 10; i++) {
              bp = params.newBindingParams();
              bp.bindByName("title", "Test record " + i);
              params.addParams(bp);
            }
            statement.bindParameters(params);

            var statements = [
                statement,
                this.conn.createStatement("ALTER TABLE services ADD COLUMN test_id NOT NULL DEFAULT 1"),
                this.conn.createStatement("ALTER TABLE tags ADD COLUMN test_col DEFAULT 4 NOT NULL")
            ];

            this.conn.executeAsync(statements,statements.length,this.transactionCallback);

        } catch (e) {
            Components.utils.reportError(this.conn.lastErrorString);
            return false;
        }

        return true;

    },
*/
    upgradeCallback: {
        handleResult: function(resultSet) {
            //No results should be returned during an upgrade transaction
        },

        handleError: function(error) {
            //print("Error: " + aError.message);
            Components.utils.reportError("WMSInspector - Error during database upgrade: " + error.message);
        },

        handleCompletion: function(reason) {
            if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                Components.utils.reportError("WMSInspector - DB upgrade transaction aborted or canceled");
        }
    },

    restoreDB: function(){
        //Copy default database to profile folder
        var src = WMSInspector.IO.getDefaultsDir();
        /*
        var src = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        src.initWithPath("/home/adria/dev/wmsinspector/dev/master/src/defaults");
        */
        
        if (src){
            src.append(this.DBName);
            var dest = WMSInspector.IO.getProfileDir();
            if (dest){
                src.copyTo(dest,"");

                //Open DB connection
                this.conn = this.getDBConnection();

                return true;
            }


        }
        return false;
    }

}
