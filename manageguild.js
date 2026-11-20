const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,ModalBuilder,TextInputBuilder,TextInputStyle}=require('discord.js');
const {normalizeTimezone}=require('./timezone');
const PAGE=10;
module.exports=({client,cfg,db})=>{
 const all=Object.entries(cfg.games).flatMap(([gameKey,g])=>Object.entries(g.divisions).map(([divisionKey,d])=>({gameKey,divisionKey,g,d})));
 db.exec('CREATE TABLE IF NOT EXISTS guild_member_profiles (guild_id TEXT NOT NULL, game TEXT NOT NULL, user_id TEXT NOT NULL, roblox_username TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(guild_id,game,user_id))');
 const columns=db.prepare('PRAGMA table_info(guild_member_profiles)').all().map(c=>c.name);
 if(!columns.includes('timezone'))db.exec('ALTER TABLE guild_member_profiles ADD COLUMN timezone TEXT');
 const profile=db.prepare('SELECT roblox_username,timezone FROM guild_member_profiles WHERE guild_id=? AND game=? AND user_id=?');
 const saveTimezone=db.prepare('INSERT INTO guild_member_profiles(guild_id,game,user_id,roblox_username,updated_by,updated_at,timezone) VALUES(?,?,?,?,?,?,?) ON CONFLICT(guild_id,game,user_id) DO UPDATE SET timezone=excluded.timezone,updated_by=excluded.updated_by,updated_at=excluded.updated_at');
 const timezone=(guildId,e,userId)=>profile.get(guildId,e.gameKey,userId)?.timezone||db.prepare("SELECT timezone FROM applications WHERE user_id=? AND game=? AND status='accepted' AND timezone IS NOT NULL ORDER BY id DESC LIMIT 1").get(userId,e.gameKey)?.timezone||null;
 const saveProfile=db.prepare('INSERT INTO guild_member_profiles(guild_id,game,user_id,roblox_username,updated_by,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(guild_id,game,user_id) DO UPDATE SET roblox_username=excluded.roblox_username,updated_by=excluded.updated_by,updated_at=excluded.updated_at');
 const roblox=(guildId,e,userId)=>profile.get(guildId,e.gameKey,userId)?.roblox_username||db.prepare("SELECT username FROM applications WHERE user_id=? AND game=? AND status='accepted' ORDER BY id DESC LIMIT 1").get(userId,e.gameKey)?.username||null;
 const roles=i=>i.member?.roles?.cache;
 const rosterState=new Map();
 const pendingRemovals=new Map();
 const ROSTER_TTL=60*1000;
 const ensureRoster=async(guild,force=false)=>{
   const now=Date.now();let state=rosterState.get(guild.id);
   if(state?.promise)return state.promise;
   if(!force&&state?.loadedAt&&now-state.loadedAt<ROSTER_TTL)return;
   // Gateway opcode 8 (Request Guild Members) is heavily rate limited.
   // Reuse the existing cache and never bulk-fetch for page navigation.
   const promise=guild.members.fetch({withPresences:false,force:true}).then(()=>{rosterState.set(guild.id,{loadedAt:Date.now()});}).catch(err=>{
     rosterState.set(guild.id,{loadedAt:Date.now()});
     console.warn('Guild roster refresh failed; using cached members:',err.message);
   });
   rosterState.set(guild.id,{loadedAt:state?.loadedAt||0,promise});
   return promise;
 };

 const permitted=(i,entry)=>{
   const r=roles(i);if(!r)return false;
   const staff=r.has(entry.d.captainRoleId)||r.has(entry.d.officerRoleId);
   return staff&&r.has(entry.d.divisionRoleId);
 };
 const entries=i=>all.filter(e=>permitted(i,e));
 const uniqueEntries=i=>entries(i);
 const find=(g,d)=>all.find(e=>e.gameKey===g&&e.divisionKey===d);
 const key=e=>e.gameKey+':'+e.divisionKey;
 const divisionMembers=async(i,e)=>{
   await ensureRoster(i.guild);
   return [...i.guild.members.cache.values()].filter(m=>!m.user.bot&&m.roles.cache.has(e.d.divisionRoleId)).sort((a,b)=>a.displayName.localeCompare(b.displayName));
 };
 const nav=(e,page,total)=>new ActionRowBuilder().addComponents(
   new ButtonBuilder().setCustomId('mg:page:'+key(e)+':'+Math.max(0,page-1)+':prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page===0),
   new ButtonBuilder().setCustomId('mg:page:'+key(e)+':'+Math.max(0,Math.min(Math.ceil(total/PAGE)-1,page+1))+':next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled((page+1)*PAGE>=total),
   new ButtonBuilder().setCustomId('mg:refresh:'+key(e)+':'+page).setLabel('Refresh').setStyle(ButtonStyle.Secondary)
 );
 const render=async(i,e,page=0)=>{
   const members=await divisionMembers(i,e);
   const totalPages=Math.max(1,Math.ceil(members.length/PAGE));
   page=Math.min(Math.max(0,page),totalPages-1);
   const shown=members.slice(page*PAGE,(page+1)*PAGE);
   const missing=members.filter(m=>!roblox(i.guild.id,e,m.id)).length;
   const lines=shown.map((m,j)=>{
     const username=roblox(i.guild.id,e,m.id);
     return '**'+String(page*PAGE+j+1).padStart(2,'0')+'.** <@'+m.id+'>  ·  '+(username?String.fromCharCode(96)+username+String.fromCharCode(96):'*Roblox not set*')+'  ·  '+(timezone(i.guild.id,e,m.id)||'GMT ?');
   });
   const embed=new EmbedBuilder()
     .setColor(0x9872e7)
     .setAuthor({name:'MOHGS  •  GUILD MANAGEMENT'})
     .setTitle(e.d.name)
     .setDescription('**'+e.g.name+'**'+String.fromCharCode(10,10)+(lines.length?lines.join(String.fromCharCode(10)):'*No members found with this division role.*'))
     .addFields(
       {name:'Members',value:String(members.length),inline:true},
       {name:'Roblox missing',value:String(missing),inline:true},
       {name:'Page',value:(page+1)+' / '+totalPages,inline:true}
     )
     .setFooter({text:'Hosted by Daenerys'});
   const components=[nav(e,page,members.length)];
   if(shown.length)components.push(new ActionRowBuilder().addComponents(
     new StringSelectMenuBuilder()
       .setCustomId('mg:select:'+key(e)+':'+page)
       .setPlaceholder('Manage a member  •  '+shown.length+' shown')
       .addOptions(shown.map(m=>{
         const username=roblox(i.guild.id,e,m.id);
         return {label:m.displayName.slice(0,75),description:((username?'Roblox: '+username:'Roblox not set')+' • '+(timezone(i.guild.id,e,m.id)||'GMT not set')).slice(0,100),value:m.id};
       }))
   ));
   return {content:'',embeds:[embed],attachments:[],components,allowedMentions:{parse:[]}};
 };
 async function selfProfile(i){
   const memberships=all.filter(e=>i.member?.roles?.cache?.has(e.d.divisionRoleId));
   if(!memberships.length)return i.reply({content:'You must have a division role to update your guild profile.',ephemeral:true});
   const games=[...new Set(memberships.map(e=>e.gameKey))];
   const requested=i.options.getString('game');
   const selected=requested?[requested]:games;
   if(selected.some(g=>!games.includes(g)))return i.reply({content:'You do not belong to a division in that game.',ephemeral:true});
   const input=i.options.getString(i.commandName==='guildsetroblox'?'username':'timezone',true).trim();
   if(i.commandName==='guildsetroblox'&&!/^[a-zA-Z0-9_]{3,20}$/.test(input))return i.reply({content:'Roblox usernames must contain 3–20 letters, numbers or underscores.',ephemeral:true});
   const value=i.commandName==='guildsettimezone'?normalizeTimezone(input):input;
   if(!value)return i.reply({content:'Invalid timezone. Examples: GMT+3, GMT-5, GMT+5:30.',ephemeral:true});
   const save=db.transaction(()=>{
     for(const gameKey of selected){
       const e=memberships.find(x=>x.gameKey===gameKey);
       const old=profile.get(i.guild.id,gameKey,i.user.id);
       const username=i.commandName==='guildsetroblox'?value:(old?.roblox_username||roblox(i.guild.id,e,i.user.id)||'Not set');
       const tz=i.commandName==='guildsettimezone'?value:(old?.timezone||timezone(i.guild.id,e,i.user.id));
       db.prepare('INSERT INTO guild_member_profiles(guild_id,game,user_id,roblox_username,updated_by,updated_at,timezone) VALUES(?,?,?,?,?,?,?) ON CONFLICT(guild_id,game,user_id) DO UPDATE SET roblox_username=excluded.roblox_username,timezone=excluded.timezone,updated_by=excluded.updated_by,updated_at=excluded.updated_at').run(i.guild.id,gameKey,i.user.id,username,i.user.id,Date.now(),tz);
     }
   });
   save();
   const destinations=memberships.filter(e=>selected.includes(e.gameKey)).map(e=>e.g.name+' / '+e.d.name);
   return i.reply({content:'Profile updated. '+(i.commandName==='guildsetroblox'?'Roblox: **':'Timezone: **')+value+'**\\nVisible in captain/officer rosters for: '+destinations.join(', '),ephemeral:true});
 }
 async function handle(i){
   if(i.isChatInputCommand()&&['guildsetroblox','guildsettimezone'].includes(i.commandName))return selfProfile(i);
   if(i.isChatInputCommand()&&i.commandName==='guildmanagement'){
     await i.deferReply({ephemeral:true});const allowed=uniqueEntries(i);if(!allowed.length)return i.editReply({content:'Access denied: you need a captain/officer role AND your numbered division role. For a full roster, enable Server Members Intent in Discord Developer Portal.'});
     if(allowed.length===1){await ensureRoster(i.guild);return i.editReply(await render(i,allowed[0]));}
     return i.editReply({content:'You have access to more than one division. Select which one to manage:',components:[new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('mg:division').setPlaceholder('Choose your division').addOptions(allowed.map(e=>({label:(e.g.name+' • '+e.d.name).slice(0,100),value:key(e)}))))],ephemeral:true});
   }
   if(!i.customId?.startsWith('mg:'))return false;
   const parts=i.customId.split(':');const action=parts[1];
   if(action==='division'){
     const [g,d]=i.values[0].split(':');const e=find(g,d);
     if(!e||!permitted(i,e))return i.reply({content:'Access denied.',ephemeral:true});
     await i.deferUpdate();await ensureRoster(i.guild);return i.editReply(await render(i,e));
   }
   if(action==='confirm'){
     const token=parts[2],pending=pendingRemovals.get(token);
     if(!pending||pending.expires<Date.now()||pending.guildId!==i.guild.id||pending.actor!==i.user.id)return i.update({content:'This confirmation has expired. Please start again.',components:[]});
     const e=find(pending.game,pending.division);
     if(!e||!permitted(i,e))return i.update({content:'You no longer have access to this division.',components:[]});
     pendingRemovals.delete(token);
     const id=pending.id,reason=pending.reason;
     await i.deferUpdate();
     const member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member?.roles.cache.has(e.d.divisionRoleId))return i.editReply({content:'Member is no longer in this division.',components:[]});
     if(id===i.user.id)return i.editReply({content:'You cannot remove yourself.',components:[]});
     const role=await i.guild.roles.fetch(e.d.divisionRoleId);
     if(!role?.editable)return i.editReply({content:'Bot cannot manage this division role. Check role hierarchy.',components:[]});
     await member.roles.remove(e.d.divisionRoleId,'Removed by '+i.user.id+'; reason: '+reason.slice(0,300));
     i.guild.members.cache.delete(id);
     await i.guild.members.fetch(id).catch(()=>null);
     const other=Object.values(e.g.divisions).some(d=>d.divisionRoleId!==e.d.divisionRoleId&&member.roles.cache.has(d.divisionRoleId));
     let sharedRemoved=false;
     if(!other&&e.d.memberRoleId&&member.roles.cache.has(e.d.memberRoleId)){
       const common=await i.guild.roles.fetch(e.d.memberRoleId).catch(()=>null);
       if(common?.editable){await member.roles.remove(e.d.memberRoleId,'No remaining division membership');sharedRemoved=true;}
     }
     const username=roblox(i.guild.id,e,id)||'Not recorded';
     let dmSent=false;
     try{await member.send({embeds:[new EmbedBuilder().setColor(0xe45468).setTitle('MOHGS | Division Removal Notice').setDescription('You have been removed from **'+e.d.name+'** in **'+e.g.name+'**.').addFields({name:'Reason',value:reason}).setTimestamp()]});dmSent=true;}catch(err){console.warn('Unable to DM removed member',id,err.message);}
     let logged=false;
     try{
       const log=await client.channels.fetch(e.g.logsChannelId);
       await log.send({embeds:[new EmbedBuilder().setColor(0xe45468).setTitle('✦ Division Member Removed').addFields({name:'Member',value:'<@'+id+'> (`'+id+'`)'},{name:'Roblox username',value:username},{name:'Game / Division',value:e.g.name+' / '+e.d.name},{name:'Reason',value:reason},{name:'Removed by',value:'<@'+i.user.id+'> (`'+i.user.id+'`)'},{name:'Roles',value:'Division role removed'+(sharedRemoved?' • Shared member role removed':'')},{name:'DM notification',value:dmSent?'Sent':'Not delivered'}).setTimestamp()],allowedMentions:{parse:[]}});logged=true;
     }catch(err){console.error('Removal log failed',err);}
     return i.editReply({content:'Removed <@'+id+'> from **'+e.d.name+'**.\nReason: '+reason+'\nDM: '+(dmSent?'Sent':'Could not deliver')+' • Log: '+(logged?'Saved':'Failed'),components:[],allowedMentions:{parse:[]}});
   }
   const [g,d]=[parts[2],parts[3]],e=find(g,d);
   if(!e||!permitted(i,e))return i.reply({content:'Access denied for this division.',ephemeral:true});
   if(action==='page'||action==='refresh'){await i.deferUpdate();if(action==='refresh')await ensureRoster(i.guild,true);const payload=await render(i,e,Number(parts[4])||0);return i.editReply(payload);}
   if(action==='select'){
     const id=i.values[0],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member||!member.roles.cache.has(e.d.divisionRoleId))return i.reply({content:'This member is no longer in the division.',ephemeral:true});
     return i.reply({content:'**Manage division member**\nMember: <@'+id+'>\nRoblox: **'+(roblox(i.guild.id,e,id)||'Not set')+'**\nTimezone: **'+(timezone(i.guild.id,e,id)||'Not set')+'**\nDivision: **'+e.d.name+'**',components:[new ActionRowBuilder().addComponents(
       new ButtonBuilder().setCustomId('mg:nickname:'+key(e)+':'+id).setLabel('Set Roblox Username').setStyle(ButtonStyle.Primary),
       new ButtonBuilder().setCustomId('mg:timezone:'+key(e)+':'+id).setLabel('Set Timezone').setStyle(ButtonStyle.Secondary),
       new ButtonBuilder().setCustomId('mg:remove:'+key(e)+':'+id).setLabel('Remove from Division').setStyle(ButtonStyle.Danger),
       new ButtonBuilder().setCustomId('mg:cancel:'+key(e)+':'+id).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
     )],ephemeral:true,allowedMentions:{parse:[]}});
   }
   if(action==='nickname'){
     const id=parts[4],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member?.roles.cache.has(e.d.divisionRoleId))return i.reply({content:'Member no longer belongs to this division.',ephemeral:true});
     return i.showModal(new ModalBuilder().setCustomId('mg:save:'+key(e)+':'+id).setTitle('Set Roblox Username').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('username').setLabel('Roblox username').setStyle(TextInputStyle.Short).setMinLength(3).setMaxLength(20).setRequired(true).setValue((roblox(i.guild.id,e,id)||'').slice(0,20)))));
   }
   if(action==='save'){
     const id=parts[4],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member?.roles.cache.has(e.d.divisionRoleId))return i.reply({content:'Member no longer belongs to this division.',ephemeral:true});
     const username=i.fields.getTextInputValue('username').trim();
     if(!/^[A-Za-z0-9_]{3,20}$/.test(username))return i.reply({content:'Invalid Roblox username. Use 3–20 letters, numbers or underscores.',ephemeral:true});
     saveProfile.run(i.guild.id,e.gameKey,id,username,i.user.id,Date.now());
     return i.reply({content:'Saved Roblox username **'+username+'** for <@'+id+'>. Use Refresh to see the change in the roster.',ephemeral:true,allowedMentions:{parse:[]}});
   }
   if(action==='timezone'){
     const id=parts[4],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member?.roles.cache.has(e.d.divisionRoleId))return i.reply({content:'Member no longer belongs to this division.',ephemeral:true});
     const field=new TextInputBuilder().setCustomId('timezone').setLabel('Timezone (example: GMT+3)').setPlaceholder('GMT+3').setStyle(TextInputStyle.Short).setMinLength(4).setMaxLength(9).setRequired(true);
     const current=timezone(i.guild.id,e,id);if(current)field.setValue(current);
     return i.showModal(new ModalBuilder().setCustomId('mg:savetz:'+key(e)+':'+id).setTitle('Set Member Timezone').addComponents(new ActionRowBuilder().addComponents(field)));
   }
   if(action==='savetz'){
     const id=parts[4],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member?.roles.cache.has(e.d.divisionRoleId))return i.reply({content:'Member no longer belongs to this division.',ephemeral:true});
     const tz=normalizeTimezone(i.fields.getTextInputValue('timezone'));
     if(!tz)return i.reply({content:'Invalid timezone. Example: GMT+3, GMT-5, GMT+5:30. Use an offset from GMT.',ephemeral:true});
     saveTimezone.run(i.guild.id,e.gameKey,id,roblox(i.guild.id,e,id)||'',i.user.id,Date.now(),tz);
     return i.reply({content:'Timezone **'+tz+'** saved for <@'+id+'>. Refresh the roster to see it.',ephemeral:true,allowedMentions:{parse:[]}});
   }
   if(action==='remove'){
     const id=parts[4],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member?.roles.cache.has(e.d.divisionRoleId))return i.reply({content:'Member no longer belongs to this division.',ephemeral:true});
     return i.showModal(new ModalBuilder().setCustomId('mg:reason:'+key(e)+':'+id).setTitle('Reason for Division Removal').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason for removal').setStyle(TextInputStyle.Paragraph).setMinLength(3).setMaxLength(500).setRequired(true))));
   }
   if(action==='reason'){
     const id=parts[4],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member?.roles.cache.has(e.d.divisionRoleId))return i.reply({content:'Member no longer belongs to this division.',ephemeral:true});
     const reason=i.fields.getTextInputValue('reason').trim();
     if(reason.length<3)return i.reply({content:'Please provide a reason.',ephemeral:true});
     const token=Math.random().toString(36).slice(2,10);
     pendingRemovals.set(token,{guildId:i.guild.id,actor:i.user.id,game:e.gameKey,division:e.divisionKey,id,reason,expires:Date.now()+5*60*1000});
     return i.reply({content:'**Confirm division removal**\nMember: <@'+id+'>\nRoblox: **'+(roblox(i.guild.id,e,id)||'Not recorded')+'**\nDivision: **'+e.d.name+'**\nReason: **'+reason+'**\n\nThis removes their division role, not their Discord server membership. A DM notification will be attempted.',components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mg:confirm:'+token).setLabel('Confirm Removal').setStyle(ButtonStyle.Danger),new ButtonBuilder().setCustomId('mg:cancel:'+key(e)+':'+id).setLabel('Cancel').setStyle(ButtonStyle.Secondary))],ephemeral:true,allowedMentions:{parse:[]}});
   }
   if(action==='cancel')return i.update({content:'Removal cancelled.',components:[]});
   return false;
 }
 return {handle};
};
