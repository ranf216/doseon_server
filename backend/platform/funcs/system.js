const fs = require('fs');
const path = require('path');

module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

	log_test()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		$Logger.logString($Const.LL_ERROR, "This is test error log");
		$Logger.logString($Const.LL_WARNING, "This is test warning log");
		$Logger.logString($Const.LL_INFO, "This is test info log");
		$Logger.logString($Const.LL_DEBUG, "This is test debug log");

		if ($Config.get("project_log_type_name"))
		{
			$Logger.logString($Const.LL_PROJECT, `This is test ${$Config.get("project_log_type_name")} log`);
		}

		return {...rc, ...vals};
	}

	debug()
	{
		switch (this.$level)
		{
			case "e":
				$Logger.logString($Const.LL_ERROR, this.$message);
			break;
			case "w":
				$Logger.logString($Const.LL_WARNING, this.$message);
			break;
			case "i":
				$Logger.logString($Const.LL_INFO, this.$message);
			break;
			case "d":
				$Logger.logString($Const.LL_DEBUG, this.$message);
			break;
			case "p":
				$Logger.logString($Const.LL_PROJECT, this.$message);
			break;
		}
		
		return $ERRS.ERR_SUCCESS;
	}

	api_ver()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		vals.system_name = $Config.get("SYSTEM_NAME");
		vals.db_schema = $Config.get("db_schema");

		let users = $Db.executeQuery("SELECT count(*) num_of_users FROM `user`", []);
		if (users.length == 0)
		{
			vals.db_connection_status = "FAIL";
		}
		else
		{
			vals.db_connection_status = "OK";
		}

		vals.api_version = $Config.get("api_version");
		vals.infra_version = $Config.get("infra_version");
		vals.environment = $Config.get("environment");
		vals.welcome = this.$welcome;
		vals.deployment_version = global.$ServerDeploymentVersion;
		vals.server_start_time = global.$ServerStartTime;

		return {...rc, ...vals};
	}

	get_system_config()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		vals.config = $Config.getSystemConfig();

		return {...rc, ...vals};
	}

	get_runtime_config()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		vals.config = $Config.getRuntimeConfig();

		return {...rc, ...vals};
	}

	test_crash()
	{
		throw new Error("test_crash");
	}

	send_mail()
	{
		let atts = [];

		this.$attachments.forEach(att =>
		{
			if (!$Utils.empty(att.content))
			{
				atts.push(att);
			}
		});

		if ($Utils.empty(atts) || !$Config.get("sendgrid_smtp", "use_sendgrid_smtp"))
		{
			return $Mailer.sendMail(this.$to_email, this.$from_prefix, this.$subject, this.$message);
		}

		let sgm = new $Sendgrid(this.$subject, this.$to_email, this.$from_prefix);

		atts.forEach(att =>
		{
			sgm.addStringAttachment($Utils.base64Encode(att.content), att.content_type, att.filename);
		});

		return sgm.sendMail(this.$message);
	}

	// function get_service_status()
	// {
	// 	$service = new Service(this.$service_id);
	// 	return $service->getStatus();
	// }

	// function set_service_active()
	// {
	// 	$service = new Service(this.$service_id);
	// 	return $service->setActive(this.$is_active);
	// }

	send_socket_message()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		new $SocketService($Config.get("socket")).sendMessage(this.$to_user_id, this.$message);

		return {...rc, ...vals};
	}

	send_test_notification()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let payload = null;
		try
		{
			payload = JSON.parse(this.$payload);
			if (!payload)
			{
			}
		}
		catch(error)
		{
			payload = {};
		}

		$Fcm.sendNotification(this.$device_id, this.$title, this.$message, payload);

		return {...rc, ...vals};
	}

	get_token_logs()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let rv = this._get_logs_text(this.$search_token, this.$log_file_name, this.$include_apis, this.$exclude_apis);
		if ($Err.isERR(rv))
		{
			return rv;
		}

		let logs = rv.logs;
		let outLines = rv.out_lines;

		this.$Session.response.send(logs.join("\n") + "\n\n\n" + outLines.join("\n"));

		return {...rc, ...vals};
	}


	_get_logs_text(searchString, logFileName, includeApis, excludeApis)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let logs = [];
		let aws = ($Config.get("using_s3") ? new $Aws() : null);

		if (fs.existsSync(`${$Config.get("log_requests_path")}/${logFileName}.log`))
		{
			let files = fs.readdirSync($Config.get("log_requests_path"));
			files.forEach(file =>
			{
				if (file.substring(0, logFileName.length) === logFileName)
				{
					logs.push(file);
				}
			});

			logs.sort(function(a, b)
			{
				if (a.length == b.length)
				{
					return ((a == b) ? 0 : (( a > b ) ? 1 : -1));
				}

				return b.length - a.length;
			});
		}
		else if ($Config.get("using_s3"))
		{
			if (aws.doesFileExist(`${$Config.get("archive_logs_to_s3_path")}/${logFileName}.log`).file_exists)
			{
				logs.push(logFileName);
			}
			else
			{
				return $ERRS.ERR_FILE_NOT_FOUND;
			}
		}
		else
		{
			return $ERRS.ERR_FILE_NOT_FOUND;
		}


		includeApis = includeApis.split(",").map(api => api.trim()).filter(api => api != "");
		excludeApis = excludeApis.split(",").map(api => api.trim()).filter(api => api != "");
		let incHashes = [];
		let outLines = [];
		let lastHash = "";


		let success = logs.every(log =>
		{
			let logContent;

			if (fs.existsSync(`${$Config.get("log_requests_path")}/${log}`))
			{
				logContent = $Utils.fileGetContents(`${$Config.get("log_requests_path")}/${log}`);
			}
			else if ($Config.get("using_s3"))
			{
				let rv = aws.getFile(`${$Config.get("archive_logs_to_s3_path")}/${log}`);
				if ($Err.isERR(rv))
				{
					rc = rv;
					return false;
				}

				logContent = rv.file_body;
			}
			else
			{
				rc = $ERRS.ERR_FILE_NOT_FOUND;
				return false;
			}


			let lines = logContent.split("\n");

			lines.forEach(line =>
			{
				line = line.trim();
				if (line == "")
				{
					return;
				}

				let parts = line.split("\t");
				if (parts.length < 6)
				{
					if (incHashes.includes(lastHash))
					{
						outLines[outLines.length - 1] += line;
					}

					return;
				}

				let logType = parts[2];
				let apiName = parts[3];
				let logHash = parts[4];
				lastHash = logHash;

				if (!$Utils.empty(includeApis) && !includeApis.includes(apiName))
				{
					return;
				}

				if (excludeApis.includes(apiName))
				{
					return;
				}

				if (logType == "REQUEST")
				{
					if (parts[5].indexOf(searchString) > -1)
					{
						incHashes.push(logHash);
						outLines.push(line);
					}
				}
				else
				{
					if (incHashes.includes(logHash))
					{
						outLines.push(line);
					}
				}
			});

			return true;
		});

		if (!success)
		{
			return {...rc, ...vals};
		}

		vals.logs = logs;
		vals.out_lines = outLines;

		return {...rc, ...vals};
	}

	perform_upgrade()
	{
		return $SystemUpgrade.performUpgrade(this.$to_version);
	}

	clear_debug_log()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		$Db.executeQuery(`DELETE FROM \`debug_log\``, []);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_DELETE_ERROR", $Db.lastErrorMsg());
		}

		return {...rc, ...vals};
	}

	analyze_logs()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if (!this.$Session.tokenValidator.isValidSystemToken(this.$token))
		{
			return $ERRS.ERR_INVALID_USER_TOKEN;
		}

        if (!(this.$date = $Utils.validateDateStr(this.$date, true)))
		{
			return $ERRS.ERR_INVALID_LOG_ANALYZER_DATE;
		}

		const endDate = $Utils.validateDateStr(this.$date, true, true);

		const logs = $Db.executeQuery(`SELECT datetime, ip_address, request_name, num_of_calls FROM
										(SELECT LOG_CREATED_ON datetime, LOG_IP_ADDRESS ip_address, LOG_REQUEST_NAME request_name, count(*) num_of_calls,
												concat(LOG_CREATED_ON, '/', LOG_IP_ADDRESS, '/', LOG_REQUEST_NAME) group_by
										FROM \`log\`
										WHERE LOG_CREATED_ON>=? AND LOG_CREATED_ON<=? AND LOG_TYPE=? AND LOG_REQUEST_NAME<>'System/api_ver'
										GROUP BY group_by
										HAVING num_of_calls>1
										ORDER BY group_by ASC) ilog`, [this.$date, endDate, "REQUEST"]);

		vals.calls = logs;

		return {...rc, ...vals};
	}

	query_logs()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if (!this.$Session.tokenValidator.isValidSystemToken(this.$token))
		{
			return $ERRS.ERR_INVALID_USER_TOKEN;
		}

		this.$lines = parseInt(this.$lines);
        this.$date_from = $Utils.validateDateStr(this.$date_from);
        this.$date_to = $Utils.validateDateStr(this.$date_to, false, true);

		const types = [];
		if (this.$set_request)											types.push("REQUEST");
		if (this.$set_response)											types.push("RESPONSE");
		if (this.$set_other)											types.push("ERROR", "WARNING", "INFO", "DEBUG");
		if (this.$set_other && $Config.get("project_log_type_name"))	types.push($Config.get("project_log_type_name"));

		if (types.length == 0)
		{
			vals.lines = [];
			return {...rc, ...vals};
		}

		let filterUids = false;
		const incUids = [];
		const wheres = ["LOG_REQUEST_NAME<>'System/api_ver'"];
		const params = [];

		if (this.$date_from)
		{
			wheres.push("LOG_CREATED_ON>=?");
			params.push(this.$date_from);
		}

		if (this.$date_to)
		{
			wheres.push("LOG_CREATED_ON<=?");
			params.push(this.$date_to);
		}

		if (this.$request)
		{
			wheres.push("LOG_REQUEST_NAME like ?");
			params.push(`%${this.$request}%`);
		}

		const where = "WHERE " + wheres.join(" AND ");
		params.push(`${this.$lines}`);

		const logs = $Db.executeQuery(`SELECT LOG_CREATED_ON 'datetime', LOG_IP_ADDRESS ip_address, LOG_TYPE 'type', LOG_REQUEST_NAME request_name,
												LOG_REQUEST_UID uid, LOG_STRING 'text'
										FROM \`log\`
										${where}
										ORDER BY LOG_ID DESC
										LIMIT ?`, params);

		if (this.$substring || this.$is_error || this.$is_rc_error)
		{
			filterUids = true;

			logs.forEach(log =>
			{
				if (incUids.includes(log.uid))
				{
					return;
				}

				if (this.$substring && log.text.indexOf(this.$substring) > -1 ||
					(this.$is_rc_error && log.type == "RESPONSE" && log.text.indexOf("\"rc\":0") === -1) ||
					(this.$is_error && log.type == "ERROR"))
				{
					incUids.push(log.uid);
				}
			});
		}

		vals.lines = logs.filter(log => (!filterUids || incUids.includes(log.uid)) && types.includes(log.type));

		return {...rc, ...vals};
	}

	get_record_change_log()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if (!this.$Session.tokenValidator.isValidSystemToken(this.$token))
		{
			return $ERRS.ERR_INVALID_USER_TOKEN;
		}

		const pk = $Db.executeQuery(`SELECT COLUMN_NAME
									FROM \`information_schema\`.\`KEY_COLUMN_USAGE\`
									WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND CONSTRAINT_NAME='PRIMARY'
									ORDER BY ORDINAL_POSITION;`, [$Config.get("db_schema"), this.$table]);
		if (pk.length == 0)
		{
			return $ERRS.ERR_DB_INVALID_TABLE_NAME;
		}
		if (pk.length > 1)
		{
			return $ERRS.ERR_DB_TABLE_PRIMARY_KEY_NOT_SUPPORTED;
		}

		const currVals = $Db.executeQuery(`SELECT * FROM \`${this.$table}\` WHERE ${pk[0].COLUMN_NAME}=?`, [this.$row_id]);
		const changeLog = [];

		const chls = $Db.executeQuery(`SELECT CHL_OPERATION_TYPE, CHL_OLD_VALUES, CHL_NEW_VALUES, CHL_CREATED_ON
										FROM \`change_log\`
										WHERE CHL_TABLE=? AND CHL_RECORD_ID=?
										ORDER BY CHL_ID DESC`, [this.$table, this.$row_id]);

		chls.forEach(chl =>
		{
			if (chl.CHL_OPERATION_TYPE == "INSERT")
			{
				changeLog.push({operation: "Insert", datetime: chl.CHL_CREATED_ON, values: JSON.parse(chl.CHL_NEW_VALUES)});
			}
			else if (chl.CHL_OPERATION_TYPE == "DELETE")
			{
				changeLog.push({operation: "Delete", datetime: chl.CHL_CREATED_ON, values: null});
			}
			else if (chl.CHL_OPERATION_TYPE == "UPDATE")
			{
				const log = {operation: "Update", datetime: chl.CHL_CREATED_ON, values: {}};
				const oldVals = JSON.parse(chl.CHL_OLD_VALUES);
				const newVals = JSON.parse(chl.CHL_NEW_VALUES);

				Object.entries(oldVals).forEach(valsObj =>
				{
					const fieldName = valsObj[0];
					const fieldOldVal = valsObj[1];
					const fieldNewVal = newVals[fieldName];

					if (fieldOldVal == fieldNewVal)
					{
						return;
					}

					log.values[fieldName] = {old: fieldOldVal, new: fieldNewVal};
				});

				if (Object.keys(log.values).length == 0)
				{
					return;
				}

				changeLog.push(log);
			}
		});

		if (currVals.length == 0 && changeLog.length == 0)
		{
			return $ERRS.ERR_DB_INVALID_ROW_ID;
		}

		vals.current_values = currVals[0];
		vals.change_log = changeLog;

		return {...rc, ...vals};
	}

	get_user_by_param()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if (!this.$Session.tokenValidator.isValidSystemToken(this.$token))
		{
			return $ERRS.ERR_INVALID_USER_TOKEN;
		}

		if ($Config.get("enable_login_log"))
		{
			const usrs = $Db.executeQuery(`SELECT USR_ID user_id, USR_TOKEN user_token, USR_EMAIL email, concat(USR_PHONE_COUNTRY_CODE, '-', USR_PHONE_NUM) phone
											FROM \`login_log\`
												JOIN \`user\` ON LOL_USR_ID=USR_ID
											WHERE LOL_USR_ID=? OR LOL_USR_TOKEN=?`, [this.$user_param, this.$user_param]);
			if (usrs.length == 0)
			{
				return $ERRS.ERR_USER_NOT_EXISTS;
			}

			vals = usrs[0];
		}
		else
		{
			const usrs = $Db.executeQuery(`SELECT USR_ID user_id, USR_TOKEN user_token, USR_EMAIL email, concat(USR_PHONE_COUNTRY_CODE, '-', USR_PHONE_NUM) phone
											FROM \`user\`
											WHERE USR_ID=? OR USR_TOKEN=?`, [this.$user_param, this.$user_param]);
			if (usrs.length == 0)
			{
				return $ERRS.ERR_USER_NOT_EXISTS;
			}

			vals = usrs[0];
		}

		return {...rc, ...vals};
	}

	get_otp_debug_logs()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if (!this.$Session.tokenValidator.isValidSystemToken(this.$token))
		{
			return $ERRS.ERR_INVALID_USER_TOKEN;
		}

		const dlgs = $Db.executeQuery(`SELECT DLG_CREATED_ON 'datetime', DLG_STRING 'text'
										FROM \`debug_log\`
										WHERE DLG_CREATED_ON>=? AND DLG_REQUEST_NAME=?
										ORDER BY DLG_CREATED_ON DESC`, [new $Date().addDays(-1).format(), "Debug/OTP"]);

		vals.logs = dlgs;

		return {...rc, ...vals};
	}
}
