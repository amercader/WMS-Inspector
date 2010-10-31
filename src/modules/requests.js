Components.utils.import("resource://wmsinspector/utils.js");

var EXPORTED_SYMBOLS = ["Requests"];

//TODO: multiple requests
var Requests = {
    GET: function(url,onSuccess,onError){
        return new Requests.Request("GET",
            url,
            false,
            onSuccess,
            onError);
    },

    POST: function(url,data,onSuccess,onError){
        return new Requests.Request("POST",
            url,
            data,
            onSuccess,
            onError);
    },

    Request : function(type,url,data,onSuccess,onError){
        this.type = type;
        this.url = url;
        this.data = data;
        this.onSuccess = onSuccess;
        this.onError = onError;

        this.completed = false;

        this.send = function(){
            var self = this;
            var xhr = Utils.getInstance("@mozilla.org/xmlextras/xmlhttprequest;1","nsIXMLHttpRequest");

            xhr.open(this.type, this.url, true);
            xhr.onerror = function(e) {
                if (!self.completed) {
                    self.onError(e.target.status);
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

}
