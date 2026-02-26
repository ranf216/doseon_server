module.exports = {
	"#salt"									: "{Any Salt String}",
	"#open_api_passcode"					: "{Any Passcode}",

	"#db_user"								: "{user name}",
	"#db_pwd"								: "{password}",

	"sms"									: {
												"#auth_id"								: "{auth_id}",
												"#auth_token"							: "{Auth token}",
											},

	"otp_verification"						: {
												"#backdoor_code"						: "{Backdoor Code}",
												"#predef_phone_nums"					: "{Array of phone numbers}",	// ["Apple", "Google"]
												"#predef_email_addresses"				: "{Array of email addresses}",	// ["Apple", "Google"]
												"#predef_otp_code"						: "{Predefined otp code}",		// "1234"
											},

	"cipher"								: {
												"#secret_key"							: "{Secret Key}",
												"#secret_iv"							: "{Secret IV}",
											},

	"#facebook_app_secret"          		: "{facebook app secret}",
	"#apple_api_passphrase"					: "{API passphrase}",
	"#google_fb_key"          				: "{Path to firebase.json}", // $Const.CONFIG_PATH + "/firebase.json"
	"#google_api_key"						: "{Google API Key}",

	"aws"									: {
												"#access_key"							: "{AWS Access Key}",
												"#access_secret"						: "{AWS Access Secret}",
											},

	"gmail_smtp"							: {
												"#password"								: "{gmail account password}",
											},

	"sendgrid_smtp"							: {
												"#key"									: "{sendgrid api key}",
											},
};
