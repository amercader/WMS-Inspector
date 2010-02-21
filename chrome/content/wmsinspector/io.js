﻿//Folder name for WMSInspector stuff in Temporary dir
const wiTempDirName = "wmsinspector";

//Naming template for temporary files
const wiTempFileName = "wi_";

//Default permissions for new temporary files
const wiTempFilesPermissions = 0666;

//Permissions for new temporary directory
const wiTempDirPermissions = 0700;


WI.IO = {
    fileCounter:0,
    externalAppService: WI.Utils.getService("@mozilla.org/uriloader/external-helper-app-service;1", "nsPIExternalAppLauncher"),
    directoryService: WI.Utils.getService("@mozilla.org/file/directory_service;1", "nsIProperties"),

    checkWITmpDir: function(){
        var dir = this.getTmpDir();
        if (dir){
            dir.append(wiTempDirName);

            // If dir doesn't exist, create it
            if( !dir.exists() || !dir.isDirectory() ) {
                dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, wiTempDirPermissions);
            }

            return dir;
        }
        return false;
    },

    getTmpDir: function(){
        if (this.directoryService)
            return this.directoryService.get("TmpD", Components.interfaces.nsIFile);
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
        return wiTempFileName + this.fileCounter + "." + extension;
    },
    createTmpFile: function(name, deleteOnExit){
        var file = this.checkWITmpDir();
        if (file){
            file.append(name);
            file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, wiTempFilesPermissions);
            if(deleteOnExit !== false){
                this.deleteTemporaryFileOnExit(file)
            }
            return file
        }
        return false;
    },

    write: function(file,data,mode,encode){

        var foStream = WI.Utils.getInstance("@mozilla.org/network/file-output-stream;1", "nsIFileOutputStream");

        if (mode == "a"){   //Append
            foStream.init(file, 0x02 | 0x10, wiTempFilesPermissions, 0);
        } else {    //Create
            foStream.init(file, 0x02 | 0x08 | 0x20, wiTempFilesPermissions, 0);
        }

        if (encode){
            //Convert data to UTF-8
            //TODO: parametrize?
            var converter = WI.Utils.getInstance("@mozilla.org/intl/converter-output-stream;1","nsIConverterOutputStream");
            converter.init(foStream, "UTF-8", 0, 0);
            converter.writeString(data);
            converter.close(); // this closes foStream
        } else {
            foStream.write(data, data.length);
            foStream.close();
        }

        return file;
    }
}
