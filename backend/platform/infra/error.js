$ERRS = require($Const.INFRA_ROOT + "/platform/definitions/errorcodes." + $Config.get("default_language") + ".js");

module.exports =
{
    err: function(err)
    {
        return $Utils.clone($ERRS[err]);
    },

	isERR: function(arr)
	{
		return !$Utils.empty(arr.rc);
	},

	isErrOf: function(arr, err)
	{
		return !$Utils.empty(arr.rc) && arr.rc == $ERRS[err].rc;
	},

	removeERR: function(arr)
	{
		delete arr.rc;
		delete arr.message;
		return arr;
	},

	errWithInfo: function(err, info)
	{
		let e = this.err(err);
		e.message += " (" + info + ")";
		return e;
	},

	errWithParams: function(err, ...args)
	{
		let e = this.err(err);
        e.message = $Utils.strFormat(e.message, ...args);
		return e;
	},

	addInfo: function(arr, info)
	{
		arr.message += " (" + info + ")";
		return arr;
	},

	DBError: function(err, cause)
	{
		let rc = this.err(err);
		let vals = {"cause": "DB error: " + cause};
		
		$Logger.logString($Const.LL_ERROR, "DB error: " + rc.rc + ": " + rc.message + "Cause: " + cause);
		
		return {...rc, ...vals};
	},

	responseWithoutError: function(err)
	{
		let resp = $Utils.clone(err);
		delete resp.rc;
		delete resp.message;
		return resp;
	},
};
