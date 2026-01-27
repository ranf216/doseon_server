/*
EXAMPLE CODE FOR CLIENT SIDE:

<script src="<socket url>/socket.io/socket.io.js"></script>
<script>
    const socket = io("<socket url>", {
                                            transports:["websocket"],
                                            cors: {
                                                origin: "*",
                                            },
                                        });
    socket.on('message', (data) => {
        console.log(`New notification: ${data}`);
    });

    socket.on('echo', (data) => {
        console.log(`Echo response: ${data}`);
    });

    socket.on('#token', (data) => {
        console.log(`Token response: ${data}`);
        socket.emit('echo', 'Echo message');
        socket.emit('message', 'Message');
        socket.emit('relay', '{"to_user_id": "xxxxxxxxxxxxxxxx", "data": "Message"}');
    });

    socket.on('connect', () => {
        console.log('Connected');
        socket.emit('#token', '<user token>');
    });

    socket.on('disconnect', () => {
        console.log('Disonnected');
    });
</script>
*/


const socketio = require('socket.io');
const http = require("http");


const memoryQueues = {};

const MemoryQueue = class
{
    constructor(queueId)
    {
        if (!$Utils.isset(memoryQueues[queueId]))
        {
            memoryQueues[queueId] = [];
        }

        this.queue = memoryQueues[queueId];
    }

    push(message)
    {
        this.queue.push(message);
        return $ERRS.ERR_SUCCESS;
    }

    pop()
    {
        const vals = {};
        const rc = $ERRS.ERR_SUCCESS;

        if (this.queue.length == 0)
        {
            vals.is_empty = true;
            vals.message_text = null;
            return {...rc, ...vals};
        }

        vals.is_empty = false;
        vals.message_text = this.queue.shift();

        return {...rc, ...vals};
    }
};


module.exports = class
{
    constructor(serviceConfig)
    {
        this.serviceConfig = serviceConfig;

        if (serviceConfig.use_memory_queue)
        {
            this.recvMsgQueue = new MemoryQueue(910000 + parseInt(serviceConfig.service_id));
            this.sendMsgQueue = new MemoryQueue(920000 + parseInt(serviceConfig.service_id));
        }
        else
        {
            this.recvMsgQueue = new $MessageQueue(910000 + parseInt(serviceConfig.service_id));
            this.sendMsgQueue = new $MessageQueue(920000 + parseInt(serviceConfig.service_id));
        }
    }

    sendMessage(toUser, data, doOffline = false)
    {
        $Logger.logString($Const.LL_DEBUG, `SocketService sendMessage: ${JSON.stringify({service_id: this.serviceConfig.service_id, to_user: toUser, data: data})}`);

        if (!doOffline && !this.serviceConfig.use_pm2_monitor)
        {
            if (!new $Service(this.serviceConfig.service_id).getStatus().is_active)
            {
                $Logger.logString($Const.LL_INFO, `Service ${this.serviceConfig.service_id} is not active - skipping message`);
                return;
            }
        }

        this.sendMsgQueue.push(JSON.stringify({userId: toUser, data: data}));
    }

    sendMultiMessage(toUsers, data, doOffline = false)
    {
        $Logger.logString($Const.LL_DEBUG, `SocketService sendMultiMessage: ${JSON.stringify({service_id: this.serviceConfig.service_id, to_users: toUsers, data: data})}`);

        if (!doOffline && !this.serviceConfig.use_pm2_monitor)
        {
            if (!new $Service(this.serviceConfig.service_id).getStatus().is_active)
            {
                $Logger.logString($Const.LL_INFO, `Service ${this.serviceConfig.service_id} is not active - skipping message`);
                return;
            }
        }

        this.sendMsgQueue.push(JSON.stringify({userIds: toUsers, data: data, isMulti: true}));
    }

    startService(isc, onMessageCallback)
    {
        this.isc = isc;
        this.service = this._init();
        this.onMessageCallback = onMessageCallback;
        this.lastHbTime = 0;
        this.TokenValidator = require($Const.INFRA_ROOT + "/platform/infra/token_validator.js");

        console.log("Starting...\n");
        $Logger.logString($Const.LL_INFO, `Service ${this.serviceConfig.service_id} is starting`);

        while (this._isRunning())
        {
            this._doServiceTasks();
            $Utils.sleep(this.serviceConfig.queue_rest_time_ms);
        }

        this.isc.endStandAlone($ERRS.ERR_SUCCESS);
    }

    startSocket(isc)
    {
        this.isc = isc;
        this.infoBySocketId = {};
        this.infoByUserId = {};
        this.lastHbTime = 0;
        this.TokenValidator = require($Const.INFRA_ROOT + "/platform/infra/token_validator.js");

        this.service = this._init(1);
        const thiz = this;

        $Utils.createCron({secondsInterval: Math.floor(this.serviceConfig.queue_rest_time_ms / 1000)}, () =>
        {
            if (!thiz._isRunning())
            {
                thiz.isc.endStandAlone($ERRS.ERR_SUCCESS);
                return;
            }

            thiz._doSocketTasks();
        });

        this.socketio = require('socket.io');
        this.http = require(this.serviceConfig.protocol);

        const serverOptionsConfiguration = {}

        if (this.serviceConfig.protocol === "https")
        {
            serverOptionsConfiguration.key = fs.readFileSync($Config.get("socket", "ssl_keyfile"));
            serverOptionsConfiguration.cert = fs.readFileSync($Config.get("socket", "ssl_certificate"));
        }
        
        const server = http.createServer(serverOptionsConfiguration);
        server.listen(this.serviceConfig.port, () =>
        {
            console.log(`Socket running on port ${this.serviceConfig.port}`)
            $Logger.logString($Const.LL_INFO, `Socket running on port ${this.serviceConfig.port}`);
        });

        const io = socketio(server, {
                                        transports:["websocket"],
                                        cors: {
                                            origin: this.serviceConfig.cors_origin,
                                        },
                                        pingInterval:5000,
                                        connectTimeout:30000,
                                        serveClient:true,
                                    });

        io.on("connection", (socket) => {thiz._onConnection(socket)});
    }


    _init(subServiceId = null)
    {
        if (subServiceId !== null, this.serviceConfig.track_user_online_ststus)
        {
            $Db.executeQuery(`DELETE FROM \`user_online_status\` WHERE UOS_SERVICE_ID=?`, [this.serviceConfig.service_id]);
        }

        if (this.serviceConfig.use_pm2_monitor)
        {
            process.on("SIGINT", (code) =>
            {
                if (subServiceId !== null, this.serviceConfig.track_user_online_ststus)
                {
                    $Db.executeQuery(`DELETE FROM \`user_online_status\` WHERE UOS_SERVICE_ID=?`, [this.serviceConfig.service_id]);
                }

                $Logger.logString($Const.LL_INFO, `Service is not active shutdown with: ${code}`);
                console.log(`Service is not active shutdown with: ${code}`);
                this.isc.endStandAlone($ERRS.ERR_SUCCESS);
            });

            return $Const.SRVID_PM2;
        }

        const service = new $Service(this.serviceConfig.service_id, subServiceId);

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
        if (this.serviceConfig.use_pm2_monitor)
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
        let rv = this.recvMsgQueue.pop();
        if ($Err.isERR(rv))
        {
            $Logger.logString($Const.LL_ERROR, "Receive message queue pop error");
            return;
        }

        while (!rv.is_empty)
        {
            console.log(`Receive message queue pop: ${rv.message_text}`);
            $Logger.logString($Const.LL_DEBUG, `Receive message queue pop: ${rv.message_text}`);
            let data = JSON.parse(rv.message_text);

            let userInfo = {};
            let isValidToken = new this.TokenValidator().isValidToken(data.token, userInfo);

            if (isValidToken)
            {
                this.onMessageCallback(userInfo, data.data);
            }
            else
            {
                console.log(`Request from invalid token: ${data.token}`);
                $Logger.logString($Const.LL_DEBUG, `Request from invalid token: ${data.token}`);
            }

            rv = this.recvMsgQueue.pop();
            if ($Err.isERR(rv))
            {
                $Logger.logString($Const.LL_ERROR, "Receive message queue pop error");
                return;
            }
        }
    }

    _doSocketTasks()
    {
        let rv = this.sendMsgQueue.pop();
        if ($Err.isERR(rv))
        {
            $Logger.logString($Const.LL_ERROR, "Send message queue pop error");
            return;
        }

        while (!rv.is_empty)
        {
            console.log(`Send message queue pop: ${rv.message_text}`);
            $Logger.logString($Const.LL_DEBUG, `Send message queue pop: ${rv.message_text}`);
            let data = JSON.parse(rv.message_text);

            if ($Utils.empty(data.isMulti))
            {
                let info = this.infoByUserId[data.userId]
                if ($Utils.empty(info))
                {
                    console.log(`Invalid socket for userId ${data.userId}`);
                    $Logger.logString($Const.LL_DEBUG, `Invalid socket for userId ${data.userId}`);
                }
                else
                {
                    info.socket.emit("message", data.data);
                }
            }
            else
            {
                data.userIds.forEach(userId =>
                {
                    let info = this.infoByUserId[userId]
                    if (!$Utils.empty(info))
                    {
                        info.socket.emit("message", data.data);
                    }
                });
            }

            rv = this.sendMsgQueue.pop();
            if ($Err.isERR(rv))
            {
                $Logger.logString($Const.LL_ERROR, "Send message queue pop error");
                return;
            }
        }
    }

    _onConnection(socket)
    {
        console.log(`New connection: ${socket.id}`);
        $Logger.logString($Const.LL_DEBUG, `New connection: ${socket.id}`);

        const thiz = this;

        socket.on("#token", (token) =>
        {
            console.log(`Set token from ${socket.id}: ${token}`);
            $Logger.logString($Const.LL_DEBUG, `Set token from ${socket.id}: ${token}`);

            let userInfo = {};
            let isValidToken = new this.TokenValidator().isValidToken(token, userInfo);
            if (!isValidToken)
            {
                console.log(`Invalid token from ${socket.id}: ${token}`);
                $Logger.logString($Const.LL_DEBUG, `Invalid token from ${socket.id}: ${token}`);
                socket.emit("#token", JSON.stringify($ERRS.ERR_INVALID_USER_TOKEN));
                return;
            }

            thiz.infoBySocketId[socket.id] = {socket: socket, token: token, userId: userInfo.userId};
            thiz.infoByUserId[userInfo.userId] = {socket: socket, token: token};

            if (this.serviceConfig.track_user_online_ststus)
            {
                $Db.executeQuery(`INSERT INTO \`user_online_status\` (UOS_USR_ID, UOS_SERVICE_ID, UOS_CONNECTED_ON) VALUES (?, ?, ?)
                                    ON DUPLICATE KEY
                                    UPDATE UOS_CONNECTED_ON = VALUES(UOS_CONNECTED_ON)`, [userInfo.userId, this.serviceConfig.service_id, $Utils.now()]);

                $Db.executeQuery(`INSERT INTO \`user_online_log\` (UOL_USR_ID, UOL_SERVICE_ID, UOL_DATETINE, UOL_ACTION) VALUES (?, ?, ?, ?)`,
                                    [userInfo.userId, this.serviceConfig.service_id, $Utils.now(), "connect"]);
            }

            let rv = thiz.recvMsgQueue.push(JSON.stringify({token: token, data: "token_accepted"}));
            if ($Err.isERR(rv))
            {
                $Logger.logString($Const.LL_ERROR, "Message queue push error");
                socket.emit("#token", JSON.stringify($ERRS.ERR_UNKNOWN_ERROR));
                return;
            }

            socket.emit("#token", JSON.stringify($ERRS.ERR_SUCCESS));
        });

        socket.on("disconnect", (reason) =>
        {
            if ($Utils.empty(thiz.infoBySocketId[socket.id]))
            {
                return;
            }

            const socketId = socket.id;
            const userId = thiz.infoBySocketId[socketId].userId;

            console.log(`Disconnect from ${socketId}, userId ${userId}: ${reason}`);
            $Logger.logString($Const.LL_DEBUG, `Disconnect from ${socketId}, userId ${userId}: ${reason}`);

            if (this.serviceConfig.track_user_online_ststus)
            {
                $Db.executeQuery(`DELETE FROM \`user_online_status\` WHERE UOS_USR_ID=? AND UOS_SERVICE_ID=?`, [userId, this.serviceConfig.service_id]);

                $Db.executeQuery(`INSERT INTO \`user_online_log\` (UOL_USR_ID, UOL_SERVICE_ID, UOL_DATETINE, UOL_ACTION) VALUES (?, ?, ?, ?)`,
                                    [userId, this.serviceConfig.service_id, $Utils.now(), "disconnect"]);
            }

            delete thiz.infoByUserId[userId];
            delete thiz.infoBySocketId[socketId];
        });

        socket.on("message", (data) =>
        {
            let info = thiz.infoBySocketId[socket.id];
            if ($Utils.empty(info))
            {
                console.log(`Invalid socket ${socket.id}`);
                $Logger.logString($Const.LL_DEBUG, `Invalid socket ${socket.id}`);
                return;
            }

            console.log(`Message received from ${socket.id}, userId ${thiz.infoBySocketId[socket.id].userId}: ${data}`);
            $Logger.logString($Const.LL_DEBUG, `Message received from ${socket.id}, userId ${thiz.infoBySocketId[socket.id].userId}: ${data}`);

            let rv = thiz.recvMsgQueue.push(JSON.stringify({token: info.token, data: data}));
            if ($Err.isERR(rv))
            {
                $Logger.logString($Const.LL_ERROR, "Message queue push error");
                return;
            }
        });

        socket.on("relay", (data) =>
        {
            let info = thiz.infoBySocketId[socket.id];
            if ($Utils.empty(info))
            {
                console.log(`Invalid socket ${socket.id}`);
                $Logger.logString($Const.LL_DEBUG, `Invalid socket ${socket.id}`);
                return;
            }

            if ($Config.get("socket", "log_relay"))
            {
                console.log(`Message received from ${socket.id}, userId ${thiz.infoBySocketId[socket.id].userId}: ${data}`);
                $Logger.logString($Const.LL_DEBUG, `Message received from ${socket.id}, userId ${thiz.infoBySocketId[socket.id].userId}: ${data}`);
            }

            const dataInfo = JSON.parse(data);
            if ($Utils.empty(dataInfo) || $Utils.empty(dataInfo.to_user_id) || $Utils.empty(dataInfo.data))
            {
                $Logger.logString($Const.LL_ERROR, "Invalid relay data");
                return;
            }

            info = thiz.infoByUserId[dataInfo.to_user_id];
            if ($Utils.empty(info))
            {
                console.log(`Invalid to_user_id ${dataInfo.to_user_id}`);
                $Logger.logString($Const.LL_DEBUG, `Invalid to_user_id ${dataInfo.to_user_id}`);
                return;
            }

            info.socket.emit("relay", dataInfo.data);
        });

        socket.on("echo", (data) =>
        {
            console.log(`Echo received from ${socket.id}: ${data}`);
            $Logger.logString($Const.LL_DEBUG, `Echo received from ${socket.id}: ${data}`);

            let info = thiz.infoBySocketId[socket.id];
            if ($Utils.empty(info))
            {
                console.log(`Invalid socket ${socket.id}`);
                $Logger.logString($Const.LL_DEBUG, `Invalid socket ${socket.id}`);
                return;
            }

            info.socket.emit("echo", data);
        });
    }
}
