module.exports = {

    SYSTEM_TIME_ZONE                                        : "UTC",

    LL_REQUEST                                              : 0x01,
    LL_RESPONSE                                             : 0x02,
    LL_ERROR                                                : 0x04,
    LL_WARNING                                              : 0x08,
    LL_INFO                                                 : 0x10,
    LL_DEBUG                                                : 0x20,
    LL_PROJECT                                              : 0x40,

    USER_STATUS_INACTIVE                                    : 0,
    USER_STATUS_ACTIVE                                      : 1,

    STATUS_NOT_DELETED                                      : 0,
    STATUS_DELETED                                          : 1,

    USER_LOGIN_AUTHORITY_EMAIL                              : 1,
    USER_LOGIN_AUTHORITY_FACEBOOK                           : 2,
    USER_LOGIN_AUTHORITY_GOOGLE                             : 3,
    USER_LOGIN_AUTHORITY_APPLE                              : 4,
    USER_LOGIN_AUTHORITY_OTP                                : 6,

    OTP_TYPE_PHONE                                          : "PHONE",
    OTP_TYPE_EMAIL                                          : "EMAIL",
    OTP_TYPE_PASSWORD                                       : "PASSWORD",

    EMAIL_TEMPLATE_FORGOT_PASSWORD			                : "forgot password",
    EMAIL_TEMPLATE_OTP_VERIFICATION			                : "otp verification",

    DATE_NULL                                               : "0000-00-00 00:00:00",
    S3_MIN_UPLOAD_PART_SIZE                                 : 5242880, // 5Mb

    ASYNC_API_SHORT_TIMEOUT_MS                              : 200,
    ASYNC_API_LONG_TIMEOUT_MS                               : 2000,
    DB_CONNECTION_TIMEOUT_MS                                : 5000,

    UPLOAD_FILE_FLAG_NONE                                   : 0,
    UPLOAD_FILE_FLAG_SAVE_TO_TEMP_FOLDER                    : 1,

    MAX_MAILER_QUEUE_TRIALS                                 : 2,

    LOG_INTERNAL_STATUS_LOGGED                              : 1,
    LOG_INTERNAL_STATUS_ERROR                               : 2,
    LOG_INTERNAL_STATUS_CRASH                               : 3,
    LOG_INTERNAL_STATUS_REPORTED_CRASH                      : 4,
    LOG_INTERNAL_STATUS_REPORTED_ERROR                      : 5,

    FILE_TYPE_PATH_FILE                                     : "files",
    FILE_TYPE_PATH_MULTIPART_TEMP                           : "multipart_temp",

    FILE_ACCESS_LEVEL_PUBLIC                                : "public", // public access
    FILE_ACCESS_LEVEL_PROTECTED                             : "protected", // authed users
    FILE_ACCESS_LEVEL_LIMITED                               : "limited", // authed users with timeout
    FILE_ACCESS_LEVEL_PRIVATE                               : "private", // only owner with timeout

    KVS_SYSTEM_ERROR_REPORT                                 : "system_error_report",

    SRVID_PM2                                               : "PM2",

    MQID_NO_QUEUE                                           : 0,
    MQID_BULK_ACTION                                        : 1,

    KVL_API_VERSION                                         : "API VERSION",

};
