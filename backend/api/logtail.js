const fs = require('fs');

exports.run = function (req, res)
{
	res.set("Content-Type", "text/html");
	res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
	res.set("Cache-Control", "post-check=0, pre-check=0");
	res.set("Pragma", "no-cache");

	if ($Config.get("enable_logtail") != true)
	{
		$Utils.unauthorize();
		return;
	}

	$Utils.authorizeIP($Config.get("restrict_logtail_to_ip"));

	if ($Config.get("enable_system_login"))
	{
		let systemToken = req.cookies.system_token;
		if (systemToken === undefined)
		{
			res.redirect("/system_login/logtail");
			return;
		}

		let isExist = $Db.executeQuery(`SELECT count(*) cnt FROM \`system_user\` WHERE STU_TOKEN=?`, [systemToken])[0].cnt;
		if (!isExist)
		{
			res.redirect("/system_login/logtail");
			return;
		}
	}

	let limit = 100;
	let file = "";

	if (!$Utils.empty(req.query.limit))
	{
		limit = parseInt(req.query.limit);
	}

	if (!$Utils.empty(req.query.file))
	{
		file = $Utils.base64Decode(req.query.file);
	}

	if ($Config.get("log_requests") === false)
	{
		res.send(html);
		return;
	}

	let cnt = "";
	let logFileName = $Config.get("log_requests_path") + "/" + (file == "" ? new $Date().format("Y_m_d") : file) + ".log";
	if (fs.existsSync(logFileName))
	{
		cnt = $Utils.fileGetContents(logFileName);
	}

	let lines = cnt.split("\n");
	let arrIps = [];
	let arrReqs = [];
	lines = getLines(lines, limit, arrIps, arrReqs);

	let html = $Utils.fileGetContents(__dirname + "/content/logtail.html");

	html = html.replace("{{getWebClientMessages}}", $Utils.getWebClientMessages())
				.replace("{{getWebClientEnvironment}}", $Utils.getWebClientEnvironment())
				.replace("{{environment}}", $Utils.empty($Config.get("env_name")) ? "default" : $Config.get("env_name"))
				.replace("{{system}}", $Config.get("SYSTEM_NAME"))
				.replaceAll("{{project}}", $Config.get("project_log_type_name"))
				.replace("{{project_display}}", $Config.get("project_log_type_name") ? "inline" : "none")
				.replace("{{limit}}", limit)
				.replace("{{file}}", file)
				.replace("{{fileOptions}}", getFileOptions())
				.replace("{{lines}}", lines)
				.replace("{{ipOptions}}", getIpOptions(arrIps))
				.replace("{{reqOptions}}", getReqOptions(arrReqs))
				.replace("{{api_url}}", $Config.get("api_url"))
				.replace("{{enable_system_login}}", $Config.get("enable_system_login") ? "" : "display: none;");

	res.send(html);
}

function getFileOptions()
{
	let fileOptions = "";
	let arrFiles = fs.readdirSync($Config.get("log_requests_path"));

	arrFiles.forEach(file =>
	{
		if ($Files.getFileExt(file) == ".log")
		{
			fileName = file.substring(0, file.length - 4);

			fileOptions = "<option value=\"" + fileName + "\">" + fileName + "</option>" + fileOptions;
		}
	});

	return fileOptions;
}

function getLines(lines, limit, arrIps, arrReqs)
{
	let linesStr = "";

	for (let i = 1; i <= limit + 1; i++)
	{
		let index = lines.length - i;
		if (index < 0)
		{
			continue;
		}
		
		let parts = lines[index].split("\t");
		if (parts.length < 6)
		{
			continue;
		}

		let part3Class = parts[3].split("/").join("_");
		let ipStr = parts[1].replace(/[\.,:]/g, "_");
		let classes = "ip_" + ipStr + " type_" + parts[2] + " req_" + part3Class + " reqid_" + parts[4];
	
		let logType = parts[2];
		
		arrIps[parts[1]] = true;
		arrReqs[parts[3]] = true;
		
		linesStr += '<tr class="' + classes + '">';
		
		for (let j = 0; j < 5; j++)
		{
			let partClass = (j == 3 ? part3Class : parts[j]);
			let className = ((j >= 1 && j <= 4) ? "filter_data" : "simple_data");
			linesStr += "<td class='" + className + "' onclick='doOnClick(" + j + ", \"" + partClass + "\")'>" + parts[j] + "</td>";
		}
		for (let j = 0; j < 5; j++)
		{
			delete parts[j];
		}
		
		let str = parts.join("\t");
		let isErr = (logType == "RESPONSE" && str.indexOf("\"rc\":0") === -1);
		str = $Utils.escapeHtml(str);
		let onclickClass = `log_message${index}`;
		let onclick = `copyToClipboard($(".${onclickClass}").html().trim())`;

		if (isErr)
		{
			linesStr += `<td class='simple_data type_FAILED_RESPONSE ${onclickClass}' onclick='${onclick}'>${str}</td>`;
		}
		else
		{
			linesStr += `<td class='simple_data ${onclickClass}' onclick='${onclick}'>${str}</td>`;
		}
		
		linesStr += '</tr>';
	}

	return linesStr;
}

function getIpOptions(arrIps)
{
	let ipOptions = "";

	Object.entries(arrIps).forEach(function(item)
	{
		let ip = item[0];
		ipOptions += "$(\"#selectIp\").append(new Option(\"" + ip + "\", \"" + ip + "\"));";
	});

	return ipOptions;
}

function getReqOptions(arrReqs)
{
	let reqOptions = "";

	Object.entries(arrReqs).forEach(function(item)
	{
		let req = item[0];
		let reqClass = req.split("/").join("_");
		reqOptions += "$(\"#selectReq\").append(new Option(\"" + req + "\", \"" + reqClass + "\"));";
	});

	return reqOptions;
}
