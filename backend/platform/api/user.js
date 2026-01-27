module.exports =
{
			"login"								: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@protected"					: "password",
													"email"							: "s",
													"password"						: "s",
													"device_id"						: "o:s:*** the FCM device id for push notifications. You can also call update_device_info later",
													"os_type"						: "o:i:0*** 1=Android, 2=iOS, 3=Web Browser",
													"os_version"					: "o:s:*** the operating system version",
													"device_model"					: "o:s:*** the device model",
													"app_version"					: "o:s:*** the application version. VERY important",
													"language"						: "o:s:"+$Config.get("default_language")+"***the user's app selected language in two characters code",
												},

			"register"							: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@protected"					: "password",
													"first_name"					: "s",
													"last_name"						: "s",
													"email"							: "s",
													"password"						: "s",
													"device_id"						: "o:s:*** the FCM device id for push notifications. You can also call update_device_info later",
													"os_type"						: "o:i:0*** 1=Android, 2=iOS, 3=Web Browser",
													"os_version"					: "o:s:*** the operating system version",
													"device_model"					: "o:s:*** the device model",
													"app_version"					: "o:s:*** the application version. VERY important",
													"language"						: "o:s:"+$Config.get("default_language")+"***the user's app selected language in two characters code",
												},

			"update_device_info"				: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"#token"						: "s",
													"device_id"						: "o:s:*** the FCM device id for push notifications. You can also call update_device_info later",
													"os_type"						: "o:i:0*** 1=Android, 2=iOS, 3=Web Browser",
													"os_version"					: "o:s:*** the operating system version",
													"device_model"					: "o:s:*** the device model",
													"app_version"					: "o:s:*** the application version. VERY important",
												},

			"update_user_language"				: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"#token"						: "s",
													"language"						: "s***the user's app selected language in two characters code",
												},

			"send_sms_code"						: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"phone_num"						: "s",
													"country_code"					: "o:s:us***can be empty if phone_num has international format"
												},

			"resend_sms_code"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"phone_num"						: "s",
													"country_code"					: "o:s:us***can be empty if phone_num has international format"
												},

			"verify_sms_code"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"phone_num"						: "s",
													"country_code"					: "o:s:us***can be empty if phone_num has international format",
													"verification_code"				: "s",
												},

			"login_with_phone"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"auth_key"						: "s",
													"device_id"						: "o:s:*** the FCM device id for push notifications. You can also call update_device_info later",
													"os_type"						: "o:i:0*** 1=Android, 2=iOS, 3=Web Browser",
													"os_version"					: "o:s:*** the operating system version",
													"device_model"					: "o:s:*** the device model",
													"app_version"					: "o:s:*** the application version. VERY important",
													"language"						: "o:s:"+$Config.get("default_language")+"***the user's app selected language in two characters code",
												},

			"register_with_phone"				: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"auth_key"						: "s",
													"first_name"					: "s",
													"last_name"						: "s",
													"email"							: "s",
													"device_id"						: "o:s:*** the FCM device id for push notifications. You can also call update_device_info later",
													"os_type"						: "o:i:0*** 1=Android, 2=iOS, 3=Web Browser",
													"os_version"					: "o:s:*** the operating system version",
													"device_model"					: "o:s:*** the device model",
													"app_version"					: "o:s:*** the application version. VERY important",
													"language"						: "o:s:"+$Config.get("default_language")+"***the user's app selected language in two characters code",
												},

			"send_email_code"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"email"							: "s",
												},

			"resend_email_code"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"email"							: "s",
												},

			"verify_email_code"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"email"							: "s",
													"verification_code"				: "s",
												},

			"login_with_email"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"auth_key"						: "s",
													"device_id"						: "o:s:*** the FCM device id for push notifications. You can also call update_device_info later",
													"os_type"						: "o:i:0*** 1=Android, 2=iOS, 3=Web Browser",
													"os_version"					: "o:s:*** the operating system version",
													"device_model"					: "o:s:*** the device model",
													"app_version"					: "o:s:*** the application version. VERY important",
													"language"						: "o:s:"+$Config.get("default_language")+"***the user's app selected language in two characters code",
												},

			"register_with_email"				: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"auth_key"						: "s",
													"first_name"					: "s",
													"last_name"						: "s",
													"phone_num"						: "s",
													"country_code"					: "o:s:***can be empty if phone_num has international format",
													"device_id"						: "o:s:*** the FCM device id for push notifications. You can also call update_device_info later",
													"os_type"						: "o:i:0*** 1=Android, 2=iOS, 3=Web Browser",
													"os_version"					: "o:s:*** the operating system version",
													"device_model"					: "o:s:*** the device model",
													"app_version"					: "o:s:*** the application version. VERY important",
													"language"						: "o:s:"+$Config.get("default_language")+"***the user's app selected language in two characters code",
												},

			"logout"							: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"#token"						: "s"
												},

			"add_user"							: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"@protected"					: "password",
													"#token"						: "s",
													"first_name"					: "s",
													"last_name"						: "s",
													"email"							: "s",
													"password"						: "s",
													"type"							: "i***1 = Admin, 2 = Regular"
												},

			"update_user"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s",
													"user_id"						: "s",
													"first_name"					: "s",
													"last_name"						: "s",
													"email"							: "s",
													"type"							: "i",
													"status"						: "i"
												},

			"delete_user"						: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s",
													"user_id"						: "s"
												},

			"get_users"							: {
													"@acl"							: [$ACL.USER_TYPE_ADMIN],
													"#token"						: "s"
												},

			"forgot_password"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"email"							: "s",
													"language"						: "s***the user's app selected language in two characters code",
												},

			"reset_password"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@protected"					: "password",
													"user_id"						: "s",
													"activation_code"				: "s",
													"password"						: "s",
													"language"						: "s***the user's app selected language in two characters code",
												},

			"delete_profile"					: {
													"@acl"							: [$ACL.USER_TYPE_REGULAR],
													"#token"						: "s",
												},

			"__create_admin"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "superuser",
													"@protected"					: "password",
													"email"							: "s",
													"password"						: "s",
												},

			"system_login"						: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@protected"					: "password",
													"user_name"						: "s",
													"password"						: "s",
												},

			"system_logout"						: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@protected"					: "token",
													"token"							: "s"
												},

			"__set_system_user"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"@mode"							: "superuser",
													"@protected"					: "password",
													"user_name"						: "s",
													"password"						: "s",
												},

};
