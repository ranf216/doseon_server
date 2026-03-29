module.exports = class
{
	static getScheduledTimesForDate(med, dateStr)
	{
		if (med.MED_FREQUENCY_TYPE === "when_necessary") return [];

		let freqData = null;
		if (!$Utils.empty(med.MED_FREQUENCY_DATA))
		{
			try { freqData = JSON.parse(med.MED_FREQUENCY_DATA); }
			catch(e) { return []; }
		}
		if (!freqData || !freqData.times || freqData.times.length === 0) return [];

		const sortedTimes = freqData.times.slice().sort();
		const checkDate = new $Date(dateStr);
		const startDate = new $Date(med.MED_START_DATE);

		// If the date is before the medication start date, no scheduled times
		if (dateStr < startDate.format("Y-m-d")) return [];

		if (med.MED_FREQUENCY_TYPE === "daily")
		{
			return sortedTimes;
		}

		if (med.MED_FREQUENCY_TYPE === "specific_days")
		{
			if (!freqData.days || freqData.days.length === 0) return [];
			const dayOfWeek = checkDate.getDay();
			if (freqData.days.includes(dayOfWeek)) return sortedTimes;
			return [];
		}

		if (med.MED_FREQUENCY_TYPE === "every_x_days")
		{
			if (!freqData.interval || freqData.interval <= 0) return [];
			const daysSinceStart = Math.floor((checkDate.getTimestamp() - startDate.getTimestamp()) / (60 * 60 * 24));
			if (daysSinceStart % freqData.interval === 0) return sortedTimes;
			return [];
		}

		if (med.MED_FREQUENCY_TYPE === "every_x_weeks")
		{
			if (!freqData.interval || freqData.interval <= 0) return [];
			const daysSinceStart = Math.floor((checkDate.getTimestamp() - startDate.getTimestamp()) / (60 * 60 * 24));
			const weeksSinceStart = Math.floor(daysSinceStart / 7);
			if (daysSinceStart >= 0 && daysSinceStart % 7 === 0 && weeksSinceStart % freqData.interval === 0) return sortedTimes;

			// Also check if the day falls within a valid interval week and matches days array
			if (freqData.days && freqData.days.length > 0)
			{
				if (weeksSinceStart % freqData.interval === 0 && freqData.days.includes(checkDate.getDay())) return sortedTimes;
			}
			return [];
		}

		if (med.MED_FREQUENCY_TYPE === "every_x_months")
		{
			if (!freqData.interval || freqData.interval <= 0) return [];
			const monthsSinceStart = (checkDate.getFullYear() - startDate.getFullYear()) * 12 + (checkDate.getMonth() - startDate.getMonth());
			if (monthsSinceStart >= 0 && monthsSinceStart % freqData.interval === 0)
			{
				// Check day_of_month if specified, otherwise use start date's day
				const targetDay = freqData.day_of_month || startDate.getDate();
				if (checkDate.getDate() === targetDay) return sortedTimes;
			}
			return [];
		}

		return [];
	}

	static getNextTakenTime(med, today)
	{
		if (med.MED_FREQUENCY_TYPE === "when_necessary") return null;

		let freqData = null;
		if (!$Utils.empty(med.MED_FREQUENCY_DATA))
		{
			try { freqData = JSON.parse(med.MED_FREQUENCY_DATA); }
			catch(e) { return null; }
		}
		if (!freqData || !freqData.times || freqData.times.length === 0) return null;

		const sortedTimes = freqData.times.slice().sort();
		const nowTime = new $Date().format("H:i");
		const nowDate = new $Date();
		const startDate = new $Date(med.MED_START_DATE);

		if (med.MED_FREQUENCY_TYPE === "daily")
		{
			for (let t of sortedTimes)
			{
				if (t > nowTime) return today + " " + t;
			}
			let tomorrow = new $Date();
			tomorrow.addDays(1);
			return tomorrow.format("Y-m-d") + " " + sortedTimes[0];
		}

		if (med.MED_FREQUENCY_TYPE === "specific_days")
		{
			if (!freqData.days || freqData.days.length === 0) return null;

			const allowedDays = freqData.days.slice().sort((a, b) => a - b);
			let checkDate = new $Date();

			for (let i = 0; i < 14; i++)
			{
				const dayOfWeek = checkDate.getDay();
				const isAllowedDay = allowedDays.includes(dayOfWeek);

				if (isAllowedDay)
				{
					const checkDateStr = checkDate.format("Y-m-d");
					for (let t of sortedTimes)
					{
						const fullDateTime = checkDateStr + " " + t;
						if (fullDateTime > nowDate.format("Y-m-d H:i"))
						{
							return fullDateTime;
						}
					}
				}

				checkDate.addDays(1);
			}
			return null;
		}

		if (med.MED_FREQUENCY_TYPE === "every_x_days")
		{
			if (!freqData.interval || freqData.interval <= 0) return null;

			const interval = freqData.interval;
			const lastTaken = this._getLastTakenDate(med.MED_ID);

			let nextDate;
			if (lastTaken)
			{
				nextDate = new $Date(lastTaken);
				nextDate.addDays(interval);
			}
			else
			{
				nextDate = new $Date(med.MED_START_DATE);
				const daysSinceStart = Math.floor((nowDate.getTimestamp() - startDate.getTimestamp()) / (60 * 60 * 24));
				const cyclesPassed = Math.floor(daysSinceStart / interval);
				nextDate.addDays(cyclesPassed * interval);

				if (nextDate.format("Y-m-d H:i") < nowDate.format("Y-m-d H:i"))
				{
					nextDate.addDays(interval);
				}
			}

			return nextDate.format("Y-m-d") + " " + sortedTimes[0];
		}

		if (med.MED_FREQUENCY_TYPE === "every_x_weeks")
		{
			if (!freqData.interval || freqData.interval <= 0) return null;

			const interval = freqData.interval;
			const lastTaken = this._getLastTakenDate(med.MED_ID);

			let nextDate;
			if (lastTaken)
			{
				nextDate = new $Date(lastTaken);
				nextDate.addDays(interval * 7);
			}
			else
			{
				nextDate = new $Date(med.MED_START_DATE);
				const daysSinceStart = Math.floor((nowDate.getTimestamp() - startDate.getTimestamp()) / (60 * 60 * 24));
				const weeksSinceStart = Math.floor(daysSinceStart / 7);
				const cyclesPassed = Math.floor(weeksSinceStart / interval);
				nextDate.addDays(cyclesPassed * interval * 7);

				if (nextDate.format("Y-m-d H:i") < nowDate.format("Y-m-d H:i"))
				{
					nextDate.addDays(interval * 7);
				}
			}

			return nextDate.format("Y-m-d") + " " + sortedTimes[0];
		}

		if (med.MED_FREQUENCY_TYPE === "every_x_months")
		{
			if (!freqData.interval || freqData.interval <= 0) return null;

			const interval = freqData.interval;
			const lastTaken = this._getLastTakenDate(med.MED_ID);

			let nextDate;
			if (lastTaken)
			{
				nextDate = new $Date(lastTaken);
				nextDate.addMonths(interval);
			}
			else
			{
				nextDate = new $Date(med.MED_START_DATE);
				const monthsSinceStart = (nowDate.getFullYear() - startDate.getFullYear()) * 12 + (nowDate.getMonth() - startDate.getMonth());
				const cyclesPassed = Math.floor(monthsSinceStart / interval);
				nextDate.addMonths(cyclesPassed * interval);

				if (nextDate.format("Y-m-d H:i") < nowDate.format("Y-m-d H:i"))
				{
					nextDate.addMonths(interval);
				}
			}

			return nextDate.format("Y-m-d") + " " + sortedTimes[0];
		}

		return null;
	}

	static _getLastTakenDate(medicationId)
	{
		const rows = $Db.executeQuery(
			`SELECT MTK_TAKEN_ON
			 FROM \`medication_taken\`
			 WHERE MTK_MED_ID=?
			 ORDER BY MTK_TAKEN_ON DESC
			 LIMIT 1`,
			[medicationId]);

		if (rows.length > 0)
		{
			return rows[0].MTK_TAKEN_ON;
		}
		return null;
	}
};
