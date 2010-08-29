WMSInspector.Library = {
    
    prefs: null,

    list: null,

    serviceTypes: [],

    selectedService: null,

    confirmBeforeDelete: true,

    currentResults: [],

    minWidth: 760,

    init: function(){

        this.serviceTypes = window.opener.WMSInspector.Overlay.serviceTypes;

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
        this.fetchList("types",typesList,function (){WMSInspector.Library.onWindowReady()});

    },

    onWindowReady: function(){
        document.getElementById("wiLibraryTagsList")
            .addEventListener("command",WMSInspector.Library.refresh,true);
        document.getElementById("wiLibraryServiceTypeList")
            .addEventListener("select",WMSInspector.Library.refresh,true);
        document.getElementById("wiLibraryOrderBy")
            .addEventListener("select",WMSInspector.Library.refresh,true);
        document.getElementById("wiLibraryDirection")
            .addEventListener("select",WMSInspector.Library.refresh,true);
        document.getElementById("wiLibraryFavoritesFirst")
            .addEventListener("command",WMSInspector.Library.refresh,true);

        WMSInspector.Library.search();
    },
    
    setSelectedService: function(element){
        WMSInspector.Library.selectedService = new WMSInspectorClasses.Service();
        WMSInspector.Library.selectedService.id = element.serviceId;
        WMSInspector.Library.selectedService.URL = element.serviceURL;
        WMSInspector.Library.selectedService.type = element.serviceType;
        WMSInspector.Library.selectedService.version = element.serviceVersion;

        //Currently, only WMS are supported for HTML reports, so if it is a different type, we disable the context menu entry
        document.getElementById("wiLibraryContextMenuGetCapabilitiesReport").setAttribute("disabled", (element.serviceType != "WMS"));


        return WMSInspector.Library.selectedService;
    },

    onExportPopUpShowing: function(){
        document.getElementById("wiLibraryMenuExportSelection").setAttribute("disabled", !(WMSInspector.Library.currentResults.length > 0));
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

                if (deleteService) WMSInspector.Library.deleteService(service.id,WMSInspector.Library.onServiceOperationFinished);

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
        try{
            if (!type || !list) return false;

            var sql;
            if (type == "tags"){
                sql = "SELECT title AS name FROM tags ORDER BY title";
            } else if (type == "types"){
                sql = "SELECT name FROM service_types";
            } else {
                return false;
            }
            var statement = WMSInspector.DB.conn.createStatement(sql);
            statement.executeAsync({
                errorsFound: false,
                handleResult: function(resultSet) {
                    try{
                        for (let row = resultSet.getNextRow();
                            row;
                            row = resultSet.getNextRow()) {
                            
                            let name = row.getResultByName("name");
                            let element = list.appendItem(name,name);
                            if (type == "tags")
                                element.setAttribute("type", "checkbox");
                        }
                    } catch (error) {
                        this.errorsFound = true;
                        WMSInspector.Library.exceptionHandler(error);
                    }
                },

                //error is a mozIStorageError object
                handleError: function(error) {
                    WMSInspector.Library.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    try {
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspector.Library.exceptionHandler(new Error("Transaction aborted or canceled"));
                    
                        if (type == "types")
                            list.selectedIndex = 0;

                        if (callback)
                            callback(!this.errorsFound);

                        return true;
                    } catch (error){
                        WMSInspector.Library.exceptionHandler(error,callback);
                    }
                }
            });
            return true;
        } catch (error){
            return WMSInspector.Library.exceptionHandler(error,callback);
        }
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
        WMSInspector.Library.searchText(document.getElementById("wiLibrarySearchFilter").value);
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

    exportAll: function(){
        var libraryQuery = new WMSInspector.libraryQuery(null,this.exportToFile);
        libraryQuery.query();

    },

    exportCurrentSelection: function(){
        if (this.currentResults.length == 0) return false;
        return this.exportToFile(this.currentResults);
    },

    exportToFile: function(records){

        if (records.length == 0) return false;


        var file = WMSInspector.IO.pickFile(
            WMSInspector.Utils.getString("wi_library_exportprompttitle"),
            "save",
            [{
                title:"CSV files",
                filter:"*.csv"
            }],
            "csv",
            "wmsinspector.csv",
            null,
            window);
            
        if (!file) return false;
        
        WMSInspector.Library.toggleProgressMeter(WMSInspector.Utils.getString("wi_library_exporting"));

        var out = WMSInspector.Library.buildExportFile(records);

        WMSInspector.IO.write(file, out,"w",true);

        WMSInspector.Library.toggleProgressMeter();

        return true;

    },

    buildExportFile: function(records){
        if (records.length == 0) return false;
        var out = "";

        var separator = this.prefs.getCharPref("exportseparator");

        var columns = ["title","URL","type","version","favorite","tags"];
        out += columns.join(separator) + "\n";

        for (let i = 0; i < records.length; i++){
            let service = records[i];
            let line = ["\"" + service.title + "\"",
            "\"" + service.URL + "\"",
            "\"" + service.type + "\"",
            "\"" + service.version + "\"",
            (service.favorite) ? "1" : "0",
            "\"" + service.tags.join(",") + "\"",
            ];

            out += line.join(separator) + "\n";

        }
        
        return out;
    },

    importFromFile: function(){
        var file = WMSInspector.IO.pickFile(
            WMSInspector.Utils.getString("wi_library_importprompttitle"),
            "open",
            [{
                title:"CSV files",
                filter:"*.csv"
            }],
            "csv",
            false,
            null,
            window);
            
        if (!file) return false;


        WMSInspector.Library.toggleProgressMeter(WMSInspector.Utils.getString("wi_library_importing"));

        var contents = WMSInspector.IO.readLineByLine(file);
        
        if (!contents){
            Components.utils.reportError("WMS Inspector - Error reading file");
            return false;
        } 

        var wiService = WMSInspector.Utils.getService("@wmsinspector.flentic.net/wmsinspector-service;1").wrappedJSObject;

        wiService.importServicesFromCSV(contents,this,this.onServicesImported);
        return true;

    },

    onServiceOperationFinished: function(result){
        if (result === false){
            //Errors were found
            WMSInspector.Utils.showAlert(WMSInspector.Utils.getString("wi_anerroroccurred"));
        } else {
            //All went good, refresh the list
            WMSInspector.Library.search();
        }
    },

    onServicesImported: function(result){
        WMSInspector.Library.toggleProgressMeter();
        
        var msg = (result !== false) ?
        WMSInspector.Utils.getString("wi_library_importprompt").replace("%S",result) :
        WMSInspector.Utils.getString("wi_library_errorsinimport");

        WMSInspector.Utils.showAlert(msg);
        if (result !== false) WMSInspector.Library.search();
        return true;
    },
    
    build: function(results){

        WMSInspector.Library.currentResults = results;

        WMSInspector.Utils.emptyElement(WMSInspector.Library.list);
        var numServices = "";

        if (results === false || results.length == 0){
            WMSInspector.Library.list.setAttribute("align","center");
            var label = document.createElement("label");

            label.setAttribute("value",(results === false) ? WMSInspector.Utils.getString("wi_library_errorsinquery") : WMSInspector.Utils.getString("wi_library_noservicesfound"));
            label.setAttribute("class","wiLibraryNoServicesFound");
            label.setAttribute("pack","center");
            WMSInspector.Library.list.appendChild(label);

        } else if (results.length){
            WMSInspector.Library.list.setAttribute("align","stretch");
            for (let i=0; i < results.length; i++){
                WMSInspector.Library.addServiceRow(results[i]);

            }
            numServices = (results.length == 1) ? WMSInspector.Utils.getString("wi_library_serviceshown") : WMSInspector.Utils.getString("wi_library_servicesshown").replace("%S",results.length);
            
        } 

        document.getElementById("wiLibraryNumServices").setAttribute("value",numServices);
    },

    //Service should be a WMSInspectorClasses.Service object
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
    
    toggleAdvancedSearch: function(){

        var box = document.getElementById("wiLibraryAdvancedSearch");
        var value = (box.getAttribute("collapsed") == "true");
        box.setAttribute("collapsed",!value);
        if (value && window.outerWidth < WMSInspector.Library.minWidth)
            window.resizeTo(WMSInspector.Library.minWidth,window.outerHeight)
        document.getElementById("wiLibraryAdvancedSearchLink").setAttribute("value",(value) ? WMSInspector.Utils.getString("wi_library_simplesearch") : WMSInspector.Utils.getString("wi_library_advancedsearch"));
    },

    toggleProgressMeter: function(msg){
        var box = document.getElementById("wiLibraryProgressMeterBox");
        var value = (box.getAttribute("collapsed") == "true");
        if (value && msg) document.getElementById("wiLibraryProgressMeterLabel").setAttribute("value", msg);
        box.setAttribute("collapsed",!value);
        return true;
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

    // TODO: move to component
    //Service should be a WMSInspectorClasses.Service object
    addService: function(service,callback){
        try{

            // In asynchronous calls, it is not safe to rely on conn.lastInsertRowID,
            // so we build a unique hash to identify the record and be able to get its
            // id later on handleCompletion.
            // This is temporary until this code is migrated to the component and threaded

            var hash = WMSInspector.Utils.getHash(service.URL + service.type + new Date().getTime());
            var sql = "INSERT INTO services \n\
                        (title,url,version,favorite,creation_date,type,hash) \n\
                   VALUES \n\
                        (:title,:url,:version,:favorite,strftime('%s','now'),:type,:hash)";

            var statement = WMSInspector.DB.conn.createStatement(sql);

            WMSInspector.DB.bindParameters(statement,{
                "title": service.title,
                "url": service.URL,
                "version": service.version,
                "favorite": (service.favorite) ? "1" : "0",
                "type": service.type,
                "hash": hash
            });

            statement.executeAsync({
                //error is a mozIStorageError object
                handleError: function(error) {
                    WMSInspector.Library.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    try {
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspector.Library.exceptionHandler(new Error("Transaction aborted or canceled"));

                        // We need to get the inserted service id, and as it's not safe to rely on
                        // conn.lastInsertRowID, we need to select the record with the previously generated
                        // hash. This is temporary until this code is migrated to the component and threaded

                        let sql = "SELECT id FROM services WHERE hash = :hash";
                        let selectStatement = WMSInspector.DB.conn.createStatement(sql);
                        WMSInspector.DB.bindParameter(selectStatement, "hash", hash);

                        selectStatement.executeAsync({
                            serviceId:false,

                            handleResult: function(resultSet) {
                                let row = resultSet.getNextRow();
                                this.serviceId = row.getResultByName("id");
                            },

                            //error is a mozIStorageError object
                            handleError: function(error) {
                                WMSInspector.Library.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                            },

                            handleCompletion: function(reason) {
                                try {
                                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                        return WMSInspector.Library.exceptionHandler("Transaction aborted or canceled",callback);


                                    if (service.tags && service.tags.length) {
                                        WMSInspector.Library.setTags(this.serviceId,service.tags,callback);
                                    } else {
                                        if (callback) callback(this.serviceId);
                                    }
                            
                                    return true;
                                } catch (error) {
                                    WMSInspector.Library.exceptionHandler(error,callback);
                                }
                            }
                        });

                        return true;

                    } catch (error) {
                        WMSInspector.Library.exceptionHandler(error,callback);
                    }
                }
            });

            return true;

        } catch (error) {
            WMSInspector.Library.exceptionHandler(error,callback);
        }
    },

    // TODO: move to component
    //Service should be a WMSInspectorClasses.Service object
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
                sqlUpdate.push(" type = :type");
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

                //error is a mozIStorageError object
                handleError: function(error) {
                    WMSInspector.Library.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    try{
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspector.Library.exceptionHandler(new Error("Transaction aborted or canceled"));

                        if (service.tags && service.tags.length) {
                            WMSInspector.Library.setTags(service.id,service.tags,callback);
                        } else {
                            if (callback) callback(service.id);
                        }

                        return true;
                    } catch (error){
                        WMSInspector.Library.exceptionHandler(error,callback);
                    }
                }
            });
            
            return true;
        } catch (error) {
            WMSInspector.Library.exceptionHandler(error,callback);
        }
    },

    /*
     * 1 - Delete previous tags from service
     * 2 - For each tag, check if exists
     *      - If exists, save the id
     *      - If not, insert tag and get new id
     * 3 - Insert records in rel_services_tag table
     */
    // TODO: move to component
    setTags: function(serviceId,tags,callback){

        try {
            if (typeof(serviceId) != "number" || tags.length < 0) return false;

            //Delete previous tags from service
            var sql = "DELETE FROM rel_services_tags WHERE services_id = :id";
            var statement = WMSInspector.DB.conn.createStatement(sql);

            WMSInspector.DB.bindParameter(statement, "id", serviceId);

            statement.executeAsync({

                //error is a mozIStorageError object
                handleError: function(error) {
                    WMSInspector.Library.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    try{
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspector.Library.exceptionHandler(new Error("Transaction aborted or canceled"));

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
                                try{
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
                                } catch (error) {
                                    WMSInspector.Library.exceptionHandler(error,callback);
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
                                    params["tagid"+i] = tagIds[i];
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

                                    //error is a mozIStorageError object
                                    handleError: function(error) {
                                        WMSInspector.Library.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                                    },

                                    handleCompletion: function(reason) {
                                        try{
                                            if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                                return WMSInspector.Library.exceptionHandler(new Error("Transaction aborted or canceled"));

                                            if (callback) callback(serviceId);

                                            return true;
                                        } catch (error){
                                            WMSInspector.Library.exceptionHandler(error,callback);
                                        }
                                    }
                                });
                        }
                        return true;
                    } catch (error) {
                        WMSInspector.Library.exceptionHandler(error,callback);
                    }
                }
            });
            return true;
        } catch (error) {
            WMSInspector.Library.exceptionHandler(error,callback);
        }
    },

    // TODO: move to component
    deleteService: function(id,callback){
        try{
            if (typeof(id) != "number") return false;

            var sql = "DELETE FROM services WHERE id = :id";
            var statement = WMSInspector.DB.conn.createStatement(sql);

            WMSInspector.DB.bindParameters(statement,{
                id:id
            });

            statement.executeAsync({

                //error is a mozIStorageError object
                handleError: function(error) {
                    WMSInspector.Library.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    try{
                        if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                            return WMSInspector.Library.exceptionHandler(new Error("Transaction aborted or canceled"));

                        // The services_after_delete_trigger trigger will deal with the service's tags

                        if (callback) callback();
                    
                        return true;
                    } catch (error){
                        WMSInspector.Library.exceptionHandler(error,callback);
                    }
                }
            });

            return true;
        } catch (error) {
            WMSInspector.Library.exceptionHandler(error,callback);
        }
    },

    exceptionHandler: function(error,callback){

        var msg = "WMSInspector - " + error.message;
        if (WMSInspector.DB.conn.lastErrorString && WMSInspector.DB.conn.lastErrorString != "not an error")
            msg += " - " + WMSInspector.DB.conn.lastErrorString;
        msg += " (line " + error.lineNumber + ")"
        Components.utils.reportError(msg);

        if (callback) callback(false);
        return false;
    }

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
                errorsFound: false,
                handleResult: function(resultSet) {
                    try{
                        for (let row = resultSet.getNextRow();
                            row;
                            row = resultSet.getNextRow()) {

                            let service = new WMSInspectorClasses.Service();
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
                    self.exceptionHandler(new Error(error.message +" [" + error.result +"]"),callback);
                },

                handleCompletion: function(reason) {
                    if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                        return self.exceptionHandler(new Error("Transaction aborted or canceled"));

                    if (self.callback) 
                        self.callback((this.errorsFound) ? false : self.results);
                    
                    return true;
                }
            });

        } catch (error) {
            return this.exceptionHandler(error);
        }


    },


    this.exceptionHandler = function(error){
        var msg = "WMSInspector - " + error.message;
        if (WMSInspector.DB.conn.lastErrorString && WMSInspector.DB.conn.lastErrorString != "not an error")
            msg += " - " + WMSInspector.DB.conn.lastErrorString;
        msg += " (line " + error.lineNumber + ")"
        Components.utils.reportError(msg);

        if (this.callback) this.callback(false);
        return false;
    }


}