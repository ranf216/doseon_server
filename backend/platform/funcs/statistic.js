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

    get_user_statistics()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;

        // Validate date parameters
        const dateValidation = this._validateDateParams(this.$from_date, this.$to_date);
        if (dateValidation !== null)
        {
            return dateValidation;
        }

        const stats = this._calculateStatistics(userId, this.$from_date, this.$to_date);

        vals.total_scheduled_passed = stats.total_scheduled_passed;
        vals.on_time_taken          = stats.on_time_taken;
        vals.lated_taken            = stats.lated_taken;
        vals.missed_taken           = stats.missed_taken;

        return {...rc, ...vals};
    }

    get_care_recipient_statistics()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        const userId = this.$Session.userId;
        const recipientId = this.$recipient_id;

        // Verify that current user is an accepted care taker for this recipient
        const reqRows = $Db.executeQuery(
            `SELECT CRQ_ID
             FROM \`care_request\`
             WHERE CRQ_TAKER_USR_ID=? AND CRQ_RECIPIENT_USR_ID=?
                AND CRQ_STATUS=?
                AND CRQ_DELETED_ON IS NULL`,
            [userId, recipientId, Number($Const.CARE_STATUS_ACCEPTED)]);

        if (reqRows.length === 0)
        {
            return $ERRS.ERR_STAT_RECIPIENT_NOT_FOUND;
        }

        // Validate date parameters
        const dateValidation = this._validateDateParams(this.$from_date, this.$to_date);
        if (dateValidation !== null)
        {
            return dateValidation;
        }

        const stats = this._calculateStatistics(recipientId, this.$from_date, this.$to_date);

        vals.total_scheduled_passed = stats.total_scheduled_passed;
        vals.on_time_taken          = stats.on_time_taken;
        vals.lated_taken            = stats.lated_taken;
        vals.missed_taken           = stats.missed_taken;

        return {...rc, ...vals};
    }

    _validateDateParams(fromDate, toDate)
    {
        if (!$Utils.empty(fromDate))
        {
            if (!$Utils.validateDateStr(fromDate))
            {
                return $ERRS.ERR_STAT_INVALID_DATE_FORMAT;
            }
        }

        if (!$Utils.empty(toDate))
        {
            if (!$Utils.validateDateStr(toDate))
            {
                return $ERRS.ERR_STAT_INVALID_DATE_FORMAT;
            }
        }

        if (!$Utils.empty(fromDate) && !$Utils.empty(toDate))
        {
            if (fromDate > toDate)
            {
                return $ERRS.ERR_STAT_INVALID_DATE_RANGE;
            }
        }

        return null;
    }

    _calculateStatistics(targetUserId, fromDate, toDate)
    {
        // Determine effective date range
        let effectiveFromDate = null;
        let effectiveToDate = null;

        if (!$Utils.empty(fromDate))
        {
            effectiveFromDate = fromDate;
        }

        if (!$Utils.empty(toDate))
        {
            effectiveToDate = toDate;
        }

        // Fetch all active medications for the user
        const medications = $Db.executeQuery(
            `SELECT MED_ID, MED_FREQUENCY_TYPE, MED_FREQUENCY_DATA, MED_START_DATE, MED_DURATION
             FROM \`medication\`
             WHERE MED_USR_ID=? AND MED_DELETED_ON IS NULL`,
            [targetUserId]);

        // Fetch taken records with optional date filtering
        let takenWhere = "MTK_USR_ID=?";
        let takenParams = [targetUserId];

        if (effectiveFromDate)
        {
            takenWhere += " AND MTK_SCHEDULED_TIME>=?";
            takenParams.push(effectiveFromDate + " 00:00:00");
        }

        if (effectiveToDate)
        {
            takenWhere += " AND MTK_SCHEDULED_TIME<=?";
            takenParams.push(effectiveToDate + " 23:59:59");
        }

        const takenRows = $Db.executeQuery(
            `SELECT MTK_MED_ID, MTK_TAKEN_ON, MTK_SCHEDULED_TIME
             FROM \`medication_taken\`
             WHERE ${takenWhere}`,
            takenParams);

        // Build a set of taken scheduled times per medication for quick lookup
        let takenByMed = {};
        for (let row of takenRows)
        {
            if (!takenByMed[row.MTK_MED_ID])
            {
                takenByMed[row.MTK_MED_ID] = [];
            }
            takenByMed[row.MTK_MED_ID].push(row);
        }

        let totalScheduledPassed = 0;
        let onTimeTaken = 0;
        let lateTaken = 0;
        let missedTaken = 0;

        const now = new $Date();
        const today = now.format("Y-m-d");
        const nowStr = now.format("Y-m-d H:i:s");

        // For each medication, iterate over the date range and calculate scheduled times
        for (let med of medications)
        {
            if (med.MED_FREQUENCY_TYPE === "when_necessary") continue;

            const medStartDate = new $Date(med.MED_START_DATE).format("Y-m-d");

            // Determine the medication end date
            let medEndDate = null;
            if (!$Utils.empty(med.MED_DURATION) && med.MED_DURATION > 0)
            {
                let ed = new $Date(med.MED_START_DATE);
                ed.addDays(med.MED_DURATION);
                medEndDate = ed.format("Y-m-d");
            }

            // Determine iteration range
            let iterStart = medStartDate;
            if (effectiveFromDate && effectiveFromDate > iterStart)
            {
                iterStart = effectiveFromDate;
            }

            let iterEnd = today;
            if (effectiveToDate && effectiveToDate < iterEnd)
            {
                iterEnd = effectiveToDate;
            }
            if (medEndDate && medEndDate < iterEnd)
            {
                iterEnd = medEndDate;
            }

            if (iterStart > iterEnd) continue;

            // Get the taken records for this medication
            const medTakenRecords = takenByMed[med.MED_ID] || [];

            // Build a map of scheduled_time -> taken record for quick matching
            let takenByScheduledTime = {};
            for (let tr of medTakenRecords)
            {
                if (tr.MTK_SCHEDULED_TIME)
                {
                    const key = new $Date(tr.MTK_SCHEDULED_TIME).format("Y-m-d H:i");
                    takenByScheduledTime[key] = tr;
                }
            }

            // Iterate day by day
            let currentDate = new $Date(iterStart);
            const endDate = new $Date(iterEnd);

            while (currentDate.format("Y-m-d") <= endDate.format("Y-m-d"))
            {
                const dateStr = currentDate.format("Y-m-d");
                const scheduledTimes = $Funcs.getScheduledTimesForDate(med, dateStr);

                for (let time of scheduledTimes)
                {
                    const scheduledDateTime = dateStr + " " + time;

                    // Only count scheduled times that have already passed
                    if (scheduledDateTime > nowStr) continue;

                    totalScheduledPassed++;

                    const takenKey = dateStr + " " + time;
                    const takenRecord = takenByScheduledTime[takenKey];

                    if (takenRecord)
                    {
                        const scheduled = new $Date(takenRecord.MTK_SCHEDULED_TIME);
                        const taken = new $Date(takenRecord.MTK_TAKEN_ON);
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
                        missedTaken++;
                    }
                }

                currentDate.addDays(1);
            }
        }

        return {
            total_scheduled_passed: totalScheduledPassed,
            on_time_taken:          onTimeTaken,
            lated_taken:            lateTaken,
            missed_taken:           missedTaken,
        };
    }
};
