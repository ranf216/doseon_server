module.exports =
{
	sendVerificationCode: function(phoneNum)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let code = $Utils.getRandomCode($Config.get("otp_verification", "num_of_digits"));
		let message = $Utils.strFormat($DataItems.getString("sms - otp verification"), code);

		if ($Config.get("otp_verification", "send_otp_to_debug_log"))
		{
			$Logger.logString($Const.LL_DEBUG, `Send SMS to ${phoneNum}: ${message}`);
			$Logger.debug(`Send SMS to ${phoneNum}: Code - {{${code}}}`, "Debug/OTP");
		}
		else
		{
			let rv = this.sendSms(phoneNum, message);
			if ($Err.isERR(rv))
			{
				return rv;
			}
		}

		vals.code = code;
		vals.message = message;

		return {...rc, ...vals};
	},
	
	resendVerificationCode: function(phoneNum, code)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let message = $Utils.strFormat($DataItems.getString("sms - otp verification"), code);

		if ($Config.get("otp_verification", "send_otp_to_debug_log"))
		{
			$Logger.logString($Const.LL_DEBUG, `Resend SMS to ${phoneNum}: ${message}`);
			$Logger.debug(`Resend SMS to ${phoneNum}: Code - {{${code}}}`, "Debug/OTP");
		}
		else
		{
			let rv = this.sendSms(phoneNum, message);
			if ($Err.isERR(rv))
			{
				return rv;
			}
		}

		vals.code = code;
		vals.message = message;

		return {...rc, ...vals};
	},
	
	sendSms: function(phoneNum, message)
	{
		$Logger.logString($Const.LL_DEBUG, `Send SMS to ${phoneNum}: ${message}`);

		if ($Config.get("sms", "send_to_debug_log"))
		{
			$Logger.logString($Const.LL_DEBUG, `Send SMS to ${phoneNum}: ${message}`);
			return $ERRS.ERR_SUCCESS;
		}

		if ($Config.get("sms", "provider") == "twilio")
		{
			return this._sendSmsTwilio(phoneNum, message);
		}

		return $ERRS.ERR_INVALID_SMS_PROVIDER;
	},

	_sendSmsTwilio: function(phoneNum, message)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const accountSid = $Config.get("sms", "auth_id");
		const authToken = $Config.get("sms", "auth_token");
		const fromNumber  = $Config.get("sms", "sender_num");
		let msSid  = $Config.get("sms", "messaging_service_sid");

		if (!msSid.startsWith("MG"))
		{
			msSid = null;
		}

		const twilio = require('twilio');
		const client = new twilio(accountSid, authToken);
		if ($Utils.empty(client))
		{
			return $Err.errWithInfo("ERR_FAILED_TO_SEND_SMS", "Could not create client");
		}

		let asyncDone = false;
		let data;

		const createOptions = {
			body: message,
			to: phoneNum,
		};

		if (msSid)
		{
			createOptions.messagingServiceSid = msSid;
		}
		else
		{
			createOptions.from = fromNumber;
		}

		client.messages.create(createOptions).then((message) => {data = message; asyncDone = true;});

		setTimeout(function()
		{
			asyncDone = true;
			data = {"error": "Twilio client timeout"};
		}, $Config.get("sms", "send_timeout_ms"));

		require('deasync').loopWhile(function(){return !asyncDone;});

		$Logger.logString($Const.LL_DEBUG, `Twilio response for ${phoneNum}: ${message}`);

		if ($Utils.empty(data.sid))
		{
			return $Err.errWithInfo("ERR_FAILED_TO_SEND_SMS", JSON.stringify(data));
		}

		return {...rc, ...vals};
	}
}
