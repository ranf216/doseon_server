const express = require('express');
const cookieParser = require('cookie-parser')
$HttpContext = require('express-http-context');
const getRawBody = require('raw-body');
const contentType = require('content-type');
const Session = require("../platform/infra/session.js");
const path = require('path');
const cors = require('cors');
const process = require('process');

const infraRoot = path.dirname(__dirname);
require(infraRoot + "/platform/infra/init_server_config.js").init(infraRoot);

const Common = require(infraRoot + "/platform/infra/common.js");
Common.init();

logServerStartTime();

process.on('uncaughtException', (error) =>
{
    console.error('CRITICAL ERROR: Uncaught Exception:', error);
    gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) =>
{
    console.error('CRITICAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
});

const app = express();
app.use(cors());
app.use($HttpContext.middleware);
app.use(cookieParser());

app.listen($SERVER_PORT, function ()
{
    console.log(`App listening on port ${$SERVER_PORT}!`);
});

// NOTICE: For every initSession, need to add `$HttpContext.get("session").closeDb();` at the end.
// The only exception is /api which does it inside main.js
app.use("/api", initSession);
app.use("/system_login/:location", initSession);
app.use("/apiclient", initSession);
app.use("/logtail", initSession);
app.use("/socket_viewer", initSession);
app.use("/log_analyzer", initSession);
app.use("/otp_viewer", initSession);
app.use("/restore_password", initSession);
app.use("/public/jsapi.js", initSession);
app.use("/files/a/:filedata", initSession);
app.use("/download/:filedata", initSession);

const Main = require("./main.js");

function initSession(req, res, next)
{
    process.nextTick(() =>
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
    });
}

function doApiCall(req, res)
{
    try
    {
        Main.run(req, res);
    }
    catch (e)
    {
        console.log(e);
    }
}

function logServerStartTime()
{
    const verPath = path.join($Const.INFRA_ROOT, "..", "version");
    const ver = $Utils.fileGetContents(verPath, false, true);

    global.$ServerDeploymentVersion = (ver ? ver.trim() : "Not Available");
    global.$ServerStartTime = new $Date().format("Y-m-d H:i:s.z");

    console.log(`START Deployment version ${global.$ServerDeploymentVersion} at ${global.$ServerStartTime}`);
}

function gracefulShutdown()
{
    const session = $HttpContext.get("session");
	if (session)
	{
		$Db.rollbackTransaction();
		session.closeDb();
	}
    
    console.log('Shutting down server due to critical error...');
    process.exit(1);
}



app.post('/api', function (req, res)
{
    const options = {
        length: req.headers['content-length'],
        limit: $REQUEST_PAYLOAD_LIMIT,
        encoding: contentType.parse(req).parameters.charset
    };

    getRawBody(req, options, function (err, string)
    {
        if (err)
        {
            res.send("Failed request: " + req);

            console.log("Failed request: " + req);
            console.log("err");
            return;
        }

        req.rawBody = string;

        // set the content-type header to JSON
        res.setHeader('Content-Type', 'application/json');
        
        doApiCall(req, res);
    });
});

app.get('/system_login/:location', function (req, res)
{
    const location = req.params.location;
    const SystemLogin = require("./system_login.js");
    SystemLogin.run(req, res, location);

    $HttpContext.get("session").closeDb();
});

app.get('/apiclient', function (req, res)
{
    const ApiClient = require("./apiclient.js");
    ApiClient.run(req, res);

    $HttpContext.get("session").closeDb();
});

app.get('/logtail', function (req, res)
{
    const Logtail = require("./logtail.js");
    Logtail.run(req, res);

    $HttpContext.get("session").closeDb();
});

app.get('/socket_viewer', function (req, res)
{
    const socketViewer = require("./socket_viewer.js");
    socketViewer.run(req, res);

    $HttpContext.get("session").closeDb();
});

app.get('/log_analyzer', function (req, res)
{
    const logAnalyzer = require("./log_analyzer.js");
    logAnalyzer.run(req, res);

    $HttpContext.get("session").closeDb();
});

app.get('/otp_viewer', function (req, res)
{
    const otpViewer = require("./otp_viewer.js");
    otpViewer.run(req, res);

    $HttpContext.get("session").closeDb();
});

app.get('/public/jsapi.js', function (req, res)
{
    const jsapi = require(path.join(infraRoot, req.path));
    jsapi.run(req, res);

    $HttpContext.get("session").closeDb();
});

app.get('/public/*', function (req, res)
{
    res.sendFile(path.join(infraRoot, req.path));
});

app.get('/restore_password', function (req, res)
{
    const Rp = require("./restore_password.js");
    Rp.run(req, res);

    $HttpContext.get("session").closeDb();
});


app.get('/favicon.ico', function (req, res)
{
    let img = new $Imaging(null, 32, 32, 3, $Config.get("env_bkg_color"), "png");
    let imgIn;

    if (req.query.src == "apiclient")
    {
        imgIn = new $Imaging(null, 10, 26, 3, $Config.get("env_text_color"), "png");
        img.copy(imgIn, 11, 3);
        imgIn = new $Imaging(null, 26, 10, 3, $Config.get("env_text_color"), "png");
        img.copy(imgIn, 3, 11);
    }
    else if (req.query.src == "logtail")
    {
        imgIn = new $Imaging(null, 26, 4, 3, $Config.get("env_text_color"), "png");
        img.copy(imgIn, 3, 6);
        img.copy(imgIn, 3, 14);
        img.copy(imgIn, 3, 22);
    }
    else if (req.query.src == "socket_viewer")
    {
        imgIn = new $Imaging(null, 4, 4, 3, $Config.get("env_text_color"), "png");
        img.copy(imgIn, 18, 10);
        img.copy(imgIn, 7, 10);
        img.copy(imgIn, 14, 20);
    }
    else if (req.query.src == "log_analyzer")
    {
        imgIn = new $Imaging(null, 8, 4, 3, $Config.get("env_text_color"), "png");
        img.copy(imgIn, 3, 6);
        imgIn = new $Imaging(null, 17, 4, 3, $Config.get("env_text_color"), "png");
        img.copy(imgIn, 3, 14);
        imgIn = new $Imaging(null, 26, 4, 3, $Config.get("env_text_color"), "png");
        img.copy(imgIn, 3, 22);
    }
    else if (req.query.src == "otp_viewer")
    {
        img.setPixelsToColor($Config.get("env_text_color"), null, [ [], [],
                                                                    [13, 14, 15, 16, 17, 18],
                                                                    [13, 14, 15, 16, 17, 18],
                                                                    [13, 14, 15, 16, 17, 18],
                                                                    [13, 14, 15, 16, 17, 18],
                                                                    [13, 14, 15, 16, 17, 18],
                                                                    [13, 14, 15, 16, 17, 18],
                                                                    [4, 13, 14, 15, 16, 17, 18, 27],
                                                                    [4, 5, 6, 13, 14, 15, 16, 17, 18, 25, 26, 27],
                                                                    [3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 23, 24, 25, 26, 27, 28],
                                                                    [3, 4, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28],
                                                                    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
                                                                    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
                                                                    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
                                                                    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
                                                                    [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
                                                                    [12, 13, 14, 15, 16, 17, 18, 19],
                                                                    [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                                                                    [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
                                                                    [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
                                                                    [8, 9, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 22, 23],
                                                                    [7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24],
                                                                    [6, 7, 8, 9, 10, 11, 12, 13, 18, 19, 20, 21, 22, 23, 24, 25],
                                                                    [5, 6, 7, 8, 9, 10, 11, 12, 13, 18, 19, 20, 21, 22, 23, 24, 25, 26],
                                                                    [5, 6, 7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24, 25, 26],
                                                                    [6, 7, 8, 9, 10, 11, 20, 21, 22, 23, 24, 25],
                                                                    [7, 8, 9, 10, 11, 20, 21, 22, 23, 24],
                                                                    [8, 9, 10, 21, 22, 23],
                                                                    [10, 21],
                                                                    [], []]);
    }
    else
    {
        imgIn = new $Imaging(null, 16, 16, 3, $Config.get("env_text_color"), "png");
        img.copy(imgIn, 8, 8);
    }

    res.type('png').send(img.getRawData("png"));
});

app.get('/files/n/:filename', $Files.Server.nFileHandler);
app.get('/files/a/:filedata', $Files.Server.aFileHandler);
app.get('/download/:filedata', $Files.Server.downloadHandler);

app.use((req, res, next) =>
{
    res.status(404).send("Page not found");
});
