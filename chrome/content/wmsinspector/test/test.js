





function test1(){
    var url = "http://oslo.geodata.es/wms52/tremp/ambiental/inuncat?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1";

    requestTest(url);
}

function requestTest(url){
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.onreadystatechange = function (aEvt) {

        if (req.readyState == 4) {
            if(req.status == 200){
                WI.Overlay.callbackTest(req);

                //  return req;

            }else{
                return false;
            }
        }
    };
    req.send(null);
}

function requestSync(dname){
    var xhttp=new XMLHttpRequest();
    xhttp.open("GET",dname,false);
    xhttp.send(null);
    return xhttp;
    //return xhttp.responseXML;
}


function test2(){
    var pr = new PAGESPEED2.ParallelXhrFlow(testAll);
    var url1 = "http://oslo.geodata.es/wms52/tremp/ambiental/inuncat?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1";

    var url2 = "http://oslo.geodata.es/wms52/elprat/guia/planejament?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1";

    pr.addRequest("GET",url1,false,false,testReq);
    pr.addRequest("GET",url2,false,false,testReq);
    pr.sendRequests();

}

function testReq(Xhr){
    alert(Xhr.responseXML);
}

function testAll(){
    alert("totes llestes")
}

function test3(){
    var url = "http://donosti.geodata.es/wi_3.xml";
    WI.Overlay.requestDocument(url);
    /*
    var url = "http://oslo.geodata.es/wms52/elprat/guia/planejament?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1";
    var request = new wiGET(url,testSuccess,testError);
    request.send();
     */


}

function testSuccess(xhr){
    alert(xhr.responseText)
}

function testError(code){
    alert(code);
}
function testXSL(){
    var processor = new XSLTProcessor();

    var xsl = document.implementation.createDocument("", "test", null);
    xsl.addEventListener("load", onXSLLoaded, false);

    xsl.load("test1.xsl");

    function onXSLLoaded() {

        processor.importStylesheet(xsl);

        alert(processor);
    }
}

function test66(){




    //var url = "http://planol.elprat.cat/wms50/elprat/guia/carrerer?REQUEST=GetLegendGraphic&VERSION=1.1.1&LAYER=allotjament&FORMAT=image/jpeg&SERVICE=WMS";
    //var url = "http://planol.elprat.cat/wms50/elprat/guia/carrerer?request=getcapabilities&service=wms&version=1.1.1";
    //var url = "http://planol.elprat.cat/wms5a0/elprat/guia/carrerer?";
var url = "http://www.geodata.es";
                       var browser = document.getElementById("wiBrowser");
                   browser.loadURI(url);
return;

    var file = WI.Overlay.saveURLtoFile(url);
    gBrowser.addTab(file.path);
    /*
    var contents = requestURL(url);

    var file = WI.IO.createTmpFile(WI.IO.getTmpFileName("html"));


    WI.IO.write(file,contents);

*/
}

function test66(){
    var url = "http://planol.elprat.cat/wms50/elprat/guia/carrerer?REQUEST=GetLegendGraphic&VERSION=1.1.1&LAYER=allotjament&FORMAT=image/png&SERVICE=WMS";
    //var url = "http://planol.elprat.cat/wms50/elprat/guia/carrerer?request=getcapabilities&service=wms&version=1.1.1";

    GetImageFromURL(url);


    var file = WI.IO.createTmpFile(WI.IO.getTmpFileName("png"));

    var contents = GetImageFromURL2(url,file);



}


function GetImageFromURL(url) {
  var ioserv = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var channel = ioserv.newChannel(url, 0, null);
  var stream = channel.open();

  if (channel instanceof Components.interfaces.nsIHttpChannel && channel.responseStatus != 200) {
    return "";
  }

  var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
    .createInstance(Components.interfaces.nsIBinaryInputStream);
  bstream.setInputStream(stream);

  var size = 0;
  var file_data = "";
  while(size = bstream.available()) {
    file_data += bstream.readBytes(size);
  }
  alert(channel.getResponseHeader("Content-type"));
 var file = WI.IO.createTmpFile(WI.IO.getTmpFileName("png"));
 WI.IO.write(file,file_data);
  return file_data;
}


function GetImageFromURL2(url,file) {

    var wbp = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
    .createInstance(Components.interfaces.nsIWebBrowserPersist);
    var ios = Components.classes['@mozilla.org/network/io-service;1']
    .getService(Components.interfaces.nsIIOService);
    var uri = ios.newURI(url, null, null);
    wbp.persistFlags &= ~Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_NO_CONVERSION; // don't save gzipped
    wbp.saveURI(uri, null, null, null, null, file);
}



 function showGetCapabilitiesReportVersionTest(){
        //var xhr = requestSync("chrome://wmsinspector/content/test/aragon.xml");
        //var xhr = requestSync("chrome://wmsinspector/content/test/espaisprotegits_1.3.0.xml");
        //var xhr = requestSync("chrome://wmsinspector/content/test/espaisprotegits.xml");
        //var xhr = requestSync("chrome://wmsinspector/content/test/shagrat.xml");
        //
        //var xhr = requestSync("chrome://wmsinspector/content/test/nasa.xml");
        var xhr = requestSync("chrome://wmsinspector/content/test/mayores_1.xml");
        var version = WI.Overlay.getWMSVersion(xhr.responseXML);

        var supportedVersions = WI.Overlay.prefs.getCharPref("reportwmsversions").split("|");
        //inArray?
        var supported = false;
        for (var i = 0; i < supportedVersions.length; i++){
            if (version == supportedVersions[i]){
                supported = true;
                break;
            }
        }
        //If no version or unsupported, try with default version
        if (!version || !supported){
            version = WI.Overlay.prefs.getCharPref("wmsversion");
        }


        /*
		alert(version);
return;
         */
        //TODO: FILTER errrors
        //alert(xhr.getResponseHeader("Content-Type"));
        var processor = new XSLTProcessor();

        var xsl = document.implementation.createDocument("", "test", null);
        xsl.addEventListener("load", onXSLLoaded, false);
        xsl.load("chrome://wmsinspector/content/xsl/wms_" + version +".xsl");
        //xsl.load("chrome://wmsinspector/content/xsl/wms_1.3.0.xsl");
        //xsl.load("chrome://wmsinspector/content/xsl/wms_common.xsl");

        function onXSLLoaded() {
            xsl.removeEventListener("load", onXSLLoaded, false);
            processor.importStylesheet(xsl);

            var newDoc = processor.transformToDocument(xhr.responseXML);

            var serializer = new XMLSerializer();
            var data = serializer.serializeToString(newDoc);

            var file = WI.IO.createTmpFile("report2.html");
            WI.IO.write(file,data,"c",true);

            WI.Overlay.showFileInBrowser(file);



        }

    }

