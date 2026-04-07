module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }

        $DataItems.define("notification_sound");
    }

    get_settings()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;

        // Fetch user settings, auto-create if not exists
        let rows = $Db.executeQuery(
            `SELECT UST_NOTIFICATION_SOUND_ID, UST_NOTIFICATION_SOUND_VOLUME,
                    UST_NOTIFICATION_SOUND_REPEAT_TIME, UST_LANGUAGE
             FROM \`user_settings\`
             WHERE UST_USR_ID=?`,
            [userId]);

        if (rows.length === 0)
        {
            // Create default settings for this user
            const now = $Utils.now();
            $Db.executeQuery(
                `INSERT INTO \`user_settings\` (UST_USR_ID, UST_CREATED_ON, UST_LAST_UPDATE)
                 VALUES (?, ?, ?)`,
                [userId, now, now]);

            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
            }

            rows = $Db.executeQuery(
                `SELECT UST_NOTIFICATION_SOUND_ID, UST_NOTIFICATION_SOUND_VOLUME,
                        UST_NOTIFICATION_SOUND_REPEAT_TIME, UST_LANGUAGE
                 FROM \`user_settings\`
                 WHERE UST_USR_ID=?`,
                [userId]);
        }

        const settings = rows[0];

        vals.notification_sound_id          = settings.UST_NOTIFICATION_SOUND_ID;
        vals.notification_sound_name        = $DataItems.getItemName(settings.UST_NOTIFICATION_SOUND_ID, "notification_sound") || settings.UST_NOTIFICATION_SOUND_ID;
        vals.notification_sound_volume      = Number(settings.UST_NOTIFICATION_SOUND_VOLUME);
        vals.notification_sound_repeat_time = Number(settings.UST_NOTIFICATION_SOUND_REPEAT_TIME);
        vals.language                       = settings.UST_LANGUAGE;

        return {...rc, ...vals};
    }

    update_settings()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;
        const now = $Utils.now();

        // Ensure settings row exists
        let rows = $Db.executeQuery(
            `SELECT UST_USR_ID
             FROM \`user_settings\`
             WHERE UST_USR_ID=?`,
            [userId]);

        if (rows.length === 0)
        {
            $Db.executeQuery(
                `INSERT INTO \`user_settings\` (UST_USR_ID, UST_CREATED_ON, UST_LAST_UPDATE)
                 VALUES (?, ?, ?)`,
                [userId, now, now]);

            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
            }
        }

        // Build dynamic SET clause for provided fields
        let setClauses = [];
        let setParams = [];

        // notification_sound_id
        if (!$Utils.empty(this.$notification_sound_id))
        {
            if (!$DataItems.isValidItemId(this.$notification_sound_id, "notification_sound"))
            {
                return $ERRS.ERR_INVALID_NOTIFICATION_SOUND;
            }
            setClauses.push("UST_NOTIFICATION_SOUND_ID=?");
            setParams.push(this.$notification_sound_id);
        }

        // notification_sound_volume
        if (Number(this.$notification_sound_volume) !== -1)
        {
            const volume = Number(this.$notification_sound_volume);
            if (isNaN(volume) || volume < 0 || volume > 100)
            {
                return $ERRS.ERR_INVALID_SOUND_VOLUME;
            }
            setClauses.push("UST_NOTIFICATION_SOUND_VOLUME=?");
            setParams.push(volume);
        }

        // notification_sound_repeat_time
        if (Number(this.$notification_sound_repeat_time) !== -1)
        {
            const repeatTime = Number(this.$notification_sound_repeat_time);
            if (isNaN(repeatTime) || repeatTime < 1)
            {
                return $ERRS.ERR_INVALID_REPEAT_TIME;
            }
            setClauses.push("UST_NOTIFICATION_SOUND_REPEAT_TIME=?");
            setParams.push(repeatTime);
        }

        // language
        if (!$Utils.empty(this.$language))
        {
            const supportedLanguages = ["en", "he"];
            if (!supportedLanguages.includes(this.$language))
            {
                return $ERRS.ERR_INVALID_LANGUAGE;
            }
            setClauses.push("UST_LANGUAGE=?");
            setParams.push(this.$language);
        }

        // Only update if there are changes
        if (setClauses.length > 0)
        {
            setClauses.push("UST_LAST_UPDATE=?");
            setParams.push(now);
            setParams.push(userId);

            $Db.executeQuery(
                `UPDATE \`user_settings\` SET ${setClauses.join(", ")} WHERE UST_USR_ID=?`,
                setParams);

            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        // Return updated settings
        const updatedRows = $Db.executeQuery(
            `SELECT UST_NOTIFICATION_SOUND_ID, UST_NOTIFICATION_SOUND_VOLUME,
                    UST_NOTIFICATION_SOUND_REPEAT_TIME, UST_LANGUAGE
             FROM \`user_settings\`
             WHERE UST_USR_ID=?`,
            [userId]);

        const settings = updatedRows[0];

        vals.notification_sound_id          = settings.UST_NOTIFICATION_SOUND_ID;
        vals.notification_sound_name        = $DataItems.getItemName(settings.UST_NOTIFICATION_SOUND_ID, "notification_sound") || settings.UST_NOTIFICATION_SOUND_ID;
        vals.notification_sound_volume      = Number(settings.UST_NOTIFICATION_SOUND_VOLUME);
        vals.notification_sound_repeat_time = Number(settings.UST_NOTIFICATION_SOUND_REPEAT_TIME);
        vals.language                       = settings.UST_LANGUAGE;

        return {...rc, ...vals};
    }
};
