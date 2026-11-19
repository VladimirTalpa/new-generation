# Mohgs Ticket Bot

Discord recruitment system for **Anime Adventures** and **Anime Crusaders X**.

## Features
- One public recruitment panel: `/panel` (administrator only)
- Game and division selection, requirements confirmation, mandatory Roblox username
- Private screenshot upload (1–5 images, max 10 MB each)
- Separate application review channels and acceptance/rejection logs for each game
- Captain-only private tickets; Accept, Reject, Transfer, Close
- Accept assigns **numbered division role + division member role** without removing existing roles
- Rejection reason and DM notifications
- SQLite application history and text transcripts in logs
- Duplicate active application prevention; 24-hour draft expiration
- Divisions managed directly in `config.js`

## Installation
1. Install **Node.js 20+** and run `npm install`.
2. Copy `.env.example` to `.env` and put your Discord bot token in `DISCORD_TOKEN`. **Never commit the token.**
3. Set all IDs in `config.js`: server, both review channels, both log channels, division captain roles, numbered division roles and member roles. Optionally configure draft and ticket categories.
4. Enable **Message Content Intent** in the Discord Developer Portal.
5. Invite the bot with Manage Channels, Manage Roles, View Channels, Send Messages, Read Message History, Attach Files and slash-command permissions. Its highest role must be above the roles it assigns.
6. Run `npm start`, then use `/panel` in the public recruitment channel.

## Hosting
Persist the `data/` directory across deployments; it contains the SQLite database and screenshots. This is particularly important on Railway, where ephemeral storage is not durable.

## Testing
This is the initial implementation and has not yet been tested against a live Discord server. Before production, verify permissions, screenshot upload, captain access, acceptance, rejection, transfers, and logging. Configure actual channel/role IDs first.
