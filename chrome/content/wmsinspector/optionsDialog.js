WI.OptionsDialog = {
    
    prefs: null,
    
    init: function(){

        //TODO: select tab if recevied window.arguments[0]

        this.prefs = WI.Utils.getPrefs();

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

        //Default editor
        var path = document.getElementById("wiEditorPath").value;
        if (path){
            this.prefs.setCharPref("editor",path);
        }
    }

}

