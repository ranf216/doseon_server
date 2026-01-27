module.exports = class
{
    constructor(serviceId, subServiceId = null)
    {
        this.serviceId = serviceId;
        this.subServiceId = subServiceId ? (1000000 + serviceId * 100 + subServiceId) : null;
        this.thisSrvId = (this.subServiceId ? this.subServiceId : this.serviceId);

        let srvs = $Db.executeQuery("SELECT SRV_ACTIVE FROM `service` WHERE SRV_ID=?", [this.serviceId]);
        if (srvs.length == 0)
        {
            $Db.executeQuery("INSERT INTO `service` (SRV_ID, SRV_ACTIVE, SRV_HEARTBEAT, SRV_METADATA) VALUES (?, ?, ?, ?)", [this.serviceId, 0, 0, ""]);
        }

        if (this.subServiceId)
        {
            let subSrvs = $Db.executeQuery("SELECT count(*) cnt FROM `service` WHERE SRV_ID=?", [this.subServiceId]);
            if (subSrvs[0].cnt == 0)
            {
                $Db.executeQuery("INSERT INTO `service` (SRV_ID, SRV_ACTIVE, SRV_HEARTBEAT, SRV_METADATA) VALUES (?, ?, ?, ?)",
                                [this.subServiceId, srvs[0].SRV_ACTIVE, 0, ""]);
            }
        }
    }

    setActive(isActive)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery("UPDATE `service` SET SRV_ACTIVE=? WHERE SRV_ID=?", [isActive ? 1 : 0, this.serviceId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        let firstSubId = 1000000 + this.serviceId * 100;
        let lastSubId = 1000099 + this.serviceId * 100;

        $Db.executeQuery("UPDATE `service` SET SRV_ACTIVE=? WHERE SRV_ID>=? AND SRV_ID<=?", [isActive ? 1 : 0, firstSubId, lastSubId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }

    heartbeat()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery("UPDATE `service` SET SRV_HEARTBEAT=? WHERE SRV_ID=?", [new $Date().getTimestamp(true), this.thisSrvId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }

    getStatus()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let where = "SRV_ID=?";
        let params = [this.serviceId];

        if (this.subServiceId)
        {
            where += " OR SRV_ID=?";
            params.push(this.thisSrvId);
        }

        let srvs = $Db.executeQuery(`SELECT SRV_ID, SRV_ACTIVE, SRV_HEARTBEAT
                                    FROM \`service\`
                                    WHERE ${where}
                                    ORDER BY SRV_ID ASC`, params);
        if (srvs.length == 0)
        {
            vals.is_active = false;
            vals.heartbeat_age = new $Date().getTimestamp(true);
        }
        else
        {
            vals.is_active = (srvs[0].SRV_ACTIVE == 1);
            vals.heartbeat_age = (new $Date().getTimestamp(true) - srvs[this.subServiceId ? 1 : 0].SRV_HEARTBEAT);
        }

        let firstSubId = 1000000 + this.serviceId * 100;
        let lastSubId = 1000099 + this.serviceId * 100;

        $Db.executeQuery("UPDATE `service` SET SRV_ACTIVE=? WHERE SRV_ID>=? AND SRV_ID<=?", [vals.is_active ? 1 : 0, firstSubId, lastSubId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }

    setMetadata(metadata)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery("UPDATE `service` SET SRV_METADATA=? WHERE SRV_ID=?", [metadata, this.thisSrvId]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }

        return {...rc, ...vals};
    }

    getMetadata()
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let srvs = $Db.executeQuery("SELECT SRV_METADATA FROM `service` WHERE SRV_ID=?", [this.thisSrvId]);
        if (srvs.length == 0)
        {
            vals.metadata = "";
        }
        else
        {
            vals.metadata = srvs[0].SRV_METADATA;
        }

        return {...rc, ...vals};
    }
}
