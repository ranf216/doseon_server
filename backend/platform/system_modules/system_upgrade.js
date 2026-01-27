module.exports =
{
	performUpgrade(toVersion = 0 /* All */)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const kvls = $Db.executeQuery(`SELECT KVL_VALUE FROM \`key_value\` WHERE KVL_KEY=?`, [$Const.KVL_API_VERSION]);
		const apiVer = Number(kvls.length == 0 ? 1 : kvls[0].KVL_VALUE);

        if (toVersion == 0)
        {
            toVersion = $Config.get("api_version");
        }

        for (let i = apiVer + 1; i <= toVersion; i++)
        {
            if (!this[`upgradeV${i}`]())
            {
				return {"rc" : 3, "message" : `Upgrade to V${i} failed`};
            }

    		$Db.executeQuery(`INSERT INTO \`key_value\` (KVL_KEY, KVL_VALUE) VALUES (?, ?)
							    ON DUPLICATE KEY UPDATE KVL_VALUE=VALUES(KVL_VALUE)`, [$Const.KVL_API_VERSION, "" + i]);

            vals[`upgrade_v${i}`] = "success";
        }

		return {...rc, ...vals};
	},


    // upgradeV2()
    // {
    //     return true;
    // },
}
