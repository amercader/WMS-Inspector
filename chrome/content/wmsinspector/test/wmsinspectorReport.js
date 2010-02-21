/*
 *
 */


var WIReport = {
    cnt: 0,
    processor: false,
    browser: null,
    loadGetCapabilitiesReport: function(url,browser){
        this.browser = browser;

        var xml = this.request2("http://oslo.geodata.es/wms52/tremp/ambiental/inuncat?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1");
    //var xml = this.request2("chrome://wmsinspector/content/test/espaisprotegits.xml");
    //this.transformXML(url,browser);
    /*
        //var xml = this.request(url);
        //var xml = this.request("chrome://wmsinspector/content/test/nasa.xml");
        var response = this.request("chrome://wmsinspector/content/test/espaisprotegits.xml");
        //var xml = this.request("chrome://wmsinspector/content/test/shagrat.xml");
        //var xml = this.request("chrome://wmsinspector/content/test/osm.xml");
        if (!response) return false;
        var version = response.responseXML.getElementsByTagName("WMT_MS_Capabilities")[0].getAttribute("version");
        this.transformXML(response.responseXML,browser,version);
        */
    },

    //transformXML: function(url,browser, version){
    transformXML: function(response){
        alert("hola");
        return;
        var version = response.responseXML.getElementsByTagName("WMT_MS_Capabilities")[0].getAttribute("version");
        var processor = new XSLTProcessor();
        
        var xsl = document.implementation.createDocument("", "test", null);
        xsl.addEventListener("load", onload, false);




        //xsl.load("chrome://wmsinspector/content/xsl/wms.xsl");
        //xsl.load("chrome://wmsinspector/content/xsl/wms2.xsl");

        //var xml = this.request2("chrome://wmsinspector/content/test/espaisprotegits.xml");
        xsl.load("chrome://wmsinspector/content/xsl/wms2.xsl");
        
        function onload() {
            processor.importStylesheet(xsl);
        }


        
        var tab = this.browser.addTab("chrome://wmsinspector/content/template.html")
        var newTabBrowser = this.browser.getBrowserForTab(tab);
        this.browser.selectedTab = tab;

        
        var newFragment = processor.transformToFragment(response.responseXML, newTabBrowser.contentDocument);
        alert(newFragment);
        var onPageLoaded = function () {
            newTabBrowser.contentDocument.title = "WMS Inspector - Informe GetCapabilities ";
            newTabBrowser.contentDocument.body.appendChild(newFragment);
            newTabBrowser.removeEventListener("load",onPageLoaded,true);
        }

        newTabBrowser.addEventListener("load",onPageLoaded , true);

        return true;
    },

    request2: function(url){
        var req = new XMLHttpRequest();
        req.open('GET', url, true);
        req.onreadystatechange = function (aEvt) {
            
            if (req.readyState == 4) {
                if(req.status == 200){
                  
                    WIReport.transformXML(req);
                  //  return req;
                  
                }else{
                    return false;
                }
            }
        };
        req.send(null);
    },

    request: function(dname){
        var xhttp=new XMLHttpRequest();
        xhttp.open("GET",dname,false);
        xhttp.send(null);
        return xhttp;
    //return xhttp.responseXML;
    }

}