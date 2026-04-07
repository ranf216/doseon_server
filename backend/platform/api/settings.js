module.exports =
{
			"get_settings"					: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get settings of the current user.",
												"#token"						: "s",
											},

			"update_settings"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Update settings of the current user. All parameters are optional; only provided values are updated.",
												"#token"						: "s",
												"notification_sound_id"			: "o:s:***Notification sound ID. " + $DataItems.getListForApiDoc("notification_sound"),
												"notification_sound_volume"		: "o:i:-1***Sound volume (0-100)",
												"notification_sound_repeat_time": "o:i:-1***Repeat alert interval in minutes",
												"language"						: "o:s:***User preferred language (en, he)",
											},
};
