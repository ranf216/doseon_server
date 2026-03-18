function getMedStatus(med, today)
{
	if (med.MED_FREQUENCY_TYPE === "when_necessary") return "active";
	if (!$Utils.empty(med.MED_DURATION) && med.MED_DURATION > 0)
	{
		let endDate = new $Date(med.MED_START_DATE);
		endDate.addDays(med.MED_DURATION);
		if (endDate.format("Y-m-d") < today) return "completed";
	}
	return "active";
}

module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

	get_group_list()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const userId = this.$Session.userId;
		const today = new $Date().format("Y-m-d");

		// Fetch all groups belonging to this user
		const groups = $Db.executeQuery(
			`SELECT MGR_ID, MGR_NAME, MGR_NOTE, MGR_CREATED_ON
			 FROM \`medication_group\`
			 WHERE MGR_USR_ID=? AND MGR_DELETED_ON IS NULL
			 ORDER BY MGR_NAME ASC`, [userId]);

		// Fetch all medications belonging to this user (for summary info)
		const medications = $Db.executeQuery(
			`SELECT MED_ID, MED_NAME, MED_DOSAGE_AMOUNT, MED_FREQUENCY_TYPE, MED_FREQUENCY_DATA,
					MED_START_DATE, MED_DURATION, MED_MGR_ID
			 FROM \`medication\`
			 WHERE MED_USR_ID=?
			 ORDER BY MED_NAME ASC`, [userId]);

		// Index medications by group_id
		let medsByGroup = {};
		for (let med of medications)
		{
			if (!$Utils.empty(med.MED_MGR_ID))
			{
				if (!medsByGroup[med.MED_MGR_ID]) medsByGroup[med.MED_MGR_ID] = [];
				medsByGroup[med.MED_MGR_ID].push({
					medication_id:		med.MED_ID,
					medication_name:	med.MED_NAME,
					status:				getMedStatus(med, today),
					dosage:				med.MED_DOSAGE_AMOUNT,
					next_taken_time:	$Funcs.getNextTakenTime(med, today),
				});
			}
		}

		// Build groups array
		vals.groups = [];
		for (let grp of groups)
		{
			let groupMeds = medsByGroup[grp.MGR_ID] || [];
			vals.groups.push({
				group_id:			grp.MGR_ID,
				group_name:			grp.MGR_NAME,
				group_note:			grp.MGR_NOTE || "",
				medication_count:	groupMeds.length,
				medications:		groupMeds,
			});
		}

		return {...rc, ...vals};
	}

	add_group()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const now = $Utils.now();
		const userId = this.$Session.userId;

		// Validate group_name is not empty
		if ($Utils.empty(this.$group_name))
		{
			return $ERRS.ERR_MEDICATION_GROUP_NAME_REQUIRED;
		}

		// Check for duplicate group name for the same user
		const existing = $Db.executeQuery(
			`SELECT MGR_ID FROM \`medication_group\` WHERE MGR_USR_ID=? AND MGR_NAME=? AND MGR_DELETED_ON IS NULL`,
			[userId, this.$group_name]);

		if (existing.length > 0)
		{
			return $ERRS.ERR_MEDICATION_GROUP_DUPLICATE_NAME;
		}

		$Db.executeQuery(
			`INSERT INTO \`medication_group\` (MGR_USR_ID, MGR_NAME, MGR_NOTE, MGR_CREATED_ON)
			 VALUES (?, ?, ?, ?)`,
			[userId, this.$group_name, this.$group_note || null, now]);

		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		vals.group_id = $Db.insertId();

		return {...rc, ...vals};
	}

	update_group()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const userId = this.$Session.userId;

		// Verify group exists and belongs to current user
		const groups = $Db.executeQuery(
			`SELECT MGR_ID FROM \`medication_group\` WHERE MGR_ID=? AND MGR_USR_ID=? AND MGR_DELETED_ON IS NULL`,
			[this.$group_id, userId]);

		if (groups.length === 0)
		{
			return $ERRS.ERR_MEDICATION_GROUP_NOT_FOUND;
		}

		// Build dynamic UPDATE
		const updateFields = [];
		const updateValues = [];

		if (!$Utils.empty(this.$group_name))
		{
			// Check for duplicate name (exclude current group)
			const existing = $Db.executeQuery(
				`SELECT MGR_ID FROM \`medication_group\` WHERE MGR_USR_ID=? AND MGR_NAME=? AND MGR_ID<>? AND MGR_DELETED_ON IS NULL`,
				[userId, this.$group_name, this.$group_id]);

			if (existing.length > 0)
			{
				return $ERRS.ERR_MEDICATION_GROUP_DUPLICATE_NAME;
			}

			updateFields.push('MGR_NAME = ?');
			updateValues.push(this.$group_name);
		}

		if (this.$group_note !== undefined && this.$group_note !== "")
		{
			updateFields.push('MGR_NOTE = ?');
			updateValues.push(this.$group_note);
		}

		if (updateFields.length > 0)
		{
			updateValues.push(this.$group_id);
			$Db.executeQuery(
				`UPDATE \`medication_group\` SET ${updateFields.join(', ')} WHERE MGR_ID=?`,
				updateValues);

			if ($Db.isError())
			{
				return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
			}
		}

		return {...rc, ...vals};
	}

	delete_group()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const now = $Utils.now();
		const userId = this.$Session.userId;

		// Verify group exists and belongs to current user
		const groups = $Db.executeQuery(
			`SELECT MGR_ID FROM \`medication_group\` WHERE MGR_ID=? AND MGR_USR_ID=? AND MGR_DELETED_ON IS NULL`,
			[this.$group_id, userId]);

		if (groups.length === 0)
		{
			return $ERRS.ERR_MEDICATION_GROUP_NOT_FOUND;
		}

		$Db.beginTransaction();

		// Move medications in this group to ungrouped (set MGR_ID to NULL)
		$Db.executeQuery(
			`UPDATE \`medication\` SET MED_MGR_ID=NULL WHERE MED_MGR_ID=? AND MED_USR_ID=?`,
			[this.$group_id, userId]);

		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		// Soft delete the group
		$Db.executeQuery(
			`UPDATE \`medication_group\` SET MGR_DELETED_ON=? WHERE MGR_ID=? AND MGR_USR_ID=?`,
			[now, this.$group_id, userId]);

		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		$Db.commitTransaction();

		return {...rc, ...vals};
	}

	get_group_details()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const userId = this.$Session.userId;
		const today = new $Date().format("Y-m-d");

		// Fetch group info
		const groups = $Db.executeQuery(
			`SELECT MGR_ID, MGR_NAME, MGR_NOTE, MGR_CREATED_ON
			 FROM \`medication_group\`
			 WHERE MGR_ID=? AND MGR_USR_ID=? AND MGR_DELETED_ON IS NULL`,
			[this.$group_id, userId]);

		if (groups.length === 0)
		{
			return $ERRS.ERR_MEDICATION_GROUP_NOT_FOUND;
		}

		const grp = groups[0];

		// Fetch medications in this group
		const medications = $Db.executeQuery(
			`SELECT MED_ID, MED_NAME, MED_TYPE, MED_DOSAGE_AMOUNT, MED_FREQUENCY_TYPE, MED_FREQUENCY_DATA,
					MED_START_DATE, MED_DURATION, MED_AVAILABLE_AMOUNT
			 FROM \`medication\`
			 WHERE MED_MGR_ID=? AND MED_USR_ID=?
			 ORDER BY MED_NAME ASC`,
			[this.$group_id, userId]);

		// Map medications
		let medItems = [];
		for (let med of medications)
		{
			medItems.push({
				medication_id:		med.MED_ID,
				medication_name:	med.MED_NAME,
				medication_type:	med.MED_TYPE,
				frequency:			med.MED_FREQUENCY_TYPE,
				dosage:				med.MED_DOSAGE_AMOUNT,
				status:				getMedStatus(med, today),
				next_taken_time:	$Funcs.getNextTakenTime(med, today),
				remaining_amount:	med.MED_AVAILABLE_AMOUNT,
			});
		}

		vals.group_id			= grp.MGR_ID;
		vals.group_name			= grp.MGR_NAME;
		vals.group_note			= grp.MGR_NOTE || "";
		vals.medication_count	= medItems.length;
		vals.medications		= medItems;

		return {...rc, ...vals};
	}
};
