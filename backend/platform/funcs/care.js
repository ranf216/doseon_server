module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }

        $DataItems.define("care_request_status");
    }

    send_request()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;
        const now = $Utils.now();

        // At least one of phone_number or email must be provided
        const hasPhone = !$Utils.empty(this.$phone_number);
        const hasEmail = !$Utils.empty(this.$email);

        if (!hasPhone && !hasEmail)
        {
            return $ERRS.ERR_CARE_MISSING_PHONE_OR_EMAIL;
        }

        // Find the care taker user by phone number or email
        let takerRows;
        if (hasPhone)
        {
			const phoneNumber = $CountryUtils.getIntlPhoneNumber(this.$phone_number, "us");

            takerRows = $Db.executeQuery(
                `SELECT USR_ID
                 FROM \`user\`
                 WHERE USR_PHONE_NUM=? AND USR_PHONE_COUNTRY_CODE=? AND USR_DELETED_ON IS NULL AND USR_STATUS=1`,
                [phoneNumber.phoneNumber, phoneNumber.countryCode]);
        }
        else
        {
            takerRows = $Db.executeQuery(
                `SELECT USR_ID
                 FROM \`user\`
                 WHERE USR_EMAIL=? AND USR_DELETED_ON IS NULL AND USR_STATUS=1`,
                [this.$email]);
        }

        if (takerRows.length === 0)
        {
            return $ERRS.ERR_CARE_TAKER_NOT_FOUND;
        }

        const takerId = takerRows[0].USR_ID;

        // Cannot send request to yourself
        if (takerId === userId)
        {
            return $ERRS.ERR_CARE_CANNOT_REQUEST_SELF;
        }

        // Check if an active request already exists (not deleted, not removed/declined)
        const existingRows = $Db.executeQuery(
            `SELECT CRQ_ID, CRQ_STATUS
             FROM \`care_request\`
             WHERE CRQ_RECIPIENT_USR_ID=? AND CRQ_TAKER_USR_ID=?
                AND CRQ_STATUS IN (?, ?)
                AND CRQ_DELETED_ON IS NULL`,
            [userId, takerId, Number($Const.CARE_STATUS_REQUESTED), Number($Const.CARE_STATUS_ACCEPTED)]);

        if (existingRows.length > 0)
        {
            return $ERRS.ERR_CARE_REQUEST_ALREADY_EXISTS;
        }

        // Create the care request
        let friendlyName = null;
        if (!$Utils.empty(this.$friendly_name))
        {
            friendlyName = this.$friendly_name;
        }

        let message = null;
        if (!$Utils.empty(this.$message))
        {
            message = this.$message;
        }

        $Db.executeQuery(
            `INSERT INTO \`care_request\` (CRQ_RECIPIENT_USR_ID, CRQ_TAKER_USR_ID, CRQ_STATUS, CRQ_FRIENDLY_NAME_BY_RECIPIENT, CRQ_MESSAGE, CRQ_CREATED_ON, CRQ_LAST_UPDATE)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, takerId, Number($Const.CARE_STATUS_REQUESTED), friendlyName, message, now, now]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        vals.request_id = $Db.insertId();
        vals.request_status = Number($Const.CARE_STATUS_REQUESTED);

        return {...rc, ...vals};
    }

    respond_request()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;
        const now = $Utils.now();
        const action = Number(this.$action);

        // Validate action value
        if (action !== Number($Const.CARE_STATUS_ACCEPTED) && action !== Number($Const.CARE_STATUS_DECLINED))
        {
            return $ERRS.ERR_CARE_INVALID_ACTION;
        }

        // Fetch the request — current user must be the care taker
        const rows = $Db.executeQuery(
            `SELECT CRQ_ID, CRQ_STATUS, CRQ_RECIPIENT_USR_ID
             FROM \`care_request\`
             WHERE CRQ_ID=? AND CRQ_TAKER_USR_ID=? AND CRQ_DELETED_ON IS NULL`,
            [this.$request_id, userId]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_CARE_REQUEST_NOT_FOUND;
        }

        const request = rows[0];

        // Must be in Requested status
        if (Number(request.CRQ_STATUS) !== Number($Const.CARE_STATUS_REQUESTED))
        {
            return $ERRS.ERR_CARE_REQUEST_NOT_PENDING;
        }

        $Db.executeQuery(
            `UPDATE \`care_request\` SET CRQ_STATUS=?, CRQ_LAST_UPDATE=? WHERE CRQ_ID=?`,
            [action, now, this.$request_id]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        vals.request_id = Number(this.$request_id);
        vals.request_status = action;

        return {...rc, ...vals};
    }

    get_pending_requests()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;

        // Current user is the care taker — get pending requests addressed to them
        const rows = $Db.executeQuery(
            `SELECT CRQ_ID, CRQ_RECIPIENT_USR_ID, CRQ_MESSAGE, CRQ_CREATED_ON,
                    USD_FIRST_NAME, USD_LAST_NAME, USR_PHONE_NUM
             FROM \`care_request\`
                JOIN \`user\` ON CRQ_RECIPIENT_USR_ID = USR_ID
                JOIN \`user_details\` ON CRQ_RECIPIENT_USR_ID = USD_USR_ID
             WHERE CRQ_TAKER_USR_ID=?
                AND CRQ_STATUS=?
                AND CRQ_DELETED_ON IS NULL`,
            [userId, Number($Const.CARE_STATUS_REQUESTED)]);

        vals.pending_requests = rows.map(row => ({
            request_id:             row.CRQ_ID,
            care_recipient_id:      row.CRQ_RECIPIENT_USR_ID,
            care_recipient_name:    (row.USD_FIRST_NAME + " " + row.USD_LAST_NAME).trim(),
            message:                row.CRQ_MESSAGE || "",
            phone_number:           row.USR_PHONE_NUM || "",
            created_at:             new $Date(row.CRQ_CREATED_ON).format(),
        }));

        return {...rc, ...vals};
    }

    get_care_recipients()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;

        // Current user is care taker — get accepted care recipients
        const rows = $Db.executeQuery(
            `SELECT CRQ_RECIPIENT_USR_ID, CRQ_FRIENDLY_NAME_BY_TAKER, CRQ_STATUS,
                    USD_FIRST_NAME, USD_LAST_NAME, USR_PHONE_NUM
             FROM \`care_request\`
                JOIN \`user\` ON CRQ_RECIPIENT_USR_ID = USR_ID
                JOIN \`user_details\` ON CRQ_RECIPIENT_USR_ID = USD_USR_ID
             WHERE CRQ_TAKER_USR_ID=?
                AND CRQ_STATUS=?
                AND CRQ_DELETED_ON IS NULL`,
            [userId, Number($Const.CARE_STATUS_ACCEPTED)]);

        vals.care_recipients = rows.map(row => ({
            care_recipient_id:  row.CRQ_RECIPIENT_USR_ID,
            friendly_name:      row.CRQ_FRIENDLY_NAME_BY_TAKER || (row.USD_FIRST_NAME + " " + row.USD_LAST_NAME).trim(),
            phone_number:       row.USR_PHONE_NUM || "",
            status:             Number(row.CRQ_STATUS),
        }));

        return {...rc, ...vals};
    }

    get_care_recipients_overview()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;
        const today = new $Date().format("Y-m-d");

        // Current user is care taker — get accepted care recipients
        const recipients = $Db.executeQuery(
            `SELECT CRQ_RECIPIENT_USR_ID, CRQ_FRIENDLY_NAME_BY_TAKER,
                    USD_FIRST_NAME, USD_LAST_NAME
             FROM \`care_request\`
                JOIN \`user_details\` ON CRQ_RECIPIENT_USR_ID = USD_USR_ID
             WHERE CRQ_TAKER_USR_ID=?
                AND CRQ_STATUS=?
                AND CRQ_DELETED_ON IS NULL`,
            [userId, Number($Const.CARE_STATUS_ACCEPTED)]);

        if (recipients.length === 0)
        {
            vals.care_recipients = [];
            return {...rc, ...vals};
        }

        // Collect all recipient IDs and fetch all their medications in one query
        const recipientIds = recipients.map(r => r.CRQ_RECIPIENT_USR_ID);
        const medications = $Db.executeQuery(
            `SELECT MED_ID, MED_USR_ID, MED_NAME, MED_TYPE, MED_DOSAGE_AMOUNT,
                    MED_FREQUENCY_TYPE, MED_FREQUENCY_DATA, MED_START_DATE, MED_DURATION
             FROM \`medication\`
             WHERE MED_USR_ID IN (${recipientIds.toPlaceholders()}) AND MED_DELETED_ON IS NULL
             ORDER BY MED_NAME ASC`,
            recipientIds);

        // Group medications by user ID
        let medsByUser = {};
        for (let med of medications)
        {
            if (!medsByUser[med.MED_USR_ID])
            {
                medsByUser[med.MED_USR_ID] = [];
            }

            medsByUser[med.MED_USR_ID].push({
                medication_id:      med.MED_ID,
                medication_name:    med.MED_NAME,
                medication_type:    med.MED_TYPE,
                dosage_amount:      med.MED_DOSAGE_AMOUNT,
                frequency_type:     med.MED_FREQUENCY_TYPE,
                next_taken_time:    $Funcs.getNextTakenTime(med, today),
            });
        }

        vals.care_recipients = recipients.map(row => ({
            care_recipient_id:  row.CRQ_RECIPIENT_USR_ID,
            friendly_name:      row.CRQ_FRIENDLY_NAME_BY_TAKER || (row.USD_FIRST_NAME + " " + row.USD_LAST_NAME).trim(),
            medications:        medsByUser[row.CRQ_RECIPIENT_USR_ID] || [],
        }));

        return {...rc, ...vals};
    }

    get_care_recipient_detail()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;
        const careRecipientId = this.$care_recipient_id;

        // Verify that current user is an accepted care taker for this recipient
        const reqRows = $Db.executeQuery(
            `SELECT CRQ_ID, CRQ_FRIENDLY_NAME_BY_TAKER, CRQ_CREATED_ON, USD_FIRST_NAME, USD_LAST_NAME, USD_PHONE_NUM, USD_PHONE_COUNTRY_CODE
             FROM \`care_request\`
                JOIN \`user_details\` ON CRQ_RECIPIENT_USR_ID = USD_USR_ID
             WHERE CRQ_TAKER_USR_ID=? AND CRQ_RECIPIENT_USR_ID=?
                AND CRQ_STATUS=?
                AND CRQ_DELETED_ON IS NULL`,
            [userId, careRecipientId, Number($Const.CARE_STATUS_ACCEPTED)]);

        if (reqRows.length === 0)
        {
            return $ERRS.ERR_CARE_RECIPIENT_NOT_FOUND;
        }

        const careRequest = reqRows[0];

        vals.friendly_name = careRequest.CRQ_FRIENDLY_NAME_BY_TAKER || (careRequest.USD_FIRST_NAME + " " + careRequest.USD_LAST_NAME).trim();
        vals.phone_number = $CountryUtils.makeIntlPhoneNumber(careRequest.USD_PHONE_NUM, careRequest.USD_PHONE_COUNTRY_CODE) || "";
        vals.adding_date = new $Date(careRequest.CRQ_CREATED_ON).format();

        // Get medications of the care recipient
        const medications = $Db.executeQuery(
            `SELECT MED_ID, MED_NAME, MED_FREQUENCY_TYPE, MED_FREQUENCY_DATA,
                    MED_DOSAGE_AMOUNT, MED_TYPE, MED_START_DATE, MED_DURATION
             FROM \`medication\`
             WHERE MED_USR_ID=? AND MED_DELETED_ON IS NULL
             ORDER BY MED_NAME ASC`,
            [careRecipientId]);

        vals.medications = medications.map(med =>
        {
            let endDate = null;
            if (!$Utils.empty(med.MED_DURATION) && med.MED_DURATION > 0)
            {
                let ed = new $Date(med.MED_START_DATE);
                ed.addDays(med.MED_DURATION);
                endDate = ed.format("Y-m-d");
            }

            return {
                medication_id:      med.MED_ID,
                medication_name:    med.MED_NAME,
                frequency:          $DataItems.getItemName(med.MED_FREQUENCY_TYPE, "frequency_type") || med.MED_FREQUENCY_TYPE,
                dosage:             med.MED_DOSAGE_AMOUNT + " " + ($DataItems.getItemName(med.MED_TYPE, "medication_type") || med.MED_TYPE),
                start_date:         new $Date(med.MED_START_DATE).format("Y-m-d"),
                end_date:           endDate,
            };
        });

        // Get recent reminders (recent taken records)
        const reminders = $Db.executeQuery(
            `SELECT MTK_MED_ID, MTK_TAKEN_ON, MTK_SCHEDULED_TIME, MED_NAME
             FROM \`medication_taken\`
                JOIN \`medication\` ON MTK_MED_ID = MED_ID AND MED_DELETED_ON IS NULL
             WHERE MTK_USR_ID=?
             ORDER BY MTK_TAKEN_ON DESC
             LIMIT 20`,
            [careRecipientId]);

        vals.recent_reminders = reminders.map(row =>
        {
            let status = "taken";
            if (row.MTK_SCHEDULED_TIME)
            {
                const scheduled = new $Date(row.MTK_SCHEDULED_TIME);
                const taken = new $Date(row.MTK_TAKEN_ON);
                const diffMinutes = (taken.getTimestamp() - scheduled.getTimestamp()) / 60;
                if (diffMinutes <= 30)
                {
                    status = "on_time";
                }
                else
                {
                    status = "late";
                }
            }

            return {
                medication_id:      row.MTK_MED_ID,
                medication_name:    row.MED_NAME,
                schedule_time:      row.MTK_SCHEDULED_TIME ? new $Date(row.MTK_SCHEDULED_TIME).format() : null,
                taken_time:         new $Date(row.MTK_TAKEN_ON).format(),
                status:             status,
            };
        });

        // Statistics
        let statsWhereParams = [careRecipientId];
        const statsRows = $Db.executeQuery(
            `SELECT MTK_TAKEN_ON, MTK_SCHEDULED_TIME
             FROM \`medication_taken\`
             WHERE MTK_USR_ID=?`,
            statsWhereParams);

        let totalScheduledPassed = 0;
        let onTimeTaken = 0;
        let lateTaken = 0;
        let missedTaken = 0;

        for (let row of statsRows)
        {
            if (row.MTK_SCHEDULED_TIME)
            {
                totalScheduledPassed++;
                const scheduled = new $Date(row.MTK_SCHEDULED_TIME);
                const taken = new $Date(row.MTK_TAKEN_ON);
                const diffMinutes = (taken.getTimestamp() - scheduled.getTimestamp()) / 60;

                if (diffMinutes <= 30)
                {
                    onTimeTaken++;
                }
                else
                {
                    lateTaken++;
                }
            }
            else
            {
                totalScheduledPassed++;
                onTimeTaken++;
            }
        }

        vals.statistic = {
            total_scheduled_passed: totalScheduledPassed,
            on_time_taken:          onTimeTaken,
            lated_taken:            lateTaken,
            missed_taken:           missedTaken,
        };

        return {...rc, ...vals};
    }

    remove_care_recipient()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;
        const now = $Utils.now();

        // Current user is the care taker — remove the care recipient
        const rows = $Db.executeQuery(
            `SELECT CRQ_ID
             FROM \`care_request\`
             WHERE CRQ_TAKER_USR_ID=? AND CRQ_RECIPIENT_USR_ID=?
                AND CRQ_STATUS=?
                AND CRQ_DELETED_ON IS NULL`,
            [userId, this.$care_recipient_id, Number($Const.CARE_STATUS_ACCEPTED)]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_CARE_RECIPIENT_NOT_FOUND;
        }

        $Db.executeQuery(
            `UPDATE \`care_request\` SET CRQ_STATUS=?, CRQ_LAST_UPDATE=? WHERE CRQ_ID=?`,
            [Number($Const.CARE_STATUS_REMOVED), now, rows[0].CRQ_ID]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }

    get_care_takers()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;

        // Current user is the care recipient — get all non-deleted care requests
        const rows = $Db.executeQuery(
            `SELECT CRQ_TAKER_USR_ID, CRQ_FRIENDLY_NAME_BY_RECIPIENT, CRQ_STATUS,
                    USD_FIRST_NAME, USD_LAST_NAME, USR_PHONE_NUM
             FROM \`care_request\`
                JOIN \`user\` ON CRQ_TAKER_USR_ID = USR_ID
                JOIN \`user_details\` ON CRQ_TAKER_USR_ID = USD_USR_ID
             WHERE CRQ_RECIPIENT_USR_ID=?
                AND CRQ_STATUS IN (?, ?, ?)
                AND CRQ_DELETED_ON IS NULL`,
            [userId, Number($Const.CARE_STATUS_REQUESTED), Number($Const.CARE_STATUS_ACCEPTED), Number($Const.CARE_STATUS_DECLINED)]);

        vals.caretakers = rows.map(row => ({
            care_taker_id:      row.CRQ_TAKER_USR_ID,
            friendly_name:      row.CRQ_FRIENDLY_NAME_BY_RECIPIENT || (row.USD_FIRST_NAME + " " + row.USD_LAST_NAME).trim(),
            phone_number:       row.USR_PHONE_NUM || "",
            request_status:     Number(row.CRQ_STATUS),
        }));

        return {...rc, ...vals};
    }

    update_friendly_name()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;
        const now = $Utils.now();
        const friendlyNameType = Number(this.$friendly_name_type);

        // Validate friendly_name_type
        if (friendlyNameType !== 1 && friendlyNameType !== 2)
        {
            return $ERRS.ERR_CARE_INVALID_FRIENDLY_NAME_TYPE;
        }

        if (friendlyNameType === 1)
        {
            // Current user is the care recipient, user_id is the care taker
            const rows = $Db.executeQuery(
                `SELECT CRQ_ID
                 FROM \`care_request\`
                 WHERE CRQ_RECIPIENT_USR_ID=? AND CRQ_TAKER_USR_ID=?
                    AND CRQ_STATUS IN (?, ?)
                    AND CRQ_DELETED_ON IS NULL`,
                [userId, this.$user_id, Number($Const.CARE_STATUS_REQUESTED), Number($Const.CARE_STATUS_ACCEPTED)]);

            if (rows.length === 0)
            {
                return $ERRS.ERR_CARE_REQUEST_NOT_FOUND;
            }

            $Db.executeQuery(
                `UPDATE \`care_request\` SET CRQ_FRIENDLY_NAME_BY_RECIPIENT=?, CRQ_LAST_UPDATE=? WHERE CRQ_ID=?`,
                [this.$friendly_name, now, rows[0].CRQ_ID]);
        }
        else
        {
            // Current user is the care taker, user_id is the care recipient
            const rows = $Db.executeQuery(
                `SELECT CRQ_ID
                 FROM \`care_request\`
                 WHERE CRQ_TAKER_USR_ID=? AND CRQ_RECIPIENT_USR_ID=?
                    AND CRQ_STATUS=?
                    AND CRQ_DELETED_ON IS NULL`,
                [userId, this.$user_id, Number($Const.CARE_STATUS_ACCEPTED)]);

            if (rows.length === 0)
            {
                return $ERRS.ERR_CARE_REQUEST_NOT_FOUND;
            }

            $Db.executeQuery(
                `UPDATE \`care_request\` SET CRQ_FRIENDLY_NAME_BY_TAKER=?, CRQ_LAST_UPDATE=? WHERE CRQ_ID=?`,
                [this.$friendly_name, now, rows[0].CRQ_ID]);
        }

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }

    remove_care_taker()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;
        const now = $Utils.now();

        // Current user is the care recipient — remove the care taker
        const rows = $Db.executeQuery(
            `SELECT CRQ_ID
             FROM \`care_request\`
             WHERE CRQ_RECIPIENT_USR_ID=? AND CRQ_TAKER_USR_ID=?
                AND CRQ_STATUS IN (?, ?)
                AND CRQ_DELETED_ON IS NULL`,
            [userId, this.$care_taker_id, Number($Const.CARE_STATUS_REQUESTED), Number($Const.CARE_STATUS_ACCEPTED)]);

        if (rows.length === 0)
        {
            return $ERRS.ERR_CARE_TAKER_NOT_FOUND;
        }

        $Db.executeQuery(
            `UPDATE \`care_request\` SET CRQ_STATUS=?, CRQ_LAST_UPDATE=? WHERE CRQ_ID=?`,
            [Number($Const.CARE_STATUS_REMOVED), now, rows[0].CRQ_ID]);

        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }
};
