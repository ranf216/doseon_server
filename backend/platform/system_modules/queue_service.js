module.exports = class
{
    constructor(serviceConfig)
    {
        this.serviceConfig = serviceConfig;

        if (serviceConfig.queue_id == $Const.MQID_NO_QUEUE)
        {
            this.__doServiceTasks = this._doServiceTasksNoQueue;
        }
        else if (serviceConfig.is_timed_message)
        {
            this.__doServiceTasks = this._doServiceTasks;
            this.msgQueue = new $TimedMessages(parseInt(serviceConfig.queue_id));
        }
        else
        {
            this.__doServiceTasks = this._doServiceTasks;
            this.msgQueue = new $MessageQueue(parseInt(serviceConfig.queue_id));
        }
    }

    startService(isc, onMessageCallback)
    {
        this.isc = isc;
        this.service = this._init();
        this.onMessageCallback = onMessageCallback;
        this.lastHbTime = 0;

        console.log("Starting...\n");
        $Logger.logString($Const.LL_INFO, `Service ${this.serviceConfig.service_id} is starting`);

        while (this._isRunning())
        {
            this.__doServiceTasks();
            $Utils.sleep(this.serviceConfig.queue_rest_time_ms);
        }

        this.isc.endStandAlone($ERRS.ERR_SUCCESS);
    }


    _init()
    {
        if (this.serviceConfig.service_id == $Const.SRVID_PM2)
        {
            process.on("SIGINT", (code) =>
            {
                $Logger.logString($Const.LL_INFO, `Service is not active shutdown with: ${code}`);
                console.log(`Service is not active shutdown with: ${code}`);
                this.isc.endStandAlone($ERRS.ERR_SUCCESS);
            });

            return $Const.SRVID_PM2;
        }

        const service = new $Service(this.serviceConfig.service_id);

        let srvStat = service.getStatus();
        if (!srvStat.is_active)
        {
            console.log("Service is not active");
            this.isc.endStandAlone($ERRS.ERR_SUCCESS);
            return;
        }
        if (srvStat.heartbeat_age < this.serviceConfig.anounce_dead_after_ms)
        {
            console.log("Other instance is alive");
            this.isc.endStandAlone($ERRS.ERR_SUCCESS);
            return;
        }

        return service;
    }

    _isRunning()
    {
        if (this.serviceConfig.service_id == $Const.SRVID_PM2)
        {
            return true;
        }

        if (Date.now() - this.lastHbTime >= this.serviceConfig.hearbeat_every_ms)
        {
            let srvStat = this.service.getStatus();
            if (!srvStat.is_active)
            {
                $Logger.logString($Const.LL_INFO, `Service ${this.serviceConfig.service_id} is not active`);
                console.log("Service is not active");
                return false;
            }
            
            this.service.heartbeat();
            this.lastHbTime = Date.now();
        }
        
        return true;
    }

    _doServiceTasks()
    {
        let rv = this.msgQueue.pop();
        if ($Err.isERR(rv))
        {
            $Logger.logString($Const.LL_ERROR, "Receive message queue pop error");
            return;
        }

        while (!rv.is_empty)
        {
            console.log(`Receive message queue pop: ${rv.message_text}`);
            $Logger.logString($Const.LL_DEBUG, `Receive message queue pop: ${rv.message_text}`);

            this.onMessageCallback(rv.message_text);

            rv = this.msgQueue.pop();
            if ($Err.isERR(rv))
            {
                $Logger.logString($Const.LL_ERROR, "Receive message queue pop error");
                return;
            }
        }
    }

    _doServiceTasksNoQueue()
    {
        this.onMessageCallback();
    }
}
