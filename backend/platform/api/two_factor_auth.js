module.exports =
{
			"send_otp_code"						: {
													"@acl"							: [$ACL.USER_TYPE_NA],
                                                    "second_factor_key"             : "s",
                                                    "factor_type"                   : "s***" + $Const.OTP_TYPE_PHONE + " or " + $Const.OTP_TYPE_EMAIL,
												},

													
			"resend_otp_code"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
                                                    "second_factor_key"             : "s",
                                                    "factor_type"                   : "s***" + $Const.OTP_TYPE_PHONE + " or " + $Const.OTP_TYPE_EMAIL,
												},

													
			"verify_otp_code"					: {
													"@acl"							: [$ACL.USER_TYPE_NA],
                                                    "second_factor_key"             : "s",
                                                    "factor_type"                   : "s***" + $Const.OTP_TYPE_PHONE + " or " + $Const.OTP_TYPE_EMAIL,
													"verification_code"				: "s",
												},

			"mandatory_change_password"			: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"@accept_x_token"				: "only",
													"@protected"					: "curr_password, new_password",
                                                    "#token"						: "s",
													"curr_password"					: "s",
													"new_password"					: "s",
												},

			"change_factor"						: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"@protected"					: "curr_password, new_password",
                                                    "#token"						: "s",
                                                    "factor_type"                   : `s***${$Const.OTP_TYPE_PHONE} or ${$Const.OTP_TYPE_EMAIL} or ${$Const.OTP_TYPE_PASSWORD}`,
													"curr_password"					: "s",
													"new_password"					: "o:s:",
													"new_phone_num"					: "o:s:",
													"new_country_code"				: "o:s:us***can be empty if phone_num has international format",
													"new_email"						: "o:s:",
												},

			"change_factor_send_otp_code"		: {
													"@acl"							: $Utils.allAuthedUserTypes(),
                                                    "#token"						: "s",
                                                    "second_factor_key"             : "s",
                                                    "factor_type"                   : `s***${$Const.OTP_TYPE_PHONE} or ${$Const.OTP_TYPE_EMAIL}`,
                                                },

													
			"change_factor_resend_otp_code"		: {
													"@acl"							: $Utils.allAuthedUserTypes(),
                                                    "#token"						: "s",
                                                    "second_factor_key"             : "s",
                                                    "factor_type"                   : `s***${$Const.OTP_TYPE_PHONE} or ${$Const.OTP_TYPE_EMAIL}`,
                                                },

													
			"change_factor_verify_otp_code"		: {
													"@acl"							: $Utils.allAuthedUserTypes(),
                                                    "#token"						: "s",
                                                    "second_factor_key"             : "s",
                                                    "factor_type"                   : `s***${$Const.OTP_TYPE_PHONE} or ${$Const.OTP_TYPE_EMAIL}`,
													"verification_code"				: "s",
                                                },

};
