module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

	get_medication_list()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const userId = this.$Session.userId;
		const today = new $Date().format("Y-m-d");

		// Fetch all groups belonging to this user
		const groups = $Db.executeQuery(
			`SELECT MGR_ID, MGR_NAME, MGR_NOTE
			 FROM \`medication_group\`
			 WHERE MGR_USR_ID=? AND MGR_DELETED_ON IS NULL
			 ORDER BY MGR_NAME ASC`, [userId]);

		// Fetch all medications belonging to this user
		const medications = $Db.executeQuery(
			`SELECT MED_ID, MED_NAME, MED_TYPE, MED_DOSAGE_AMOUNT, MED_FREQUENCY_TYPE, MED_FREQUENCY_DATA,
					MED_START_DATE, MED_DURATION, MED_AVAILABLE_AMOUNT, MED_MGR_ID
			 FROM \`medication\`
			 WHERE MED_USR_ID=? AND MED_DELETED_ON IS NULL
			 ORDER BY MED_NAME ASC`, [userId]);

		// Helper: determine medication status ("active" or "completed")
		const getMedStatus = (med) =>
		{
			if (med.MED_FREQUENCY_TYPE === "when_necessary") return "active";
			if (!$Utils.empty(med.MED_DURATION) && med.MED_DURATION > 0)
			{
				let endDate = new $Date(med.MED_START_DATE);
				endDate.addDays(med.MED_DURATION);
				if (endDate.format("Y-m-d") < today) return "completed";
			}
			return "active";
		};

		// Helper: compute next_taken_time from frequency_data
		const getNextTakenTime = (med) =>
		{
			if (med.MED_FREQUENCY_TYPE === "when_necessary") return null;

			let freqData = null;
			if (!$Utils.empty(med.MED_FREQUENCY_DATA))
			{
				try { freqData = JSON.parse(med.MED_FREQUENCY_DATA); }
				catch(e) { return null; }
			}
			if (!freqData || !freqData.times || freqData.times.length === 0) return null;

			const nowTime = new $Date().format("H:i");
			const sortedTimes = freqData.times.slice().sort();
			for (let t of sortedTimes)
			{
				if (t > nowTime) return today + " " + t;
			}
			// All times passed today, return first time tomorrow
			let tomorrow = new $Date();
			tomorrow.addDays(1);
			return tomorrow.format("Y-m-d") + " " + sortedTimes[0];
		};

		// Map a DB row to an API medication item
		const mapMedication = (med) =>
		{
			let item = {
				medication_id:		med.MED_ID,
				medication_name:	med.MED_NAME,
				medication_type:	med.MED_TYPE,
				dosage:				med.MED_DOSAGE_AMOUNT,
				status:				getMedStatus(med),
				next_taken_time:	getNextTakenTime(med),
				remaining_amount:	med.MED_AVAILABLE_AMOUNT,
			};
			return item;
		};

		// Index medications by group_id
		let medsByGroup = {};	// group_id -> [medication items]
		let ungrouped = [];

		for (let med of medications)
		{
			let mapped = mapMedication(med);
			if (!$Utils.empty(med.MED_MGR_ID))
			{
				if (!medsByGroup[med.MED_MGR_ID]) medsByGroup[med.MED_MGR_ID] = [];
				medsByGroup[med.MED_MGR_ID].push(mapped);
			}
			else
			{
				ungrouped.push(mapped);
			}
		}

		// Build group_list
		vals.group_list = [];
		for (let grp of groups)
		{
			let groupMeds = medsByGroup[grp.MGR_ID] || [];
			vals.group_list.push({
				group_id:			grp.MGR_ID,
				group_name:			grp.MGR_NAME,
				group_note:			grp.MGR_NOTE || "",
				medication_count:	groupMeds.length,
				medications:		groupMeds,
			});
		}

		vals.ungrouped_medications = ungrouped;

		return {...rc, ...vals};
	}

	add_medication()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const now = $Utils.now();
		const userId = this.$Session.userId;

		// Validate medication_type
		if (!$DataItems.isValidItemId(this.$medication_type, "medication_type"))
		{
			return $ERRS.ERR_INVALID_MEDICATION_TYPE;
		}

		// Validate frequency_type
		if (!$DataItems.isValidItemId(this.$frequency_type, "frequency_type"))
		{
			return $ERRS.ERR_INVALID_FREQUENCY_TYPE;
		}

		// Validate frequency_data JSON if provided
		let frequencyData = null;
		if (!$Utils.empty(this.$frequency_data))
		{
			try
			{
				JSON.parse(this.$frequency_data);
				frequencyData = this.$frequency_data;
			}
			catch (e)
			{
				return $ERRS.ERR_INVALID_FREQUENCY_DATA;
			}
		}

		// Validate and default start_date to today if not provided
		let startDate = new $Date().format("Y-m-d");
		if (!$Utils.empty(this.$start_date))
		{
			startDate = $Utils.validateDateStr(this.$start_date);
			if (!startDate)
			{
				return $ERRS.ERR_INVALID_START_DATE;
			}
		}

		// Validate group_id exists if provided
		let groupId = null;
		if (!$Utils.empty(this.$group_id) && this.$group_id > 0)
		{
			const groups = $Db.executeQuery(`SELECT MGR_ID FROM \`medication_group\` WHERE MGR_ID=? AND MGR_USR_ID=? AND MGR_DELETED_ON IS NULL`, [this.$group_id, userId]);
			if (groups.length === 0)
			{
				return $ERRS.ERR_INVALID_MEDICATION_GROUP;
			}
			groupId = this.$group_id;
		}

		// Save medication image if provided
		let imageName = "";
		if (!$Utils.empty(this.$medication_image))
		{
			const rv = $Utils.saveNewImageOrKeepOld(userId, this.$medication_image, null, "medicine");
			if ($Err.isERR(rv))
			{
				return rv;
			}
			imageName = rv.image_name;
		}

		// Duration and available_amount (0 treated as null)
		let duration = (!$Utils.empty(this.$duration) && this.$duration > 0) ? this.$duration : null;
		let availableAmount = (!$Utils.empty(this.$available_amount) && this.$available_amount > 0) ? this.$available_amount : null;

		$Db.executeQuery(`INSERT INTO \`medication\` (MED_USR_ID, MED_NAME, MED_TYPE, MED_DOSAGE_AMOUNT, MED_FREQUENCY_TYPE, MED_FREQUENCY_DATA, MED_START_DATE, MED_DURATION, MED_AVAILABLE_AMOUNT, MED_MGR_ID, MED_NOTES, MED_IMAGE, MED_CREATED_ON)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
						[userId, this.$medication_name, this.$medication_type, this.$dosage_amount, this.$frequency_type, frequencyData, startDate, duration, availableAmount, groupId, this.$notes, imageName, now]);

		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		vals.medication_id = $Db.insertId();

		return {...rc, ...vals};
	}

	get_medication_detail()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const userId = this.$Session.userId;
        const filesSql = new $Files.SQL("MED_IMAGE");

		const rows = $Db.executeQuery(
			`SELECT MED_ID, MED_NAME, MED_TYPE, MED_DOSAGE_AMOUNT, MED_FREQUENCY_TYPE, MED_FREQUENCY_DATA,
					MED_START_DATE, MED_DURATION, MED_AVAILABLE_AMOUNT, MED_MGR_ID, MED_NOTES, ${filesSql.select()}
			 FROM \`medication\`
			 	${filesSql.join()}
			 WHERE MED_ID=? AND MED_USR_ID=? AND MED_DELETED_ON IS NULL`,
			[this.$medication_id, userId]);

		if (rows.length === 0)
		{
			return $ERRS.ERR_MEDICATION_NOT_FOUND;
		}

		const med = rows[0];

		vals.medication = {
			medication_id:		med.MED_ID,
			medication_name:	med.MED_NAME,
			medication_type:	med.MED_TYPE,
			dosage_amount:		med.MED_DOSAGE_AMOUNT,
			frequency_type:		med.MED_FREQUENCY_TYPE,
			frequency_data:		med.MED_FREQUENCY_DATA || "",
			start_date:			new $Date(med.MED_START_DATE).format("Y-m-d"),
			duration:			med.MED_DURATION || 0,
			available_amount:	med.MED_AVAILABLE_AMOUNT || 0,
			group_id:			med.MED_MGR_ID || 0,
			notes:				med.MED_NOTES || "",
			medication_image:	$Files.getUrl(filesSql.get(med)),
		};

		return {...rc, ...vals};
	}

	update_medication()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const userId = this.$Session.userId;
		const now = $Utils.now();

		const rows = $Db.executeQuery(
			`SELECT MED_ID, MED_IMAGE FROM \`medication\` WHERE MED_ID=? AND MED_USR_ID=? AND MED_DELETED_ON IS NULL`,
			[this.$medication_id, userId]);

		if (rows.length === 0)
		{
			return $ERRS.ERR_MEDICATION_NOT_FOUND;
		}

		const currentMed = rows[0];
		let updateFields = [];
		let updateValues = [];

		if (!$Utils.empty(this.$medication_name))
		{
			updateFields.push("MED_NAME=?");
			updateValues.push(this.$medication_name);
		}

		if (!$Utils.empty(this.$medication_type))
		{
			if (!$DataItems.isValidItemId(this.$medication_type, "medication_type"))
			{
				return $ERRS.ERR_INVALID_MEDICATION_TYPE;
			}
			updateFields.push("MED_TYPE=?");
			updateValues.push(this.$medication_type);
		}

		if (!$Utils.empty(this.$dosage_amount) && this.$dosage_amount > 0)
		{
			updateFields.push("MED_DOSAGE_AMOUNT=?");
			updateValues.push(this.$dosage_amount);
		}

		if (!$Utils.empty(this.$frequency_type))
		{
			if (!$DataItems.isValidItemId(this.$frequency_type, "frequency_type"))
			{
				return $ERRS.ERR_INVALID_FREQUENCY_TYPE;
			}
			updateFields.push("MED_FREQUENCY_TYPE=?");
			updateValues.push(this.$frequency_type);
		}

		if (!$Utils.empty(this.$frequency_data))
		{
			try
			{
				JSON.parse(this.$frequency_data);
				updateFields.push("MED_FREQUENCY_DATA=?");
				updateValues.push(this.$frequency_data);
			}
			catch (e)
			{
				return $ERRS.ERR_INVALID_FREQUENCY_DATA;
			}
		}

		if (!$Utils.empty(this.$start_date))
		{
			const validatedDate = $Utils.validateDateStr(this.$start_date);
			if (!validatedDate)
			{
				return $ERRS.ERR_INVALID_START_DATE;
			}
			updateFields.push("MED_START_DATE=?");
			updateValues.push(validatedDate);
		}

		if (this.$duration !== undefined && this.$duration !== null)
		{
			updateFields.push("MED_DURATION=?");
			updateValues.push(this.$duration > 0 ? this.$duration : null);
		}

		if (this.$available_amount !== undefined && this.$available_amount !== null)
		{
			updateFields.push("MED_AVAILABLE_AMOUNT=?");
			updateValues.push(this.$available_amount > 0 ? this.$available_amount : null);
		}

		if (this.$group_id !== undefined && this.$group_id !== null)
		{
			if (this.$group_id > 0)
			{
				const groups = $Db.executeQuery(
					`SELECT MGR_ID FROM \`medication_group\` WHERE MGR_ID=? AND MGR_USR_ID=? AND MGR_DELETED_ON IS NULL`,
					[this.$group_id, userId]);
				if (groups.length === 0)
				{
					return $ERRS.ERR_INVALID_MEDICATION_GROUP;
				}
				updateFields.push("MED_MGR_ID=?");
				updateValues.push(this.$group_id);
			}
			else
			{
				updateFields.push("MED_MGR_ID=?");
				updateValues.push(null);
			}
		}

		if (this.$notes !== undefined && this.$notes !== null)
		{
			updateFields.push("MED_NOTES=?");
			updateValues.push(this.$notes);
		}

		if ($Utils.isset(this.$medication_image))
		{
			let newImageName = currentMed.MED_IMAGE;
			if (this.$medication_image === "")
			{
				newImageName = "";
			}
			else
			{
				const rv = $Utils.saveNewImageOrKeepOld(userId, this.$medication_image, null, "medicine");
				if ($Err.isERR(rv))
				{
					return rv;
				}
				newImageName = rv.image_name;
			}
			updateFields.push("MED_IMAGE=?");
			updateValues.push(newImageName);
		}

		if (updateFields.length === 0)
		{
			return {...rc, ...vals};
		}

		updateValues.push(this.$medication_id);
		updateValues.push(userId);

		$Db.executeQuery(
			`UPDATE \`medication\` SET ${updateFields.join(", ")} WHERE MED_ID=? AND MED_USR_ID=?`,
			updateValues);

		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return {...rc, ...vals};
	}

	delete_medication()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const userId = this.$Session.userId;
		const now = $Utils.now();

		const rows = $Db.executeQuery(
			`SELECT MED_ID FROM \`medication\` WHERE MED_ID=? AND MED_USR_ID=? AND MED_DELETED_ON IS NULL`,
			[this.$medication_id, userId]);

		if (rows.length === 0)
		{
			return $ERRS.ERR_MEDICATION_NOT_FOUND;
		}

		$Db.executeQuery(
			`UPDATE \`medication\` SET MED_DELETED_ON=? WHERE MED_ID=? AND MED_USR_ID=?`,
			[now, this.$medication_id, userId]);

		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return {...rc, ...vals};
	}

	confirm_taken()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const userId = this.$Session.userId;
		const now = $Utils.now();

		const rows = $Db.executeQuery(
			`SELECT MED_ID, MED_DOSAGE_AMOUNT, MED_AVAILABLE_AMOUNT FROM \`medication\` WHERE MED_ID=? AND MED_USR_ID=? AND MED_DELETED_ON IS NULL`,
			[this.$medication_id, userId]);

		if (rows.length === 0)
		{
			return $ERRS.ERR_MEDICATION_NOT_FOUND;
		}

		const med = rows[0];

		let dosageAmount = med.MED_DOSAGE_AMOUNT;
		if (!$Utils.empty(this.$dosage_amount) && this.$dosage_amount > 0)
		{
			dosageAmount = this.$dosage_amount;
		}

		let takenOn = now;
		if (!$Utils.empty(this.$taken_on))
		{
			const parsedDate = new $Date(this.$taken_on);
			if (!parsedDate.isValid())
			{
				return $ERRS.ERR_INVALID_TAKEN_TIME;
			}
			takenOn = parsedDate.format("Y-m-d H:i:s");
		}

		let scheduledTime = null;
		if (!$Utils.empty(this.$scheduled_time))
		{
			const parsedDate = new $Date(this.$scheduled_time);
			if (!parsedDate.isValid())
			{
				return $ERRS.ERR_INVALID_TAKEN_TIME;
			}
			scheduledTime = parsedDate.format("Y-m-d H:i:s");
		}

		$Db.beginTransaction();

		$Db.executeQuery(
			`INSERT INTO \`medication_taken\` (MTK_MED_ID, MTK_USR_ID, MTK_TAKEN_ON, MTK_SCHEDULED_TIME, MTK_DOSAGE_AMOUNT, MTK_NOTES, MTK_CREATED_ON)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[this.$medication_id, userId, takenOn, scheduledTime, dosageAmount, this.$notes, now]);

		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		vals.taken_id = $Db.insertId();

		if (!$Utils.empty(med.MED_AVAILABLE_AMOUNT) && med.MED_AVAILABLE_AMOUNT > 0)
		{
			const newAmount = Math.max(0, med.MED_AVAILABLE_AMOUNT - dosageAmount);
			$Db.executeQuery(
				`UPDATE \`medication\` SET MED_AVAILABLE_AMOUNT=? WHERE MED_ID=?`,
				[newAmount, this.$medication_id]);

			if ($Db.isError())
			{
				$Db.rollbackTransaction();
				return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
			}

			vals.remaining_amount = newAmount;
		}

		$Db.commitTransaction();

		return {...rc, ...vals};
	}

	get_taken_history()
	{
		let vals = {num_of_pages: 0, num_of_items: 0, items: []};
		let rc = $ERRS.ERR_SUCCESS;

		const userId = this.$Session.userId;

		let whereConditions = ["MTK_USR_ID=?"];
		let queryParams = [userId];

		if (!$Utils.empty(this.$medication_id) && this.$medication_id > 0)
		{
			whereConditions.push("MTK_MED_ID=?");
			queryParams.push(this.$medication_id);
		}

		if (!$Utils.empty(this.$from_date))
		{
			const validatedDate = $Utils.validateDateStr(this.$from_date);
			if (!validatedDate)
			{
				return $ERRS.ERR_INVALID_START_DATE;
			}
			whereConditions.push("MTK_TAKEN_ON >= ?");
			queryParams.push(validatedDate + " 00:00:00");
		}

		if (!$Utils.empty(this.$to_date))
		{
			const validatedDate = $Utils.validateDateStr(this.$to_date);
			if (!validatedDate)
			{
				return $ERRS.ERR_INVALID_START_DATE;
			}
			whereConditions.push("MTK_TAKEN_ON <= ?");
			queryParams.push(validatedDate + " 23:59:59");
		}

		const whereClause = whereConditions.join(" AND ");

		let page = Number(this.$page);
		let pageSize = 50;
		let offset = pageSize * page;

		const count = $Db.executeQuery(
			`SELECT COUNT(*) cnt FROM \`medication_taken\` WHERE ${whereClause}`,
			queryParams)[0].cnt;

		let numOfPages = Math.floor((count + pageSize - 1) / pageSize);
		vals.num_of_pages = numOfPages;
		vals.num_of_items = count;

		if (page < 0 || page >= numOfPages || count == 0) return {...rc, ...vals};

		const rows = $Db.executeQuery(
			`SELECT MTK_ID, MTK_MED_ID, MTK_TAKEN_ON, MTK_SCHEDULED_TIME, MTK_DOSAGE_AMOUNT, MTK_NOTES, MED_NAME, MED_TYPE
			 FROM \`medication_taken\`
			 	JOIN \`medication\` ON MTK_MED_ID = MED_ID
			 WHERE ${whereClause}
			 ORDER BY MTK_TAKEN_ON DESC
			 LIMIT ${pageSize} OFFSET ${offset}`,
			queryParams);

		vals.items = rows.map(row => ({
			taken_id:			row.MTK_ID,
			medication_id:		row.MTK_MED_ID,
			medication_name:	row.MED_NAME,
			medication_type:	row.MED_TYPE,
			taken_on:			new $Date(row.MTK_TAKEN_ON).format("Y-m-d H:i:s"),
			scheduled_time:		row.MTK_SCHEDULED_TIME ? new $Date(row.MTK_SCHEDULED_TIME).format("Y-m-d H:i:s") : null,
			dosage_amount:		row.MTK_DOSAGE_AMOUNT,
			notes:				row.MTK_NOTES || "",
		}));

		return {...rc, ...vals};
	}
};
