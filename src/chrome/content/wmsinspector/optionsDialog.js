var OptionsDialog = {
    
    prefs: null,

    serviceTypes: window.opener.WMSInspector.Overlay.serviceTypes,

    init: function(){

        this.prefs = WMSInspector.Utils.getPrefs();
        

        document.getElementById("wiHideContextMenu").checked = this.prefs.getBoolPref("hidecontextmenu");
        
        document.getElementById("wiEditorPath").value = this.prefs.getCharPref("editor");

        document.getElementById("wiLibraryConfirmBeforeDelete").checked = this.prefs.getBoolPref("libraryconfirmbeforedelete");

        //Build service types tree
        this.buildServiceTypesTree();
    },

    buildServiceTypesTree: function(){

        var treeChildren = document.getElementById("wiServiceTypesTreeChildren");

        WMSInspector.Utils.emptyElement(treeChildren);

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
        var filePicker = WMSInspector.Utils.getInstance("@mozilla.org/filepicker;1",nsIFilePicker)

        filePicker.init(window, WMSInspector.Utils.getString("wi_options_chooseaneditor"), nsIFilePicker.modeOpen);
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
        var dialog = window.openDialog(
            "chrome://wmsinspector/content/addServiceTypeDialog.xul",
            "wiAddServiceTypeDialog",
            "chrome,centerscreen",
            id // If a service type id provided, dialog will be shown in edit mode
            );
        dialog.focus();
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
                var prompt = WMSInspector.Utils.showConfirm(WMSInspector.Utils.getString("wi_options_confirmdeleteservicetype"));
                if (prompt){

                    OptionsDialog.deleteServiceType(serviceTypeId);
                }
                break;

        }
        return true;
    },

    addServiceType: function(serviceType){
        window.opener.WMSInspector.Overlay.addServiceType(serviceType,this.refreshServiceTypeTree);
    },

    updateServiceType: function(serviceType){
        window.opener.WMSInspector.Overlay.updateServiceType(serviceType,this.refreshServiceTypeTree);
    },

    deleteServiceType: function(serviceTypeId){

        window.opener.WMSInspector.Overlay.deleteServiceType(serviceTypeId,this.refreshServiceTypeTree);
    },

    refreshServiceTypeTree: function(serviceTypes){
        OptionsDialog.serviceTypes = serviceTypes;
        OptionsDialog.buildServiceTypesTree();
    }

}

