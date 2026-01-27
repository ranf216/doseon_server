module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

	verify_facebook_auth()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		// validate that we allow FB login
		if (!$Config.get('enable_fb_login'))
		{
			return $ERRS.ERR_USER_FACEBOOK_LOGIN_NOT_ALLOWED;
		}
		
		// validate required parameters
		if (this.$facebook_user_id == "")
		{
			return $ERRS.ERR_INVALID_FACEBOOK_USER_ID;
		}
		if (this.$facebook_access_token == "")
		{
			return $ERRS.ERR_INVALID_FACEBOOK_ACCESS_TOKEN;
		}

		// validate the access token is valid and matches the facebook id
		// try
		// {
		// 	$fb = new Facebook\Facebook(array(
		// 		'app_id' => $Config.get('facebook_app_id'),
		// 		'app_secret' => $Config.get('facebook_app_secret'),
		// 		'default_graph_version' => $Config.get('facebook_app_ver')
		// 	));
		// 	$response = $fb->get('/me?fields=id&access_token=' . this.$facebook_access_token);
		// }
		// catch (Facebook\Exceptions\FacebookSDKException $e)
		// {
		// 	return $ERRS.ERR_USER_FACEBOOK_AUTHENTICATION_ERROR;
		// }
		
		// $decodeBody = $response->getDecodedBody();
		// if ((this.$facebook_user_id != $decodeBody.id))
		// {
		// 	return $ERRS.ERR_USER_FACEBOOK_AUTHENTICATION_FAILED;
		// }

		return this._createSocialAuthKey(this.$facebook_user_id, $Const.USER_LOGIN_AUTHORITY_FACEBOOK);
	}

	verify_google_auth()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		// validate that we allow FB login
		if (!$Config.get('enable_google_login'))
		{
			return $ERRS.ERR_USER_GOOGLE_LOGIN_NOT_ALLOWED;
		}
		
		// validate required parameters
		if (this.$google_user_id == "")
		{
			return $ERRS.ERR_INVALID_GOOGLE_USER_ID;
		}
		if (this.$google_access_token == "")
		{
			return $ERRS.ERR_INVALID_GOOGLE_ACCESS_TOKEN;
		}

		// validate the access token is valid and matches the google id
		// try
		// {
		// 	$ch = curl_init();

		// 	// Set the url, number of POST vars, POST data
		// 	curl_setopt($ch, CURLOPT_URL, "https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=" + this.$google_access_token);
		// 	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		// 	if ($Config.get("ignore_ssl_cert"))
		// 	{
		// 		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
		// 	}
			
		// 	$result = curl_exec($ch);
			
		// 	if ($result === FALSE)
		// 	{
		// 		return Err::errWithInfo("ERR_USER_GOOGLE_AUTHENTICATION_FAILED", "Received empty response");
		// 	}
		// }
		// catch (\Exception $e)
		// {
		// 	return Err::errWithInfo("ERR_USER_GOOGLE_AUTHENTICATION_FAILED", "Exception: " . JSON.stringify(e));
		// }
	/*
		$resultParsed = json_decode($result);
		if ($Utils.empty($resultParsed) || $Utils.empty($resultParsed->id))
		{
			return Err::errWithInfo("ERR_USER_GOOGLE_AUTHENTICATION_FAILED", "Invalid result: " . $result);
		}
		if ($resultParsed->id != this.$google_user_id)
		{
			return Err::errWithInfo("ERR_USER_GOOGLE_AUTHENTICATION_FAILED", `Authentication failed: ${resultParsed->id}, ${this.$google_user_id}`);
		}
	*/
		return this._createSocialAuthKey(this.$google_user_id, $Const.USER_LOGIN_AUTHORITY_GOOGLE);
	}

	verify_apple_auth()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		// validate that we allow Apple login
		if (!$Config.get('enable_apple_login'))
		{
			return $ERRS.ERR_USER_APPLE_LOGIN_NOT_ALLOWED;
		}
		
		// validate required parameters
		if (this.$apple_user_id == "")
		{
			return $ERRS.ERR_INVALID_APPLE_USER_ID;
		}
		if (this.$apple_access_token == "")
		{
			return $ERRS.ERR_INVALID_APPLE_ACCESS_TOKEN;
		}
	/*
		// validate the access token is valid and matches the apple id
		try
		{
			$ch = curl_init();

			// Set the url, number of POST vars, POST data
			curl_setopt($ch, CURLOPT_URL, "https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=" + this.$google_access_token);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

			if ($Config.get("ignore_ssl_cert"))
			{
				curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
			}
			
			$result = curl_exec($ch);
			
			if ($result === FALSE)
			{
				return Err::errWithInfo("ERR_USER_APPLE_AUTHENTICATION_FAILED", "Received empty response");
			}
		}
		catch (\Exception $e)
		{
			return Err::errWithInfo("ERR_USER_APPLE_AUTHENTICATION_FAILED", "Exception: " . JSON.stringify(e));
		}
	*/
		return this._createSocialAuthKey(this.$apple_user_id, $Const.USER_LOGIN_AUTHORITY_APPLE);
	}

	login_with_social()
	{
		$Utils.setCurrUserLang(this.$language);

		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let sca = this._getSocialByAuthKey(this.$auth_key);
		if ($Err.isERR(sca))
		{
			return sca;
		}

		$Db.executeQuery("DELETE FROM `social_auth` WHERE  SCA_AUTH_KEY=?", [this.$auth_key]);

		let users = $Db.executeQuery(`SELECT *
									FROM \`user\`
										JOIN \`user_details\` ON USR_ID=USD_USR_ID
									WHERE USR_PASSWORD=? AND USR_STATUS=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY=?`,
									[sca.SCA_USER_ID_HASH, $Const.USER_STATUS_ACTIVE, sca.SCA_LOGIN_AUTHORITY]);
		if (users.length == 0)
		{
			return $ERRS.ERR_SOCIAL_USER_NOT_FOUND;
		}
		
		const userModule = new $User(this.$Session);
		rc = userModule._performLogin(users[0], this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version, this.$language);

		return {...rc, ...vals};
	}

	register_with_social()
	{
		$Utils.setCurrUserLang(this.$language);

		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
		
		if (this.$first_name == "")
		{
			return $ERRS.ERR_REQ_FIRST_NAME;
		}

		let sca = this._getSocialByAuthKey(this.$auth_key);
		if ($Err.isERR(sca))
		{
			return sca;
		}

		let users = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_PASSWORD=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY=?`,
											[sca.SCA_USER_ID_HASH, sca.SCA_LOGIN_AUTHORITY]);
		if (users.length > 0)
		{
			$Db.executeQuery("DELETE FROM `social_auth` WHERE  SCA_AUTH_KEY=?", [this.$auth_key]);
			return $ERRS.ERR_USER_ALREADY_EXISTS;
		}


		$Db.beginTransaction();	

		const token = $Utils.uniqueHash();
		const userId = $Utils.uniqueHash();
		$Db.executeQuery(`INSERT INTO \`user\` (USR_ID, USR_EMAIL, USR_PASSWORD, USR_TOKEN, USR_CREATED_ON, USR_TYPE, USR_STATUS,
												USR_LOGIN_AUTHORITY, USR_PHONE_NUM, USR_PHONE_COUNTRY_CODE, USR_LANG)
												VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
				[userId, '', sca.SCA_USER_ID_HASH, token, $Utils.now(), $Const.USER_TYPE_REGULAR, $Const.USER_STATUS_ACTIVE,
												sca.SCA_LOGIN_AUTHORITY, "", "", this.$language]);

		if ($Db.isError())
		{
			$Db.rollbackTransaction();		
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery(`INSERT INTO \`user_details\` (USD_USR_ID, USD_EMAIL, USD_TYPE, USD_STATUS, USD_FIRST_NAME, USD_LAST_NAME)
								VALUES (?, ?, ?, ?, ?, ?)`, [userId, '', $Const.USER_TYPE_REGULAR, $Const.USER_STATUS_ACTIVE, this.$first_name, this.$last_name]);
		if ($Db.isError())
		{
			$Db.rollbackTransaction();
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery("DELETE FROM `social_auth` WHERE  SCA_AUTH_KEY=?", [this.$auth_key]);
		
		const userModule = new $User(this.$Session);
		rc = userModule._updateDeviceInfo(userId, this.$device_id, this.$os_type, this.$os_version, this.$device_model, this.$app_version);
		userModule._logLogin(userId, token);

		$Db.commitTransaction();	

		vals['token'] = token;
		
		return {...rc, ...vals};
	}


	_createSocialAuthKey(socialUserId, loginAuthority)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const validSecs = $Config.get("socail_auth_key_valid_for_seconds");
		const validThru = new $Date().addSeconds(validSecs).format();
		const authKey = $Utils.uniqueHash();
		const userIdHash = $Utils.hash(socialUserId);

		$Db.executeQuery("DELETE FROM `social_auth` WHERE SCA_USER_ID_HASH=? AND SCA_LOGIN_AUTHORITY=?", [userIdHash, loginAuthority]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_DELETE_ERROR", $Db.lastErrorMsg());
		}

		$Db.executeQuery("INSERT INTO `social_auth` (SCA_USER_ID_HASH, SCA_LOGIN_AUTHORITY, SCA_VALID_THRU, SCA_AUTH_KEY) VALUES (?, ?, ?, ?)",
										[userIdHash, loginAuthority, validThru, authKey]);
		if ($Db.isDuplicateEntryError())	
		{
			$Db.executeQuery("UPDATE `social_auth` SET SCA_VALID_THRU=?, SCA_AUTH_KEY=? WHERE SCA_USER_ID_HASH=? AND SCA_LOGIN_AUTHORITY=?",
													[validThru, authKey, userIdHash, loginAuthority]);
			if ($Db.isError())
			{
				return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
			}		
		}
		else if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}
		
		vals.auth_key = authKey;

		if ($Config.get("social_return_is_registered"))
		{
			let users = $Db.executeQuery("SELECT USR_ID FROM `user`  WHERE  USR_PASSWORD=? AND USR_STATUS=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY=?",
												[userIdHash, $Const.USER_STATUS_ACTIVE, loginAuthority]);
			vals.is_registered = (users.length == 0 ? false : true);
		}

		return {...rc, ...vals};
	}

	_getSocialByAuthKey(authKey)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let scas = $Db.executeQuery("SELECT SCA_USER_ID_HASH, SCA_LOGIN_AUTHORITY, SCA_VALID_THRU FROM `social_auth`  WHERE  SCA_AUTH_KEY=?", [authKey]);
		if (scas.length == 0)
		{
			return $ERRS.ERR_INVALID_SOCIAL_AUTHORIZATION;
		}

		let sca = scas[0];
		if (sca.SCA_VALID_THRU < $Utils.now())
		{
			$Db.executeQuery("DELETE FROM `social_auth` WHERE  SCA_AUTH_KEY=?", [authKey]);
			return $ERRS.ERR_INVALID_SOCIAL_AUTHORIZATION;
		}
		
		vals.SCA_USER_ID_HASH = sca.SCA_USER_ID_HASH;
		vals.SCA_LOGIN_AUTHORITY = sca.SCA_LOGIN_AUTHORITY;
		
		return {...rc, ...vals};
	}
}