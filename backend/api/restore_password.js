exports.run = function (req, res)
{
	// if (!isHTTPS())
	// {
	//     header("HTTP/1.1 401 Unauthorized");
	// 	exit("<h2>401 Unauthorized</h2>");
	// }

	if ($Utils.empty(req.query.userid) || $Utils.empty(req.query.activation))
	{
		$Utils.unauthorize();
		return;
	}

	var js = createContent(req.query.userid, req.query.activation);
	res.send(js);

	// function isHTTPS()
	// {
	// 	if (CONFIG("use_ssl") == false)
	// 	{
	// 		return TRUE;
	// 	}

	// 	if (empty($_SERVER['HTTPS']))
	// 	{
	// 		return FALSE;
	// 	}

	// 	if ($_SERVER['HTTPS'] == "on")
	// 	{
	// 		return TRUE;
	// 	}

	// 	return FALSE;
	// }
}

function createContent(userid, activation)
{
	let contentText =`
<html>
	<head>
		<script type="text/javascript" src="../public/jquery-1.8.2.mini.js"></script>

		<script type="text/javascript">
			function callAPI()
			{
				var postData = new Object();
				postData["#request"] = "User/reset_password";
				postData["user_id"] = "${userid}";
				postData["activation_code"] = "${activation}";
				postData["password"] = $("#inpPwd").val();
				postData["language"] = "` + $Config.get("default_language") + `"

				$.ajax({
						url: "` + $Config.get("api_url") + `",
						type: "POST",
						data: JSON.stringify(postData),
						dataType: 'json',
						headers: { 'Content-Type': 'application/json' },
						success: function (json)
						{
							$("#result" ).html(json["message"]);
						},
						error: function()
						{
							$("#result" ).html("Failed " + arguments[0].responseText);
						}
				});
			}
		</script>
		
	</head>
	<body>
		New password: <input type="password" id="inpPwd" />
		<br/>
		<input type="button" value="Reset" onclick="callAPI()" />
		<br/>
		<br/>
		<h2 id="result"></h2>
	</body>
</html>
`;

return contentText;
}
