-- =============================================
-- Settings module - user_settings table
-- =============================================

CREATE TABLE IF NOT EXISTS `user_settings` (
  `UST_USR_ID` varchar(128) NOT NULL COMMENT 'FK to user.USR_ID',
  `UST_NOTIFICATION_SOUND_ID` varchar(50) NOT NULL DEFAULT 'default' COMMENT 'Notification sound identifier',
  `UST_NOTIFICATION_SOUND_VOLUME` int unsigned NOT NULL DEFAULT 80 COMMENT 'Sound volume 0-100',
  `UST_NOTIFICATION_SOUND_REPEAT_TIME` int unsigned NOT NULL DEFAULT 5 COMMENT 'Repeat alert interval in minutes',
  `UST_LANGUAGE` varchar(16) NOT NULL DEFAULT 'en' COMMENT 'User preferred language',
  `UST_CREATED_ON` datetime NOT NULL,
  `UST_LAST_UPDATE` datetime NOT NULL,
  PRIMARY KEY (`UST_USR_ID`),
  CONSTRAINT `FK_UST_USR_ID` FOREIGN KEY (`UST_USR_ID`) REFERENCES `user` (`USR_ID`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
