WMSInspector.Threads = {
    main: Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread,


    runThread: function(threadId,processFunction,params,callbackFunction){
        var background = Components.classes["@mozilla.org/thread-manager;1"].getService().newThread(0);

        background.dispatch(new WMSInspector.workingThread(threadId, processFunction, params, callbackFunction), Components.interfaces.nsIThread.DISPATCH_NORMAL);
    }
}

WMSInspector.workingThread = function(threadID, processFunction, params, callbackFunction) {
    this.threadID = threadID;

    this.processFunction = processFunction;
    this.params = params;
    this.callbackFunction = callbackFunction;
    this.result = null;
};

WMSInspector.workingThread.prototype = {
    run: function() {
        try {
            // This is where the working thread does its processing work.

            this.result = this.processFunction(this.params);


            // When it's done, call back to the main thread to let it know
            // we're finished.

            WMSInspector.Threads.main.dispatch(new WMSInspector.mainThread(this.threadID, this.callbackFunction, this.result),
                Components.interfaces.nsIThread.DISPATCH_NORMAL);
                
        } catch(e) {
            Components.utils.reportError(e);
        }
    },

    QueryInterface: function(iid) {
        if (iid.equals(Components.interfaces.nsIRunnable) ||
            iid.equals(Components.interfaces.nsISupports)) {
            return this;
        }
        throw Components.results.NS_ERROR_NO_INTERFACE;
    }
};

WMSInspector.mainThread = function(threadID, callbackFunction, result) {
    this.threadID = threadID;

    this.callbackFunction = callbackFunction;
    this.result = result;
};

WMSInspector.mainThread.prototype = {
    run: function() {
        try {
            // This is where we react to the completion of the working thread.

            this.callbackFunction(this.result);
        } catch(e) {
            Components.utils.reportError(e);
        }
    },

    QueryInterface: function(iid) {
        if (iid.equals(Components.interfaces.nsIRunnable) ||
            iid.equals(Components.interfaces.nsISupports)) {
            return this;
        }
        throw Components.results.NS_ERROR_NO_INTERFACE;
    }
};

