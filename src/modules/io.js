Components.utils.import("resource://wmsinspector/utils.js");

var EXPORTED_SYMBOLS = ["IO"];

var IO = {
    //Folder name for WMSInspector stuff in Temporary dir
    tempDirName: "wmsinspector",

    //Folder name for WMSInspector stuff in Profile dir
    profileDirName: "wmsinspector",

    //Naming template for temporary files
    tempFileName: "wi_",

    //Default permissions for new temporary files
    tempFilesPermissions: 0666,

    //Permissions for new directories
    tempDirPermissions: 0755,

    fileCounter:0,

    externalAppService: Utils.getService("@mozilla.org/uriloader/external-helper-app-service;1", "nsPIExternalAppLauncher"),

    directoryService: Utils.getService("@mozilla.org/file/directory_service;1", "nsIProperties"),


    checkWITmpDir: function(){
        var dir = this.getTmpDir();
        return this.checkDir(dir);
    },

    checkWIProfileDir: function(){
        var dir = this.getProfileDir();
        return this.checkDir(dir);
    },

    checkDir: function(dir){
        if (dir){
            // If dir doesn't exist, create it
            if( !dir.exists() || !dir.isDirectory() ) {
                dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, this.tempDirPermissions);
            }

            return dir;
        }
        return false;
    },

    getTmpDir: function(){
        var dir = this.getDir("TmpD");
        if (dir) dir.append(this.tempDirName);
        return dir;
    },

    getProfileDir: function(){
        var dir = this.getDir("ProfD");
        if (dir) dir.append(this.profileDirName);
        return dir;
    },

    getDefaultsDir: function(){
        var dir = this.getDir("ProfD");
        if (dir) dir.append("extensions");
        if (dir) dir.append(Utils.extensionId);
        if (dir) dir.append("defaults");
        return dir;
    },

    getDir: function(dirCode){
        dirCode = dirCode || "TmpD";
        if (this.directoryService)
            return this.directoryService.get(dirCode, Components.interfaces.nsIFile);
        return false;
    },

    deleteTemporaryFileOnExit: function(file) {
        if (this.externalAppService)
            return this.externalAppService.deleteTemporaryFileOnExit(file);

        return false;

    },

    getTmpFileName: function(extension){
        extension = (extension || "tmp");
        this.fileCounter++;
        return this.tempFileName + this.fileCounter + "." + extension;
    },

    createTmpFile: function(name, deleteOnExit){
        var file = this.checkWITmpDir();
        if (file){
            name = name || "wmsinspector";
            file.append(name);
            file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, this.tempFilesPermissions);
            if(deleteOnExit !== false){
                this.deleteTemporaryFileOnExit(file)
            }
            return file
        }
        return false;
    },

    write: function(file,data,mode,encode){

        var foStream = Utils.getInstance("@mozilla.org/network/file-output-stream;1", "nsIFileOutputStream");

        if (mode == "a"){   //Append
            foStream.init(file, 0x02 | 0x10, this.tempFilesPermissions, 0);
        } else {    //Create
            foStream.init(file, 0x02 | 0x08 | 0x20, this.tempFilesPermissions, 0);
        }

        if (encode){
            //Convert data to UTF-8
            //TODO: parametrize?
            var converter = Utils.getInstance("@mozilla.org/intl/converter-output-stream;1","nsIConverterOutputStream");
            converter.init(foStream, "UTF-8", 0, 0);
            converter.writeString(data);
            converter.close(); // this closes foStream
        } else {
            foStream.write(data, data.length);
            foStream.close();
        }

        return file;
    },

    read: function(file){

        var data = "";
        var fstream = Utils.getInstance("@mozilla.org/network/file-input-stream;1", "nsIFileInputStream");
        var cstream = Utils.getInstance("@mozilla.org/intl/converter-input-stream;1", "nsIConverterInputStream");

        fstream.init(file, -1, 0, 0);
        cstream.init(fstream, "UTF-8", 0, 0);

        let (str = {}) {
            cstream.readString(-1, str); // read the whole file and put it in str.value
            data = str.value;
        }
        cstream.close();

        return data;
    },

    readLineByLine: function(file){

        var fiStream = Utils.getInstance("@mozilla.org/network/file-input-stream;1", "nsIFileInputStream");
        fiStream.init(file, 0x01, 0444, 0);

        var charset = "UTF-8";
        var is = Utils.getInstance("@mozilla.org/intl/converter-input-stream;1", "nsIConverterInputStream");

        is.init(fiStream, charset, 1024, 0xFFFD);
        is.QueryInterface(Components.interfaces.nsIUnicharLineInputStream);

        if (is instanceof Components.interfaces.nsIUnicharLineInputStream) {
            var line = {};
            var lines = [];
            var cont;
            do {
                cont = is.readLine(line);
                lines.push(line.value);
            } while (cont);

            is.close();

            return lines;
        }

        return false;
    },

    /*
     * mode: "open","save","folder","multiple"
     * filters: [{title:"XML files",filter:"*.xml"},{title:"XUL files",filter:"*.xul"}]
     */
    pickFile: function(title, mode, filters, defaultExtension, defaultName, defaultFolder, parent){
        title = title || Utils.getString("wi_extension_name")
        parent = parent || window;

        var nsIFilePicker = Components.interfaces.nsIFilePicker
        var fp = Utils.getInstance("@mozilla.org/filepicker;1", "nsIFilePicker");

        var modes = {
            "open" : nsIFilePicker.modeOpen,
            "save" : nsIFilePicker.modeSave,
            "folder" : nsIFilePicker.modeGetFolder,
            "multiple" : nsIFilePicker.modeOpenMultiple
        }

        if (modes[mode]){
            mode = modes[mode];
        } else {
            mode = nsIFilePicker.modeOpen;
        }

        if (defaultExtension) fp.defaultExtension = defaultExtension;
        if (defaultName) fp.defaultString = defaultName;
        if (defaultFolder) fp.displayDirectory = defaultFolder;

        if (filters){
            for(let i = 0; i < filters.length; i++){
                fp.appendFilter(filters[i].title,filters[i].filter);
            }
        }

        fp.init(parent,title,mode)
        var res = fp.show();
        if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace){
            if (mode == "multiple") {
                var files = [];
                while (fp.files.hasMoreElements()){
                    let file = fp.files.getNext().QueryInterface(Components.interfaces.nsILocalFile);
                    files.push(file);
                }

                return files;

            } else {
                return fp.file;
            }
        } else {
            return false;
        }

    }
}
