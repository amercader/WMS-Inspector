var EXPORTED_SYMBOLS = ["WMSInspectorClasses"];

// WMSInspectorClasses namespace
var WMSInspectorClasses = {};

WMSInspectorClasses.Service = function(){
    this.id = "";
    this.title = "";
    this.URL = "";
    this.version = "";
    this.favorite = false;
    this.type = "WMS";
    this.tags = [];
}


WMSInspectorClasses.ServiceType = function(){
    this.id = "";
    this.name = "";
    this.title = "";
    this.defaultVersion = "";
}