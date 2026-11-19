// Replace these placeholders with your Discord IDs. Add divisions here, not via commands.
module.exports = {
  guildId: 'GUILD_ID',
  draftCategoryId: '',
  ticketCategoryId: '',
  games: {
    animeAdventures: {
      name: 'Anime Adventures',
      reviewChannelId: 'AA_REVIEW_CHANNEL',
      logsChannelId: 'AA_LOG_CHANNEL',
      divisions: {
        zero: { name: 'Division Zero', requirementsUrl: '', captainRoleId: 'AA_ZERO_CAPTAIN_ROLE', divisionRoleId: 'AA_ZERO_DIVISION_ROLE', memberRoleId: 'AA_MEMBER_ROLE' }
      }
    },
    animeCrusadersX: {
      name: 'Anime Crusaders X',
      reviewChannelId: 'ACX_REVIEW_CHANNEL',
      logsChannelId: 'ACX_LOG_CHANNEL',
      divisions: {
        one: { name: 'Division One', requirementsUrl: '', captainRoleId: 'ACX_ONE_CAPTAIN_ROLE', divisionRoleId: 'ACX_ONE_DIVISION_ROLE', memberRoleId: 'ACX_MEMBER_ROLE' }
      }
    }
  }
};
