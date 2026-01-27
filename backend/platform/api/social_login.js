module.exports =
{
			"verify_facebook_auth"				: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"facebook_user_id"				: "s",
													"facebook_access_token"			: "s",
												},


			"verify_google_auth"				: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"google_user_id"				: "s",
													"google_access_token"			: "s",
												},


			"verify_apple_auth"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"apple_user_id"					: "s",
													"apple_access_token"			: "s",
												},


			"login_with_social"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"auth_key"						: "s",
													"device_id"						: "o:s:*** the FCM device id for push notifications. You can also call update_device_info later",
													"os_type"						: "o:i:0*** 1=Android, 2=iOS, 3=Web Browser",
													"os_version"					: "o:s:*** the operating system version",
													"device_model"					: "o:s:*** the device model",
													"app_version"					: "o:s:*** the application version. VERY important",
													"language"						: "o:s:en***the user's app selected language in two characters code",
												},

			"register_with_social"				: {
													"@acl"							: [$ACL.USER_TYPE_NA],
													"auth_key"						: "s",
													"first_name"					: "s",
													"last_name"						: "s",
													"device_id"						: "o:s:*** the FCM device id for push notifications. You can also call update_device_info later",
													"os_type"						: "o:i:0*** 1=Android, 2=iOS, 3=Web Browser",
													"os_version"					: "o:s:*** the operating system version",
													"device_model"					: "o:s:*** the device model",
													"app_version"					: "o:s:*** the application version. VERY important",
													"language"						: "o:s:en***the user's app selected language in two characters code",
												},
};
