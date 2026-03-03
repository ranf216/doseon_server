module.exports = {
	"#salt"									: "ae0d1e5984ce8c3ca967c25e17a3e7ef",
	"#open_api_passcode"					: "{Any Passcode}",

	"#db_user"								: "admin",
	"#db_pwd"								: "vcRrrGjk7SbZN9H2",

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
												"#secret_key"							: "1801da8527aa7dbb122baa291e653fbc0228dbaed11502916dba1267d182c0e1",
												"#secret_iv"							: "0d12fa116331a9e27b6732999aa7c343b75c16cfeb86254abaae56ed1a15abd2",
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
