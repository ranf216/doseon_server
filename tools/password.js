const infraRoot = __dirname + "/../backend";
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

if (process.argv.length <= 3)
{
    console.log("\x1b[32m\x1b[1m%s\x1b[0m", "password <userId / email / phone> <password>");
    return;
}

isc.initStandAlone(infraRoot, "inafra", "password");

const user = process.argv[2];
const inputPwd = process.argv[3];
let phoneNum = "XXX";
let phoneCode = "XX";
let userId = "";

const phoneNumber = $CountryUtils.getIntlPhoneNumber(user);
if (!$Utils.empty(phoneNumber))
{
    phoneNum = phoneNumber.phoneNumber;
    phoneCode = phoneNumber.countryCode;
}

if (/^[a-fA-F0-9]{64}$/.test(user))
{
    userId = user;
}
else
{
    const usrs = $Db.executeQuery(`SELECT USR_ID FROM \`user\` WHERE USR_EMAIL=? || (USR_PHONE_NUM=? AND USR_PHONE_COUNTRY_CODE=?)`, [user, phoneNum, phoneCode]);
    if (usrs.length == 0)
    {
        console.log("\x1b[31m\x1b[1m%s\x1b[0m", "User not found");
        isc.endStandAlone($ERRS.ERR_SUCCESS);
        return;
    }
    userId = usrs[0].USR_ID;
}

const pwd = $Utils.hash(userId + inputPwd);

console.log("\x1b[33m\x1b[1m%s\x1b[0m", `Password: ${pwd}`);

isc.endStandAlone($ERRS.ERR_SUCCESS);
