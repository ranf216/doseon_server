const USER_ROLE_ALLOW   = 1;
const USER_ROLE_UNALLOW = 2;
const USER_ROLE_DENY    = 3;
const USER_ROLE_UNDENY  = 4;

function UserRoleSetData()
{
    return {
        role: null,
        action: null,
        table: null,
        allowField: null,
        denyField: null,
        fieldTypeValues: [], // array of FieldTypeValue
    };
}

function FieldTypeValue(field = null, value = null) // Used for passing params to generic queries
{
    return {field, value};
}


module.exports =
{
    /*****************************************************************************************************************
     * getCustomUserRoleAllowDeny
     * 
     * Return array(allowBits, denyBits) to merge (and override) user level and user type level role permissions
     * 
     * Point to notice:
     * 1. Check for current user type, and see if roles are applicable
     * 2. Check for specific params pased to the APIs
     * 
     *****************************************************************************************************************/
    getCustomUserRoleAllowDeny: function()
    {
        return [0, 0];
    },


    allowUserRole: function(userId, role)
    {
        return this._setResetUserRoleBit(userId, role, USER_ROLE_ALLOW);
    },

    unallowUserRole: function(userId, role)
    {
        return this._setResetUserRoleBit(userId, role, USER_ROLE_UNALLOW);
    },

    denyUserRole: function(userId, role)
    {
        return this._setResetUserRoleBit(userId, role, USER_ROLE_DENY);
    },

    undenyUserRole: function(userId, role)
    {
        return this._setResetUserRoleBit(userId, role, USER_ROLE_UNDENY);
    },

    getUserRoles: function(userId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let usrs = $Db.executeQuery(`SELECT USR_TYPE, USR_ROLE_ALLOW, USR_ROLE_DENY FROM \`user\` WHERE USR_ID=?`, [userId]);
        if (usrs.length == 0)
        {
            return $ERRS.ERR_USER_NOT_EXISTS;
        }

        let usr = usrs[0];

        vals.roles = $Utils.getCalculatedUserRoles(usr.USR_TYPE, usr.USR_ROLE_ALLOW, usr.USR_ROLE_DENY);

        return {...rc, ...vals};
    },

    /**
     * Determines whether the user has the specified role.
     *
     * @param {(string|Object)} userInfo - User information. Can be:
     *   - A `string` representing the user id.
     *   - An `object` with the following properties:
     *     @property {int} [userType] - The user type.
     *     @property {int} [allowRolesBits] - The user allowed bits.
     *     @property {int} [denyRolesBits] - The user denied bits.
     * @param {int} role - The role to check.
     * @returns {boolean} `true` if the user has the role, otherwise `false`.
     */
    doesUserHaveRole: function(userInfo, role)
    {
        let roles;

        if ($Utils.isString(userInfo))
        {
            const rv = this.getUserRoles(userInfo);
            if ($Err.isERR(rv))
            {
                return false;
            }

            roles = rv.roles;
        }
        else
        {
            roles = $Utils.getCalculatedUserRoles(userInfo.userType, userInfo.allowRolesBits, userInfo.denyRolesBits);
        }

        return roles.includes(parseInt(role));
    },


    _setResetUserRoleBit: function(userId, role, action)
    {
        let ursd = new UserRoleSetData();
        ursd.role = role;
        ursd.action = action;
        ursd.table = "user_details";
        ursd.allowField = "USD_ROLE_ALLOW";
        ursd.denyField = "USD_ROLE_DENY";
        ursd.fieldTypeValues.push(new FieldTypeValue("USD_USR_ID", userId));

        $HttpContext.get("session").tokenValidator.deleteFromUserCache(userId);

        return this._setResetRoleBit(ursd);
    },

    _isValidUserRole: function(role)
    {
        let isFound = false;
        
        $Globals.allUserRoles.every(userRole =>
        {
            if (userRole[1] == role)
            {
                isFound = true;
                return false;
            }

            return true;
        });
        
        return isFound;
    },

    _setResetRoleBit: function(userRoleSetData)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;
        
        if (!this._isValidUserRole(userRoleSetData.role))
        {
            return $ERRS.ERR_INVALID_USER_ROLE;
        }
        
        let query = `SELECT ${userRoleSetData.allowField}, ${userRoleSetData.denyField} FROM \`${userRoleSetData.table}\``;
        let params = [];
        
        let isFirst = true;
        
        userRoleSetData.fieldTypeValues.forEach(ftv =>
        {
            if (isFirst)
            {
                isFirst = false;
                query += " WHERE ";
            }
            else
            {
                query += " AND ";
            }
            
            query += `${ftv.field}=?`;
            params.push(ftv.value);
        });

        let usrs = $Db.executeQuery(query, params);
        if (usrs.length == 0)
        {
            return $ERRS.ERR_USER_NOT_EXISTS;
        }
        
        let allowRoles = usrs[0][userRoleSetData.allowField];
        let denyRoles = usrs[0][userRoleSetData.denyField];
        
        let setRoleBit = 1 << (userRoleSetData.role - 1);
        let resetRoleBit = ~setRoleBit;
        
        
        switch (userRoleSetData.action)
        {
            case USER_ROLE_ALLOW:
                setAllow = true;
                resetAllow = false;
                setDeny = false;
                resetDeny = true;
            break;

            case USER_ROLE_UNALLOW:
                setAllow = false;
                resetAllow = true;
                setDeny = false;
                resetDeny = false;
            break;

            case USER_ROLE_DENY:
                setAllow = false;
                resetAllow = true;
                setDeny = true;
                resetDeny = false;
            break;

            case USER_ROLE_UNDENY:
                setAllow = false;
                resetAllow = false;
                setDeny = false;
                resetDeny = true;
            break;
        }
        

        if (setAllow)
        {
            allowRoles = allowRoles | setRoleBit;
        }
        if (resetAllow)
        {
            allowRoles = allowRoles & resetRoleBit;
        }
        if (setDeny)
        {
            denyRoles = denyRoles | setRoleBit;
        }
        if (resetDeny)
        {
            denyRoles = denyRoles & resetRoleBit;
        }
        

        query = `UPDATE \`${userRoleSetData.table}\` SET ${userRoleSetData.allowField}=?, ${userRoleSetData.denyField}=?`;
        params = [allowRoles, denyRoles];
        
        isFirst = true;
        
        userRoleSetData.fieldTypeValues.forEach(ftv =>
        {
            if (isFirst)
            {
                isFirst = false;
                query += " WHERE ";
            }
            else
            {
                query += " AND ";
            }
            
            query += `${ftv.field}=?`;
            params.push(ftv.value);
        });

        $Db.executeQuery(query, params);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    },
}
