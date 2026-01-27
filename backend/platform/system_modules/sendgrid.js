/*
*	constructor(subject, to, fromSuffix, bcc = null)
*
*	addS3Attachment(s3Attachment)
*	addFileAttachment(sourceFile, contentType, fileName)
*	addStringAttachment(content, contentType, fileName)
*
*	sendMail(message, messageText = null)
*	sendMailWithTemplate(templateId, params)
*/

const emailValidator = require("email-validator");

module.exports = class
{
    constructor(subject, to, fromSuffix = null, bcc = null)
	{
		let from = $Mailer.getFromName(fromSuffix);
		let fromEmail = $Mailer.getFromEmail(fromSuffix);

		$Logger.logString($Const.LL_DEBUG, `TO: ${to}, FROM: ${from} <${fromEmail}>`);
		$Logger.logString($Const.LL_DEBUG, `SUBJECT: ${subject}`);

		this.email = null;

		if (!emailValidator.validate(fromEmail))
		{
			$Logger.logString($Const.LL_ERROR, `from ${fromEmail}: Invalid email address`);
			return;
		}
		if (!emailValidator.validate(to))
		{
			$Logger.logString($Const.LL_ERROR, `to ${to}: Invalid email address`);
			return;
		}
		if (!$Utils.empty(bcc) && !emailValidator.validate(bcc))
		{
			$Logger.logString($Const.LL_ERROR, `bcc ${bcc}: Invalid email address`);
			return;
		}

		this.email = {
			to: to,
			from: {email: fromEmail, name: from},
			subject: subject,
		};

		if (!$Utils.empty(bcc))
		{
			this.email.bcc = bcc;
		}
	}

	addS3Attachment(s3Attachment)
	{
		if ($Utils.empty(this.email))
		{
			return;
		}

		let aws = new $Aws();
		let rv = aws.getFile(s3Attachment);
		if ($Err.isERR(rv))
		{
			$Logger.logString($Const.LL_ERROR, "Failed to retrieve S3 attachment: " + JSON.stringify(rv));
			return;
		}

		let keyExplode = s3Attachment.split('/');
		let attachmentFilename = keyExplode[keyExplode.length - 1];
		let attachmentContent = $Utils.base64Encode(rv['file_body']);
		let attachmentContentType = rv['content_type'];

		this._setAttachment(attachmentContent, attachmentContentType, attachmentFilename);
	}

	addFileAttachment(sourceFile, contentType, fileName)
	{
		if ($Utils.empty(this.email))
		{
			return;
		}

		let cnt = $Utils.fileGetContents(sourceFile);
		this._setAttachment($Utils.base64Encode(cnt), contentType, fileName);
	}

	addStringAttachment(content, contentType, fileName)
	{
		if ($Utils.empty(this.email))
		{
			return;
		}

		this._setAttachment($Utils.base64Encode(content), contentType, fileName);
	}

	sendMail(message, messageText = null)
	{
		if ($Utils.empty(this.email))
		{
			return false;
		}

		$Logger.logString($Const.LL_DEBUG, "MESSAGE: " + message.replace(/\r|\n/g, ""));

		this.email.html = message;

		if (!$Utils.empty(messageText))
		{
			this.email.text = messageText;
		}

		return this._send();
	}

    sendMailWithTemplate(templateId, params)
    {
		if ($Utils.empty(this.email))
		{
			return false;
		}

		$Logger.logString($Const.LL_DEBUG, `TEMPLATE ID: ${templateId}`);
		$Logger.logString($Const.LL_DEBUG, "PARAMS: " + JSON.stringify(params));

        this.email.templateId = templateId;
		this.email.dynamic_template_data = params;

		return this._send();
    }

	sendCalendarMeeting(startTime, lengthMins, title, description, organizerName, organizerEmail, attendeesArr /* name, email */,
						location = null, uid = null, sequence = null, isCancel = false, recurrenceRule = null)
	{
// Reference: https://www.npmjs.com/package/ics

		if ($Utils.empty(this.email))
		{
			return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
		}

		let dStart = new $Date(startTime);
		let startVals = dStart.format("Y,m,d,H,i");
		startVals = $Utils.commaSepListToArray(startVals).map(num => parseInt(num));

		let lenH = Math.floor(lengthMins / 60);
		let lenM = lengthMins % 60;

		attendeesArr.forEach(att =>
		{
			att.rsvp = true;
			att.partstat = "NEEDS-ACTION";
		});

		const ics = require('ics')

		let event = {
			start: startVals,
			startInputType: 'utc',
			duration: { hours: lenH, minutes: lenM },
			title: title,
			description: description,
			method: (isCancel ? "CANCEL" : "REQUEST"),
			transp: "OPAQUE",
			status: (isCancel ? "CANCELLED" : "CONFIRMED"),
			busyStatus: 'BUSY',
			organizer: { name: organizerName, email: organizerEmail },
			attendees: attendeesArr,
		}

		if (!$Utils.empty(location))		event.location = location;
		if (!$Utils.empty(uid))				event.uid = uid;
		if (!$Utils.empty(sequence))		event.sequence = sequence;
		if (!$Utils.empty(recurrenceRule))	event.recurrenceRule = recurrenceRule;

		let ical = ics.createEvent(event, (error, value) =>
		{
			if (error)
			{
				$Logger.logString($Const.LL_ERROR, `Failed to create iCal event`);
				return "";
			}

			return value;
		});

		if ($Utils.empty(ical))
		{
			return $ERRS.ERR_FAILED_TO_CREATE_ICAL_EVENT;
		}

		  
		this.email.content = [{ type: 'text/calendar; method=REQUEST', value: ical }];

		this.email.attachments = [{
			content: $Utils.base64Encode(ical),
			filename: "invite.ics",
			name: "invite.ics",
			type: "application/ics",
			disposition: 'attachment',
		}];

		return this._send();
	}

	_send()
	{
		if ($Config.get("sendgrid_smtp", "is_debug_mode"))
		{
			$Logger.logString($Const.LL_DEBUG, "DEBUG MODE: Email was not sent");
			return $ERRS.ERR_SUCCESS;
		}

		const sgMail = require('@sendgrid/mail');
		sgMail.setApiKey($Config.get("sendgrid_smtp", "key"));

		let asyncDone = false;
		let log;
		let rc;
		let email = this.email;

		sgMail.send(this.email).then(() =>
		{
			log = `To => ${email.to} Subject: ${email.subject}`;
			rc = $ERRS.ERR_SUCCESS;
			asyncDone = true;
		},
		error =>
		{
			log = `Error: ** to ${email.to} Error: ${error} Subject: ${email.subject}`;
			rc = $ERRS.ERR_FAILED_TO_SEND_EMAIL;
			asyncDone = true;
		});

		require('deasync').loopWhile(function(){return !asyncDone;});

		$Files.saveFile($Config.get("sendgrid_smtp", "log_file"), new $Date().format() +  ` ${log}\n`, $Config.get("standard_file_access"), "as");
		$Logger.logString($Err.isERR(rc) ? $Const.LL_ERROR : $Const.LL_DEBUG, log);

		return rc;
    }

	_setAttachment(attachmentContent, attachmentContentType, attachmentFilename)
	{
		let attachment = {
			content: attachmentContent,
			filename: attachmentFilename,
			type: attachmentContentType,
			disposition: 'attachment',
			content_id: attachmentFilename, //Only used if disposition is set to inline
		};

		if (!$Utils.isset(this.email.attachments))
		{
			this.email.attachments = [];
		}

		this.email.attachments.push(attachment);
	}
}
