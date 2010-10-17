var EXPORTED_SYMBOLS = ["Classes"];

// WMSInspectorClasses namespace
var Classes = {};

Classes.Service = function(){
    this.id = "";
    this.title = "";
    this.URL = "";
    this.version = "";
    this.favorite = false;
    this.type = "WMS";
    this.tags = [];
}


Classes.ServiceType = function(){
    this.id = "";
    this.name = "";
    this.title = "";
    this.defaultVersion = "";
}