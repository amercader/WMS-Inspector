WI.OptionsDialog = {
    
    prefs: null,
    
    init: function(){

        this.prefs = WI.Utils.getPrefs();
        
        //Set values from current preferences values
        document.getElementById("wiHideContextMenu").checked = this.prefs.getBoolPref("hidecontextmenu");
        document.getElementById("wiEditorPath").value = this.prefs.getCharPref("editor");
    },

    selectEditor: function() {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var filePicker = WI.Utils.getInstance("@mozilla.org/filepicker;1",nsIFilePicker)

        filePicker.init(window, WI.Utils.getString("wi_options_chooseaneditor"), nsIFilePicker.modeOpen);
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
        
    }

}

