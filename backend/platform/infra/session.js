const url = require('url');
const Common = require(__dirname + "/common.js");
const TokenValidator = require(__dirname + "/token_validator.js");

module.exports = class
{
    constructor(request, response)
    {
        this.request = request;
        this.response = response;

        Common.init();
        this._dbConn = null;
        this.userId = "";
        this.userType = 0;
        this.userLang = $Config.get("default_language");
        this.userRoleAllow = 0;
        this.userRoleDeny = 0;
        this.userRoles = null;
        this.token = null;
        this.tokenValidator = new TokenValidator(this);
        this.impersonatorStack = null;
        this.accountImpersonationStack = null;
        this.custom = {};

        global.$HttpContext.set('session', this);
    }

    destroy()
    {
        this.tokenValidator = null;
        global.$HttpContext.set('session', null);
    }

    getHostName()
    {
        if ($Utils.isset(this.request))
        {
            let urlObj = url.parse(this.request.url, false);
            $Const.HOST_NAME = urlObj.hostname;
        }
        else
        {
            $Const.HOST_NAME = undefined;
        }
    }

    getRemoteAddress()
    {
        if (!$Utils.empty(this.request) && !$Utils.empty(this.request.headers['x-forwarded-for']))
        {
            return this.request.headers['x-forwarded-for'];
        }

        if ($Utils.empty(this.request) || !$Utils.isset(this.request.socket) || !$Utils.isset(this.request.socket.remoteAddress))
        {
            return "UNKNOWN";
        }

        let parts = this.request.socket.remoteAddress.split(":");
        let ip = parts[parts.length - 1];

        if ($Utils.empty(ip))
        {
            return "UNKNOWN";
        }

        return ip;
    }

    getCurrentUserRoles()
    {
        if (typeof $UserRoles !== 'undefined')
        {
            let rv = $UserRoles.getCustomUserRoleAllowDeny();
            this.userRoleAllow |= rv.customAllow;
            this.userRoleDeny |= rv.customDeny;
        }

        this.userRoles = $Utils.getCalculatedUserRoles(this.userType, this.userRoleAllow, this.userRoleDeny);
        
        return this.userRoles;
    }
    
    isCurrentUserHasRole(role)
    {
        if (this.userRoles === null)
        {
            this.userRoles = $Utils.getCalculatedUserRoles(this.userType, this.userRoleAllow, this.userRoleDeny);
        }

        return this.userRoles.includes(parseInt(role));
    }

    closeDb()
    {
        $Db.releaseConnection(this._dbConn);
    }

    closeDbAndEchoJsonEncode(resp)
    {
        this.echoJsonEncode(resp);
        $Db.releaseConnection(this._dbConn);
    }
    
    echoJsonEncode(resp)
    {
        $Logger.logRequest(resp, false);
    
        if ($Utils.empty($HttpContext.get("req").query.callback))
        {
            $HttpContext.get("res").send(JSON.stringify(resp));
        }
        else
        {
            $HttpContext.get("res").send($HttpContext.get("req").query.callback + "(" + JSON.stringify(resp) + ")");
        }
    }

    impersonate(userId, impersonateToken = false)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        if (this.impersonatorStack === null)
        {
            this.impersonatorStack = [];
        }

        let usrs = $Db.executeQuery("SELECT USR_TOKEN, USR_TYPE FROM `user` WHERE USR_ID=?", [userId]);
        if (usrs.length == 0)
        {
            return $ERRS.ERR_USER_NOT_EXISTS;
        }

        this.impersonatorStack.push([this.userId, this.userType, this.token]);

        this.userId = userId;
        this.userType = usrs[0].USR_TYPE;

        if (impersonateToken)
        {
            this.token = usrs[0].USR_TOKEN;
        }

        return {...rc, ...vals};
    }

    unimpersonate()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let elem = this.impersonatorStack.pop();
        if (!$Utils.empty(elem))
        {
            this.userId = elem[0];
            this.userType = elem[1];
            this.token = elem[2];
        }

        return {...rc, ...vals};
    }

    impersonateAccount(userId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        if (userId == this.userId)
        {
            return $ERRS.ERR_SUCCESS;
        }

        const usrs = $Db.executeQuery(`SELECT USR_TYPE, USR_ROLE_ALLOW, USR_ROLE_DENY, USR_LANG FROM \`user\` WHERE USR_ID=? AND USR_DELETED_ON is null`, [userId]);
        if (usrs.length == 0)
        {
            return $ERRS.ERR_USER_NOT_EXISTS;
        }
        const user = usrs[0];

        if (this.accountImpersonationStack === null)
        {
            this.accountImpersonationStack = [];
        }

        this.accountImpersonationStack.push({userId: this.userId, userType: this.userType});

        this.userId = userId;
        this.userType = user.USR_TYPE;
        this.userLang = user.USR_LANG || $Config.get("default_language");
        this.userRoleAllow = user.USR_ROLE_ALLOW;
        this.userRoleDeny = user.USR_ROLE_DENY;
        this.userRoles = $Utils.getCalculatedUserRoles(this.userType, this.userRoleAllow, this.userRoleDeny);
        this.token = null;

        return {...rc, ...vals};
    }

    getAccountImpersonationParent(generation = 1)
    {
        if ($Utils.empty(this.accountImpersonationStack) || generation > this.accountImpersonationStack.length || generation < 1)
        {
            return null;
        }

        return this.accountImpersonationStack[this.accountImpersonationStack.length - generation];
    }

    getAccountImpersonationTopParent()
    {
        if ($Utils.empty(this.accountImpersonationStack))
        {
            return {userId: this.userId, userType: this.userType};
        }

        return this.accountImpersonationStack[0];
    }
}
