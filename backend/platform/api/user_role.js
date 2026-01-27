module.exports =
{
			"allow"								: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s",
													"user_id"						: "s",
													"role"							: "i***<br/>" + $Utils.getUserRolesListForApiDoc(),
												},


			"unallow"							: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s",
													"user_id"						: "s",
													"role"							: "i***<br/>" + $Utils.getUserRolesListForApiDoc(),
												},


			"deny"								: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s",
													"user_id"						: "s",
													"role"							: "i***<br/>" + $Utils.getUserRolesListForApiDoc(),
												},


			"undeny"							: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s",
													"user_id"						: "s",
													"role"							: "i***<br/>" + $Utils.getUserRolesListForApiDoc(),
												},


			"get_user_roles"					: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s",
													"user_id"						: "s",
												},


			"get_my_roles"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN, $ACL.USER_TYPE_REGULAR],
													"#token"						: "s",
												},

};
