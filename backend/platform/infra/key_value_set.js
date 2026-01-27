const fs = require('fs');

module.exports = class
{
    constructor(setName)
    {
        if ($Utils.empty(setName))
        {
            setName = "default";
        }

        this.setFile = $Config.get("key_value_sets_path") + `/${setName}.json`;

		if (fs.existsSync(this.setFile))
        {
            let cnt = $Utils.fileGetContents(this.setFile);
            this.data = JSON.parse(cnt);
        }
        else
        {
            this.data = {};
        }
    }

    getAll()
    {
        return $Utils.clone(this.data);
    }

    getValue(key)
    {
        if (!$Utils.isset(this.data[key]))
        {
            return null;
        }

        return this.data[key];
    }

    hasValue(key)
    {
        return $Utils.isset(this.data[key]);
    }

    setValue(key, value)
    {
        this.data[key] = value;
        $Files.saveFile(this.setFile, JSON.stringify(this.data), $Config.get("standard_file_access"));
    }

    unsetValue(key)
    {
        if (!$Utils.isset(this.data[key]))
        {
            return;
        }

        delete this.data[key];
        $Files.saveFile(this.setFile, JSON.stringify(this.data), $Config.get("standard_file_access"));
    }

    delete()
    {
        $Utils.unlink(this.setFile);
    }
};
