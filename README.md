# anti-scam-ocr
A Discord bot that uses Tesseract to detect and block scam messages containing images with text. 

### Using Docker Compose
Create a `docker-compose.yml` file with the following content:

```yaml
version: "3.8"

services:
  anti-scam-ocr:
    image: ghcr.io/saeraphinx/anti-scam-ocr:latest
    container_name: anti-scam-ocr
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN: "your-discord-bot-token"
      - ALLOWED_CHANNELS: "1234,5678"
      - DISALLOWED_CHANNELS: "1234,5678"
      - IS_WHITELIST: "true"
      - BANNED_WORDS: "crypto casino,special promo code,withdrawl successful,free gift"
      - LOG_CHANNEL: "optional-log-channel-id"
      - SHOULD_DELETE: "true"
      - SHOULD_PUNISH: "false"
      - TIMEOUT_DURATION: "7d"
      - SCAN_EVERYTHING: "true"
      - TRIGGERS_BEFORE_ACTION: "1"
```

## Environment Variables

### Example `.env` file

```sh
# Discord bot token
DISCORD_TOKEN=""
# comma separated list of allowed channel IDs
ALLOWED_CHANNELS=""
# comma separated list of disallowed channel IDs
DISALLOWED_CHANNELS=""
# whether to use the allowed channels or disallowed channels variable
IS_WHITELIST="true"
# comma separated list of banned words/phrases, not case sensitive. Recommended to have a few words/phrases instead of just one to reduce false positives
BANNED_WORDS="crypto casino,special promo code,withdrawl successful,free gift"
# channel ID for logging detected messages
LOG_CHANNEL=""
# whether to delete messages containing banned words
SHOULD_DELETE="true"
# whether to punish users for sending banned words (timeout duration)
SHOULD_PUNISH="true"
# duration of timeout for users who send banned words (see ms library for format)
TIMEOUT_DURATION="7d"
# whether to scan messages from all users, including bots & users that the bot cannot moderate
SCAN_EVERYTHING="true"
# number of triggers before punishment action is taken (timeout/deletion)
TRIGGERS_BEFORE_ACTION="1"

```
