//TODO: multiple requests
WMSInspector.Request = function(type,url,data,onSuccess,onError){
//function wiRequest(type,url,data,onSuccess,onError){
    this.type = type;
    this.url = url;
    this.data = data;
    this.onSuccess = onSuccess;
    this.onError = onError;

    this.completed = false;

    this.send = function(){
        var self = this;

        var xhr = new XMLHttpRequest();
        xhr.open(this.type, this.url, true);
        xhr.onerror = function() {
            if (!self.completed) {
                self.onError(0);
            }
        };
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    self.onSuccess(xhr || "");
                } else {
                    self.onError(xhr);
                }
                self.completed = true;
            }
        };
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("Connection", "close");

        if (this.data) {
            xhr.send(this.data);
        } else {
            xhr.send(null);
        }
    }


}

WMSInspector.GET = function(url,onSuccess,onError){
    return new WMSInspector.Request("GET",
        url,
        false,
        onSuccess,
        onError);
}

WMSInspector.POST = function(url,data,onSuccess,onError){
    return new WMSInspector.Request("POST",
        url,
        data,
        onSuccess,
        onError);
}