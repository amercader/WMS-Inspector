var EXPORTED_SYMBOLS = ["Classes"];

var Classes = {

    Service: function(){
        this.id = "";
        this.title = "";
        this.URL = "";
        this.version = "";
        this.favorite = false;
        this.type = "WMS";
        this.tags = [];
    },

    ServiceType: function(){
        this.id = "";
        this.name = "";
        this.title = "";
        this.defaultVersion = "";
    }
}