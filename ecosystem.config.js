module.exports = {
  apps : [
    {
      name   : "infrajs",
      script: __dirname + "/backend/api/server.js",
      // Specify which folder to watch
//      watch: ["backend/platform/api", "backend/platform/config"],
      // Specify delay between watch interval
      watch_delay: 1000,
      // Specify which folder to ignore 
      ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
    },
    {
      name   : "infrajs_files",
      script: __dirname + "/backend/api/files.js",
      // Specify which folder to watch
//      watch: ["backend/platform/api", "backend/platform/config"],
      // Specify delay between watch interval
      watch_delay: 1000,
      // Specify which folder to ignore 
      ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
    },
    {
      name   : "infrajs_cron_remove_logs",
      script: __dirname + "/backend/platform/jobs/cron_remove_logs.js",
      // Specify which folder to watch
//      watch: ["backend/platform/api", "backend/platform/config"],
      // Specify delay between watch interval
      watch_delay: 1000,
      // Specify which folder to ignore 
      ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
    }
  ]
}
