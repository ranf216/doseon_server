module.exports =
{
    loggerName: null,

    init: function(infraRoot)
    {
        let conf = require(infraRoot + "/platform/config/server.config.js");
        Object.entries(conf).forEach(function(confObj)
        {
            let key = confObj[0];
            let val = confObj[1];
    
            global["$" + key] = val;
        });
    },

    initStandAlone: function(infraRoot, envDomain, loggerName = null)
    {
        this.init(infraRoot);

        global.$HttpContext =
        {
            set: function(key, value)
            {
                this[key] = value;
            },

            get: function(key)
            {
                return this[key];
            }
        };

        const Session = require(infraRoot + "/platform/infra/session.js");

        $Const.ENV_DOMAIN = envDomain;

        new Session(null, null);

        if (loggerName != null)
        {
            this.setLogger(loggerName);
        }
    },

    setLogger: function(loggerName)
    {
        this.loggerName = loggerName;
        if (this.loggerName !== null)
        {
            $Logger.logRequest({"#request": `Jobs/${this.loggerName}`}, true);
        }
    },

    endStandAlone: function(rc)
    {
        try
        {
            if (this.loggerName !== null)
            {
                $Logger.logRequest(rc, false);
            }
        }
        catch(error)
        {
            console.log(error);
        }
        finally
        {
            $HttpContext.get("session").closeDb();
            $HttpContext.get("session").destroy();

            process.exit();
        }
    },
};
