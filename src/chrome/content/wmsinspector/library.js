WMSInspector.Library = {
    
    //prefs: null,
    
    init: function(){

        //this.prefs = WMSInspector.Utils.getPrefs();
        
        //Set values from current preferences values
        //var versions = this.prefs.getCharPref("wmsversions").split("|");

        
        var item;

        for (var i=0; i < 3; i++){
            this.addServiceRow(i,"Test service "+i,"http://wewere.com/OWS/"+i,"WMS",["reference","INSPIRE","to order"]);
            
        }

    },

    addServiceRow: function(id,title,url,type,tags) {
        var item = document.createElement("richlistboxitem");
        item.setAttribute("class","libraryItem");
        item.serviceId = id;
        item.setAttribute("title", title);
        item.setAttribute("type", type);
        item.setAttribute("URL", url);
        //var box = document.getAnonymousNodes(item);
//        var box = document.getAnonymousElementByAttribute(item,"class","wiLibraryTagsBox");

        //alert(box);
        //Without the interval, the method is not found
        if (tags) setTimeout(function(){ item.addTags(tags)},1);
        //item.getServiceId();
        document.getElementById("wiServicesListbox").appendChild(item);


    },

    addTags: function(item,tags){
       
       item.getServiceId()
    }
/*
 *         <richlistboxitem >
            <hbox flex="1">
                <vbox >
                    <image src="chrome://wmsinspector/skin/icons/favorite.png" />
                </vbox>

                <vbox>
                    <label value="ICC - Servidor ràster" style="font-weight:bold"/>
                    <label flex="1" value="http://shagrat.icc.es/lizardtech/iserv/ows?"/>
                    <hbox >
                        <label flex="0" class="libraryTag" value="ref" />
                        <label flex="0" class="libraryTag" value="INSPIRE" />
                    </hbox>
                </vbox>
                <spacer flex="1" />
                <vbox>
                    <label value="WMS" style="font-style:italic"/>
                </vbox>
            </hbox>
        </richlistboxitem>
 */
}

