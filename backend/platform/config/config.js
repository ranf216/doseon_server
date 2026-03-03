module.exports = {
	// Version
	"api_version"							: "1",
	"infra_version"							: "3.8.21",

	// Server online - If set to false, no API is able to run!!!
	"api_server_active"						: true,

	// Environment
	"env_is_production"						: false,
	"env_display"							: true,
	"env_name"								: "STAGING",
	"env_text_color"						: "#000000",
	"env_bkg_color"							: "#32ae48",

	// Access rights
	"enable_supreuser_api"					: false,
	"enable_test_api"						: true,
	"enable_api_client"						: true,
	"enable_logtail"						: true,
	"enable_socket_viewer"					: true,
	"enable_log_analyzer"					: true,
	"enable_otp_viewer"						: true,
	"enable_system_login"					: false,
	"restrict_supreuser_api_to_ip"			: [],
	"restrict_test_api_to_ip"				: [],
	"restrict_api_client_to_ip"				: [],
	"restrict_logtail_to_ip"				: [],
	"restrict_socket_viewer_to_ip"			: [],
	"restrict_log_analyzer_to_ip"			: [],
	"restrict_otp_viewer_to_ip"				: [],

	// Basic
	"ignore_ssl_cert"						: true,
	"use_ssl"								: false,
	"debug_email"							: true,
	"user_cache_mode"						: 2, // 0 = none, 1 = db mem table, 2 = file system cache
	"using_s3"								: true,
	"fail_deprecated_api"					: false,
	"enable_set_file_access"				: true,
	"default_language"						: "en",

	// Logger
	"project_log_type_name"					: "", // Set name to enable project specific log level (no white spaces)
	"log_requests"							: $Const.LL_REQUEST | $Const.LL_RESPONSE | $Const.LL_ERROR | $Const.LL_WARNING | $Const.LL_INFO | $Const.LL_DEBUG | $Const.LL_PROJECT, // false for none
	"log_unknown_params_to_api"				: true,
	"max_log_file_size"						: 10000000,
	"log_to_db"								: false,
	"remove_logs_older_than_days"			: 15,
	"archive_logs_to_s3_path"				: "/log_archive", // Empty for no archiving
	"send_error_logs_hours"					: [0, 12],
	"enable_login_log"						: true,

	// Admin config
	"admin_emails"							: ["{any list of email adresses}", ],
	"admin_phones"							: ["{any list of international numbers}", ],

	// Platform URLs
	"api_url"								: `${$SERVER_PUBLIC_URL}/api`,
	"restore_pwd_url"						: `${$SERVER_PUBLIC_URL}/restore_password`,
	"files_url"								: `${$FILES_PUBLIC_URL}/files/`,
	"download_url"							: `${$FILES_PUBLIC_URL}/download/`,

	// System paths
	"files_path"							: "files",
	"media_path"							: $Const.INFRA_ROOT + "/content/media",
	"log_requests_path"						: $Const.INFRA_ROOT + "/runtime/log",
	"cache_path"							: $Const.INFRA_ROOT + "/runtime/cache",
	"key_value_sets_path"					: $Const.INFRA_ROOT + "/runtime/key_value_sets",
	"temp_path"								: $Const.INFRA_ROOT + "/content/temp",
	"multipart_temp_path"					: $Const.INFRA_ROOT + "/content/temp",

	// File access
	"standard_file_access"					: {"user" : "ec2-user", "group" : "ec2-user", "mode" : "0664"},
	"file_access_level"						: {
												"enabled"								: true,
												"default"								: $Const.FILE_ACCESS_LEVEL_PROTECTED,
												"timeout_secs"							: 1800,
												"download_timeout_secs"					: 30,
											},

	// Security
	"max_user_token_time"					: 2000000000, // 63+ years
	"update_last_access_interval"			: 86400, // 60 * 60 * 24    Use 0 for every call
	"reuse_token_on_login"					: true, // if the token exists and did not expire, re-use it. Otherwisem creaet a new token all the time.
	"refresh_token_on_api_access"			: true, // If true, token time is refreshed on any API access, otherwise token time is calced by login time.
	"max_failed_login_retries"				: 3,
	"failed_login_cooldown_time"			: 60,
	"#salt"									: "{Any Salt String}",
	"log_protected_params"					: true,
	"log_activate_truncated_params"			: false,
	"use_2factor_auth"						: true,
	"password_valid_for_seconds"			: 0,
	"#open_api_passcode"					: "{Any Passcode}",
	"password_criteria"						: {
												"force_criteria"						: true,
												"min_chars"								: 8,
												"max_chars"								: 18,
												"has_lowercase"							: true,
												"has_uppercase"							: true,
												"has_number"							: true,
												"has_special"							: true,
											},
	"auth_grant"							: {
												"is_enabled"							: false,
												"valid_for_seconds"						: 2592000, // 30 days
											},

	// Database
	"#db_user"								: "{user name}",
	"db_schema"								: "doseon_staging",
	"#db_pwd"								: "{password}",
	"db_instance"							: "development-db.cli8ezs4cwqd.us-west-1.rds.amazonaws.com",
	"db_port"								: "3306",
	"db_pool_size"							: 50,
	"db_throw_exception_on_error"			: false,
	"db_log_exception_on_error"				: true,
	"db_ignore_ssl"							: false, // Turn true for production on pods

	// Sockets
	"socket"								: {
												"protocol"                  			: $SOCKET_PROTOCOL,
												"port"                      			: $SOCKET_PORT,
												"cors_origin"               			: "*",
												"service_id"                			: 1,
												"use_pm2_monitor"						: true,
												"anounce_dead_after_ms"     			: 60000,
												"hearbeat_every_ms"         			: 5000,
												"queue_rest_time_ms"        			: 500,
												"ssl_certificate"						: "certificate.crt",
												"ssl_keyfile"							: "privateKey.key",
												"track_user_online_ststus"				: false,
												"use_memory_queue"						: false,
												"log_relay"								: false,
											},

	// Queue Services
	"send_mail_queue_service"				: {
                                                "service_id"                			: $Const.SRVID_PM2,
												"queue_id"								: $Const.MQID_NO_QUEUE,
                                                "anounce_dead_after_ms"     			: 60000,
                                                "hearbeat_every_ms"         			: 15000,
                                                "queue_rest_time_ms"        			: 3000,
												"is_timed_message"						: false,
											},

	"queue_service"							: {
                                                "service_id"                			: $Const.SRVID_PM2, //$Const.SRVID_XXXXX,
												"queue_id"								: 0, // $Const.MQID_XXXXX,
                                                "anounce_dead_after_ms"     			: 15000,
                                                "hearbeat_every_ms"         			: 5000,
                                                "queue_rest_time_ms"        			: 500,
												"is_timed_message"						: false,
											},

	"bulk_action_service"					: {
                                                "service_id"                			: $Const.SRVID_PM2,
												"queue_id"								: $Const.MQID_BULK_ACTION,
                                                "anounce_dead_after_ms"     			: 12000,
                                                "hearbeat_every_ms"         			: 5000,
                                                "queue_rest_time_ms"        			: 500,
											},

	// Image upload
	"reduce_image_on_upload"				: true,
	"reduce_image_params"					: {
												"max_width"								: 1080,
												"max_height"							: 1080,
												"convert_to_jpeg"						: true,
											},

	// SMS
	"sms"									: {
												"provider"								: "{provider name}", // twilio
												"#auth_id"								: "{auth_id}",
												"#auth_token"							: "{Auth token}",
												"messaging_service_sid"					: "{Messaging service sid}",
												"sender_num"							: "{Sender num}",
												"send_timeout_ms"						: 5000,
												"send_to_debug_log"						: true,
											},

	"otp_verification"						: {
												"num_of_digits"							: 6,
												"code_valid_for_seconds"				: 300,
												"auth_key_valid_for_seconds"			: 3600,
												"max_tries"								: 3,
												"return_is_registered"					: true,
												// Development
												"send_otp_to_debug_log"					: true,
												"override_otp_code_verification"		: true,
												"enable_backdoor_code"					: false,
												"#backdoor_code"						: "{Backdoor Code}",
												"#predef_phone_nums"					: "{Array of phone numbers}",
												"#predef_email_addresses"				: "{Array of email addresses}",
												"#predef_otp_code"						: "{Predefined otp code}",
											},

	"avatar"								: {
												"size"									: 300,
												"default_font_file"						: "typewriter.ttf",
												"default_font_name"						: "typewriter",
												"default_color"							: "#ff0000",
											},

	"cipher"								: {
												"#secret_key"							: "{Secret Key}",
												"#secret_iv"							: "{Secret IV}",
												"enc_method"							: "aes-256-cbc",
											},


	// Login platforms
	"enable_fb_login"						: false, 
	"enable_google_login"					: false, 
	"enable_apple_login"					: false,
	"socail_auth_key_valid_for_seconds"		: 7200,
	"social_return_is_registered"			: true,

	// FACEBOOK inetgration
	// you need the facebook SDK from https://developers.facebook.com/docs/php/gettingstarted installed under plarform/vendor/facebook
	// you need to configure the below parameters for fb integration to work.
	// the api name is login_with_facebook
	"facebook_app_id"               		: "{facebook app id}",
	"#facebook_app_secret"          		: "{facebook app secret}",
	"facebook_app_ver"              		: "v2.4",
		
	// Apple		
	"#apple_api_passphrase"					: "{API passphrase}",
	"apple_api_pem_file"					: "{path to pem file}",
	"apple_api_url"							: "ssl://gateway.push.apple.com:2195",

	// FCM / Google API		
	"#google_fb_key"          				: "{Path to firebase.json}",
	"#google_api_key"						: "{Google API Key}",
	"google_api_protocol"					: "https",
	"google_api_lang"						: "en",

	// AWS		
	"aws"									: {
												"bucket_name"							: "app.doseon.staging",
												"#access_key"							: "AKIA3F4XZBKBTROK5XAQ",
												"#access_secret"						: "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",
												"region"								: "us-west-1",
												"version"								: "2006-03-01",
											},

	"mailer_accounts"						: {
												"from_name"								: "{default name}",
												"from_email"							: "{default email}",
											//	"from_name_SUFFIX"						: "suffix", // to be used for muliple accounts in both Sendgrid and MalieQueue
											//	"from_email_SUFFIX"						: "suffix", // to be used for muliple accounts in both Sendgrid and MalieQueue
											},

	// gmail smtp
	// Check this to enable gmail SMTP access: https://stackoverflow.com/a/25175234/1755778
	"gmail_smtp"							: {
												"use_gmail_smtp"						: false,
												"user_name"								: "{gmail account name}",
												"#password"								: "{gmail account password}",
												"log_file"								: $Const.INFRA_ROOT + "/runtime/log/gmailer.log",
											},

	"sendgrid_smtp"							: {
												"use_sendgrid_smtp"						: false,
												"#key"									: "{sendgrid api key}",
												"log_file"								: $Const.INFRA_ROOT + "/runtime/log/sendgrid.log",
												"is_debug_mode"							: true,
											},

};
