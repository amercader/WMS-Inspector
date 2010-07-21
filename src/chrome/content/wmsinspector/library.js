WMSInspector.Library = {
    
    //prefs: null,

    list: null,
    services: [],

    // Some classes used are not supported in Firefox 3.5.
    // Code executed under this condition should be removed when support for Firefox 3.5 is dropped
    legacyCode: (WMSInspector.Utils.compareFirefoxVersions(Application.version,"3.6") < 0),

    init: function(){

        //this.prefs = WMSInspector.Utils.getPrefs();
        
        //Set values from current preferences values
        //var versions = this.prefs.getCharPref("wmsversions").split("|");

        this.list = document.getElementById("wiServicesListbox");

        WMSInspector.DB.checkDB();
        
        if (WMSInspector.DB.conn == null){
            document.getElementById("wiLibraryDBError").setAttribute("style","visibility: visible");
            this.list.setAttribute("style","visibility: collapse");
            return;
        }


        //Build list
        //this.findServices("Australia server");
        //this.findServices("Birds");
        //this.findServices("woqqqqqqqqqqqqqqqqqq");
        //this.findServices("ma");
        //this.findServices();
        //var query = new WMSInspector.libraryQuery("ma",{tag: "World",kk:232, type: "WMS"});
        
        var params = new WMSInspector.libraryQueryParams("",{
            tags: [ "world","Check later"],
            kk:232,
            types: [ "WCS","WMS"]
        });
         var testQuery = new WMSInspector.libraryQuery(params,this.build)
        testQuery.query();
        
        /*
        var testQuery = new WMSInspector.libraryQuery(null,this.build);
        testQuery.query();
        */
    //this.build(testQuery.results);
        
    /*
        Components.utils.reportError(query.buildSQL());
        var query = new WMSInspector.libraryQuery("",{
            tags: [ "World"],
            kk:232,
            types: [ "WCS"]
        });
        Components.utils.reportError(query.buildSQL());
        var query = new WMSInspector.libraryQuery("",{
            
            kk:232,
            types: [ "WCS"]
        });
        Components.utils.reportError(query.buildSQL());
        var query = new WMSInspector.libraryQuery();
        Components.utils.reportError(query.buildSQL());
        */
    //TEST
    /*
        for (var i=0; i < 10; i++){
            favorite = ((Math.random().toFixed(2)*100) % 2 == 0);
            tags = ((Math.random().toFixed(2)*100) % 2 == 0) ? ["reference","INSPIRE","to order"] : false;
            this.addServiceRow(i,"Test service "+i,"http://test.com/OWS/"+i,"WMS",favorite,tags);
            
        }
        */

    },

    build: function(results){

        results = results || [];
        
        WMSInspector.Library.clearList();

        if (results.length){
            WMSInspector.Library.list.setAttribute("align","stretch");
            for (let i=0; i < results.length; i++){
                WMSInspector.Library.addServiceRow(results[i]);

            }
        } else{
            WMSInspector.Library.list.setAttribute("align","center");
            var label = document.createElement("label");
            label.setAttribute("value",WMSInspector.Utils.getString("wi_library_noservicesfound"));
            label.setAttribute("class","wiLibraryNoServicesFound");
            label.setAttribute("pack","center");
            WMSInspector.Library.list.appendChild(label);
        }
    },

    //Service should be a WMSInspector.libraryService object
    addServiceRow: function(service) {
        var item = document.createElement("richlistboxitem");
        item.setAttribute("class","libraryItem");
        item.serviceId = service.id;
        item.setAttribute("title", service.title);
        item.setAttribute("type", service.type);
        item.setAttribute("URL", service.URL);
        
        //Without the timeout, the created item methods are not found
        setTimeout(function(){
            if (service.tags) item.addTags(service.tags);
            item.setFavorite(service.favorite)
        },1);

        this.list.appendChild(item);
    },

    clearList: function(){
        while(this.list.firstChild) this.list.removeChild(this.list.firstChild);
    }
}

WMSInspector.libraryService = function(){
    this.id = "";
    this.title = "";
    this.URL = "";
    this.favorite = false;
    this.type = "";
    this.tags = [];
}

WMSInspector.libraryQueryParams = function(text,filters,sort,direction){
    this.text = text || "";
    this.filters = filters || {};
    this.sort = sort || ["creation_date"];
    this.direction = direction || "ASC";
}

WMSInspector.libraryQuery = function(params,callback){
    
    this.params = params || new WMSInspector.libraryQueryParams();
    this.callback = callback || null;

    this.results = [];

    this.sql = "";

    this.buildSQL = function(){
        var text = this.params.text;
        var filters = this.params.filters;
        var sort = this.params.sort;
        var direction = this.params.direction;

        this.sql = "";
        
        this.sql += "SELECT s.id AS id,s.title AS title,s.url AS url,s.favorite AS favorite,s.type AS type,s.tags AS tags";

        if (filters.tags){
            //Are we filtering by tags? If so, things are not so easy.
            this.sql += " FROM v_services s LEFT JOIN rel_services_tags r ON s.id=r.services_id LEFT JOIN tags t ON r.tags_id = t.id";
        } else {
            this.sql += " FROM v_services s";
        }
        
        var sqlWhere = "";
        if (text){
            sqlWhere = "s.title LIKE :text OR s.url LIKE :text OR s.tags LIKE :text";
        }

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

            if (sqlFilters.length) sqlWhere += (sqlWhere.length) ? " AND " + sqlFilters.join(" AND ") : sqlFilters.join(" AND ");
        }


        if (sqlWhere.length) this.sql += " WHERE " + sqlWhere;
        
        if (filters.tags) this.sql += " GROUP BY s.id";

        if (sort.length){
            var sqlSort = "";
            
            for (let i = 0; i < sort.length; i++){
                if (sort[i].toLowerCase() == "creation_date" ||
                    sort[i].toLowerCase() == "title"){
                    sqlSort += (sqlSort.length) ? "," : " ";
                    sqlSort += "s." + sort[i];
                }
            }
            if (sqlSort.length) {
                this.sql += " ORDER BY" + sqlSort;
                if (direction) this.sql += " " + direction;
            }

        }

        return this.sql;
    }

    this.query = function(){
        try{
            if (!this.sql) this.buildSQL();
            var text = this.params.text;
            var filters = this.params.filters;

            //Components.utils.reportError(this.sql);
            
            var statement = WMSInspector.DB.conn.createStatement(this.sql);

            if (WMSInspector.Library.legacyCode){
                // Asyncronous parameters binding is not supported in Firefox 3.5
                // This code should be removed when support for Firefox 3.5 is dropped

                if (text) statement.params.text = "%" + text + "%";

                if (filters.tags)
                    for (let i = 0; i < filters.tags.length; i++)
                    statement.params["tag"+i] = filters.tags[i];

                if (filters.types)
                    for (let i = 0; i < filters.tags.length; i++)
                    statement.params["type"+i] = filters.types[i];
  
            } else {
                var params = statement.newBindingParamsArray();
                var bp = params.newBindingParams();

                if (text) bp.bindByName("text", text);

                if (filters.tags)
                    for (let i = 0; i < filters.tags.length; i++)
                    bp.bindByName("tag"+i, filters.tags[i]);

                if (filters.types)
                    for (let i = 0; i < filters.tags.length; i++)
                    bp.bindByName("type"+i, filters.types[i]);
            
                params.addParams(bp);

                statement.bindParameters(params);
            }

            this.results = [];
               
            var self = this;
       
            statement.executeAsync({
                handleResult: function(resultSet) {

                    for (let row = resultSet.getNextRow();
                        row;
                        row = resultSet.getNextRow()) {

                        let service = new WMSInspector.libraryService();
                        service.id = row.getResultByName("id");
                        service.title = row.getResultByName("title");
                        service.URL = row.getResultByName("url");
                        service.favorite = (row.getResultByName("favorite") == 1);
                        service.type = row.getResultByName("type");
                        let tags = row.getResultByName("tags");
                        if (tags) service.tags = tags.split(",");

                        self.results.push(service);
                    }
                },

                handleError: function(error) {
                    Components.utils.reportError("WMSInspector - Error querying services view: " + error.message);
                },

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                        Components.utils.reportError("WMSInspector - Transaction aborted or canceled");

                    if (self.callback) self.callback(self.results);
                }
            });

        } catch (e) {
            Components.utils.reportError(e);
            Components.utils.reportError("WMSInspector - " + WMSInspector.DB.conn.lastErrorString);
            return false;
        }


    }


}