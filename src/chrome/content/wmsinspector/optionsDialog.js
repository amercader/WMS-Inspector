Components.utils.import("resource://wmsinspector/utils.js");

var OptionsDialog = {
    
    prefs: null,

    serviceTypes: [],

    init: function(){

        // Get a WMSInspector service instance
        this.wis = Utils.getService("@wmsinspector.flentic.net/wmsinspector-service;1").wrappedJSObject;

        this.prefs = Utils.getPrefs();
        

        document.getElementById("wiHideContextMenu").checked = this.prefs.getBoolPref("hidecontextmenu");
        
        document.getElementById("wiEditorPath").value = this.prefs.getCharPref("editor");

        document.getElementById("wiLibraryConfirmBeforeDelete").checked = this.prefs.getBoolPref("libraryconfirmbeforedelete");

        //Get the service types and versions from the DB.
        this.wis.getServiceTypes(function(results){
            if (results){
                OptionsDialog.serviceTypes = results;

                //Build service types tree
                OptionsDialog.buildServiceTypesTree();
            }
        });

    },

    buildServiceTypesTree: function(){

        var treeChildren = document.getElementById("wiServiceTypesTreeChildren");

        Utils.emptyElement(treeChildren);

        for (let i = 0; i < OptionsDialog.serviceTypes.length; i++){
            let serviceType = OptionsDialog.serviceTypes[i];
            let treeItem = document.createElement("treeitem");
            let treeRow = document.createElement("treerow");


            let treeCellName = document.createElement("treecell");
            treeCellName.setAttribute("value", serviceType.id);
            treeCellName.setAttribute("label", serviceType.name);
            treeRow.appendChild(treeCellName);

            let treeCellTitle = document.createElement("treecell");
            treeCellTitle.setAttribute("label", serviceType.title);
            treeRow.appendChild(treeCellTitle);

            let treeCellDefault = document.createElement("treecell");
            treeCellDefault.setAttribute("label", serviceType.defaultVersion);
            treeRow.appendChild(treeCellDefault);

            let treeCellVersions = document.createElement("treecell");
            treeCellVersions.setAttribute("label", serviceType.versions.join(","));
            treeRow.appendChild(treeCellVersions);

            treeItem.appendChild(treeRow);
            treeChildren.appendChild(treeItem);

        }


    },

    selectEditor: function() {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var filePicker = Utils.getInstance("@mozilla.org/filepicker;1",nsIFilePicker)

        filePicker.init(window, Utils.getString("wi_options_chooseaneditor"), nsIFilePicker.modeOpen);
        filePicker.appendFilters(nsIFilePicker.filterApps);

        var res = filePicker.show();
        if (res == nsIFilePicker.returnOK) {
            document.getElementById("wiEditorPath").value = filePicker.file.path;
        }
    },

    onAccept: function(){

        //Hide context menu
        this.prefs.setBoolPref("hidecontextmenu",(document.getElementById("wiHideContextMenu").checked === true));

        //Default editor
        this.prefs.setCharPref("editor",document.getElementById("wiEditorPath").value);

        //Ask before deleting one of the Library items
        this.prefs.setBoolPref("libraryconfirmbeforedelete",(document.getElementById("wiLibraryConfirmBeforeDelete").checked === true));
        
    },

    openAddServiceTypeDialog: function(id){

        var serviceType = null;
        if (id){
            //Get service type details
            for (let i = 0; i < this.serviceTypes.length;i++){
                if (this.serviceTypes[i].id == id) {
                    serviceType = this.serviceTypes[i];
                    break;
                }
            }
        }
        var params = {
            inn: {
                "serviceType": serviceType
            },
            out: false
        };

        window.openDialog(
            "chrome://wmsinspector/content/addServiceTypeDialog.xul",
            "wiAddServiceTypeDialog",
            "chrome,centerscreen,modal,dialog",
            params // If a service type id provided, dialog will be shown in edit mode
            ).focus();

        if (params.out.serviceType){
            if (params.out.serviceType.id){
                this.wis.updateServiceType(params.out.serviceType,this.refreshServiceTypeTree);
            } else {
                this.wis.addServiceType(params.out.serviceType,this.refreshServiceTypeTree);
            }
        }
    },
    
    doContextMenuAction: function(mode,event){
        var tree = document.getElementById("wiServiceTypesTree");

        var serviceTypeId = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('name'));

        switch (mode){
            case 1:
                //Edit service type
                OptionsDialog.openAddServiceTypeDialog(serviceTypeId);
                break;
            case 2:
                //Delete service type
                var prompt = Utils.showConfirm(Utils.getString("wi_options_confirmdeleteservicetype"));
                if (prompt){
                    OptionsDialog.wis.deleteServiceType(serviceTypeId,this.refreshServiceTypeTree);
                }
                break;
        }
        return true;
    },

    refreshServiceTypeTree: function(){
        // Refresh the service types array and the tree
        OptionsDialog.wis.getServiceTypes(function(results){
            if (results){
                OptionsDialog.serviceTypes = results;
                OptionsDialog.buildServiceTypesTree();
            }
        });
    }
}

