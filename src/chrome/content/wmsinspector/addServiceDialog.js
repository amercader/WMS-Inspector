Components.utils.import("resource://wmsinspector/classes.js");
Components.utils.import("resource://wmsinspector/utils.js");

var AddServiceDialog = {
    Library : window.opener.Library,

    serviceTypes:[],
    
    serviceId: false,

    prefs: null,

    init: function(){
        this.prefs = Utils.getPrefs();
        
        this.serviceTypes= (this.Library.serviceTypes.length) ? this.Library.serviceTypes : window.opener.WMSInspector.Overlay.serviceTypes;

        var params = (window.arguments[0]) ? window.arguments[0].inn : false;

        var url, version = false;

        if (params){
            if (params.id) this.serviceId = params.id;
            url = (params.url) ? params.url : false;
            version = (params.version) ? params.version : false;

        }

        this.Library.fetchList("tags",document.getElementById("wiAddServiceTagsList"));
        this.setServiceTypesList();
 
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
            var queryParams = new window.opener.Library.libraryQueryParams(false,{
                ids:[this.serviceId]
            });
            var libraryQuery = new window.opener.Library.libraryQuery(queryParams,this.fetchDetails)
            libraryQuery.query();

        }

    },

    setServiceTypesList: function(){

        var serviceTypesList = document.getElementById("wiAddServiceTypeMenu");
        for (let i=0; i < this.serviceTypes.length; i++){
            serviceTypesList.appendItem(this.serviceTypes[i].name,this.serviceTypes[i].name);
        }
        serviceTypesList.selectedIndex = 0;

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
