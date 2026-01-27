const crypto = require('crypto');

const secretKey = $Config.get("cipher", "secret_key");
const secretIV = $Config.get("cipher", "secret_iv");
const encMethod = $Config.get("cipher", "enc_method");

const staticKey = crypto.createHash('sha512').update(secretKey).digest('hex').substring(0, 32);
const staticEncIv = crypto.createHash('sha512').update(secretIV).digest('hex').substring(0, 16);

module.exports =
{
    encryptData: function(data, iv = null)
    {
        iv = (iv || staticEncIv).substring(0, 16);
        const cipher = crypto.createCipheriv(encMethod, staticKey, iv);
        const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
        return Buffer.from(encrypted).toString('base64');
    },

    decryptData: function(data, iv = null)
    {
        iv = (iv || staticEncIv).substring(0, 16);
        let text = "";

        try
        {
            const buff = Buffer.from(data, 'base64');
            data = buff.toString('utf-8');
            const decipher = crypto.createDecipheriv(encMethod, staticKey, iv);
            text = decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
        }
        catch (error)
        {
            text = "";
        }

        return text;
    }    
}
