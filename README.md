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
This is able to be deployed on any system where NPM is able to be installed.

## Requirements:
Linux VM (Previously Required Docker, but this has been extracted from there)

Obtain Discord Token
Go to the Discord Developer portal: https://discord.com/developers/applications
Click 'New Application' and give it a name.
Open the newly created app, select 'Bot' in the sidebar and add a bot to the application.
Disable 'Public Bot'.
Enable 'Message Content Intent'.
Click 'Reset Token'.
Copy the token and save it for later use in the config.json file.
Inviting the Bot
Click on 'OAuth2' in the sidebar and then on 'General'.
Click on the 'Copy' button to copy the client ID, save it.
Open the following URL to invite the bot, insert your client ID: https://discord.com/oauth2/authorize?client_id=<YOUR CLIENT ID>&permissions=35840&scope=bot
The bot should now appear on your Discord server, showing as offline.
Build and Push Docker Image
Set the SWNDB_IMAGE environment variable and build the image:

export SWNDB_IMAGE=<your-repository>:<your-tag>
bash build.sh
Setup Folders and Configs
mkdir -p /opt/swndb/config && mkdir -p /opt/swndb/data
nano /opt/swndb/config/config.json
Paste the following to config.json, replacing the token with the previously obtained Discord bot token:

{
  "token": "<token obtained from Discord dev portal>",
  "admins": []
}
Run Docker Image
Use docker compose to start the container:

docker compose -p swndb up -d
Your bot should now be online.

Admin Setup
Once the bot is online, send the following private message to the bot to obtain your ID:

@<BOTNAME> id
Open config.json and add the ID as a string to the admin list as follows:

{
  "token": "<token obtained from Discord dev portal>",
  "admins": ["<YOUR ID>"]
}
Restart the container.

Quick Start
@<BOTNAME> monitor while attaching the ArmA3 modset html.
@<BOTNAME> notify #<yourchannel> @<youruser> so the bot notifies you on the given channel.
@<BOTNAME> info to check if the mods are parsed and notifications are set.
Problems for Future Brian (To Do)
Support for other Steam Workshop enabled games
Make ArmA 3 SPOTREP notifications optional
Use an actual database instead of abusing JSON files
Reduce code duplication between manager modules
Multiple sets of workshop items per server
Distributed agents for checking Steam Workshop to increase frequency of checks and prevent rate limiting.
