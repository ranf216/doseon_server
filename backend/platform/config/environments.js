/* To create new environment, add entry of "domain" : "env_name"
 *
 * If accessed domain is found in the array, the config file that will be loaded is
 * env_name.config.js
 *
 * If accessed domain is not found, config.js will be loaded and environment name will be "default"
 * 
 * A stand alone js (cron or other) can define $Const.ENV_DOMAIN after including common.js and before calling Common.init to be used instead of the server domain
 *
 * The name of the environment is displayed in the response of api_ver
 */

module.exports = {

//	"sandbox.starrybyte.com"					: "sandbox",

};
