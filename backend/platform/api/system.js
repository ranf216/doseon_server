module.exports =
{
			"api_ver"							: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"welcome"						: "o:s:Hello World***A welcome message.<br/>This parameter will be sent back in the response"
												},


			"get_runtime_config"				: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "off",
												},


			"get_system_config"					: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@mode"							: "off",
													"#token"						: "s",
												},

													
			"log_test"							: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "test",
												},
	
	
			"debug"								: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "test",
													"level"							: "o:s:d***e / w / i / d" + ($Config.get("project_log_type_name") ? " / p" : ""),
													"message"						: "s",
												},


			"test_crash"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@mode"							: "test",
													"#token"						: "s",
												},

	
			"send_mail"							: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "test",
													"to_email"						: "s",
													"from_prefix"					: "o:s:",
													"subject"						: "s",
													"message"						: "s",
													"attachments"					: {
																						"content"							: "s***base64 file content",
																						"content_type"						: "s",
																						"filename"							: "s",
																					},
												},

			"get_service_status"				: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s",
													"service_id"					: "i",
												},

			"set_service_active"				: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s",
													"service_id"					: "i",
													"is_active"						: "b",
												},

			"send_socket_message"				: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "test",
													"to_user_id"					: "s",
													"message"						: "s",
												},

			"send_test_notification"			: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@mode"							: "test",
													"#token"						: "s",
													"device_id"						: "s",
													"title"							: "s",
													"message"						: "s",
													"payload"						: "s***json",
												},

			"get_token_logs"					: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@mode"							: "unlogged",
													"token"							: "s",
													"search_token"					: "s",
													"log_file_name"					: "s",
													"include_apis"					: "o:s:***Comma separated list of apis to include in the search",
													"exclude_apis"					: "o:s:***Comma separated list of apis to ignore in the search",
												},

			"perform_upgrade"					: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@mode"							: "superuser",
													"#token"						: "s",
													"to_version"					: "o:i:0***0 = all"
												},

			"clear_debug_log"					: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@mode"							: "test",
													"#token"						: "s",
												},

			"analyze_logs"						: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "unlogged",
													"token"							: "s",
													"date"							: "s",
												},

			"query_logs"						: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "unlogged",
													"token"							: "s",
													"substring"						: "s",
													"lines"							: "i",
													"date_from"						: "s",
													"date_to"						: "s",
													"request"						: "s",
													"set_request"					: "b",
													"set_response"					: "b",
													"set_other"						: "b",
													"is_error"						: "b",
													"is_rc_error"					: "b",
												},

			"get_record_change_log"				: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "unlogged",
													"token"							: "s",
													"table"							: "s",
													"row_id"						: "s",
												},

			"get_user_by_param"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "unlogged",
													"token"							: "s",
													"user_param"					: "s",
												},

			"get_otp_debug_logs"				: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "unlogged",
													"token"							: "s",
												},

			"run_query"							: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@mode"							: "test,unlogged",
													"#token"						: "s",
													"query"							: "s",
													"params"						: {
																						"type"							: "s",
																						"value"							: "s",
																					}
												},

};
