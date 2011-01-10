Components.utils.import("resource://wmsinspector/classes.js");
Components.utils.import("resource://wmsinspector/utils.js");

var AddServiceTypeDialog = {

    prefs: null,

    serviceType: false,

    init: function(){
        this.prefs = Utils.getPrefs();

        if (window.arguments[0]) this.serviceType = window.arguments[0].inn.serviceType;

        if (this.serviceType !== null){
            
            //Edit an existing service
            this.fetchDetails(this.serviceType);

            //Change dialog title
            document.title = Utils.getString("wi_addservicetype_editservicetypetitle");

        }

    },

    fetchDetails: function(serviceType){

        document.getElementById("wiAddServiceTypeName").value = serviceType.name;
        document.getElementById("wiAddServiceTypeTitle").value = serviceType.title;
        document.getElementById("wiAddServiceTypeDefault").value = serviceType.defaultVersion;
        document.getElementById("wiAddServiceTypeVersions").value = serviceType.versions.join(",");

    },


    
    onAccept: function(){

        var name = document.getElementById("wiAddServiceTypeName").value;
        var title = document.getElementById("wiAddServiceTypeTitle").value;
        var defaultVersion = document.getElementById("wiAddServiceTypeDefault").value;
        var versions = Utils.getValuesFromCSVTextbox(document.getElementById("wiAddServiceTypeVersions"));

        if (!name || !title || !defaultVersion || versions.length == 0){
            Utils.showAlert(Utils.getString("wi_fillallfields"));
            return false;
        } else {
            var exists = false;
            for (let i=0; i < versions.length; i++) {
                if (versions[i] == defaultVersion){
                    exists = true;
                    break;
                }
            }
            if (!exists){
                Utils.showAlert(Utils.getString("wi_addservicetype_defaultversionnotpresent"));
                return false;
            }
        }

        var serviceType = new Classes.ServiceType();

        serviceType.id = (AddServiceTypeDialog.serviceType) ? AddServiceTypeDialog.serviceType.id : null;
        serviceType.name = name;
        serviceType.title = title;
        serviceType.defaultVersion = defaultVersion;
        serviceType.versions = versions;

        window.arguments[0].out = {"serviceType": serviceType};

        return true;

    }
}
