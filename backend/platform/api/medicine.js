module.exports =
{
			"get_medication_list"			: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get the list of user medications grouped by medication groups.",
												"#token"						: "s",
											},

			"add_medication"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Add a new medication for the current user.<br/><br/>"
																				+ "<b>frequency_data</b> JSON structure per frequency_type:<br/><br/>"
																				+ "<b>daily</b> — times per day:<br/>"
																				+ "<code>{\\\"times\\\": [\\\"08:00\\\", \\\"14:00\\\", \\\"20:00\\\"]}</code><br/><br/>"
																				+ "<b>specific_days</b> — days of week + times:<br/>"
																				+ "<code>{\\\"days\\\": [\\\"monday\\\", \\\"wednesday\\\", \\\"friday\\\"], \\\"times\\\": [\\\"08:00\\\", \\\"20:00\\\"]}</code><br/><br/>"
																				+ "<b>every_x_days</b> — every N days + times:<br/>"
																				+ "<code>{\\\"interval\\\": 3, \\\"times\\\": [\\\"09:00\\\"]}</code><br/><br/>"
																				+ "<b>every_x_weeks</b> — every N weeks on specific days + times:<br/>"
																				+ "<code>{\\\"interval\\\": 2, \\\"days\\\": [\\\"monday\\\", \\\"thursday\\\"], \\\"times\\\": [\\\"08:00\\\"]}</code><br/><br/>"
																				+ "<b>every_x_months</b> — every N months on a day of month + times:<br/>"
																				+ "<code>{\\\"interval\\\": 1, \\\"day_of_month\\\": 15, \\\"times\\\": [\\\"10:00\\\"]}</code><br/><br/>"
																				+ "<b>when_necessary</b> — no schedule (frequency_data can be omitted):<br/>"
																				+ "<code>{}</code>",
												"#token"						: "s",
												"medication_name"				: "s***Medication display name",
												"medication_type"				: "s***" + $DataItems.getListForApiDoc("medication_type"),
												"dosage_amount"					: "d***Numeric amount per intake (e.g. 2 pills, 5 ml)",
												"frequency_type"				: "s***" + $DataItems.getListForApiDoc("frequency_type"),
												"frequency_data"				: "o:s:***JSON string with schedule details: times, days, intervals",
												"start_date"					: "o:s:***Start date in YYYY-MM-DD format. Defaults to today",
												"duration"						: "o:i:0***Duration in days for calculating end date",
												"available_amount"				: "o:d:0***Amount of medicine on hand",
												"group_id"						: "o:i:0***medication_group ID to associate the medication with",
												"notes"							: "o:s:***Notes about taking the medication",
												"medication_image"				: "o:s:***Base64 encoded medication image",
											},

			"get_medication_detail"			: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get detailed information about a specific medication.",
												"#token"						: "s",
												"medication_id"					: "i***Medication ID",
											},

			"update_medication"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Update an existing medication. All fields are optional except medication_id.",
												"#token"						: "s",
												"medication_id"					: "i***Medication ID to update",
												"medication_name"				: "o:s:***Medication display name",
												"medication_type"				: "o:s:***" + $DataItems.getListForApiDoc("medication_type"),
												"dosage_amount"					: "o:d:0***Numeric amount per intake",
												"frequency_type"				: "o:s:***" + $DataItems.getListForApiDoc("frequency_type"),
												"frequency_data"				: "o:s:***JSON string with schedule details",
												"start_date"					: "o:s:***Start date in YYYY-MM-DD format",
												"duration"						: "o:i:0***Duration in days",
												"available_amount"				: "o:d:0***Amount of medicine on hand",
												"group_id"						: "o:i:0***medication_group ID (0 to remove from group)",
												"notes"							: "o:s:***Notes about taking the medication",
												"medication_image"				: "o:s:***Base64 encoded medication image for new image, empty string to remove old image, omit this param or send the image url to keep the old image",
											},

			"delete_medication"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Delete a medication.",
												"#token"						: "s",
												"medication_id"					: "i***Medication ID to delete",
											},

			"confirm_taken"					: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Confirm that a medication dose was taken.",
												"#token"						: "s",
												"medication_id"					: "i***Medication ID",
												"dosage_amount"					: "o:d:0***Amount taken (defaults to medication's dosage_amount)",
												"taken_on"						: "o:s:***When the medication was taken in YYYY-MM-DD HH:MM:SS format (defaults to now)",
												"scheduled_time"				: "o:s:***The scheduled time for this dose in YYYY-MM-DD HH:MM:SS format",
												"notes"							: "o:s:***Notes about this dose",
											},

			"get_taken_history"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get the history of taken medications for the current user.",
												"#token"						: "s",
												"medication_id"					: "o:i:0***Filter by specific medication ID (0 for all medications)",
												"from_date"						: "o:s:***Start date filter in YYYY-MM-DD format",
												"to_date"						: "o:s:***End date filter in YYYY-MM-DD format",
												"page"							: "o:i:0***Page number for pagination (default 0)",
											},
};
