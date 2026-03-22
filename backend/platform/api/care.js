module.exports =
{
			"send_request"					: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Send a caretaker request to another user by phone number or email. At least one of phone_number or email must be provided. The current user is the care recipient.",
												"#token"						: "s",
												"phone_number"					: "o:s:***Phone number of the care taker to invite",
												"email"							: "o:s:***Email of the care taker to invite",
												"friendly_name"					: "o:s:***Optional friendly name for the care taker",
												"message"						: "o:s:***Optional message to include with the request",
											},

			"respond_request"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Respond to a care request (accept or decline). The current user is the care taker.",
												"#token"						: "s",
												"request_id"					: "i***Care request ID",
												"action"						: "i***Action to take: 2 = accept, 3 = decline",
											},

			"get_pending_requests"			: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get the list of pending care requests for the current user (as Care Taker).",
												"#token"						: "s",
											},

			"get_care_recipients"			: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get the list of care recipients that the current user is taking care of.",
												"#token"						: "s",
											},

			"get_care_recipient_detail"		: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get detailed information about a care recipient including medications, recent reminders and statistics.",
												"#token"						: "s",
												"care_recipient_id"				: "s***User ID of the care recipient",
											},

			"remove_care_recipient"			: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Remove a care recipient from the care list. The current user is the care taker.",
												"#token"						: "s",
												"care_recipient_id"				: "s***User ID of the care recipient to remove",
											},

			"get_care_takers"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get the list of care takers assigned to the current user (as Care Recipient).",
												"#token"						: "s",
											},

			"update_friendly_name"			: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Update the friendly name of a care taker or care recipient.",
												"#token"						: "s",
												"request_id"					: "i***Care request ID",
												"friendly_name"					: "s***New friendly name",
												"friendly_name_type"			: "i***1 = friendly name of a care taker (set by the care recipient), 2 = friendly name of a care recipient (set by the care taker)",
											},

			"remove_care_taker"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Remove a care taker from the care list. The current user is the care recipient.",
												"#token"						: "s",
												"care_taker_id"					: "s***User ID of the care taker to remove",
											},
};
