module.exports = class
{
    constructor(queueId)
    {
        this.queueId = queueId;
    }

    push(message)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery("INSERT INTO `queue` (QUE_ID, QUE_CREATED_ON, QUE_TEXT) VALUES (?, ?, ?)", [this.queueId, $Utils.now(), message]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        let queId = $Db.insertId();

        $Logger.logString($Const.LL_DEBUG, `Pushed message id: ${queId}, on queue: ${this.queueId}, message: ${message}`);

        return {...rc, ...vals};
    }

    pop()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let lockId = $Utils.uniqueHash();

        $Db.executeQuery("CALL prc_queue_set_lock(?, ?)", [this.queueId, lockId]);
        if ($Db.isError())
        {
            vals.is_empty = true;
            vals.message_text = null;
            return {...rc, ...vals};
        }

        let ques = $Db.executeQuery("SELECT QUE_MSG_ID, QUE_TEXT FROM `queue` WHERE QUE_LOCK_ID=?", [lockId]);
        if ($Db.isError())
        {
            vals.is_empty = true;
            vals.message_text = null;
            return {...rc, ...vals};
        }
        
        if (ques.length == 0)
        {
            vals.is_empty = true;
            vals.message_text = null;
        }
        else
        {
            $Logger.logString($Const.LL_DEBUG, `Popped message id: ${ques[0].QUE_MSG_ID}, on queue: ${this.queueId}`);
            vals.is_empty = false;
            vals.message_text = ques[0].QUE_TEXT;
            if ($Utils.empty(ques[0].QUE_MSG_ID))
            {
                $Logger.logString($Const.LL_ERROR, "QUE_MSG_ID is null!! " + JSON.stringify(ques));
                return $ERRS.ERR_DB_GENERAL_ERROR;
            }

            $Db.executeQuery("DELETE FROM `queue` WHERE QUE_MSG_ID=?", [ques[0].QUE_MSG_ID]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_DELETE_ERROR", $Db.lastErrorMsg());
            }            
        }

        return {...rc, ...vals};
    }

    popAll()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        try
        {
            let lockId = $Utils.uniqueHash();

            $Db.executeQuery("CALL prc_queue_set_lock_all(?, ?)", [this.queueId, lockId]);
            if ($Db.isError())
            {
                vals.is_empty = true;
                vals.message_text = null;
                return {...rc, ...vals};
            }
    
            let ques = $Db.executeQuery("SELECT QUE_MSG_ID, QUE_TEXT FROM `queue` WHERE QUE_LOCK_ID=?", [lockId]);
            if ($Db.isError())
            {
                vals.is_empty = true;
                vals.message_text = null;
                return {...rc, ...vals};
            }
    
            if (ques.length == 0)
            {
                vals.is_empty = true;
                vals.message_texts = [];
            }
            else
            {
                const messages = [];
                let isSuccess = ques.every(que =>
                {
                    $Logger.logString($Const.LL_DEBUG, `Popped message id: ${que.QUE_MSG_ID}, on queue: ${this.queueId}`);
              
                    if ($Utils.empty(que.QUE_MSG_ID))
                    {
                        $Logger.logString($Const.LL_ERROR, "QUE_MSG_ID is null!! " + JSON.stringify(ques));
                        return false;
                    };
                    
                    messages.push(JSON.parse(que.QUE_TEXT));

                    return true;
                });

                if (!isSuccess)
                {
                    return $ERRS.ERR_DB_GENERAL_ERROR;
                }
                else
                {
                    vals.is_empty = false;
                    vals.message_texts = messages;
                };
    
                $Db.executeQuery("DELETE FROM `queue` WHERE QUE_LOCK_ID=?", [lockId]);
                if ($Db.isError())
                {
                    return $Err.DBError("ERR_DB_DELETE_ERROR", $Db.lastErrorMsg());
                }            
            }
        }
        catch(error)
        {
            $Logger.logString($Const.LL_ERROR, `$MessageQueue.popAll catch Error: ${JSON.stringify(error.message)}`);
            return $ERRS.ERR_UNKNOWN_ERROR;
        }

        return {...rc, ...vals};
    }

    top()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let ques = $Db.executeQuery("SELECT QUE_TEXT FROM `queue` WHERE QUE_ID=? ORDER BY QUE_MSG_ID ASC LIMIT 1", [this.queueId]);

        if (ques.length == 0)
        {
            vals.is_empty = true;
            vals.message_text = null;
        }
        else
        {
            vals.is_empty = false;
            vals.message_text = ques[0].QUE_TEXT;
        }

        return {...rc, ...vals};
    }

    size()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let ques = $Db.executeQuery("SELECT count(*) cnt FROM `queue` WHERE QUE_ID=?", [this.queueId]);
        vals.size = ques[0].cnt;

        return {...rc, ...vals};
    }

    clear()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery("DELETE FROM `queue` WHERE QUE_ID=?", [this.queueId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_DELETE_ERROR", $Db.lastErrorMsg());
        }        

        return {...rc, ...vals};
    }
}
