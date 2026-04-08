module.exports =
{
			"get_user_statistics"			: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get medication intake statistics of the current user.",
												"#token"						: "s",
												"from_date"						: "o:s:***Optional start date filter (YYYY-MM-DD)",
												"to_date"						: "o:s:***Optional end date filter (YYYY-MM-DD)",
											},

			"get_care_recipient_statistics"	: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get medication intake statistics of a care recipient. The current user must be an accepted care taker.",
												"#token"						: "s",
												"recipient_id"					: "s***User ID of the care recipient",
												"from_date"						: "o:s:***Optional start date filter (YYYY-MM-DD)",
												"to_date"						: "o:s:***Optional end date filter (YYYY-MM-DD)",
											},
};
