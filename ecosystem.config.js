module.exports = {
  apps : [
    {
      name   : "doseon_staging",
      script: __dirname + "/backend/api/server.js",
      // Specify which folder to watch
//      watch: ["backend/platform/api", "backend/platform/config"],
      // Specify delay between watch interval
      watch_delay: 1000,
      // Specify which folder to ignore 
      ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
    },
//     {
//       name   : "doseon_files_staging",
//       script: __dirname + "/backend/api/files.js",
//       // Specify which folder to watch
// //      watch: ["backend/platform/api", "backend/platform/config"],
//       // Specify delay between watch interval
//       watch_delay: 1000,
//       // Specify which folder to ignore 
//       ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
//     },
    {
      name   : "doseon_cron_remove_logs_staging",
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
