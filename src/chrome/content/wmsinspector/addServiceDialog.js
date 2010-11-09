Components.utils.import("resource://wmsinspector/classes.js");
Components.utils.import("resource://wmsinspector/utils.js");

var AddServiceDialog = {

    serviceTypes:[],
    
    serviceId: false,

    prefs: null,

    wis: null,

    init: function(){

        // Get a WMSInspector service instance
        this.wis = Utils.getWMSInspectorService();

        this.prefs = Utils.getPrefs();

        var params = (window.arguments[0]) ? window.arguments[0].inn : false;

        var url, version = false;

        if (params){
            if (params.id) this.serviceId = params.id;
            url = (params.url) ? params.url : false;
            version = (params.version) ? params.version : false;

        }

        //Get tags from DB
        this.wis.getTags(function(tags){
            if (tags){
                var tagsList = document.getElementById("wiAddServiceTagsList");
                for (let i = 0; i < tags.length; i++){
                    let element = tagsList.appendItem(tags[i],tags[i]);
                    element.setAttribute("type", "checkbox");
                }
            }
        });

        //Get the service types and versions from the DB.
        this.wis.getServiceTypes(function(results){
            if (results){
                AddServiceDialog.serviceTypes = results;

                var typesList = document.getElementById("wiAddServiceTypeMenu");

                for (let i = 0;i<results.length;i++)
                    typesList.appendItem(results[i].name,results[i].name);
                typesList.selectedIndex = 0;

            }
        });
 
        if (!this.serviceId){
            //If no id provided, open dialog in add mode

            if (url) document.getElementById("wiAddServiceURL").value = url;
            if (version){
                var versionsList = document.getElementById("wiAddServiceVersionMenu");
                for (let i=0; i < versionsList.itemCount; i++){
                    let item = versionsList.getItemAtIndex(i);
                    if (item.getAttribute("label") == version) {
                        versionsList.selectedItem = item;
                        break;
                    }
                }
            }

        } else {
            //Else, edit an existing service

            //Change dialog title
            document.title = Utils.getString("wi_addservice_editservicetitle");

            //Get service details from DB
            var queryParams = new Classes.LibraryQueryParams(false,{
                ids:[this.serviceId]
            });
            var libraryQuery = new Classes.LibraryQuery(queryParams,this.fetchDetails)
            libraryQuery.query();

        }

    },

    setVersionsList: function(){
        
        var serviceTypes = AddServiceDialog.serviceTypes;
        var selectedType = document.getElementById("wiAddServiceTypeMenu").selectedItem.value;

        for (let i=0; i < serviceTypes.length; i++){
            if (serviceTypes[i].name == selectedType){
                var versionsList = document.getElementById("wiAddServiceVersionMenu");
                versionsList.removeAllItems()
                for (let j=0; j < serviceTypes[i].versions.length; j++){
                    versionsList.appendItem(serviceTypes[i].versions[j],serviceTypes[i].versions[j]);
                    if (serviceTypes[i].versions[j] == serviceTypes[i].defaultVersion)
                        versionsList.selectedIndex = j;
                }
                if (versionsList.selectedIndex == -1) versionsList.selectedIndex = 0;
                break;
            }
            
        }

    },

    fetchDetails: function(services){
        var service = services[0];
        document.getElementById("wiAddServiceURL").value = service.URL;
        document.getElementById("wiAddServiceTitle").value = service.title;


        var list = document.getElementById("wiAddServiceVersionMenu");
        for (let i=0; i < list.itemCount; i++){
            let item = list.getItemAtIndex(i);
            if (item.getAttribute("label") == service.version) {
                list.selectedItem = item;
                break;
            }
        }

        list = document.getElementById("wiAddServiceTypeMenu");
        for (let i=0; i < list.itemCount; i++){
            let item = list.getItemAtIndex(i);
            if (item.getAttribute("label") == service.type) {
                list.selectedItem = item;
                break;
            }
        }

        if (service.tags.length){
            list = document.getElementById("wiAddServiceTagsList");
            for (let i=0; i < list.getRowCount(); i++){
                let item = list.getItemAtIndex(i);
                let label = item.getAttribute("label");
                for (let j=0;j<service.tags.length;j++){

                    if (label == service.tags[j]) {
                        item.setAttribute("checked",true)
                        break;
                    }
                }

            }
            document.getElementById("wiAddServiceTags").value = service.tags.join(", ");
        }
        document.getElementById("wiAddServiceFavorite").setAttribute("checked",service.favorite)

    },

    redrawTagTextBox: function(){
        var tagsInTextBox = Utils.getValuesFromCSVTextbox(document.getElementById("wiAddServiceTags"));;

        var list = document.getElementById("wiAddServiceTagsList");
        
        for (let i=0; i < list.getRowCount(); i++){
            let item = list.getItemAtIndex(i);
            if (item.getAttribute("checked") == "true") {
                if (tagsInTextBox.indexOf(item.getAttribute("value")) == -1)
                    tagsInTextBox.push(item.getAttribute("value"));
            } else {
                let index = tagsInTextBox.indexOf(item.getAttribute("value"))
                if ( index != -1)
                    tagsInTextBox.splice(index,1);
            }
        }

        document.getElementById("wiAddServiceTags").value = tagsInTextBox.join(", ");
    },
    
    onAccept: function(){
        var url = document.getElementById("wiAddServiceURL").value;
        if (!Utils.checkURL(url)){
            Utils.showAlert(Utils.getString("wi_getcapabilities_nourl"));
            return false;
        }

        var service = new Classes.Service();

        service.id = AddServiceDialog.serviceId;
        service.title = document.getElementById("wiAddServiceTitle").value;
        service.URL = url;
        service.favorite = (document.getElementById("wiAddServiceFavorite").checked);
        service.version = document.getElementById("wiAddServiceVersionMenu").selectedItem.getAttribute("label");
        service.type = document.getElementById("wiAddServiceTypeMenu").selectedItem.getAttribute("value");

        var tags = Utils.getValuesFromCSVTextbox(document.getElementById("wiAddServiceTags"));
        if (tags) service.tags = tags;

        window.arguments[0].out = {"service": service};

        return true;

    }
}
