//TODO: multiple requests
function wiRequest(type,url,data,onSuccess,onError){
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

function wiGET(url,onSuccess,onError){
    return new wiRequest("GET",
        url,
        false,
        onSuccess,
        onError);
}

function wiPOST(url,data,onSuccess,onError){
    return new wiRequest("POST",
        url,
        data,
        onSuccess,
        onError);
}