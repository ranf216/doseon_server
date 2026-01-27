const express = require('express');
const cookieParser = require('cookie-parser')
$HttpContext = require('express-http-context');
const getRawBody = require('raw-body');
const contentType = require('content-type');
const Session = require("../platform/infra/session.js");
const path = require('path');
const cors = require('cors');

const infraRoot = path.dirname(__dirname);
require(infraRoot + "/platform/infra/init_server_config.js").init(infraRoot);
const Common = require(infraRoot + "/platform/infra/common.js");
Common.init();

const app = express();
app.use(cors());
app.use($HttpContext.middleware);
app.use(cookieParser())

app.listen($FILES_PORT, function ()
{
    console.log(`App listening on port ${$FILES_PORT}!`);
});

// NOTICE: For every initSession, need to add `$HttpContext.get("session").closeDb();` at the end.
// The only exception is /api which does it inside main.js
app.use("/files/a/:filedata", initSession);
app.use("/download/:filedata", initSession);
app.use("/healthcheck", initSession);

function initSession(req, res, next)
{
    const session = new Session(req, res);
    $HttpContext.set('req', req);
    $HttpContext.set('res', res);

    res.on('finish', () =>
    {
        session.destroy();
    });

    res.on('close', () =>
    {
        session.destroy();
    });

    next();
}


app.get('/files/n/:filename', $Files.Server.nFileHandler);
app.get('/files/a/:filedata', $Files.Server.aFileHandler);
app.get('/download/:filedata', $Files.Server.downloadHandler);

app.get('/healthcheck', function (req, res)
{
    res.status(200).send("OK");
    $HttpContext.get("session").closeDb();
});

app.use((req, res, next) =>
{
    res.status(404).send("Page not found");
});
