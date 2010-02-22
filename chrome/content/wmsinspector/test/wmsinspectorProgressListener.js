const STATE_START = Components.interfaces.nsIWebProgressListener.STATE_START;
const STATE_STOP = Components.interfaces.nsIWebProgressListener.STATE_STOP;
const STATE_IS_WINDOW = Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW;
const STATE_IS_REQUEST = Components.interfaces.nsIWebProgressListener.STATE_IS_REQUEST;
const STATE_IS_DOCUMENT = Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT;

var wiProgressListener =
{
  QueryInterface: function(aIID)
  {
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
   throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function(aProgress, aRequest, aFlag, aStatus)
  {
    if(aFlag & (STATE_IS_DOCUMENT|STATE_START))
    {
    	/*
    		var doc = aProgress.DOMWindow.document;
      aRequest.QueryInterface(Components.interfaces.nsIChannel);
      var browser = document.getElementById("wiBrowser");
      alert("state_stop 87: "+doc.contentType);
      */
    } 
    
  	/*
	if(aFlag & STATE_IS_REQUEST && aFlag & STATE_START){
	   	var document = aProgress.DOMWindow.document;
   		aRequest.cancel(Components.results.NS_BINDING_ABORTED);
   	alert("state_stop 444: "+document.contentType);	
	}

   // If you use gtProgressListener for more than one tab/window, use
   // aProgress.DOMWindow to obtain the tab/window which triggers the state change
   if(aFlag & STATE_START)
   {
     
     // This fires when the load event is initiated
   }
   if(aFlag & STATE_STOP)
   {
   	if(aFlag & STATE_IS_WINDOW){
   		
	   	//var document = aProgress.DOMWindow.document;
   		//aRequest.cancel(Components.results.NS_BINDING_ABORTED);
   	//alert("state_stop 88: "+document.contentType);	
     // This fires when the load finishes
    }
   }
	*/
   return 0;
  },

  onLocationChange: function(aProgress, aRequest, aURI)
  {
   // This fires when the location bar changes; i.e load event is confirmed
   // or when the user switches tabs. If you use gtProgressListener for more than one tab/window,
   // use aProgress.DOMWindow to obtain the tab/window which triggered the change.

   return 0;
  },

  // For definitions of the remaining functions see XULPlanet.com
  onProgressChange: function() {return 0;},
  onStatusChange: function() {return 0;},
  onSecurityChange: function() {return 0;},
  onLinkIconAvailable: function() {return 0;}
}