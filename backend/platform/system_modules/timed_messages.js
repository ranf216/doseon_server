module.exports = class
{
    constructor(type)
    {
        this.type = type;
    }

    push(due, message, extraIndexInt = null, extraIndexStr = null)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery(`INSERT INTO \`timed_message\` (TIM_TYPE, TIM_CREATED_ON, TIM_DUE, TIM_TEXT, TIM_EXTRA_INDEX_INT, TIM_EXTRA_INDEX_STR) VALUES (?, ?, ?, ?, ?, ?)`,
                                [this.type, $Utils.now(), due, message, extraIndexInt, extraIndexStr]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }        

        return {...rc, ...vals};
    }

    pop()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let lockId = $Utils.uniqueHash();

        $Db.executeQuery("CALL prc_timed_message_set_lock(?, ?, ?)", [this.type, lockId, $Utils.now()]);
        if ($Db.isError())
        {
            vals.is_empty = true;
            vals.message_text = null;
            return {...rc, ...vals};
        }

        let tims = $Db.executeQuery("SELECT TIM_ID, TIM_TEXT FROM `timed_message` WHERE TIM_LOCK_ID=?", [lockId]);
        if ($Db.isError())
        {
            vals.is_empty = true;
            vals.message_text = null;
            return {...rc, ...vals};
        }

        if (tims.length == 0)
        {
            vals.is_empty = true;
            vals.message_text = null;
        }
        else
        {
            let tim = tims[0];

            $Logger.logString($Const.LL_DEBUG, `Popped timed_message id: ${tim.TIM_ID}, for type: ${this.type}`);
            vals.is_empty = false;
            vals.message_text = tim.TIM_TEXT;
            if ($Utils.empty(tim.TIM_ID))
            {
                $Logger.logString($Const.LL_ERROR, "TIM_ID is null!! " + JSON.stringify(tims));
                return $ERRS.ERR_DB_GENERAL_ERROR;
            }

            $Db.executeQuery(`DELETE FROM \`timed_message\` WHERE TIM_ID=?`, [tim.TIM_ID]);
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

            $Db.executeQuery("CALL prc_timed_message_set_lock_all(?, ?, ?)", [this.type, lockId, $Utils.now()]);
            if ($Db.isError())
            {
                vals.is_empty = true;
                vals.message_texts = [];
                return {...rc, ...vals};
            }

            let tims = $Db.executeQuery("SELECT TIM_ID, TIM_TEXT FROM `timed_message` WHERE TIM_LOCK_ID=?", [lockId]);
            if ($Db.isError())
            {
                vals.is_empty = true;
                vals.message_texts = [];
                return {...rc, ...vals};
            }

            if (tims.length == 0)
            {
                vals.is_empty = true;
                vals.message_texts = [];
            }
            else
            {
                const messages = [];
                let isSuccess = tims.every(tim =>
                {
                    $Logger.logString($Const.LL_DEBUG, `Popped message id: ${tim.TIM_ID}, for type: ${this.type}`);
                
                    if ($Utils.empty(tim.TIM_ID))
                    {
                        $Logger.logString($Const.LL_ERROR, "TIM_ID is null!! " + JSON.stringify(tims));
                        return false;
                    };
                    
                    messages.push(JSON.parse(tim.TIM_TEXT));

                    return true;
                });

                if (!isSuccess)
                {
                    return $ERRS.ERR_DB_GENERAL_ERROR;
                }

                vals.is_empty = false;
                vals.message_texts = messages;

                $Db.executeQuery("DELETE FROM `timed_message` WHERE TIM_LOCK_ID=?", [lockId]);
                if ($Db.isError())
                {
                    return $Err.DBError("ERR_DB_DELETE_ERROR", $Db.lastErrorMsg());
                }            
            }
        }
        catch(error)
        {
            $Logger.logString($Const.LL_ERROR, `$TimedMessages.popAll catch Error: ${JSON.stringify(error.message)}`);
            return $ERRS.ERR_UNKNOWN_ERROR;
        }

        return {...rc, ...vals};
    }

    getByExtraIndexInt(extraIndexInt)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let tims = $Db.executeQuery(`SELECT TIM_ID timed_message_id, TIM_TYPE type, TIM_DUE due_date, TIM_TEXT text
                                    FROM \`timed_message\`
                                    WHERE TIM_EXTRA_INDEX_INT=? AND TIM_TYPE=?
                                    ORDER BY TIM_ID ASC`, [extraIndexInt, this.type]);

        vals.messages = tims;
    
        return {...rc, ...vals};
    }

    getByExtraIndexStr(extraIndexStr)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let tims = $Db.executeQuery(`SELECT TIM_ID timed_message_id, TIM_TYPE type, TIM_DUE due_date, TIM_TEXT text
                                    FROM \`timed_message\`
                                    WHERE TIM_EXTRA_INDEX_STR=? AND TIM_TYPE=?
                                    ORDER BY TIM_ID ASC`, [extraIndexStr, this.type]);

        vals.messages = tims;
    
        return {...rc, ...vals};
    }

    remove(timedMessageId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery(`DELETE FROM \`timed_message\` WHERE TIM_ID=?`, [timedMessageId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_DELETE_ERROR", $Db.lastErrorMsg());
        }
    
        return {...rc, ...vals};
    }
}
