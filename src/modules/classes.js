Components.utils.import("resource://wmsinspector/db.js");
Components.utils.import("resource://wmsinspector/log.js");

var EXPORTED_SYMBOLS = ["Classes"];

var Classes = {

    Service: function(){
        this.id = "";
        this.title = "";
        this.URL = "";
        this.version = "";
        this.favorite = false;
        this.type = "WMS";
        this.tags = null;
    },

    ServiceType: function(){
        this.id = "";
        this.name = "";
        this.title = "";
        this.defaultVersion = "";
    },


    LibraryQueryParams: function(text,filters,sorts,directions){
        this.text = text || "";
        this.filters = filters || {};
        this.sorts = sorts || ["favorite","creation_date"];
        this.directions = directions || ["DESC","DESC"];
    },

    LibraryQuery: function(params,callback){

        this.params = params || new Classes.LibraryQueryParams();
        this.callback = callback || null;

        this.results = [];

        this.sql = "";

        //Private properties
        var allowedSorts = ["favorite","creation_date","title"];
        var allowedDirections = ["ASC","DESC"];

        this.buildSQL = function(){
            var text = this.params.text;
            var filters = this.params.filters;
            var sorts = this.params.sorts;
            var directions = this.params.directions;

            this.sql = "";

            this.sql += "SELECT s.id AS id,s.title AS title,s.url AS url,s.favorite AS favorite,s.type AS type,s.version AS version,s.tags AS tags";

            if (filters.tags){
                //Are we filtering by tags? If so, things are not so easy.
                this.sql += " FROM v_services s LEFT JOIN rel_services_tags r ON s.id=r.services_id LEFT JOIN tags t ON r.tags_id = t.id";
            } else {
                this.sql += " FROM v_services s";
            }

            var sqlWhere = "";
            if (text)
                sqlWhere = "(s.title LIKE :text OR s.url LIKE :text OR s.tags LIKE :text)";


            if (filters){
                var sqlFilters = [];
                var i = 0;
                if (filters.tags){
                    var sqlTags = "";
                    for (let i = 0; i < filters.tags.length; i++){
                        if (i > 0) sqlTags += " OR";
                        sqlTags += " t.title = :tag"+i;
                    }
                    if (filters.tags.length > 1) sqlTags = "(" + sqlTags + ")";
                    sqlFilters.push(sqlTags);
                }

                if (filters.types){
                    var sqlTypes = "";
                    for (let i = 0; i < filters.types.length; i++){
                        if (i > 0) sqlTypes += " OR";
                        sqlTypes += " s.type = :type" + i;
                    }
                    if (filters.types.length > 1) sqlTypes = "(" + sqlTypes + ")";
                    sqlFilters.push(sqlTypes);
                }

                if (filters.ids){
                    var sqlIds = "";
                    for (let i = 0; i < filters.ids.length; i++){
                        if (i > 0) sqlIds += " OR";
                        sqlIds += " s.id = :id" + i;
                    }
                    if (filters.ids.length > 1) sqlIds = "(" + sqlIds + ")";
                    sqlFilters.push(sqlIds);
                }

                if (sqlFilters.length) sqlWhere += (sqlWhere.length) ? " AND " + sqlFilters.join(" AND ") : sqlFilters.join(" AND ");
            }


            if (sqlWhere.length) this.sql += " WHERE " + sqlWhere;

            if (filters.tags) this.sql += " GROUP BY s.id";

            if (sorts.length){
                var sqlSort = "";

                for (let i = 0; i < sorts.length; i++){
                    if (this.allowedValue(allowedSorts,sorts[i])){
                        sqlSort += (sqlSort.length) ? "," : " ";
                        sqlSort += "s." + sorts[i];
                        if (directions && directions[i] && this.allowedValue(allowedDirections,directions[i])) sqlSort += " " + directions[i];

                    }
                }

                if (sqlSort.length) this.sql += " ORDER BY" + sqlSort;
            }

            return this.sql;
        }

        this.allowedValue = function(collection,value){
            for (let i = 0; i < collection.length; i++){
                if (collection[i].toLowerCase() == value.toLowerCase()) return true;
            }
            return false;
        }

        this.query = function(){
            try{
                if (!this.sql) this.buildSQL();
                var text = this.params.text;
                var filters = this.params.filters;

                var statement = DB.conn.createStatement(this.sql);

                if (text || filters.tags || filters.types || filters.ids){
                    var params = {};
                    if (text) params.text = "%" + text + "%";
                    if (filters.tags)
                        for (let i = 0; i < filters.tags.length; i++)
                        params["tag"+i] = filters.tags[i];

                    if (filters.types)
                        for (let i = 0; i < filters.types.length; i++)
                        params["type"+i] = filters.types[i];

                    if (filters.ids)
                        for (let i = 0; i < filters.ids.length; i++)
                        params["id"+i] = filters.ids[i];

                    DB.bindParameters(statement,params);
                }

                this.results = [];

                var self = this;

                statement.executeAsync({
                    errorsFound: false,
                    handleResult: function(resultSet) {
                        try{
                            for (let row = resultSet.getNextRow();
                                row;
                                row = resultSet.getNextRow()) {

                                let service = new Classes.Service();
                                service.id = row.getResultByName("id");
                                service.title = row.getResultByName("title");
                                service.URL = row.getResultByName("url");
                                service.favorite = (row.getResultByName("favorite") == 1);
                                service.type = row.getResultByName("type");
                                service.version = row.getResultByName("version");
                                let tags = row.getResultByName("tags");
                                if (tags) service.tags = tags.split(",").sort();


                                self.results.push(service);
                            }
                        } catch (error) {
                            this.errorsFound = true;
                            self.exceptionHandler(error);
                        }
                    },

                    //error is a mozIStorageError object
                    handleError: function(error) {
                        self.exceptionHandler(new Error(error.message +" [" + error.result +"]"));
                    },

                    handleCompletion: function(reason) {
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return self.exceptionHandler(new Error("Transaction aborted or canceled"),callback);

                        if (self.callback)
                            self.callback((this.errorsFound) ? false : self.results);

                        return true;
                    }
                });

            } catch (error) {
                return this.exceptionHandler(error);
            }


        },

        this.exceptionHandler = function(error,callback){
            Log.error(error);
            if (DB.conn.lastErrorString && DB.conn.lastErrorString != "not an error")
                Log.error(DB.conn.lastErrorString);

            if (callback) callback(false);
            return false;
        }


    }

}