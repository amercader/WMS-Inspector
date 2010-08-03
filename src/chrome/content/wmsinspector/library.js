WMSInspector.Library = {
    
    prefs: null,

    list: null,
    
    services: [],

    //selectedServiceId: false,
    selectedService: null,

    confirmBeforeDelete: true,

    init: function(){

        this.prefs = WMSInspector.Utils.getPrefs();
        WMSInspector.Utils.setPreferenceObserver(this.prefs,this);
        
        this.confirmBeforeDelete = this.prefs.getBoolPref("libraryconfirmbeforedelete");

        this.list = document.getElementById("wiServicesListbox");

        WMSInspector.DB.checkDB();
        
        if (WMSInspector.DB.conn == null){
            document.getElementById("wiLibraryDBError").setAttribute("style","visibility: visible");
            this.list.setAttribute("style","visibility: collapse");
            return;
        }

        //Fetch lists with values from DB
        //When the last list is fetched, call the default query (all services)
        this.fetchList("tags",document.getElementById("wiLibraryTagsList"));
        
        //Add <All> option to service types list
        var typesList = document.getElementById("wiLibraryServiceTypeList");
        typesList.appendItem(WMSInspector.Utils.getString("wi_all"),0);
        this.fetchList("types",typesList,this.search);



    },
    setSelectedService: function(element){
        WMSInspector.Library.selectedService = new WMSInspector.libraryService();
        WMSInspector.Library.selectedService.id = element.serviceId;
        WMSInspector.Library.selectedService.URL = element.serviceURL;
        WMSInspector.Library.selectedService.type = element.serviceType;
        WMSInspector.Library.selectedService.version = element.serviceVersion;

        //Currently, only WMS are supported for HTML reports, so if it is a different type, we disable the context menu entry
        document.getElementById("wiLibraryContextMenuGetCapabilitiesReport").setAttribute("disabled", (element.serviceType != "WMS"));


        return WMSInspector.Library.selectedService;
    },
    onContextMenu: function(event){
        WMSInspector.Library.setSelectedService(event.target);
    },

    doContextMenuAction: function(mode,event){
        if (!WMSInspector.Library.selectedService) return false;

        var service = WMSInspector.Library.selectedService;

        switch (mode){
            case 1:
                //Copy URL
                var out = service.URL;
                var clipboardService = WMSInspector.Utils.getService("@mozilla.org/widget/clipboardhelper;1","nsIClipboardHelper");
                if (out && clipboardService) clipboardService.copyString(out);
                break;
            case 2:
                //Edit service
                WMSInspector.Library.openAddServiceDialog(service.id);
                break;
            case 3:
                //Delete service
                var deleteService = true;

                if (WMSInspector.Library.confirmBeforeDelete){
                    deleteService = false;
                    var check = {
                        value:false
                    };
                    var prompt = WMSInspector.Utils.showConfirm(WMSInspector.Utils.getString("wi_library_confirmdelete"),
                        false,
                        WMSInspector.Utils.getString("wi_dontaskagain"),
                        check);
                    if (prompt){
                        if (check.value === true){
                            WMSInspector.Library.confirmBeforeDelete = false;
                            //Save preference
                            WMSInspector.Library.prefs.setBoolPref("libraryconfirmbeforedelete",false);
                        }
                        deleteService = true;
                    }
                }

                if (deleteService) WMSInspector.Library.deleteService(service.id,WMSInspector.Library.search);

                break;
            case 4:
            case 5:
                // GetCapabilities request 
                // Currently, for HTML reports only WMS are supported

                let url = window.opener.WMSInspector.Overlay.getGetCapabilitiesURL(service.URL,service.type,service.version);
                if (mode == 4){
                    window.opener.WMSInspector.Overlay.requestGetCapabilities(url);
                } else if (mode == 5){
                    window.opener.WMSInspector.Overlay.requestDocument(url);
                }
                
                break;
            
                // GetCapabilities request (HTML report)

                break;
        }
        return true;
    },

    observe: function(subject,topic,data){

        if (topic == "nsPref:changed" && data == "libraryconfirmbeforedelete"){
            this.confirmBeforeDelete = this.prefs.getBoolPref("libraryconfirmbeforedelete");
        }
    },

    shutdown: function(){
        this.prefs.removeObserver("", this);
    },
    
    fetchList: function(type,list,callback){
        if (!type || !list) return false;

        var sql;
        if (type == "tags"){
            sql = "SELECT title AS name FROM tags ORDER BY title";
        } else if (type == "types"){
            sql = "SELECT name FROM service_type";
        } else {
            return false;
        }
        var statement = WMSInspector.DB.conn.createStatement(sql);
        statement.executeAsync({
            handleResult: function(resultSet) {
                for (let row = resultSet.getNextRow();
                    row;
                    row = resultSet.getNextRow()) {
                            
                    let name = row.getResultByName("name");
                    let element = list.appendItem(name,name);
                    if (type == "tags")
                        element.setAttribute("type", "checkbox");
                }
            },

            handleError: function(error) {
                Components.utils.reportError("WMSInspector - Error querying table (" + type + "): " + error.message);
            },

            handleCompletion: function(reason) {
                if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                    Components.utils.reportError("WMSInspector - Transaction aborted or canceled");
                    return false;
                }
                    
                if (type == "types")
                    list.selectedIndex = 0;

                if (callback)
                    callback();

                return true;
            }
        });
        return true;
    },

    searchText: function(text){
        //Get query parameters
        //Tags
        var list = document.getElementById("wiLibraryTagsList");
        var tags = [];

        for (let i = 0; i < list.getRowCount(); i++) {
            let item = list.getItemAtIndex(i);
            if (item.getAttribute("checked") == "true") tags.push(item.getAttribute("value"));
        }

        //Service type
        list = document.getElementById("wiLibraryServiceTypeList");
        var type = (list.selectedIndex != 0) ? [list.selectedItem.getAttribute("value")] : false;

        //Favorites first?
        var favsFirst = (document.getElementById("wiLibraryFavoritesFirst").getAttribute("checked"));
        var orderBy = (favsFirst) ? ["favorite"] : [];
        var direction = (favsFirst) ? ["DESC"] : [];

        //Order by
        orderBy.push(document.getElementById("wiLibraryOrderBy").selectedItem.getAttribute("value"));

        //Direction
        direction.push( (document.getElementById("wiLibraryDirectionAsc").selected === true) ? "ASC" : "DESC");

        var params = new WMSInspector.libraryQueryParams(
            text,
            {
                tags:(tags.length) ? tags : false,
                types:type
            },
            orderBy,
            direction);

        this.search(params)
    },

    searchTag: function(tag){
        var params = new WMSInspector.libraryQueryParams(false,{
            tags:[tag]
        });
        this.search(params)
    },

    search: function(params){

        var libraryQuery = new WMSInspector.libraryQuery(params,WMSInspector.Library.build)
        libraryQuery.query();
        
    },

    refresh: function(){
        this.searchText(document.getElementById("wiLibrarySearchFilter").getAttribute("value"));
    },

    restore: function(){
        //Clear filter text
        document.getElementById("wiLibrarySearchFilter").value = "";
        
        //Tags
        var list = document.getElementById("wiLibraryTagsList");
        for (let i = 0; i < list.getRowCount(); i++)
        list.getItemAtIndex(i).setAttribute("checked",false);

        //Service type
        document.getElementById("wiLibraryServiceTypeList").selectedIndex = 0;

        //Favorites first?
        document.getElementById("wiLibraryFavoritesFirst").setAttribute("checked",true);

        //Order by
        document.getElementById("wiLibraryOrderBy").selectedIndex = 0;

        //Direction
        document.getElementById("wiLibraryDirectionAsc").setAttribute("selected",false);
        document.getElementById("wiLibraryDirectionDesc").setAttribute("selected",true);

        //Show all services
        this.search()
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
        
        /*
         * Custom properties can be defined to avoid querying the DB when performing
         * actions over the service (copy, getcapabilities...)
         */

        item.serviceId = service.id;
        item.serviceURL = service.URL;
        item.serviceType = service.type;
        item.serviceVersion = service.version;
        item.setAttribute("title", service.title);
        item.setAttribute("type", service.type);
        item.setAttribute("URL", service.URL);
        item.setAttribute("context", "wiLibraryContextMenu");
        
        //Without the timeout, the created item methods are not found
        setTimeout(function(){
            if (service.tags) item.addTags(service.tags);
            item.setFavorite(service.favorite)
        },1);

        this.list.appendChild(item);
    },

    clearList: function(){
        while(this.list.firstChild) this.list.removeChild(this.list.firstChild);
    },

    toggleAdvancedSearch: function(){

        var box = document.getElementById("wiLibraryAdvancedSearch");
        var value = (box.getAttribute("collapsed") == "true");
        box.setAttribute("collapsed",!value);
        if (value && window.outerWidth < box.getBoundingClientRect().width){
            window.sizeToContent();
        }
        document.getElementById("wiLibraryAdvancedSearchLink").setAttribute("value",(value) ? WMSInspector.Utils.getString("wi_library_simplesearch") : WMSInspector.Utils.getString("wi_library_advancedsearch"));
    },

    openAddServiceDialog: function(id) {

        var dialog = window.openDialog(
            "chrome://wmsinspector/content/addServiceDialog.xul",
            "wiAddServiceDialog",
            "chrome,centerscreen",
            id // If a service id provided, dialog will be shown in edit mode
            );
        dialog.focus();
    },

    //Service should be a WMSInspector.libraryService object
    addService: function(service,callback){
        try{
            var sql = "INSERT INTO services \n\
                        (title,url,version,favorite,creation_date,service_type_id) \n\
                   VALUES \n\
                        (:title,:url,:version,:favorite,strftime('%s','now'),(SELECT id FROM service_type WHERE name = :type))";

            var statement = WMSInspector.DB.conn.createStatement(sql);
            
            WMSInspector.DB.bindParameters(statement,{
                "title": service.title,
                "url": service.URL,
                "version": service.version,
                "favorite": (service.favorite) ? "1" : "0",
                "type": service.type
            });

            statement.executeAsync({
                
                handleError: function(error) {
                    Components.utils.reportError("WMSInspector - Error inserting a new service: " + error.message);
                },

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                        Components.utils.reportError("WMSInspector - Transaction aborted or canceled");
                        return false;
                    }

                    var serviceId = WMSInspector.DB.conn.lastInsertRowID;
                    if (service.tags) {
                        WMSInspector.Library.setTags(serviceId,service.tags,callback);
                    } else {
                        if (callback) callback();
                    }

                    return true;
                }
            });

        } catch (e) {
            Components.utils.reportError(e);
            Components.utils.reportError("WMSInspector - " + WMSInspector.DB.conn.lastErrorString);
            return false;
        }
    },

    //Service should be a WMSInspector.libraryService object
    updateService: function(service,callback){
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
                sqlUpdate.push(" service_type_id = (SELECT id FROM service_type WHERE name = :type)");
                params.type = service.type
            }
            if (typeof(service.favorite) == "boolean") {
                sqlUpdate.push(" favorite = :favorite");
                params.favorite = (service.favorite) ? "1" :"0";
            }

            if (sqlUpdate.length == 0) return false;

            sqlUpdate.push(" update_date = strftime('%s','now')");

            sql += " SET " + sqlUpdate.join(",") + " WHERE id = :id";
            params.id = service.id;

            var statement = WMSInspector.DB.conn.createStatement(sql);

            WMSInspector.DB.bindParameters(statement,params);

            statement.executeAsync({

                handleError: function(error) {
                    Components.utils.reportError("WMSInspector - Error updating service: " + error.message);
                },

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                        Components.utils.reportError("WMSInspector - Transaction aborted or canceled");
                        return false;
                    }
                    if (service.tags.length) {
                        WMSInspector.Library.setTags(service.id,service.tags,callback);
                    } else {
                        if (callback) callback();
                    }

                    return true;
                }
            });
            
            return true;
        } catch (e) {
            Components.utils.reportError(e);
            Components.utils.reportError("WMSInspector - " + WMSInspector.DB.conn.lastErrorString);
            return false;
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
            var statement = WMSInspector.DB.conn.createStatement(sql);

            WMSInspector.DB.bindParameter(statement, "id", serviceId);

            statement.executeAsync({
                handleError: function(error) {
                    Components.utils.reportError("WMSInspector - Error deleting records from the rel_services_tags table: " + error.message);
                },

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                        Components.utils.reportError("WMSInspector - Transaction aborted or canceled");
                        return false;
                    }

                    //Check if tags exist and insert new ones if not
                    var tagIds = [];

                    for (let i = 0; i < tags.length; i ++){
                        let tagExists = false;
                        let selectSql = "SELECT id FROM tags WHERE title = :tag" + i;
                        let selectStatement = WMSInspector.DB.conn.createStatement(selectSql);

                        WMSInspector.DB.bindParameter(selectStatement, "tag"+i, tags[i]);

                        try {
                            
                            while (selectStatement.step()) {
                                //Tag already exists
                                tagExists = true;
                                tagIds.push(selectStatement.row.id)
                            }
                        }
                        finally {
                            selectStatement.reset();
                            if (!tagExists){
                                //Tag does not exist
                                let insertSql = "INSERT INTO tags (title) VALUES (:tag" + i+")";
                                let insertStatement = WMSInspector.DB.conn.createStatement(insertSql);

                                WMSInspector.DB.bindParameter(insertStatement, "tag"+i, tags[i]);

                                insertStatement.execute();
                                
                                //Get the id of the last inserted tag
                                tagIds.push(WMSInspector.DB.conn.lastInsertRowID);
                            }
                        }
                    }

                    if (tagIds.length){
                        //Insert records in the services-tags relationship table
                        var statements = [];

                        if (WMSInspector.DB.legacyCode){
                            for (let i = 0; i < tagIds.length; i ++){
                                let sql = "INSERT INTO rel_services_tags (services_id,tags_id) VALUES (:serviceid,:tagid" + i + ")";
                                let statement = WMSInspector.DB.conn.createStatement(sql);
                                let params = {};
                                params.serviceid = serviceId;
                                params["tag"+i] = tags[i];
                                WMSInspector.DB.bindParameters(statement,params);

                                statements.push(statement);
                            }
                        } else {
                            let sql = "INSERT INTO rel_services_tags (services_id,tags_id) VALUES (:serviceid,:tagid)";
                            let statement = WMSInspector.DB.conn.createStatement(sql);
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


                        WMSInspector.DB.conn.executeAsync(
                            statements,
                            statements.length,
                            {
                                handleError: function(error) {
                                    Components.utils.reportError("WMSInspector - Error inserting records in the rel_services_tags table: " + error.message);
                                },

                                handleCompletion: function(reason) {
                                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                                        Components.utils.reportError("WMSInspector - Transaction aborted or canceled");
                                        return false;
                                    }

                                    if (callback) callback();

                                    return true;
                                }
                            });
                    }
                    return true;
                }
            });
            return true;
        } catch (e) {
            Components.utils.reportError(e);
            Components.utils.reportError("WMSInspector - " + WMSInspector.DB.conn.lastErrorString);
            return false;
        }
    },

    deleteService: function(id,callback){
        try{
            if (typeof(id) != "number") return false;

            var sql = "DELETE FROM services WHERE id = :id";
            var statement = WMSInspector.DB.conn.createStatement(sql);

            WMSInspector.DB.bindParameters(statement,{
                id:id
            });

            statement.executeAsync({

                handleError: function(error) {
                    Components.utils.reportError("WMSInspector - Error deleting service: " + error.message);
                },

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED){
                        Components.utils.reportError("WMSInspector - Transaction aborted or canceled");
                        return false;
                    }
                    // The services_after_delete_trigger trigger will deal with the service's tags

                    if (callback) callback();
                    
                    return true;
                }
            });

            return true;
        } catch (e) {
            Components.utils.reportError(e);
            Components.utils.reportError("WMSInspector - " + WMSInspector.DB.conn.lastErrorString);
            return false;
        }
    }

}

WMSInspector.libraryService = function(){
    this.id = "";
    this.title = "";
    this.URL = "";
    this.version = "";
    this.favorite = false;
    this.type = "";
    this.tags = [];
}

WMSInspector.libraryQueryParams = function(text,filters,sorts,directions){
    this.text = text || "";
    this.filters = filters || {};
    this.sorts = sorts || ["favorite","creation_date"];
    this.directions = directions || ["DESC","DESC"];
}

WMSInspector.libraryQuery = function(params,callback){
    
    this.params = params || new WMSInspector.libraryQueryParams();
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
            sqlWhere = "s.title LIKE :text OR s.url LIKE :text OR s.tags LIKE :text";
        

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

            //Components.utils.reportError(this.sql);

            var statement = WMSInspector.DB.conn.createStatement(this.sql);
            
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

                WMSInspector.DB.bindParameters(statement,params);
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
                        service.version = row.getResultByName("version");
                        let tags = row.getResultByName("tags");
                        if (tags) service.tags = tags.split(",").sort();
                        

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