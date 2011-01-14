Components.utils.import("resource://wmsinspector/utils.js");
Components.utils.import("resource://wmsinspector/io.js");
Components.utils.import("resource://wmsinspector/log4moz.js");

var EXPORTED_SYMBOLS = ["Log"];

const LOG_FILE_NAME = "wmsinspector.log.txt";
const DEFAULT_LEVEL = "Info";

var logger = function(){

    this.logToConsole = true;
    this.logToFile = true;

    // Log file name
    this.logFileName = LOG_FILE_NAME;

    // Default log level
    this.level = Log4Moz.Level[DEFAULT_LEVEL];

    // Set preferences object
    this.prefs = Utils.getPrefs();

    // Set preferences observer
    Utils.setPreferenceObserver(this.prefs,this);

    // Preferences observer
    this.observe = function(subject,topic,data){
        if (topic == "nsPref:changed" && data == "logtoconsole"){
            this.logToConsole = this.prefs.getBoolPref("logtoconsole");

            if (this.logToConsole && !this.consoleService)
                this.setupConsoleLogger();
        }

        if (topic == "nsPref:changed" && data == "logtofile"){
            this.logToFile = this.prefs.getBoolPref("logtofile");

            if (this.logToFile && !this.fileLogger)
                this.setupFileLogger();
        }
    }

    this.setup = function(){

        this.logToConsole = this.prefs.getBoolPref("logtoconsole");
        this.logToFile = this.prefs.getBoolPref("logtofile");

        if (this.logToConsole)
            this.setupConsoleLogger();

        if (this.logToFile)
            this.setupFileLogger();
    }

    this.setupConsoleLogger = function(){
        this.consoleService = Utils.getService("@mozilla.org/consoleservice;1","nsIConsoleService");
    }

    this.setupFileLogger = function(){

        var formatter = new Log4Moz.BasicFormatter();
        var root = Log4Moz.repository.rootLogger;
        var logFile = IO.checkWIProfileDir();
        var appender;

        logFile.append(this.logFileName);

        // Loggers are hierarchical, lowering this log level will affect all
        // output.
        root.level = this.level;

        // this appender will log to the file system.
        appender = new Log4Moz.RotatingFileAppender(logFile, formatter);
        appender.level = this.level;
        root.addAppender(appender);

        // Set up logger
        this.fileLogger = Log4Moz.repository.getLogger("WMSInspector");
        this.fileLogger.level = this.level;

    }


    this.log = function(level,out){

        if (out === null) out = "";

        var msg = "";

        // instanceof Error does not work
        var isError = (
            (typeof(out.message) != "undefined" &&
            typeof(out.lineNumber) != "undefined" &&
            typeof(out.fileName) != "undefined")           
        );

        var isException = (out instanceof Components.interfaces.nsIException);

        if (isError || isException){
            msg = out.message + " (line " + out.lineNumber + ")";
        } else if (typeof(out) == "object"){
            msg = Log4Moz.enumerateProperties(out).join(",");
        } else {
            msg = out;
        }
        if (this.logToFile){
            this.fileLogger[level](msg);
        }

        if (this.logToConsole){
            msg = "WMSInspector: ";
            msg += (isError || isException) ? out.message : out;
            if (level == "info" || level == "debug"){
                this.consoleService.logStringMessage(msg);
            } else {
                // nsIScriptError
                var flags = {
                    "error": 0,
                    "warn": 1
                }
                var scriptError = Utils.getInstance("@mozilla.org/scripterror;1","nsIScriptError");
                if (isError || isException){
                    scriptError.init(msg, (isError) ? out.fileName : out.filename, null, out.lineNumber, null, flags[level], null);
                } else {
                    scriptError.init(msg, null, null, null, null, flags[level], null);
                }


                this.consoleService.logMessage(scriptError);

            }
        }

    }

    this.error = function(out){
        this.log("error",out)
        }
    this.warn = function(out){
        this.log("warn",out)
        }
    this.info = function(out){
        this.log("info",out)
        }
    this.debug = function(out){
        this.log("debug",out)
        }


    this.setup();

}



var Log = new logger();

