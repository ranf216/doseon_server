module.exports = class
{
    constructor(session)
    {
        this.session = session;
    }

	isValidToken(token, userInfoAsObject = null)
	{
		if ($Utils.empty(token))
		{
			return false;
		}
		
		let isCached = true;

		let users = this._tokenValidationGetCachedUser(token);
		if (users.length == 0)
		{
			users = $Db.executeQuery("SELECT USR_ID, USR_TYPE, USR_LANG, USR_LAST_LOGIN, USR_LAST_ACCESS, USR_ROLE_ALLOW, USR_ROLE_DENY, USR_STATUS, USR_DELETED_ON FROM `user`  WHERE  USR_TOKEN=?", [token]);
			
			if (users.length == 0)
			{
				return false;
			}
			
			if (users[0].USR_STATUS != $Const.USER_STATUS_ACTIVE || users[0].USR_DELETED_ON != null)
			{
				return false;
			}
			
			let rv = this._tokenValidationSetCachedUser(users[0].USR_ID, users[0].USR_TYPE, users[0].USR_LANG, token, users[0].USR_LAST_LOGIN,
																users[0].USR_LAST_ACCESS, users[0].USR_ROLE_ALLOW, users[0].USR_ROLE_DENY);
			if ($Err.isERR(rv))
			{
				isCached = false;
			}
		}
		
		let lastAccessDate = users[0].USR_LAST_ACCESS;
		let lastAccessTime = new $Date(lastAccessDate);
		let lastAccessTts = lastAccessTime.getTimestamp();
		let accessDate;
		let tokenTime;
		let tts;
	
		if ($Config.get("refresh_token_on_api_access"))
		{
			accessDate = lastAccessDate;
			tokenTime = lastAccessTime;
			tts = lastAccessTts;
		}
		else
		{
			accessDate = users[0].USR_LAST_LOGIN;
			tokenTime = new $Date(accessDate);
			tts = tokenTime.getTimestamp();
		}

		let today = new $Date();
		let ts = today.getTimestamp();
		
		if (ts - tts > $Config.get("max_user_token_time"))
		{
			this.deleteFromUserCache(users[0].USR_ID);
			return false;
		}

		let userInfo = {
			"user_id"				: users[0].USR_ID,
			"user_type"				: users[0].USR_TYPE,
			"user_lang"				: users[0].USR_LANG,
			"user_role_allow"		: users[0].USR_ROLE_ALLOW,
			"user_role_deny"		: users[0].USR_ROLE_DENY,
        };

		if (userInfoAsObject === null)
		{
			this.session.userId = userInfo.user_id;
			this.session.userType = parseInt(userInfo.user_type);
			this.session.userLang = userInfo.user_lang;
			$Utils.setCurrUserLang(this.session.userLang);
			this.session.userRoleAllow = userInfo.user_role_allow;
			this.session.userRoleDeny = userInfo.user_role_deny;
		}
		else
		{
			userInfoAsObject.userId = userInfo.user_id;
			userInfoAsObject.userType = parseInt(userInfo.user_type);
			userInfoAsObject.userLang = userInfo.user_lang;
			userInfoAsObject.userRoleAllow = userInfo.user_role_allow;
			userInfoAsObject.userRoleDeny = userInfo.user_role_deny;
		}		

		if (isCached && ts - lastAccessTts >= $Config.get("update_last_access_interval"))
		{
			this._tokenValidationUpdateLastAccess(userInfo.user_id, userInfo.user_type, userInfo.user_lang, token, users[0].USR_LAST_LOGIN,
															$Utils.now(), userInfo.user_role_allow, userInfo.user_role_deny);
		}
		
		return true;
	}

	deleteFromUserCache(userId)
	{
		let cacheMode = $Config.get("user_cache_mode");

		switch (cacheMode)
		{
			case 1: // db mem
			{
				let users = $Db.executeQuery("SELECT USR_LAST_ACCESS FROM `user_mem` WHERE USR_ID=?", [userId]);
				if (users.length > 0)
				{
					$Db.executeQuery("UPDATE `user`  SET USR_LAST_ACCESS=?  WHERE  USR_ID=?", [users[0].USR_LAST_ACCESS, userId]);
				}

				$Db.executeQuery("DELETE FROM `user_mem` WHERE USR_ID=?", [userId]);
			}
			break;

			case 2: // fs cache
			{
				let rv = $Cache.get("user", userId);
				if (!$Err.isERR(rv))
				{
					let token = rv.data.USR_TOKEN;
					
					rv = $Cache.get("token", token);
					if (!$Err.isERR(rv))
					{
						let lastAccess = rv.data.USR_LAST_ACCESS;
						if ($Utils.empty(lastAccess))
						{
							lastAccess = null;
						}
						$Db.executeQuery("UPDATE `user`  SET USR_LAST_ACCESS=?  WHERE  USR_ID=?", [lastAccess, userId]);
					}

					$Cache.delete("token", token);
				}
				
				$Cache.delete("user", userId);
			}
			break;

			default: // none
			{
			}
			break;
		}
	}

	isValidSystemToken(token)
	{
		if (!$Config.get("enable_system_login"))
		{
			return true;
		}

		const isValid = $Db.executeQuery(`SELECT count(*) cnt FROM \`system_user\` WHERE STU_TOKEN=?`, [token])[0].cnt;
		if (!isValid)
		{
			return false;
		}

		return true;
	}


	_tokenValidationGetCachedUser(token)
	{
		let cacheMode = $Config.get("user_cache_mode");
		let users;

		switch (cacheMode)
		{
			case 1: // db mem
			{
				users = $Db.executeQuery(`SELECT * FROM \`user_mem\` WHERE USR_TOKEN=?`, [token]);
			}
			break;

			case 2: // fs cache
			{
				users = [];

				let rv = $Cache.get("token", token);
				if ($Err.isERR(rv))
				{
					break;
				}
				
				users[0] = rv.data;
			}
			break;

			default: // none
			{
				users = [];
			}
			break;
		}
		
		return users;
	}

	_tokenValidationSetCachedUser(userId, type, lang, token, lastLogin, lastAccess, roleAllow, roleDeny)
	{
		let cacheMode = $Config.get("user_cache_mode");

		switch (cacheMode)
		{
			case 1: // db mem
			{
				$Db.executeQuery("INSERT INTO `user_mem`  (USR_ID, USR_TYPE, USR_LANG, USR_TOKEN, USR_LAST_LOGIN, USR_LAST_ACCESS, USR_ROLE_ALLOW, USR_ROLE_DENY) \
											VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [userId, type, lang, token, lastLogin, lastAccess, roleAllow, roleDeny]);
				if ($Db.isError())
				{
					return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.last_error_msg());
				}
			}
			break;

			case 2: // fs cache
			{
				let rv = $Cache.put("user", userId, [token]);
				if ($Err.isERR(rv))
				{
					return rv;
				}

				rv = $Cache.put("token", token, [userId, type, lang, lastLogin, lastAccess, roleAllow, roleDeny]);
				if ($Err.isERR(rv))
				{
					$Cache.delete("user", userId);
					return rv;
				}
			}
			break;

			default: // none
			{
			}
			break;
		}
		
		return $ERRS.ERR_SUCCESS;
	}

	_tokenValidationUpdateLastAccess(userId, type, lang, token, lastLogin, lastAccess, roleAllow, roleDeny)
	{
		let cacheMode = $Config.get("user_cache_mode");

		switch (cacheMode)
		{
			case 1: // db mem
			{
				$Db.executeQuery("UPDATE `user_mem`  SET USR_LAST_ACCESS=?  WHERE  USR_ID=?", [$Utils.now(), userId]);
			}
			break;

			case 2: // fs cache
			{
				$Cache.put("token", token, [userId, type, lang, lastLogin, lastAccess, roleAllow, roleDeny]);
			}
			break;

			default: // none
			{
				$Db.executeQuery("UPDATE `user`  SET USR_LAST_ACCESS=?  WHERE  USR_ID=?", [$Utils.now(), userId]);
			}
			break;
		}
	}
}
