const VerData = class
{
    constructor(json = null)
    {
        this.field1 = "";
        this.field2 = "";
        this.authKey = "";

        if (json)
        {
            let data = JSON.parse(json);
            this.field1 = data.field1;
            this.field2 = data.field2;
            this.authKey = data.authKey;
        }
    }

    render()
    {
        return JSON.stringify({field1: this.field1, field2: this.field2, authKey: this.authKey});
    }
}



module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

    send_otp_code()
    {
        let rv = this._validate_factor_key(this.$second_factor_key);
        if ($Err.isERR(rv))
        {
            return rv;
        }

        return this._send_otp_code(this.$factor_type, rv.user_id);
    }

    _send_otp_code(factorType, userId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        if (factorType != $Const.OTP_TYPE_PHONE && factorType != $Const.OTP_TYPE_EMAIL)
        {
            return $ERRS.ERR_INVALID_VERIFICATION_FACTOR_TYPE;
        }

        let usrs = $Db.executeQuery(`SELECT USR_EMAIL, USR_PHONE_NUM, USR_PHONE_COUNTRY_CODE FROM \`user\` WHERE USR_ID=?`, [userId]);
        let field1;
        let field2;
    
        if (factorType == $Const.OTP_TYPE_PHONE)
        {
            field1 = usrs[0].USR_PHONE_NUM;
            field2 = usrs[0].USR_PHONE_COUNTRY_CODE;
        }
        else
        {
            field1 = usrs[0].USR_EMAIL;
            field2 = "";
        }

        let rv = new $User(this.$Session)._send_otp_code(factorType, field1, field2, true);
        if ($Err.isERR(rv))
        {
            return rv;
        }

        let verData = new VerData();
        verData.field1 = field1;
        verData.field2 = field2;
        verData.authKey = rv.auth_key;
    
        $Db.executeQuery(`UPDATE \`user\` SET USR_2ND_FACTOR_VERIFICATION=? WHERE USR_ID=?`, [verData.render(), userId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }
    
    resend_otp_code()
    {
        let rv = this._validate_factor_key(this.$second_factor_key);
        if ($Err.isERR(rv))
        {
            return rv;
        }

        return this._resend_otp_code(this.$factor_type, rv.user_id);
    }

    _resend_otp_code(factorType, userId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        if (factorType != $Const.OTP_TYPE_PHONE && factorType != $Const.OTP_TYPE_EMAIL)
        {
            return $ERRS.ERR_INVALID_VERIFICATION_FACTOR_TYPE;
        }

        let usrs = $Db.executeQuery(`SELECT USR_EMAIL, USR_PHONE_NUM, USR_PHONE_COUNTRY_CODE FROM \`user\` WHERE USR_ID=?`, [userId]);
        let field1;
        let field2;

        if (factorType == $Const.OTP_TYPE_PHONE)
        {
            field1 = usrs[0].USR_PHONE_NUM;
            field2 = usrs[0].USR_PHONE_COUNTRY_CODE;
        }
        else
        {
            field1 = usrs[0].USR_EMAIL;
            field2 = "";
        }
    
        let rv = new $User(this.$Session)._resend_otp_code(factorType, field1, field2);
        if ($Err.isERR(rv))
        {
            return rv;
        }

        return {...rc, ...vals};
    }
    
    verify_otp_code()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let rv = this._validate_factor_key(this.$second_factor_key);
        if ($Err.isERR(rv))
        {
            return rv;
        }
        let userId = rv.user_id;
    
        let usrs = $Db.executeQuery(`SELECT USR_2ND_FACTOR_VERIFICATION FROM \`user\` WHERE USR_ID=?`, [userId]);
        let verData = new VerData(usrs[0].USR_2ND_FACTOR_VERIFICATION);
    
        rv = new $User(this.$Session)._verify_otp_code(this.$factor_type, verData.field1, verData.field2, this.$verification_code);
        if ($Err.isERR(rv))
        {
            return rv;
        }
    
        if (rv.auth_key != verData.authKey)
        {
            return $ERRS.ERR_INVALID_VERIFICATION_SEND_NEW_CODE;
        }
    
        $Db.executeQuery(`UPDATE \`user\` SET USR_2ND_FACTOR_VERIFICATION=null, USR_2ND_FACTOR_KEY=null, USR_2ND_FACTOR_KEY_VALID_THRU=null WHERE USR_ID=?`, [userId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }
    
    
        const device_id = "";
        const os_type = 0;
        const os_version = "";
        const device_model = "";
        const app_version = "";
    
		const usr = $Db.executeQuery(`SELECT *
									FROM \`user\`
										JOIN \`user_details\` ON USR_ID=USD_USR_ID
									WHERE USR_ID=?`, [userId])[0];

        rc = new $User(this.$Session)._performLogin(usr, device_id, os_type, os_version, device_model, app_version);

        const pwdTooOld = (!$Utils.empty(usr.USR_PASSWORD_CREATED_ON) &&
                            $Config.get("password_valid_for_seconds") > 0 &&
                            new $Date(usr.USR_PASSWORD_CREATED_ON).addSeconds($Config.get("password_valid_for_seconds")).format() < $Utils.now());

        vals.need_change_password = (pwdTooOld || (usr.USR_PASSWORD.charAt(0) == "X"));

        if (vals.need_change_password)
        {
            rc.token = "X" + rc.token.substring(1);
            $Db.executeQuery(`UPDATE \`user\` SET USR_TOKEN=? WHERE USR_ID=?`, [rc.token, userId]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }

        return {...rc, ...vals};
    }

    mandatory_change_password()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let usrs = $Db.executeQuery(`SELECT USR_PASSWORD FROM \`user\` WHERE USR_ID=? AND USR_STATUS=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY=?`,
                                [this.$Session.userId, $Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_EMAIL]);
        if (usrs.length == 0)
        {
            return $ERRS.ERR_USER_NOT_FOUND;
        }
        
        if (!$Utils.isCorrectPwd(this.$Session.userId, this.$curr_password, usrs[0].USR_PASSWORD))
        {
            return $ERRS.ERR_INVALID_PASSWORD;
        }

        if (!$Utils.isValidPassword(this.$new_password))
        {
            return $ERRS.ERR_PASSWORD_NOT_MEET_CRITERIA;
        }

        if (this.$new_password == this.$curr_password)
        {
            return $ERRS.ERR_NEW_PASSWORD_CANNOT_BE_SAME_AS_CURRENT;
        }

        const newPwd = $Utils.hash(this.$Session.userId + this.$new_password);

        $Db.executeQuery(`UPDATE \`user\` SET USR_PASSWORD=?, USR_PASSWORD_CREATED_ON=?, USR_TOKEN='' WHERE USR_ID=?`, [newPwd, $Utils.now(), this.$Session.userId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        const device_id = "";
        const os_type = 0;
        const os_version = "";
        const device_model = "";
        const app_version = "";
    
		const usr = $Db.executeQuery(`SELECT *
									FROM \`user\`
										JOIN \`user_details\` ON USR_ID=USD_USR_ID
									WHERE USR_ID=?`, [this.$Session.userId])[0];

        rc = new $User(this.$Session)._performLogin(usr, device_id, os_type, os_version, device_model, app_version);
        vals.need_change_password = false;

        return {...rc, ...vals};
    }

    change_factor()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
    
        if ($Utils.empty(this.$new_password) && $Utils.empty(this.$new_phone_num) && $Utils.empty(this.$new_email))
        {
            return $ERRS.ERR_NO_ACTION_TO_DO;
        }
    
        if (![$Const.OTP_TYPE_PHONE, $Const.OTP_TYPE_EMAIL, $Const.OTP_TYPE_PASSWORD].includes(this.$factor_type))
        {
            return $ERRS.ERR_INVALID_FACTOR_TYPE;
        }
    
        let usrs = $Db.executeQuery(`SELECT USR_PASSWORD, USR_PHONE_NUM, USR_PHONE_COUNTRY_CODE, USR_EMAIL
                                    FROM \`user\`
                                    WHERE USR_ID=? AND USR_STATUS=? AND USR_DELETED_ON is null AND USR_LOGIN_AUTHORITY=?`,
                                [this.$Session.userId, $Const.USER_STATUS_ACTIVE, $Const.USER_LOGIN_AUTHORITY_EMAIL]);
        if (usrs.length == 0)
        {
            return $ERRS.ERR_USER_NOT_FOUND;
        }
        
        if (!$Utils.isCorrectPwd(this.$Session.userId, this.$curr_password, usrs[0].USR_PASSWORD))
        {
            return $ERRS.ERR_INVALID_PASSWORD;
        }
    
    
        let field1;
        let field2;
        let newPwd;

        if (this.$factor_type == $Const.OTP_TYPE_PHONE)
        {
            let phoneNumber = $CountryUtils.getIntlPhoneNumber(this.$new_phone_num, this.$new_country_code);
            if ($Utils.empty(phoneNumber))
            {
                return $ERRS.ERR_INVALID_PHONE_NUMBER;
            }
    
            field1 = this.$new_phone_num;
            field2 = this.$new_country_code;
        }
        else if (this.$factor_type == $Const.OTP_TYPE_EMAIL)
        {
            if (!$Utils.validateEmail(this.$new_email))
            {
                return $ERRS.ERR_INVALID_EMAIL_ADDRESS;
            }
    
            field1 = this.$new_email;
            field2 = "";
        }
        else
        {
            if (!$Utils.isValidPassword(this.$new_password))
            {
                return $ERRS.ERR_PASSWORD_NOT_MEET_CRITERIA;
            }

            newPwd = $Utils.hash(this.$Session.userId + this.$new_password);
            field1 = newPwd;
            field2 = "";
        }
    
    
        let secondFactorKey = $Utils.uniqueHash();
        let validSecs = $Config.get("otp_verification", "auth_key_valid_for_seconds");
        let validTrhu = new $Date().addSeconds(validSecs).format();
        let pendingFactor = JSON.stringify({factor: this.$factor_type, field1: field1, field2: field2});
    
        $Db.executeQuery(`UPDATE \`user\` SET USR_2ND_FACTOR_KEY=?, USR_2ND_FACTOR_KEY_VALID_THRU=?, USR_PENDING_FACTOR=? WHERE USR_ID=?`,
                                    [secondFactorKey, validTrhu, pendingFactor, this.$Session.userId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        vals.is_verified = true;
        vals.second_factor_key = secondFactorKey;
        vals.phone_num = $Utils.getObscuredPhone(usrs[0].USR_PHONE_NUM, usrs[0].USR_PHONE_COUNTRY_CODE);
        vals.email = $Utils.getObscuredEmail(usrs[0].USR_EMAIL);
    
        return {...rc, ...vals};
    }
    
    change_factor_send_otp_code()
    {
        let rv = this._validate_factor_key(this.$second_factor_key);
        if ($Err.isERR(rv))
        {
            return rv;
        }
    
        if (this.$Session.userId != rv.user_id)
        {
            return $ERRS.ERR_USER_NOT_EXISTS;
        }
    
        return  this._send_otp_code(this.$factor_type, rv.user_id);
    }
    
    change_factor_resend_otp_code()
    {
        let rv = this._validate_factor_key(this.$second_factor_key);
        if ($Err.isERR(rv))
        {
            return rv;
        }
    
        if (this.$Session.userId != rv.user_id)
        {
            return $ERRS.ERR_USER_NOT_EXISTS;
        }
    
        return this._resend_otp_code(this.$factor_type, rv.user_id);
    }
    
    change_factor_verify_otp_code()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
    
        let rv = this._validate_factor_key(this.$second_factor_key);
        if ($Err.isERR(rv))
        {
            return rv;
        }
        let userId = rv.user_id;
    
        if (this.$Session.userId != userId)
        {
            return $ERRS.ERR_USER_NOT_EXISTS;
        }
    
        let usrs = $Db.executeQuery(`SELECT USR_2ND_FACTOR_VERIFICATION, USR_PENDING_FACTOR FROM \`user\` WHERE USR_ID=?`, [userId]);
        let verData = new VerData(usrs[0].USR_2ND_FACTOR_VERIFICATION);
        let pendingFactor = JSON.parse(usrs[0].USR_PENDING_FACTOR);
        let updateFactorType = pendingFactor.factor;
        let updateField1 = pendingFactor.field1;
        let updateField2 = pendingFactor.field2;
    
        rv = new $User(this.$Session)._verify_otp_code(this.$factor_type, verData.field1, verData.field2, this.$verification_code);
        if ($Err.isERR(rv))
        {
            return rv;
        }
    
        if (rv.auth_key != verData.authKey)
        {
            return $ERRS.ERR_INVALID_VERIFICATION_SEND_NEW_CODE;
        }

        $Db.executeQuery(`UPDATE \`user\` SET USR_2ND_FACTOR_VERIFICATION=null, USR_2ND_FACTOR_KEY=null, USR_2ND_FACTOR_KEY_VALID_THRU=null, USR_PENDING_FACTOR=null WHERE USR_ID=?`, [userId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }
    
    
        if (updateFactorType == $Const.OTP_TYPE_PHONE)
        {
            $Db.executeQuery(`UPDATE \`user_details\` SET USD_PHONE_NUM=?, USD_PHONE_COUNTRY_CODE=? WHERE USD_USR_ID=?`, [updateField1, updateField2, userId]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }
        else if (updateFactorType == $Const.OTP_TYPE_EMAIL)
        {
            $Db.executeQuery(`UPDATE \`user_details\` SET USD_EMAIL=? WHERE USD_USR_ID=?`, [updateField1, userId]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }
        else
        {
            $Db.executeQuery(`UPDATE \`user\` SET USR_PASSWORD=?, USR_PASSWORD_CREATED_ON=? WHERE USR_ID=?`, [updateField1, $Utils.now(), userId]);
            if ($Db.isError())
            {
                return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
            }
        }
    
        return {...rc, ...vals};
    }

    _validate_factor_key(factorKey)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let usrs = $Db.executeQuery(`SELECT USR_ID, USR_2ND_FACTOR_KEY_VALID_THRU FROM \`user\` WHERE USR_2ND_FACTOR_KEY=?`, [factorKey]);
        if (usrs.length == 0)
        {
            return $ERRS.ERR_USER_NOT_EXISTS;
        }

        if (usrs[0].USR_2ND_FACTOR_KEY_VALID_THRU < $Utils.now())
        {
            return $ERRS.ERR_INVALID_VERIFICATION_SEND_NEW_CODE;
        }

        vals.user_id = usrs[0].USR_ID;

        return {...rc, ...vals};
    }
}
