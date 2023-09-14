# Steam Workshop Notifications Discord Bot (SWNDB)

A Discord bot which monitors the Steam Workshop and notifies users on Discord when a workshop item has updated. Currently, only supports ArmA 3.

## Features
- Steam Workshop update notifications (ArmA 3 only), including the changelog
- ArmA 3 SPOTREP notifications, including the changelog
- Supports multiple Discord servers, monitors one set of workshop items per server
- Notifications on multiple channels, optionally notifying multiple users
## Commands
All commands must be prefixed with the bots name using Discord's mentions.


```@<BOTNAME> id``` returns the Discord ID of the user. Private message allowed.

```@<BOTNAME> info```general info about how many mods are monitored, and who is notified where.

```@<BOTNAME> logs``` outputs the log files. Private message allowed.

```@<BOTNAME> monitor``` expects an ArmA3 modset HTML to be attached, determines the mods that should be monitored.

```@<BOTNAME> notify #<channel1> #<channel2> ... [@<user1> @<user2> ...] [#<role1> #<role2> ...] ``` sets the users to be notified and the channels on which the bot outputs, multiple users and multiple channels allowed. Users and roles are optional. The order of channels, users and roles should not matter.

```@<BOTNAME>``` disable disables the bot completely.

```@<BOTNAME> version``` returns the version of the bot. Private message allowed.


## Installation
The following script will install the application on any Linux system. Please follow the steps below to acquire your Discord Token and invite your Bot to your server before attempting to run the included script.

### Obtain Discord Token:
- Go to the Discord Developer portal: https://discord.com/developers/applications
- Click 'New Application' and give it a name.
- Open the newly created app, select 'Bot' in the sidebar and add a bot to the application.
- Disable 'Public Bot'. (You may need to leave this as public if you are not an admin on the server you are trying to add the bot. Someone with appropriate permissions can also do the invite using the URL under ***Inviting the Bot***
- Enable 'Message Content Intent'.
- Click 'Reset Token'.
- Copy the token and save it for later use in the config.json file.

### Inviting the Bot:
- Click on 'OAuth2' in the sidebar and then on 'General'.
- Click on the 'Copy' button to copy the client ID, save it.
- Open the following URL to invite the bot, insert your client ID: ```https://discord.com/oauth2/authorize?client_id=<YOUR CLIENT ID>&permissions=35840&scope=bot```
- The bot should now appear on your Discord server, showing as offline.

### Run the Install Script:
- Download the installation script from the releases (You can use CURL or WGET with the direct URL to easily grab it from the Linux CLI)
- Run the following command to allow the script to execute: ```chmod +x Install_Bot.sh```
- Run the following command to install ```sudo ./Install_Bot.sh```

### Quick Start:
- ```@<BOTNAME> monitor``` while attaching the ArmA3 modset html.
- ```@<BOTNAME> notify #<yourchannel> @<youruser>``` so the bot notifies you on the given channel.
- ```@<BOTNAME> info``` to check if the mods are parsed and notifications are set.


## Future Enhancements:
- Make ArmA 3 SPOTREP notifications optional
- Use an actual database instead of abusing JSON files
- Reduce code duplication between manager modules
- Distributed agents for checking Steam Workshop to increase frequency of checks and prevent rate limiting.
- Containerize this again in Docker? (If there is interest)

## Acknowledgements
I would like to thank the original author of the steam-workshop-notifications-discord-bot, [Br-ian](https://github.com/Br-ian), for laying the foundation for which I was able to build on.
