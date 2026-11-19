const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,ModalBuilder,TextInputBuilder,TextInputStyle}=require('discord.js');
const PAGE=10;
module.exports=({client,cfg,db})=>{
 const all=Object.entries(cfg.games).flatMap(([gameKey,g])=>Object.entries(g.divisions).map(([divisionKey,d])=>({gameKey,divisionKey,g,d})));
 db.exec('CREATE TABLE IF NOT EXISTS guild_member_profiles (guild_id TEXT NOT NULL, game TEXT NOT NULL, user_id TEXT NOT NULL, roblox_username TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(guild_id,game,user_id))');
 const profile=db.prepare('SELECT roblox_username FROM guild_member_profiles WHERE guild_id=? AND game=? AND user_id=?');
 const saveProfile=db.prepare('INSERT INTO guild_member_profiles(guild_id,game,user_id,roblox_username,updated_by,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(guild_id,game,user_id) DO UPDATE SET roblox_username=excluded.roblox_username,updated_by=excluded.updated_by,updated_at=excluded.updated_at');
 const roblox=(guildId,e,userId)=>profile.get(guildId,e.gameKey,userId)?.roblox_username||db.prepare("SELECT username FROM applications WHERE user_id=? AND game=? AND status='accepted' ORDER BY id DESC LIMIT 1").get(userId,e.gameKey)?.username||null;
 const roles=i=>i.member?.roles?.cache;
 const rosterState=new Map();
 const pendingRemovals=new Map();
 const ROSTER_TTL=5*60*1000;
 const ensureRoster=async(guild,force=false)=>{
   const now=Date.now();let state=rosterState.get(guild.id);
   if(state?.promise)return state.promise;
   if(!force&&state?.loadedAt&&now-state.loadedAt<ROSTER_TTL)return;
   // Gateway opcode 8 (Request Guild Members) is heavily rate limited.
   // Reuse the existing cache and never bulk-fetch for page navigation.
   const promise=guild.members.fetch({withPresences:false}).then(()=>{rosterState.set(guild.id,{loadedAt:Date.now()});}).catch(err=>{
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
 const uniqueEntries=i=>{
   const found=entries(i);
   const seen=new Set();
   return found.filter(e=>{if(seen.has(e.d.divisionRoleId))return false;seen.add(e.d.divisionRoleId);return true;});
 };
 const find=(g,d)=>all.find(e=>e.gameKey===g&&e.divisionKey===d);
 const key=e=>e.gameKey+':'+e.divisionKey;
 const divisionMembers=async(i,e)=>{
   return [...i.guild.members.cache.values()].filter(m=>!m.user.bot&&m.roles.cache.has(e.d.divisionRoleId)).sort((a,b)=>a.displayName.localeCompare(b.displayName));
 };
 const nav=(e,page,total)=>new ActionRowBuilder().addComponents(
   new ButtonBuilder().setCustomId('mg:page:'+key(e)+':'+Math.max(0,page-1)).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page===0),
   new ButtonBuilder().setCustomId('mg:page:'+key(e)+':'+Math.max(0,Math.min(Math.ceil(total/PAGE)-1,page+1))).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled((page+1)*PAGE>=total),
   new ButtonBuilder().setCustomId('mg:refresh:'+key(e)+':'+page).setLabel('Refresh').setStyle(ButtonStyle.Secondary)
 );
 const render=async(i,e,page=0)=>{
   const members=await divisionMembers(i,e);page=Math.min(Math.max(0,page),Math.max(0,Math.ceil(members.length/PAGE)-1));
   const shown=members.slice(page*PAGE,(page+1)*PAGE);
   const embed=new EmbedBuilder().setColor(0x9872e7).setTitle('✦ MOHGS | Division Management').setDescription('**'+e.g.name+' — '+e.d.name+'**\n\n'+(shown.length?shown.map((m,j)=>'**'+(page*PAGE+j+1)+'.** <@'+m.id+'> • `'+m.id+'`\nRoblox: **'+(roblox(i.guild.id,e,m.id)||'Not set')+'**').join('\n'):'No members with this division role.')).addFields({name:'Members',value:String(members.length),inline:true},{name:'Page',value:(page+1)+' / '+Math.max(1,Math.ceil(members.length/PAGE)),inline:true}).setFooter({text:'Remove Division opens a confirmation. Discord server kick is never used.'});
   const components=[nav(e,page,members.length)];
   if(shown.length)components.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('mg:select:'+key(e)+':'+page).setPlaceholder('Select a member to manage').addOptions(shown.map(m=>({label:m.displayName.slice(0,75),description:m.id,value:m.id})))));
   return {content:'',embeds:[embed],components,allowedMentions:{parse:[]}};
 };
 async function handle(i){
   if(i.isChatInputCommand()&&i.commandName==='manageguild'){
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
     const other=Object.values(e.g.divisions).some(d=>d.divisionRoleId!==e.d.divisionRoleId&&member.roles.cache.has(d.divisionRoleId));
     let sharedRemoved=false;
     if(!other&&e.d.memberRoleId&&member.roles.cache.has(e.d.memberRoleId)){
       const common=await i.guild.roles.fetch(e.d.memberRoleId).catch(()=>null);
       if(common?.editable){await member.roles.remove(e.d.memberRoleId,'No remaining division membership');sharedRemoved=true;}
     }
     const username=roblox(i.guild.id,e,id)||'Not recorded';
     let dmSent=false;
     try{await member.send({embeds:[new EmbedBuilder().setColor(0xe45468).setTitle('MOHGS | Division Removal Notice').setDescription('You have been removed from **'+e.d.name+'** in **'+e.g.name+'**.').addFields({name:'Roblox Username',value:username},{name:'Reason',value:reason}).setTimestamp()]});dmSent=true;}catch(err){console.warn('Unable to DM removed member',id,err.message);}
     let logged=false;
     try{
       const log=await client.channels.fetch(e.g.logsChannelId);
       await log.send({embeds:[new EmbedBuilder().setColor(0xe45468).setTitle('✦ Division Member Removed').addFields({name:'Member',value:'<@'+id+'> (\\`'+id+'\\`)'},{name:'Roblox username',value:username},{name:'Game / Division',value:e.g.name+' / '+e.d.name},{name:'Reason',value:reason},{name:'Removed by',value:'<@'+i.user.id+'> (\\`'+i.user.id+'\\`)'},{name:'Roles',value:'Division role removed'+(sharedRemoved?' • Shared member role removed':'')},{name:'DM notification',value:dmSent?'Sent':'Not delivered'}).setTimestamp()],allowedMentions:{parse:[]}});logged=true;
     }catch(err){console.error('Removal log failed',err);}
     return i.editReply({content:'Removed <@'+id+'> from **'+e.d.name+'**.\\nReason: '+reason+'\\nDM: '+(dmSent?'Sent':'Could not deliver')+' • Log: '+(logged?'Saved':'Failed'),components:[],allowedMentions:{parse:[]}});
   }
   const [g,d]=[parts[2],parts[3]],e=find(g,d);
   if(!e||!permitted(i,e))return i.reply({content:'Access denied for this division.',ephemeral:true});
   if(action==='page'||action==='refresh'){await i.deferUpdate();if(action==='refresh')await ensureRoster(i.guild);const payload=await render(i,e,Number(parts[4])||0);return i.editReply(payload);}
   if(action==='select'){
     const id=i.values[0],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member||!member.roles.cache.has(e.d.divisionRoleId))return i.reply({content:'This member is no longer in the division.',ephemeral:true});
     return i.reply({content:'**Manage division member**\\nMember: <@'+id+'>\\nRoblox: **'+(roblox(i.guild.id,e,id)||'Not set')+'**\\nDivision: **'+e.d.name+'**',components:[new ActionRowBuilder().addComponents(
       new ButtonBuilder().setCustomId('mg:nickname:'+key(e)+':'+id).setLabel('Set Roblox Username').setStyle(ButtonStyle.Primary),
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
     return i.reply({content:'**Confirm division removal**\\nMember: <@'+id+'>\\nRoblox: **'+(roblox(i.guild.id,e,id)||'Not recorded')+'**\\nDivision: **'+e.d.name+'**\\nReason: **'+reason+'**\\n\\nThis removes their division role, not their Discord server membership. A DM notification will be attempted.',components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mg:confirm:'+token).setLabel('Confirm Removal').setStyle(ButtonStyle.Danger),new ButtonBuilder().setCustomId('mg:cancel:'+key(e)+':'+id).setLabel('Cancel').setStyle(ButtonStyle.Secondary))],ephemeral:true,allowedMentions:{parse:[]}});
   }
   if(action==='cancel')return i.update({content:'Removal cancelled.',components:[]});
   return false;
 }
 return {handle};
};
