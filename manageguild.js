const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,PermissionFlagsBits}=require('discord.js');
const PAGE=10;
module.exports=({client,cfg,db})=>{
 const all=Object.entries(cfg.games).flatMap(([gameKey,g])=>Object.entries(g.divisions).map(([divisionKey,d])=>({gameKey,divisionKey,g,d})));
 const admin=i=>i.memberPermissions?.has(PermissionFlagsBits.Administrator);
 const roles=i=>i.member?.roles?.cache;
 const memberRoles=async i=>(await i.guild.members.fetch(i.user.id)).roles.cache;
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
   await i.guild.members.fetch({withPresences:false});
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
   const embed=new EmbedBuilder().setColor(0x9872e7).setTitle('✦ MOHGS | Division Management').setDescription('**'+e.g.name+' — '+e.d.name+'**\n\n'+(shown.length?shown.map((m,j)=>'**'+(page*PAGE+j+1)+'.** <@'+m.id+'> • `'+m.id+'`').join('\n'):'No members with this division role.')).addFields({name:'Members',value:String(members.length),inline:true},{name:'Page',value:(page+1)+' / '+Math.max(1,Math.ceil(members.length/PAGE)),inline:true}).setFooter({text:'Remove Division opens a confirmation. Discord server kick is never used.'});
   const components=[nav(e,page,members.length)];
   if(shown.length)components.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('mg:select:'+key(e)+':'+page).setPlaceholder('Select a member to remove from this division').addOptions(shown.map(m=>({label:m.displayName.slice(0,75),description:m.id,value:m.id})))));
   return {content:'',embeds:[embed],components,allowedMentions:{parse:[]}};
 };
 async function handle(i){
   if(i.isChatInputCommand()&&i.commandName==='manageguild'){
     await i.deferReply({ephemeral:true});await i.guild.members.fetch(i.user.id);const allowed=uniqueEntries(i);if(!allowed.length)return i.editReply({content:'Access denied: you need a captain/officer role AND your numbered division role. For a full roster, enable Server Members Intent in Discord Developer Portal.'});
     if(allowed.length===1)return i.editReply(await render(i,allowed[0]));
     return i.editReply({content:'You have access to more than one division. Select which one to manage:',components:[new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('mg:division').setPlaceholder('Choose your division').addOptions(allowed.map(e=>({label:(e.g.name+' • '+e.d.name).slice(0,100),value:key(e)}))))],ephemeral:true});
   }
   if(!i.customId?.startsWith('mg:'))return false;
   await i.guild.members.fetch(i.user.id);
   const parts=i.customId.split(':');const action=parts[1];
   if(action==='division'){
     const [g,d]=i.values[0].split(':');const e=find(g,d);
     if(!e||!permitted(i,e))return i.reply({content:'Access denied.',ephemeral:true});
     await i.deferUpdate();return i.message.edit(await render(i,e));
   }
   const [g,d]=[parts[2],parts[3]],e=find(g,d);
   if(!e||!permitted(i,e))return i.reply({content:'Access denied for this division.',ephemeral:true});
   if(action==='page'||action==='refresh'){await i.deferUpdate();const payload=await render(i,e,Number(parts[4])||0);return i.message.edit(payload);}
   if(action==='select'){
     const id=i.values[0],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member||!member.roles.cache.has(e.d.divisionRoleId))return i.reply({content:'This member is no longer in the division.',ephemeral:true});
     return i.reply({content:'**Confirm division removal**\nMember: <@'+id+'> (`'+id+'`)\nDivision: **'+e.d.name+'**\n\nThis removes the numbered division role and, if the member has no other divisions in this game, the game membership role. The user will NOT be kicked from Discord.',components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mg:confirm:'+key(e)+':'+id).setLabel('Confirm Removal').setStyle(ButtonStyle.Danger),new ButtonBuilder().setCustomId('mg:cancel:'+key(e)+':'+id).setLabel('Cancel').setStyle(ButtonStyle.Secondary))],ephemeral:true,allowedMentions:{parse:[]}});
   }
   if(action==='cancel')return i.update({content:'Removal cancelled.',components:[]});
   if(action==='confirm'){
     const id=parts[4],member=await i.guild.members.fetch(id).catch(()=>null);
     if(!member||!member.roles.cache.has(e.d.divisionRoleId))return i.update({content:'Member is no longer in this division.',components:[]});
     if(id===i.user.id)return i.update({content:'You cannot remove yourself.',components:[]});
     const role=await i.guild.roles.fetch(e.d.divisionRoleId);
     if(!role||!role.editable)return i.update({content:'Bot cannot manage this division role. Check role hierarchy.',components:[]});
     await i.deferUpdate();
     await member.roles.remove(e.d.divisionRoleId,'Division removal by '+i.user.id);
     const other=Object.values(e.g.divisions).some(d=>d.divisionRoleId!==e.d.divisionRoleId&&member.roles.cache.has(d.divisionRoleId));
     let sharedRemoved=false;
     if(!other&&e.d.memberRoleId&&member.roles.cache.has(e.d.memberRoleId)){
       const common=await i.guild.roles.fetch(e.d.memberRoleId).catch(()=>null);
       if(common?.editable){await member.roles.remove(e.d.memberRoleId,'No remaining division membership');sharedRemoved=true;}
     }
     const record=db.prepare("SELECT username FROM applications WHERE user_id=? AND game=? AND status='accepted' ORDER BY id DESC LIMIT 1").get(id,e.gameKey);
     const log=await client.channels.fetch(e.g.logsChannelId);
     const embed=new EmbedBuilder().setColor(0xe45468).setTitle('✦ Division Member Removed').addFields(
       {name:'Member',value:'<@'+id+'> (`'+id+'`)'},{name:'Roblox username',value:record?.username||'Not recorded'},
       {name:'Game / Division',value:e.g.name+' / '+e.d.name},
       {name:'Removed by',value:'<@'+i.user.id+'> (`'+i.user.id+'`)'},
       {name:'Roles',value:'Division role removed'+(sharedRemoved?' • Shared game member role removed':'')}
     ).setTimestamp();
     await log.send({embeds:[embed],allowedMentions:{parse:[]}});
     return i.editReply({content:'Removed <@'+id+'> from **'+e.d.name+'**. Action logged.',components:[],allowedMentions:{parse:[]}});
   }
   return false;
 }
 return {handle};
};
