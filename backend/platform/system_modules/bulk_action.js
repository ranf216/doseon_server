const _seesionInfoProps = ["userId", "userType"];

function _createSessionInfo(session)
{
    let info = {};
    _seesionInfoProps.forEach(prop =>
    {
        info[prop] = session[prop];
    });
    return JSON.stringify(info);
}

function _impersonate(sessionInfo)
{
    let vals = {};
    let rc = $ERRS.ERR_SUCCESS;

    let session = $HttpContext.get("session");

    rc = session.impersonate(sessionInfo.userId, sessionInfo.originalUserType);
    if ($Err.isERR(rc))
    {
        return rc;
    }

    return {...rc, ...vals};
}

module.exports =
{
    __initialize: function()
    {
    },

    push(actionId /* Can be null */, module, method, data, session = null)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        actionId = actionId || $Utils.uniqueHash();
        session = session || $HttpContext.get("session");

        let sessionInfo = _createSessionInfo(session);

        $Db.executeQuery(`INSERT INTO \`bulk_action\` (BAC_ID, BAC_SESSION_INFO, BAC_STATUS, BAC_MODULE, BAC_METHOD, BAC_DATA, BAC_INFO, BAC_CREATED_ON)
                                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [actionId, sessionInfo, 0, module, method, JSON.stringify(data), "", $Utils.now()]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        new $MessageQueue($Const.MQID_BULK_ACTION).push(JSON.stringify({actionId}));

        vals.action_id = actionId;

        return {...rc, ...vals};
    },

    getStatus(actionId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let bacs = $Db.executeQuery(`SELECT BAC_STATUS, BAC_INFO FROM \`bulk_action\` WHERE BAC_ID=? AND BAC_COMPLETED_ON is null`, [actionId]);
        if (bacs.length == 0)
        {
            return $ERRS.ERR_INVALID_ACTION_ID;
        }

        let status = bacs[0].BAC_STATUS;

        if (status == -1)
        {
            return JSON.parse(bacs[0].BAC_INFO);
        }

        if (status == 100)
        {
            rc = JSON.parse(bacs[0].BAC_INFO);
        }

        vals.progress = status;

        return {...rc, ...vals};
    },

    setProgress(actionId, progressPc)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        progressPc = Math.round(progressPc);
        if (progressPc < 0)
        {
            progressPc = 0;
        }
        else if (progressPc >= 100)
        {
            progressPc = 99;
        }

        $Db.executeQuery(`UPDATE \`bulk_action\` SET BAC_STATUS=? WHERE BAC_ID=?`, [progressPc, actionId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    },

    setDone(actionId, rv)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery(`UPDATE \`bulk_action\` SET BAC_STATUS=100, BAC_INFO=? WHERE BAC_ID=?`, [JSON.stringify(rv), actionId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    },

    setError(actionId, err)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery(`UPDATE \`bulk_action\` SET BAC_STATUS=-1, BAC_INFO=? WHERE BAC_ID=?`, [JSON.stringify(err), actionId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    },

    getData(actionId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let bacs = $Db.executeQuery(`SELECT BAC_DATA FROM \`bulk_action\` WHERE BAC_ID=? AND BAC_COMPLETED_ON is null`, [actionId]);
        if (bacs.length == 0)
        {
            return $ERRS.ERR_INVALID_ACTION_ID;
        }

        vals.data = JSON.parse(bacs[0].BAC_DATA);

        return {...rc, ...vals};
    },

    getFinalInfo(actionId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let bacs = $Db.executeQuery(`SELECT BAC_STATUS, BAC_INFO FROM \`bulk_action\` WHERE BAC_ID=? AND BAC_COMPLETED_ON is null`, [actionId]);
        if (bacs.length == 0)
        {
            return $ERRS.ERR_INVALID_ACTION_ID;
        }

        let status = bacs[0].BAC_STATUS;

        if (status == -1)
        {
            return JSON.parse(bacs[0].BAC_INFO);
        }

        if (status != 100)
        {
            return $ERRS.ERR_ACTION_STILL_IN_PROGRESS;
        }


        vals.info = JSON.parse(bacs[0].BAC_INFO);

        return {...rc, ...vals};
    },

    dispose(actionId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery(`UPDATE \`bulk_action\` SET BAC_COMPLETED_ON=? WHERE BAC_ID=?`, [$Utils.now(), actionId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    },

    execute(actionId)
    {
        $Logger.logString($Const.LL_DEBUG, `Start execute action ${actionId}`);

        let bacs = $Db.executeQuery(`SELECT BAC_SESSION_INFO, BAC_MODULE, BAC_METHOD, BAC_DATA FROM \`bulk_action\` WHERE BAC_ID=? AND BAC_COMPLETED_ON is null`, [actionId]);
        if (bacs.length == 0)
        {
            return $ERRS.ERR_INVALID_ACTION_ID;
        }

        let bac = bacs[0];
        let module = bac.BAC_MODULE;
        let method = bac.BAC_METHOD;
        let data = bac.BAC_DATA;

        let rv = _impersonate(JSON.parse(bac.BAC_SESSION_INFO));
        if ($Err.isERR(rv))
        {
            this.setError(actionId, rc);
            return rv;
        }

        let session = $HttpContext.get("session");

        if (!$Utils.isset(global[module]) || !$Utils.isset(global[module][method]))
        {
            let rc = $Err.errWithInfo("ERR_INVALID_MODULE_OR_METHOD", `${actionId} - ${module}.${method}`);
            this.setError(actionId, rc);
            session.unimpersonate();
            return rc;
        }

        $Logger.logString($Const.LL_DEBUG, `Executing: ${module}.${method} (${actionId}, ${data})`);

        rv = global[module][method](actionId, JSON.parse(data));
        session.unimpersonate();

        if ($Err.isERR(rv))
        {
            $Logger.logString($Const.LL_DEBUG, `ERROR: Failed Bulk Action ${actionId} ${module}.${method}: ${JSON.stringify(rv)}`);
            this.setError(actionId, rv);
        }
        else
        {
            $Logger.logString($Const.LL_DEBUG, `Finished Bulk Action ${actionId} ${module}.${method}: ${JSON.stringify(rv)}`);
            this.setDone(actionId, rv);
        }

        return rv;
    },
}
