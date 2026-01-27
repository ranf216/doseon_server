const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const useragent = require('express-useragent');

const infraRoot = path.dirname(__dirname);
require(infraRoot + "/platform/infra/init_server_config.js").init(infraRoot);

let app = express();
app.use(cors());
app.use(useragent.express());

const config = require(infraRoot + "/platform/config/onelink.js");

app.listen($ONELINK_SERVER_PORT, function ()
{
    console.log(`App listening on port ${$ONELINK_SERVER_PORT}!`);
});

Object.entries(config.links).forEach(function(apiObj)
{
    let linkName = apiObj[0];

    app.get(`/${linkName}`, function (req, res)
    {
        console.log(req.originalUrl);
        let linkInfo = config.links[req.originalUrl.substring(1)];
        console.log(JSON.stringify(linkInfo));

        let useragent = {
            browser: req.useragent.browser,
            version: req.useragent.version,
            os: req.useragent.os,
            platform: req.useragent.platform,
            isiOS: (req.useragent.isiPad || req.useragent.isiPod || req.useragent.isiPhone || req.useragent.isiPhoneNative),
            isAndoird: (req.useragent.isAndroid || req.useragent.isAndroidNative || req.useragent.isAndroidTablet)
        };
        console.log(JSON.stringify(useragent));
    
        if (useragent.isAndoird)
        {
            console.log(`Redirect to Android URL: ${linkInfo.android_url}`);
            res.redirect(linkInfo.android_url);
        }
        else if (useragent.isiOS)
        {
            console.log(`Redirect to iOS URL: ${linkInfo.ios_url}`);
            res.redirect(linkInfo.ios_url);
        }
        else
        {
            console.log(`Redirect to Web URL: ${linkInfo.web_url}`);
            res.redirect(linkInfo.web_url);
        }
    });
});
