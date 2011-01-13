Components.utils.import("resource://wmsinspector/classes.js");
Components.utils.import("resource://wmsinspector/utils.js");
Components.utils.import("resource://wmsinspector/db.js");
Components.utils.import("resource://wmsinspector/io.js");
Components.utils.import("resource://wmsinspector/log.js");

var Library = {

    prefs: null,

    list: null,

    serviceTypes: [],

    selectedService: null,

    confirmBeforeDelete: true,

    currentResults: [],

    minWidth: 760,

    wis: null,

    init: function(){

        // Get a WMSInspector service instance
        this.wis = Utils.getWMSInspectorService();

        this.prefs = Utils.getPrefs();
        Utils.setPreferenceObserver(this.prefs,this);

        this.confirmBeforeDelete = this.prefs.getBoolPref("libraryconfirmbeforedelete");

        this.list = document.getElementById("wiServicesListbox");

        DB.checkDB();

        if (DB.conn == null){
            document.getElementById("wiLibraryDBError").setAttribute("style","visibility: visible");
            this.list.setAttribute("style","visibility: collapse");
            return;
        }

        //Get tags from DB
        this.wis.getTags(function(tags){
            if (tags){
                var tagsList = document.getElementById("wiLibraryTagsList");
                for (let i = 0; i < tags.length; i++){
                    let element = tagsList.appendItem(tags[i],tags[i]);
                    element.setAttribute("type", "checkbox");
                }
            }
        });

        //Get the service types and versions from the DB and call onWindowReady
        this.wis.getServiceTypes(function(results){
            if (results){
                Library.serviceTypes = results;

                var typesList = document.getElementById("wiLibraryServiceTypeList");

                typesList.appendItem(Utils.getString("wi_all"),0);
                for (let i = 0;i<results.length;i++)
                    typesList.appendItem(results[i].name,results[i].name);
                typesList.selectedIndex = 0;

                Library.onWindowReady()
            }
        });


        //this.fetchList("types",typesList,function (){Library.onWindowReady()});

    },

    onWindowReady: function(){
        document.getElementById("wiLibraryTagsList")
            .addEventListener("command",Library.refresh,true);
        document.getElementById("wiLibraryServiceTypeList")
            .addEventListener("select",Library.refresh,true);
        document.getElementById("wiLibraryOrderBy")
            .addEventListener("select",Library.refresh,true);
        document.getElementById("wiLibraryDirection")
            .addEventListener("select",Library.refresh,true);
        document.getElementById("wiLibraryFavoritesFirst")
            .addEventListener("command",Library.refresh,true);

        Library.search();
    },

    setSelectedService: function(element){
        Library.selectedService = new Classes.Service();
        Library.selectedService.id = element.serviceId;
        Library.selectedService.URL = element.serviceURL;
        Library.selectedService.type = element.serviceType;
        Library.selectedService.version = element.serviceVersion;

        //Currently, only WMS are supported for HTML reports, so if it is a different type, we disable the context menu entry
        document.getElementById("wiLibraryContextMenuGetCapabilitiesReport").setAttribute("disabled", (element.serviceType != "WMS"));


        return Library.selectedService;
    },

    onExportPopUpShowing: function(){
        document.getElementById("wiLibraryMenuExportSelection").setAttribute("disabled", !(Library.currentResults.length > 0));
    },

    onContextMenu: function(event){
        Library.setSelectedService(event.target);
    },

    doContextMenuAction: function(mode,event){
        if (!Library.selectedService) return false;

        var service = Library.selectedService;

        switch (mode){
            case 1:
                //Copy URL
                var out = service.URL;
                var clipboardService = Utils.getService("@mozilla.org/widget/clipboardhelper;1","nsIClipboardHelper");
                if (out && clipboardService) clipboardService.copyString(out);
                break;
            case 2:
                //Edit service
                Library.openAddServiceDialog(service.id);
                break;
            case 3:
                //Delete service
                var deleteService = true;

                if (Library.confirmBeforeDelete){
                    deleteService = false;
                    var check = {
                        value:false
                    };
                    var prompt = Utils.showConfirm(Utils.getString("wi_library_confirmdelete"),
                        false,
                        Utils.getString("wi_dontaskagain"),
                        check);
                    if (prompt){
                        if (check.value === true){
                            Library.confirmBeforeDelete = false;
                            //Save preference
                            Library.prefs.setBoolPref("libraryconfirmbeforedelete",false);
                        }
                        deleteService = true;
                    }
                }

                //if (deleteService) Library.deleteService(service.id,Library.onServiceOperationFinished);
                if (deleteService) Library.wis.deleteService(service.id,Library.onServiceOperationFinished);

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

        var params = new Classes.LibraryQueryParams(
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
        var params = new Classes.LibraryQueryParams(false,{
            tags:[tag]
        });
        this.search(params)
    },

    search: function(params){
        var libraryQuery = new Classes.LibraryQuery(params,Library.build)
        libraryQuery.query();

    },

    refresh: function(){
        Library.searchText(document.getElementById("wiLibrarySearchFilter").value);
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
        var libraryQuery = new Classes.LibraryQuery(null,this.exportToFile);
        libraryQuery.query();

    },

    exportCurrentSelection: function(){
        if (this.currentResults.length == 0) return false;
        return this.exportToFile(this.currentResults);
    },

    exportToFile: function(records){

        if (records.length == 0) return false;


        var file = IO.pickFile(
            Utils.getString("wi_library_exportprompttitle"),
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

        Library.toggleProgressMeter(Utils.getString("wi_library_exporting"));

        var out = Library.buildExportFile(records);

        IO.write(file, out,"w",true);

        Library.toggleProgressMeter();

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
            (service.tags && service.tags.length) ? "\"" + service.tags.join(",") + "\"" : "\"\"",
            ];

            out += line.join(separator) + "\n";

        }

        return out;
    },

    importFromFile: function(){
        var file = IO.pickFile(
            Utils.getString("wi_library_importprompttitle"),
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


        Library.toggleProgressMeter(Utils.getString("wi_library_importing"));

        var contents = IO.readLineByLine(file);

        if (!contents){
            Log.warn("Error reading file (" + file.path + ")")
            return false;
        }

        var separator = this.prefs.getCharPref("exportseparator");

        Library.wis.importServicesFromCSV(contents,separator,this.onServicesImported);
        
        return true;

    },

    onServiceOperationFinished: function(result){
        if (result === false){
            //Errors were found
            Utils.showAlert(Utils.getString("wi_anerroroccurred"));
        } else {
            //All went good, refresh the list
            Library.search();
        }
    },

    onServicesImported: function(result){
        Library.toggleProgressMeter();

        var msg = (result !== false) ?
        Utils.getString("wi_library_importprompt").replace("%S",result) :
        Utils.getString("wi_library_errorsinimport");

        Utils.showAlert(msg);
        if (result !== false) Library.search();
        return true;
    },

    build: function(results){

        Library.currentResults = results;

        Utils.emptyElement(Library.list);
        var numServices = "";

        if (results === false || results.length == 0){
            Library.list.setAttribute("align","center");
            var label = document.createElement("label");

            label.setAttribute("value",(results === false) ? Utils.getString("wi_library_errorsinquery") : Utils.getString("wi_library_noservicesfound"));
            label.setAttribute("class","wiLibraryNoServicesFound");
            label.setAttribute("pack","center");
            Library.list.appendChild(label);

        } else if (results.length){
            Library.list.setAttribute("align","stretch");
            for (let i=0; i < results.length; i++){
                Library.addServiceRow(results[i]);

            }
            numServices = (results.length == 1) ? Utils.getString("wi_library_serviceshown") : Utils.getString("wi_library_servicesshown").replace("%S",results.length);

        }

        document.getElementById("wiLibraryNumServices").setAttribute("value",numServices);
    },

    //Service should be a Classes.Service object
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
        if (value && window.outerWidth < Library.minWidth)
            window.resizeTo(Library.minWidth,window.outerHeight)
        document.getElementById("wiLibraryAdvancedSearchLink").setAttribute("value",(value) ? Utils.getString("wi_library_simplesearch") : Utils.getString("wi_library_advancedsearch"));
    },

    toggleProgressMeter: function(msg){
        var box = document.getElementById("wiLibraryProgressMeterBox");
        var value = (box.getAttribute("collapsed") == "true");
        if (value && msg) document.getElementById("wiLibraryProgressMeterLabel").setAttribute("value", msg);
        box.setAttribute("collapsed",!value);
        return true;
    },

    openAddServiceDialog: function(id) {

        var params = { inn: { id: id }, out: false };

        window.openDialog(
            "chrome://wmsinspector/content/addServiceDialog.xul",
            "wiAddServiceDialog",
            "chrome,centerscreen,modal,dialog",
            params // If a service id provided, dialog will be shown in edit mode
            ).focus();

        if (params.out.service){
            if (params.out.service.id){
                this.wis.updateService(params.out.service,this.onServiceOperationFinished);
            } else {
                this.wis.addService(params.out.service,this.onServiceOperationFinished);
            }
        }

    }

}
