exports.run = function (req, res)
{
	res.set("Content-Type", "text/html");
	res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
	res.set("Cache-Control", "post-check=0, pre-check=0");
	res.set("Pragma", "no-cache");

	if ($Config.get("enable_socket_viewer") != true)
	{
		$Utils.unauthorize();
		return;
	}

	$Utils.authorizeIP($Config.get("restrict_socket_viewer_to_ip"));

	if ($Config.get("enable_system_login"))
	{
		let systemToken = req.cookies.system_token;
		if (systemToken === undefined)
		{
			res.redirect("/system_login/socket_viewer");
			return;
		}

		let isExist = $Db.executeQuery(`SELECT count(*) cnt FROM \`system_user\` WHERE STU_TOKEN=?`, [systemToken])[0].cnt;
		if (!isExist)
		{
			res.redirect("/system_login/socket_viewer");
			return;
		}
	}

	let html = $Utils.fileGetContents(__dirname + "/content/socket_viewer.html");

	html = html.replace("{{getWebClientMessages}}", $Utils.getWebClientMessages())
				.replace("{{getWebClientEnvironment}}", $Utils.getWebClientEnvironment())
				.replace("{{environment}}", $Utils.empty($Config.get("env_name")) ? "default" : $Config.get("env_name"))
				.replace("{{system}}", $Config.get("SYSTEM_NAME"))
				.replaceAll("{{socket_url}}", $SOCKET_PUBLIC_URL)
				.replace("{{api_url}}", $Config.get("api_url"))
				.replace("{{enable_system_login}}", $Config.get("enable_system_login") ? "" : "display: none;");

	res.send(html);
}
