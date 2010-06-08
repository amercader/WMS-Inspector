WMSInspector.OptionsDialog = {
    
    prefs: null,
    
    init: function(){

        this.prefs = WMSInspector.Utils.getPrefs();
        
        //Set values from current preferences values
        var versions = this.prefs.getCharPref("wmsversions").split("|");
        var defVersion = this.prefs.getCharPref("wmsversion");

        var menuList = document.getElementById("wiVersionMenu");
        var item;

        for (var i=0; i < versions.length; i++){
            item = menuList.appendItem(versions[i],i);
            if (versions[i] == defVersion)  menuList.selectedItem = item;
        }

        document.getElementById("wiHideContextMenu").checked = this.prefs.getBoolPref("hidecontextmenu");
        document.getElementById("wiEditorPath").value = this.prefs.getCharPref("editor");
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

        //Default WMS version
        this.prefs.setCharPref("wmsversion",document.getElementById("wiVersionMenu").selectedItem.getAttribute("label"));

        //Hide context menu
        this.prefs.setBoolPref("hidecontextmenu",(document.getElementById("wiHideContextMenu").checked === true));

        //Default editor
        this.prefs.setCharPref("editor",document.getElementById("wiEditorPath").value);
        
    }

}

