var WIImages = {
    currentServiceImages: [],

    lastSeqId: 0,

    refreshImages: function(){
        this.currentServiceImages = [];
        var currentWindow = WI.Utils.getContentWindow();
        this.getImages(currentWindow);
        
    },

    getImages: function(window){

        //Get Images from main document
        var images = this.getFrameImages(window.document);

        if (images.length > 0){
            this.currentServiceImages = this.currentServiceImages.concat(images);
        }
        //Recursively, get images from children frames (if any)
        var winframes = window.frames;
        if (winframes.length){
            for (var i=0; i< winframes.length; i++){
                this.getImages(winframes[i]);
            }
        }

    },
    getFrameImages: function(document){
        var out = [];
        var imgs = document.images;
        for (var i=0;i< imgs.length;i++){
            if (this.isServiceImage(imgs[i].src)) {
                var serviceImage = new wiServiceImage(imgs[i],this);
                serviceImage.id = this.lastSeqId;
                this.lastSeqId++;
                out.push(serviceImage);

            }
        }
        return out;
    },

    //TODO: parametrize
    isServiceImage: function(imgsrc){
        return (imgsrc.indexOf("SERVICE=WMS") != -1);
        //return (imgsrc.indexOf(".google.com") != -1);
    }

}

function wiServiceImage(img,parent){
    this.id = "";
    this.parent = parent;
    this.src = img.src;
    this.width = img.width;
    this.heigth = img.height;
    this.server = this.src.substring(0,this.src.indexOf("?"));
    this.params = new wiServiceImageParams(this.src);
	
    this.getParamByIndex = function(index){
        return (this.params.params[index]) ? this.params.params[index] : false;
    }

    this.getParamByName = function(name){
        var index = this.getParamIndex(name);
        return this.getParamByIndex(index);
    }
	
    this.setParam = function(name,value){
        var param = this.getParamByName(name);
        if (param) {
            param.value = value;
        } else {
            param = this.addParam(name,value);
        }
        return param;
    }
		
    this.addParam = function(name,value){
        var params = this.params.params;
        var cnt = this.params.count;
        params[cnt] = Object();
        params[cnt].name = name;
        params[cnt].value = value;
        this.params.count++;
        return params[cnt];
    }

    this.getParamIndex = function(name){
        for (var i=0;i < this.params.count;i++){
            var param = this.getParamByIndex(i);
            if (param.name == name) return i;
        }
        return false;
    }
	
    this.updateSrc = function(){
        var server = this.server;
        var params = "";
		
        for (var i=0;i < this.params.count;i++){
            var param = this.getParamByIndex(i);
            params += param.name + "=" + param.value;
            if (i < (this.params.count - 1)) params += "&";
        }
		
        this.src = server + "?" + params;
		
        return this.src;
		
    }
	
    this.request = this.getParamByName("REQUEST").value;
	
}

function wiServiceImageParams(imgsrc){
    var cnt = 0;
    var paramstmp = imgsrc.substring(imgsrc.indexOf("?")+1).split("&");
    this.params = Array();
	
    var tmp;
    for (var i=0;i<paramstmp.length;i++){
        tmp = paramstmp[i].split("=");
        if (tmp[0]){
            this.params[cnt] = Object();
            this.params[cnt].name = tmp[0];
            this.params[cnt].value = (tmp[1]) ? tmp[1] : "";
            cnt = this.params.length;
        }
    }
    this.count = cnt || 0;
}

function sortServiceImages(windowServiceImages,mode){
    var criteria;
    var out = Array();
    var exists;
    var cnt = 0;
    var serviceImage;
    
    for (var i=0; i < windowServiceImages.length; i++){
        serviceImage = windowServiceImages[i];
        criteria = (mode == 0) ? serviceImage.server : serviceImage.request;
        exists = false;
        for (var k=0; k < out.length; k++){
            if (out[k].item == criteria) {
                exists = true;
                break;
            }
        }
        if (exists){
            out[k].elements[out[k].elements.length] = serviceImage;
        } else {
            cnt = out.length;
            out[cnt] = Object();
            out[cnt].item = criteria;
            out[cnt].elements = Array();
            out[cnt].elements[0] = serviceImage;
        }
    }
    return out;
}
