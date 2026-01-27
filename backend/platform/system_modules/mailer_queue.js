/*
*	constructor(mailType, to, fromSuffix, subject, bcc = null)
*
*	addS3Attachment(s3Attachment)
*	addFileAttachment(sourceFile, contentType, fileName)
*
*	sendMail(message, messageText = null)
*	sendMailWithTemplate(templateId, params)
*/

const emailValidator = require("email-validator");

module.exports = class
{
	constructor(mailType, subject, to, fromSuffix = null, bcc = null)
	{
        this.isValid = false;

		let from = $Mailer.getFromName(fromSuffix);
		let fromEmail = $Mailer.getFromEmail(fromSuffix);

		$Logger.logString($Const.LL_DEBUG, `MailerQueue: TO: ${to}, FROM: ${from} <${fromEmail}>, SUBJECT: ${subject}`);

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

        this.isValid = true;
        this.data = {};

		this.data.mailType = mailType;
		this.data.to = to;
		this.data.fromSuffix = fromSuffix;
		this.data.subject = subject;
        this.data.bcc = bcc;
        this.data.s3Attachments = [];
        this.data.fileAttachments = [];
        this.data.isTemplate = false;
        this.data.calendarMeetingInfo = null;
        this.data.message = null;
        this.data.messageText = null;
        this.data.templateId = null;
        this.data.params = null;
    }

	addS3Attachment(s3AttachmentFile)
	{
        this.data.s3Attachments.push(s3AttachmentFile);
	}

	addFileAttachment(sourceFile, contentType, fileName)
	{
        this.data.fileAttachments.push({"sourceFile": sourceFile, "contentType": contentType, "fileName": fileName});
	}

	sendMail(message, messageText = null)
	{
        this.data.message = message;
        this.data.messageText = messageText;

        return this._send();
	}

    sendMailWithTemplate(templateId, params)
    {
        this.data.isTemplate = true;
        this.data.templateId = templateId;
        this.data.params = params;

        return this._send();
    }

	sendCalendarMeeting(startTime, lengthMins, title, description, organizerName, organizerEmail, attendeesArr /* name, email */,
                        location = null, uid = null, sequence = null, isCancel = false, recurrenceRule = null)
	{
        this.data.calendarMeetingInfo = {startTime, lengthMins, title, description, organizerName, organizerEmail, attendeesArr, location,
                                        uid, sequence, isCancel, recurrenceRule};
        return this._send();
	}

    _send()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery("INSERT INTO `mailer_queue` (MQU_EMAIL_TYPE, MQU_DATA, MQU_CREATED_ON) VALUES (?, ?, ?)",
                                                                [this.data.mailType, JSON.stringify(this.data), $Utils.now()]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }


    static batchSend()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let mqus = $Db.executeQuery("SELECT MQU_ID, MQU_EMAIL_TYPE, MQU_TRIAL FROM `mailer_queue` WHERE MQU_IS_FAILED=0", []);
        mqus.forEach (mqu =>
        {
            if (mqu.MQU_TRIAL >= $Const.MAX_MAILER_QUEUE_TRIALS)
            {
                this._sendMailFailedAlert(mqu.MQU_ID, mqu.MQU_EMAIL_TYPE);
                $Db.executeQuery("UPDATE `mailer_queue` SET MQU_IS_FAILED=1 WHERE MQU_ID=?", [mqu.MQU_ID]);
                return;
            }

            $Db.executeQuery("UPDATE `mailer_queue` SET MQU_TRIAL=MQU_TRIAL+1 WHERE MQU_ID=?", [mqu.MQU_ID]);

            let mqusData = $Db.executeQuery("SELECT MQU_DATA FROM `mailer_queue` WHERE MQU_ID=?", [mqu.MQU_ID]);
            let data = JSON.parse(mqusData[0].MQU_DATA);

            if (this._sendSendgridMail(data))
            {
                $Db.executeQuery("DELETE FROM `mailer_queue` WHERE MQU_ID=?", [mqu.MQU_ID]);
            }
        });

        return {...rc, ...vals};
    }

    static _sendSendgridMail(data)
    {
        let mailer = new $Sendgrid(data.subject, data.to, null, data.fromSuffix, data.bcc);

        data.s3Attachments.forEach (s3Att =>
        {
            mailer.addS3Attachment(s3Att);
        });

        data.fileAttachments.forEach (fileAtt =>
        {
            mailer.addFileAttachment(fileAtt.sourceFile, fileAtt.contentType, fileAtt.fileName);
        });

        if (data.isTemplate)
        {
            return mailer.sendMailWithTemplate(data.templateId, data.params);
        }

        if (data.calendarMeetingInfo)
        {
            return mailer.sendCalendarMeeting(data.calendarMeetingInfo.startTime, data.calendarMeetingInfo.lengthMins, data.calendarMeetingInfo.title,
                                            data.calendarMeetingInfo.description, data.calendarMeetingInfo.organizerName, data.calendarMeetingInfo.organizerEmail,
                                            data.calendarMeetingInfo.attendeesArr, data.calendarMeetingInfo.location, data.calendarMeetingInfo.uid,
                                            data.calendarMeetingInfo.sequence, data.calendarMeetingInfo.isCancel, data.calendarMeetingInfo.recurrenceRule);
        }

        return mailer.sendMail(data.message, data.messageText);
	}

    static _sendMailFailedAlert(mquId, emailType)
    {
        $Utils.sendSystemErrorEmail(`Failed to send '${emailType}' email (Id: ${mquId})`, `Mailer Queue ID: ${mquId}<br/>Mail Type: ${emailType}`);
        $Utils.sendSystemErrorSMS(`Failed to send '${emailType}' email (Id: ${mquId})`);
    }
}
