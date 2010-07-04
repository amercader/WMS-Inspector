WMSInspector.ServiceImages = {
    currentServiceImages: [],

    lastSeqId: 0,

    refreshImages: function(){
        this.currentServiceImages = [];
        var currentWindow = WMSInspector.Utils.getContentWindow();
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

        // <img> tags
        var imgs = document.getElementsByTagName("img");

        for (var i=0;i< imgs.length;i++){
            if (this.isServiceImage(imgs[i].src)) {
                var serviceImage = new WMSInspector.ServiceImage(imgs[i].src,this);
                serviceImage.id = this.lastSeqId;
                this.lastSeqId++;
                out.push(serviceImage);

            }
        }
		
        //<div> tags background image
        var divs = document.getElementsByTagName("div");

        for (var i=0;i< divs.length;i++){
            var bgImg = this.checkDivBackgroundImage(divs[i]);
            if (bgImg){
                if (this.isServiceImage(bgImg)) {
                    var serviceImage = new WMSInspector.ServiceImage(bgImg,this);
                    serviceImage.id = this.lastSeqId;
                    this.lastSeqId++;
                    out.push(serviceImage);

                }
            }
        }

        return out;
    },
	
    checkDivBackgroundImage: function(div){
        var out = false;
        if (div.style){
            if (div.style.backgroundImage){
                var src = div.style.backgroundImage;
                // Extract url(...)
                out = src.substring(4,src.length - 1);
            }
        }
        return out;
    },
	
    //TODO: parametrize
    isServiceImage: function(imgsrc){
        return (imgsrc.indexOf("SERVICE=WMS") != -1);
    }

}

WMSInspector.ServiceImage = function(src,parent){
    this.id = "";
    this.parent = parent;
    this.src = src;
    this.server = this.src.substring(0,this.src.indexOf("?"));
    this.params = [];
    

    this.extractParams = function(src){
        src = src || this.src;
        var srcParams = src.substring(src.indexOf("?")+1).split("&");
        this.params = [];

        var tmp;
        for (var i=0;i<srcParams.length;i++){
            tmp = srcParams[i].split("=");
            if (tmp[0]) this.addParam(tmp[0],(tmp[1]) ? tmp[1] : "");
        }
    }

    this.getParamByIndex = function(index){
        return (this.params[index]) ? this.params[index] : false;
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
        this.params.push({"name":name,"value":value});

        return this.params.length;

    }

    this.removeParam = function(name){
        var i = this.getParamIndex(name);
        if (i !== false){
            this.params.splice(i,1);

            return this.params.length;
        }

        return false;

    }

    this.getParamIndex = function(name){
        for (var i=0;i < this.params.length;i++){
            var param = this.getParamByIndex(i);
            if (param.name.toLowerCase() == name.toLowerCase()) return i;
        }
        return false;
    }
	
    this.updateSrc = function(){
        var params = "";
		
        for (var i=0;i < this.params.length;i++){
            var param = this.getParamByIndex(i);
            params += param.name + "=" + param.value;
            if (i < (this.params.length - 1)) params += "&";
        }
		
        this.src = (this.server.indexOf("?") != -1) ? this.server + "&" + params : this.server + "?" + params;
		
        return this.src;
		
    }

    this.extractParams();
	
    this.request = this.getParamByName("REQUEST").value;
	
    //If found, add the MapServer map parameter to the server URL
    var mapParam = this.getParamByName("map");
    if (mapParam){
        this.server += "?" + mapParam.name + "=" + mapParam.value;
    }

}