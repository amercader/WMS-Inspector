
WMSInspector.EditParameterDialog = {
    frameId: null,
    imageId: null,
    paramId: null,
    paramName: null,
    paramValue: null,

    init: function(){
        this.imageId = window.arguments[0];
        this.paramId = window.arguments[1];
        this.paramName = window.arguments[2];
        this.paramValue = window.arguments[3];
		
        document.getElementById("wiParamName").value = this.paramName + "=";
        document.getElementById("wiParamValue").value = this.paramValue;
    },
	
    onAccept: function(){
        this.paramValue = document.getElementById("wiParamValue").value;
        window.opener.WMSInspector.Overlay.onParamUpdated(this.imageId,this.paramId,this.paramName,this.paramValue);

        window.close();

    }
}
