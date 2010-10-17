
var AddParameterDialog = {
    imageId: null,
    paramName: null,
    paramValue: null,

    init: function(){
        this.imageId = window.arguments[0];
        this.paramName = window.arguments[1];
		
        if (this.paramName) document.getElementById("wiParamName").value = this.paramName;
        
    },
	
    onAccept: function(){
        this.paramValue = document.getElementById("wiParamValue").value;
        if (this.paramName != document.getElementById("wiParamName").value) this.paramName = document.getElementById("wiParamName").value;
        window.opener.WMSInspector.Overlay.onParamAdded(this.imageId,this.paramName,this.paramValue);

        window.close();

    }
}
