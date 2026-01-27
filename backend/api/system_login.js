exports.run = function (req, res, location)
{
	res.set("Content-Type", "text/html");
	res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
	res.set("Cache-Control", "post-check=0, pre-check=0");
	res.set("Pragma", "no-cache");

	var html = $Utils.fileGetContents(__dirname + "/content/system_login.html");

	html = html.replace(/\{\{environment\}\}/g, $Utils.empty($Config.get("env_name")) ? "default" : $Config.get("env_name"))
				.replace(/\{\{system\}\}/g, $Config.get("SYSTEM_NAME"))
				.replace("{{api_url}}", $Config.get("api_url"))
				.replace("{{secure}}", $SERVER_PROTOCOL == "https" ? "secure: true" : "")
				.replaceAll("{{location}}", location);

	res.send(html);
}
