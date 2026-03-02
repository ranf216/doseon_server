module.exports =
{
			"get_group_list"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get all medication groups created by the current user, including a summary of medications in each group.",
												"#token"						: "s",
											},

			"add_group"						: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Create a new medication group.",
												"#token"						: "s",
												"group_name"					: "s***Group display name",
												"group_note"					: "o:s:***Optional note for the group",
											},

			"update_group"					: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Update an existing medication group.",
												"#token"						: "s",
												"group_id"						: "i***medication_group ID",
												"group_name"					: "o:s:***New group name",
												"group_note"					: "o:s:***New group note",
											},

			"delete_group"					: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Delete a medication group. Medications in this group are moved to ungrouped.",
												"#token"						: "s",
												"group_id"						: "i***medication_group ID",
											},

			"get_group_details"				: {
												"@acl"							: [$ACL.USER_TYPE_REGULAR],
												"@doc"							: "Get detailed information about a medication group and its medications.",
												"#token"						: "s",
												"group_id"						: "i***medication_group ID",
											},
};
