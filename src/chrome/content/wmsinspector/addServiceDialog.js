
WMSInspector.AddServiceDialog = {
    Library : window.opener.WMSInspector.Library,

    serviceTypes:[],
    
    serviceId: false,

    prefs: null,

    init: function(){
        this.prefs = WMSInspector.Utils.getPrefs();
        
        this.serviceTypes= (this.Library.serviceTypes.length) ? this.Library.serviceTypes : window.opener.WMSInspector.Overlay.serviceTypes;
        
        document.documentElement.getButton("accept").addEventListener(
            "command",
            WMSInspector.AddServiceDialog.onAccept, false);

        if (window.arguments) this.serviceId = window.arguments[0];

        this.Library.fetchList("tags",document.getElementById("wiAddServiceTagsList"));
        this.setServiceTypesList();
 
        if (!this.serviceId){
            //If no id provided, open dialog in add mode

            if (window.arguments[1]) document.getElementById("wiAddServiceURL").value = window.arguments[1];
            var version = window.arguments[2];
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
            document.title = WMSInspector.Utils.getString("wi_addservice_editservicetitle");

            //Get service details from DB
            var params = new window.opener.WMSInspector.libraryQueryParams(false,{
                ids:[this.serviceId]
            });
            var libraryQuery = new window.opener.WMSInspector.libraryQuery(params,this.fetchDetails)
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
        
        var serviceTypes = WMSInspector.AddServiceDialog.serviceTypes;
        var selectedType = document.getElementById("wiAddServiceTypeMenu").selectedItem.value;

        for (let i=0; i < serviceTypes.length; i++){
            if (serviceTypes[i].name == selectedType){
                var versionsList = document.getElementById("wiAddServiceVersionMenu");
                versionsList.removeAllItems()
                for (let j=0; j < serviceTypes[i].versions.length; j++){
                    versionsList.appendItem(serviceTypes[i].versions[j],serviceTypes[i].versions[j]);
                    if (serviceTypes[i].versions[j] == serviceTypes[i].defaultversion)
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
        var tagsInTextBox = this.getTagsFromTagField();

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
    
    //http://mxr.mozilla.org/mozilla-central/source/browser/components/places/content/editBookmarkOverlay.js#1006
    getTagsFromTagField: function() {
        // we don't require the leading space (after each comma)
        var tags = document.getElementById("wiAddServiceTags").value.split(",");
        for (var i=0; i < tags.length; i++) {
            // remove trailing and leading spaces
            tags[i] = tags[i].replace(/^\s+/, "").replace(/\s+$/, "");

            // remove empty entries from the array.
            if (tags[i] == "") {
                tags.splice(i, 1);
                i--;
            }
        }
        return tags;
    },
    
    onAccept: function(){
        var url = document.getElementById("wiAddServiceURL").value;
        if (!WMSInspector.Utils.checkURL(url)){
            WMSInspector.Utils.showAlert(WMSInspector.Utils.getString("wi_getcapabilities_nourl"));
            return false;
        }

        var service = new WMSInspectorClasses.Service();

        service.id = WMSInspector.AddServiceDialog.serviceId;
        service.title = document.getElementById("wiAddServiceTitle").value;
        service.URL = url;
        service.favorite = (document.getElementById("wiAddServiceFavorite").checked);
        service.version = document.getElementById("wiAddServiceVersionMenu").selectedItem.getAttribute("label");
        service.type = document.getElementById("wiAddServiceTypeMenu").selectedItem.getAttribute("value");

        var tags = WMSInspector.AddServiceDialog.getTagsFromTagField()
        if (tags) service.tags = tags;

        //If the dialog was called from the Library window, refresh the services list after adding or updating
        //the service
        var callback = (window.opener.name == "wiLibrary") ? WMSInspector.AddServiceDialog.Library.onServiceOperationFinished : null;

        if (WMSInspector.AddServiceDialog.serviceId){
            //Update an existing service
            WMSInspector.AddServiceDialog.Library.updateService(service,callback);
        } else {
            //Add a new service to Library
            WMSInspector.AddServiceDialog.Library.addService(service,callback);
        }

        window.close();
        return true;

    }
}
