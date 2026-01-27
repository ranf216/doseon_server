const fs = require('fs');

module.exports =
{
	logRequest: function(json, isRequest, traetedParamsForLogging = null)
	{
		let session = getSession();
		if (session.custom.log_requests === 0)
		{
			return;
		}

		if (isRequest && !$Utils.empty(json) && !$Utils.empty(json["#request"]))
		{
			session.custom.request_name = json["#request"];
			session.custom.request_treated_params = traetedParamsForLogging;
		}
		
		if (isRequest && $Config.get("log_requests") & $Const.LL_REQUEST)
		{
			let removed = [];
			if (!$Config.get("log_protected_params"))
			{
				this._treatParams(json, "protected_request", removed);
			}
			if ($Config.get("log_activate_truncated_params"))
			{
				this._treatParams(json, "truncated_request", removed);
			}
			
			let jsonStr = JSON.stringify(json);
			internalLogString($Const.LL_REQUEST, jsonStr);
			
			if (!$Utils.empty(removed))
			{
                Object.entries(removed).forEach(function(item, index, arr)
                {
                    let param = item[0];
                    let value = item[1];
					json[param] = value;
				});
			}
		}
		else if (!isRequest && $Config.get("log_requests") & $Const.LL_RESPONSE)
		{
			let removed = [];
			if (!$Config.get("log_protected_params"))
			{
				this._treatParams(json, "protected_response", removed);
			}
			if ($Config.get("log_activate_truncated_params"))
			{
				this._treatParams(json, "truncated_response", removed);
			}

			let jsonStr = JSON.stringify(json);
			internalLogString($Const.LL_RESPONSE, jsonStr, json.rc == $ERRS.ERR_API_CRASH.rc);
			
			if (!$Utils.empty(removed))
			{
                Object.entries(removed).forEach(function(item, index, arr)
                {
                    let param = item[0];
                    let value = item[1];
					json[param] = value;
				});
			}
		}
	},

	queueString: function(type, logString)
	{
		internalLogString(type, logString, false, true);
	},

	logString: function(type, logString)
	{
		internalLogString(type, logString);
	},

	logStringToDbOnly: function(type, logString)
	{
		internalLogString(type, logString, false, false, true);
	},

	logQueue: function()
	{
		const session = getSession();

		if ($Utils.empty(session.custom.log_queue))
		{
			return;
		}

		let placeholders = [];
		let params = [];

		session.custom.log_queue.forEach(log =>
		{
			placeholders.push("(?, ?, ?, ?, ?, ?)");
			params = params.concat(log);
		});

		placeholders = placeholders.join(",");
		session.custom.log_queue = [];

		$Db.executeQuery(`INSERT INTO \`log\` (LOG_CREATED_ON, LOG_IP_ADDRESS, LOG_TYPE, LOG_REQUEST_NAME, LOG_REQUEST_UID, LOG_STRING) VALUES ${placeholders}`, params);
	},

	debug: function(logString, overrideRequestName = null)
	{
		let session = getSession();

		let requestName = overrideRequestName || session.custom.request_name;
		if ($Utils.empty(requestName))
		{
			requestName = "/null/";
		}

		let reqUid = session.custom.req_uid;
		if ($Utils.empty(reqUid))
		{
			reqUid = $Utils.simpleUniqueHash();
			session.custom.req_uid = reqUid;
		}

		$Db.executeQuery(`INSERT INTO \`debug_log\` (DLG_CREATED_ON, DLG_REQUEST_NAME, DLG_REQUEST_UID, DLG_STRING) VALUES (?, ?, ?, ?)`,
									[$Utils.now(), requestName, reqUid, logString]);
	},


	_treatParams: function(json, treatType, treatedParams)
	{
		let session = getSession();
		let tpfl = session.custom.request_treated_params;

		if ($Utils.empty(tpfl))
		{
			return;
		}

		let params = [];
		let isTruncate = (treatType == "truncated_request" || treatType == "truncated_response");

		if ($Utils.isset(tpfl[treatType]) && !$Utils.empty(tpfl[treatType]))
		{
			params = tpfl[treatType].split(",");
		}


		if (!isTruncate)
		{
			params.push("token");
		}

		params.forEach(function(param)
        {
			param = param.trim();

			if ($Utils.isset(json[param]))
			{
				if (isTruncate)
				{
					if (("" + json[param]).length > 20)
					{
						treatedParams[param] = json[param];
						json[param] = ("" + json[param]).substring(0, 20) + "...";
					}
				}
				else
				{
					treatedParams[param] = json[param];
					json[param] = "******";
				}
			}
        });
	},


	markCrashesAndErrors: function()
	{
		let now = new $Date();
		now.addMinutes(-5);

		$Db.executeQuery(`UPDATE \`log\` SET LOG_INTERNAL_STATUS=? WHERE LOG_ID in
								(SELECT log_id FROM
									(SELECT logr.LOG_ID log_id
									FROM \`log\` loge
										JOIN \`log\` logr ON loge.LOG_REQUEST_UID=logr.LOG_REQUEST_UID
									WHERE loge.LOG_TYPE='ERROR' AND logr.LOG_INTERNAL_STATUS=? AND loge.LOG_CREATED_ON<?) ilog
								)`, [$Const.LOG_INTERNAL_STATUS_ERROR, $Const.LOG_INTERNAL_STATUS_LOGGED, now.format()]);

		$Db.executeQuery(`UPDATE \`log\` SET LOG_INTERNAL_STATUS=? WHERE LOG_ID in
								(SELECT log_id FROM
									(SELECT logcr.LOG_ID log_id
									FROM	(SELECT loge.LOG_ID, loge.LOG_REQUEST_UID, loge.LOG_TYPE LOGE_TYPE, logr.LOG_TYPE LOGR_TYPE
											FROM \`log\` loge
												LEFT OUTER JOIN \`log\` logr ON loge.LOG_REQUEST_UID=logr.LOG_REQUEST_UID AND logr.LOG_TYPE='RESPONSE'
											WHERE loge.LOG_TYPE='REQUEST' AND loge.LOG_INTERNAL_STATUS<? AND logr.LOG_TYPE is null AND loge.LOG_CREATED_ON<?) logc
										JOIN \`log\` logcr ON logc.LOG_REQUEST_UID=logcr.LOG_REQUEST_UID) ilog
								)`, [$Const.LOG_INTERNAL_STATUS_CRASH, $Const.LOG_INTERNAL_STATUS_CRASH, now.format()]);

		$Db.executeQuery(`DELETE FROM \`log\` WHERE LOG_ID in
								(SELECT log_id FROM
									(SELECT logr.LOG_ID log_id
									FROM \`log\` loge
										JOIN \`log\` logr ON loge.LOG_REQUEST_UID=logr.LOG_REQUEST_UID
									WHERE (loge.LOG_TYPE='REQUEST' OR loge.LOG_REQUEST_NAME=?) AND logr.LOG_INTERNAL_STATUS=? AND loge.LOG_CREATED_ON<?) ilog
								)`, ["/null/", $Const.LOG_INTERNAL_STATUS_LOGGED, now.format()]);
	},

	reportCrashes: function()
	{
		let logs = $Db.executeQuery(`SELECT LOG_ID log_id, LOG_CREATED_ON 'datetime', LOG_IP_ADDRESS ip_address, LOG_TYPE 'type', LOG_REQUEST_NAME request_name,
											LOG_REQUEST_UID request_uid, substring(LOG_STRING, 1, 500) 'text'
									FROM \`log\`
									WHERE LOG_INTERNAL_STATUS=?
									ORDER BY LOG_ID ASC`, [$Const.LOG_INTERNAL_STATUS_CRASH]);
		if (logs.length == 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let requestUid = logs[0].request_uid;
		let text = "";

		logs.forEach(log =>
		{
			if (log.request_uid != requestUid)
			{
				this._sendCrashReport(requestUid, text);

				requestUid = log.request_uid;
				text = "";
			}

			text += this._createTableRow(log);
		});

		this._sendCrashReport(requestUid, text);

		return $ERRS.ERR_SUCCESS;
	},

	reportErrors: function()
	{
		let logs = $Db.executeQuery(`SELECT LOG_ID log_id, LOG_CREATED_ON 'datetime', LOG_IP_ADDRESS ip_address, LOG_TYPE 'type', LOG_REQUEST_NAME request_name,
											LOG_REQUEST_UID request_uid, substring(LOG_STRING, 1, 500) 'text'
									FROM \`log\`
									WHERE LOG_INTERNAL_STATUS=?
									ORDER BY LOG_ID ASC`, [$Const.LOG_INTERNAL_STATUS_ERROR]);
		if (logs.length == 0)
		{
			return $ERRS.ERR_SUCCESS;
		}

		let body = "";

		let requestUid = logs[0].request_uid;
		let text = "";

		logs.forEach(log =>
		{
			if (log.request_uid != requestUid)
			{
				body += `<table>${text}</table><br/><hr/><br/>`;

				requestUid = log.request_uid;
				text = "";
			}

			text += this._createTableRow(log);
		});

		body += `<table>${text}</table>`;

		let html = `<html>${body}</html>`;

		$Utils.sendSystemErrorEmail("API Errors list", html);

		$Db.executeQuery(`UPDATE \`log\` SET LOG_INTERNAL_STATUS=? WHERE LOG_INTERNAL_STATUS=?`, [$Const.LOG_INTERNAL_STATUS_REPORTED_ERROR, $Const.LOG_INTERNAL_STATUS_ERROR]);

		return $ERRS.ERR_SUCCESS;
	},

	_sendCrashReport: function(requestUid, text)
	{
		if ($Utils.empty(text))
		{
			return;
		}

		text = `<html><table>${text}</table></html>`;

		$Utils.sendSystemErrorEmail(`API Crash - UID ${requestUid}`, text);
		$Utils.sendSystemErrorSMS(`API Crash - UID ${requestUid}`);

		$Db.executeQuery(`UPDATE \`log\` SET LOG_INTERNAL_STATUS=? WHERE LOG_REQUEST_UID=?`, [$Const.LOG_INTERNAL_STATUS_REPORTED_CRASH, requestUid]);
	},

	_createTableRow: function(log)
	{
		return `<tr>
	<td>${log.datetime}</td>
	<td>&nbsp;</td>
	<td>${log.ip_address}</td>
	<td>&nbsp;</td>
	<td>${log.type}</td>
	<td>&nbsp;</td>
	<td>${log.request_name}</td>
	<td>&nbsp;</td>
	<td>${log.request_uid}</td>
	<td>&nbsp;</td>
	<td>` + $Utils.escapeHtml(log.text) + `</td>
</tr>`;
	}
}

function getSession()
{
	let session = $HttpContext.get("session");
	if (!$Utils.empty(session))
	{
		return session;
	}

	return {
		log_requests: 0,
		custom: {request_name: "General", request_treated_params: []},
		getRemoteAddress()
		{
			return "UNKNOWN";
		},
	};
}

function internalLogString(type, logString, isResponseError = false, isQueueDb = false, onlyLogToDb = false)
{
	const session = getSession();

	if (session.custom.log_requests === 0)
	{
		return;
	}

	if (!($Config.get("log_requests") & type))
	{
		return;
	}

	let requestName = session.custom.request_name;
	if ($Utils.empty(requestName))
	{
		requestName = "/null/";
	}

	let reqUid = session.custom.req_uid;
	if ($Utils.empty(reqUid))
	{
		reqUid = $Utils.simpleUniqueHash();
		session.custom.req_uid = reqUid;
	}

	let typeStr;
	
	switch (type)
	{
		case $Const.LL_REQUEST:	    typeStr = "REQUEST";								break;
		case $Const.LL_RESPONSE:	typeStr = "RESPONSE";								break;
		case $Const.LL_ERROR:		typeStr = "ERROR";									break;
		case $Const.LL_WARNING:	    typeStr = "WARNING";								break;
		case $Const.LL_INFO:		typeStr = "INFO";									break;
		case $Const.LL_DEBUG:		typeStr = "DEBUG";									break;
		case $Const.LL_PROJECT:		typeStr = $Config.get("project_log_type_name");		break;
		default:			        typeStr = "DEBUG";									break;
	}
	
	const ip = session.getRemoteAddress();

	if (!onlyLogToDb)
	{
		const fileName = $Config.get("log_requests_path") + "/" + new $Date().format("Y_m_d") + ".log";
		const maxSize = $Config.get("max_log_file_size");

		if (!$Utils.empty(maxSize) && fs.existsSync(fileName))
		{
			const fileSize = fs.statSync(fileName).size;
			
			if (fileSize >= maxSize)
			{
				const newName = $Config.get("log_requests_path") + "/" + new $Date().format("Y_m_d_H_i_s") + ".log";
				fs.renameSync(fileName, newName);
			}
		}

		$Files.saveFile(fileName, $Utils.now() + "\t" + ip + "\t" + typeStr + "\t" + requestName + "\t" + reqUid + "\t" + logString + "\n", $Config.get("standard_file_access"), "as");
	}

	if ((onlyLogToDb || $Config.get("log_to_db")) && !$Utils.empty($Db) && !isResponseError)
	{
		const params = [$Utils.now(), ip, typeStr, requestName, reqUid, logString];

		if (isQueueDb)
		{
			if (!$Utils.isset(session.custom.log_queue))
			{
				session.custom.log_queue = [];
			}

			session.custom.log_queue.push(params);
		}
		else
		{
			$Db.executeQuery(`INSERT INTO \`log\` (LOG_CREATED_ON, LOG_IP_ADDRESS, LOG_TYPE, LOG_REQUEST_NAME, LOG_REQUEST_UID, LOG_STRING) VALUES (?, ?, ?, ?, ?, ?)`, params);
		}
	}
}
