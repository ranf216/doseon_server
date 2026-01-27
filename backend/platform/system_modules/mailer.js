module.exports =
{
	sendMailFromTemplate: function(toEmail, emailId, params, fromSuffix = null)
	{
		let subject = $DataItems.getString("email - " + emailId);
		let message = $Utils.fileGetContents($Const.INFRA_ROOT + "/platform/email_teplates/" + $DataItems.getString("email template - " + emailId));

		Object.entries(params).forEach(function(paramsObj)
		{
			let param = new RegExp(paramsObj[0], 'g');
			let value = paramsObj[1];
	
			subject = subject.replace(param, value);
			message = message.replace(param, value);
		});
		
		let rv = this.sendMail(toEmail, fromSuffix, subject, message);
		if ($Err.isERR(rv))
		{
			return rv;
		}

		return $ERRS.ERR_SUCCESS;
	},

	sendMail: function(toEmail, fromSuffix, subject, message)
	{
		let fromName = $Mailer.getFromName(fromSuffix);
		let fromEmail = $Mailer.getFromEmail(fromSuffix);

		if ($Config.get("debug_email") == true)
		{
			$Logger.logString($Const.LL_DEBUG, `TO: ${toEmail}, FROM: ${fromName} <${fromEmail}>`);
			$Logger.logString($Const.LL_DEBUG, "SUBJECT: " + subject);
			$Logger.logString($Const.LL_DEBUG, "MESSAGE: " + message.replace(/\r|\n/g, ""));
			return $ERRS.ERR_SUCCESS;
		}
		else if ($Config.get("gmail_smtp", "use_gmail_smtp"))
		{
			return this.sendMailFromGmail(toEmail, fromName, fromEmail, subject, message);
		}
		else if ($Config.get("sendgrid_smtp", "use_sendgrid_smtp"))
		{
			let sgm = new $Sendgrid(subject, toEmail, fromSuffix);
			return sgm.sendMail(message);
		}

		return $ERRS.ERR_NO_EMAIL_PROVIDER_SET;
	},

	sendMailFromGmail: function(to, from, fromEmail, subject, message, messageText = null)
	{
		const nodemailer = require('nodemailer');

		let transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: $Config.get("gmail_smtp", "user_name"),
				pass: $Config.get("gmail_smtp", "password"),
			}
		});

		let mailOptions = {
			from: `${from} <${fromEmail}>`,
			to: to,
			subject: subject,
			html: message,
			text: messageText,
		};

		let asyncDone = false;
		let log;
		let rc;

		transporter.sendMail(mailOptions, function(error, info)
		{
			if (error)
			{
				log = `Error: ** to ${to} Error: ${error} Subject: ${subject}`;
				rc = $ERRS.ERR_FAILED_TO_SEND_EMAIL;
			}
			else
			{
				log = `To => ${to} Subject: ${subject}`;
				rc = $ERRS.ERR_SUCCESS;
			}

			asyncDone = true;
		});

		require('deasync').loopWhile(function(){return !asyncDone;});

		$Files.saveFile($Config.get("gmail_smtp", "log_file"), new $Date().format() +  ` ${log}\n`, $Config.get("standard_file_access"), "as");
		$Logger.logString($Err.isERR(rc) ? $Const.LL_ERROR : $Const.LL_DEBUG, log);

		return rc;
	},

	sendEmailVerificationCode: function(email, fromSuffix = null)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let code = $Utils.getRandomCode($Config.get("otp_verification", "num_of_digits"));

		if ($Config.get("otp_verification", "send_otp_to_debug_log"))
		{
			$Logger.logString($Const.LL_DEBUG, `Send Email to ${email}: Code - ${code}`);
			$Logger.debug(`Send Email to ${email}: Code - {{${code}}}`, "Debug/OTP");
		}
		else
		{
            let params = {
                code: code,
            };
            new $MailerQueue("Account Login", "", email, fromSuffix).sendMailWithTemplate($Config.get("sendgrid_template", "account_login"), params);
		}

		vals.code = code;

		return {...rc, ...vals};
	},
	
	resendEmailVerificationCode: function(email, code, fromSuffix = null)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;


		if ($Config.get("otp_verification", "send_otp_to_debug_log"))
		{
			$Logger.logString($Const.LL_DEBUG, `Resend Email to ${email}: Code - ${code}`);
			$Logger.debug(`Resend Email to ${email}: Code - {{${code}}}`, "Debug/OTP");
		}
		else
		{
            let params = {
                code: code,
            };
            new $MailerQueue("Account Login", "", email, fromSuffix).sendMailWithTemplate($Config.get("sendgrid_template", "account_login"), params);
		}

		vals.code = code;

		return {...rc, ...vals};
	},

	getFromEmail: function(suffix)
	{
		return $Config.get("mailer_accounts", "from_email" + (suffix ? `_${suffix}` : ""));
	},

	getFromName: function(suffix)
	{
		return $Config.get("mailer_accounts", "from_name" + (suffix ? `_${suffix}` : ""));
	},
}
