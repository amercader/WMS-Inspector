
WMSInspector.AddServiceDialog = {
    Library : window.opener.WMSInspector.Library,

    serviceId: false,

    prefs: null,

    init: function(){
        this.prefs = WMSInspector.Utils.getPrefs();

        window.opener.WMSInspector.DB.checkDB();

        document.documentElement.getButton("accept").addEventListener(
            "command",
            WMSInspector.AddServiceDialog.onAccept, false);

        if (window.arguments) this.serviceId = window.arguments[0];

        if (!this.serviceId){
            //If no id provided, open dialog in add mode

            var version = false;

            if (window.arguments[1]) document.getElementById("wiAddServiceURL").value = window.arguments[1];
            if (window.arguments[2]) version = window.arguments[2];

            this.Library.fetchList("tags",document.getElementById("wiAddServiceTagsList"));
            this.Library.fetchList("types",document.getElementById("wiAddServiceTypeMenu"));

            //TODO: get versions from DB, and suitable ones for each service type
            // (also in GetCapabilities dialog)
            var versions = this.prefs.getCharPref("wmsversions").split("|");
            var defVersion = this.prefs.getCharPref("wmsversion");

            var menuList = document.getElementById("wiAddServiceVersionMenu");
            var item;

            for (var i=0; i < versions.length; i++){
                item = menuList.appendItem(versions[i],i);
                if ((version && (versions[i] == version)) || (!version && (versions[i] == defVersion)))  menuList.selectedItem = item;
            }


        } else {

        //Else, edit an existing service

        }

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

        var service = new window.opener.WMSInspector.libraryService();

        service.id = this.serviceId;
        service.title = document.getElementById("wiAddServiceTitle").value;
        service.URL = url;
        service.favorite = (document.getElementById("wiAddServiceFavorite").checked);
        service.version = document.getElementById("wiAddServiceVersionMenu").selectedItem.getAttribute("label");
        service.type = document.getElementById("wiAddServiceTypeMenu").selectedItem.getAttribute("value");

        var tags = WMSInspector.AddServiceDialog.getTagsFromTagField()
        if (tags) service.tags = tags;

        if (WMSInspector.AddServiceDialog.serviceId){
            WMSInspector.AddServiceDialog.Library.updateService(service);
        } else {
            WMSInspector.AddServiceDialog.Library.addService(service,WMSInspector.AddServiceDialog.Library.search);
        }

        window.close();
        return true;

    }
}
