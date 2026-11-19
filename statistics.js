const {EmbedBuilder,AttachmentBuilder}=require('discord.js');
const sharp=require('sharp');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=(rows,status)=>rows.filter(r=>r.status===status).length;
const fmt=n=>Number(n||0).toLocaleString('en-US');
const bar=(value,max)=>'▰'.repeat(Math.max(0,Math.min(10,Math.round(10*value/Math.max(1,max)))))+'▱'.repeat(10-Math.max(0,Math.min(10,Math.round(10*value/Math.max(1,max)))));
module.exports=({cfg,db})=>{
 const entries=Object.entries(cfg.games).flatMap(([key,g])=>Object.entries(g.divisions).map(([division,d])=>({key,g,division,d})));
 async function show(i){
   await i.deferReply({ephemeral:true});
   const rows=db.prepare('SELECT * FROM applications WHERE guild_id=?').all(i.guild.id);
   const now=Date.now(),week=rows.filter(r=>r.created_at>=now-7*86400000),month=rows.filter(r=>r.created_at>=now-30*86400000);
   const accepted=count(rows,'accepted'),rejected=count(rows,'rejected'),pending=count(rows,'pending'),review=count(rows,'review'),closed=count(rows,'closed');
   const resolved=accepted+rejected,rate=resolved?Math.round(100*accepted/resolved):0;
   const recentResolved=month.filter(r=>['accepted','rejected'].includes(r.status));
   const recentRate=recentResolved.length?Math.round(100*count(recentResolved,'accepted')/recentResolved.length):0;
   // Only configured division roles count as current membership. This excludes users who lost their role.
   try{await i.guild.members.fetch({withPresences:false});}catch(e){console.warn('Statistics member fetch failed:',e.message);}
   const members=[...i.guild.members.cache.values()].filter(m=>!m.user.bot);
   const divisions=entries.map(e=>({...e,members:members.filter(m=>m.roles.cache.has(e.d.divisionRoleId)).length}));
   const uniqueMembers=new Set(divisions.flatMap(e=>members.filter(m=>m.roles.cache.has(e.d.divisionRoleId)).map(m=>m.id))).size;
   const totalDivisionSlots=divisions.reduce((n,e)=>n+e.members,0);
   const staffRows=rows.filter(r=>r.captain_id&&['accepted','rejected','closed'].includes(r.status));
   const staffCounts=new Map();for(const r of staffRows)staffCounts.set(r.captain_id,(staffCounts.get(r.captain_id)||0)+1);
   const topStaff=[...staffCounts].sort((a,b)=>b[1]-a[1]).slice(0,3);
   const shots=db.prepare('SELECT COUNT(*) AS total FROM images WHERE application_id IN (SELECT id FROM applications WHERE guild_id=?)').get(i.guild.id).total;
   const stats={total:rows.length,accepted,rejected,pending,review,closed,rate,week:week.length,month:month.length,monthAccepted:count(month,'accepted'),monthRejected:count(month,'rejected'),recentRate,uniqueMembers,totalDivisionSlots,shots};
   const picture=await illustration(stats);
   const divisionText=divisions.map(e=>'**'+e.g.name+' · '+e.d.name+'** — '+fmt(e.members)+' members').join('\n')||'No divisions configured';
   const embed=new EmbedBuilder().setColor(0xc66af1).setAuthor({name:'MOHGS  •  RECRUITMENT ANALYTICS'}).setTitle('📊 Guild Statistics')
     .setDescription('**Live overview of guild recruitment and membership**\nStatistics are calculated from saved applications and current Discord division roles.')
     .setImage('attachment://mohgs-statistics.png')
     .addFields(
       {name:'📨 All Applications',value:fmt(stats.total),inline:true},
       {name:'🟢 Accepted',value:fmt(accepted),inline:true},
       {name:'🔴 Rejected',value:fmt(rejected),inline:true},
       {name:'🕒 Pending',value:fmt(pending),inline:true},
       {name:'🔎 In Review',value:fmt(review),inline:true},
       {name:'📁 Closed',value:fmt(closed),inline:true},
       {name:'📅 Last 7 Days',value:fmt(week.length)+' applications',inline:true},
       {name:'🗓️ Last 30 Days',value:fmt(month.length)+' applications',inline:true},
       {name:'🎯 Acceptance Rate',value:rate+'% (decided applications)',inline:true},
       {name:'👥 Current Guild Members',value:fmt(uniqueMembers)+' unique users across '+divisions.length+' divisions',inline:false},
       {name:'🛡️ Division Rosters',value:divisionText.slice(0,1024),inline:false},
       {name:'🏅 Top Reviewers',value:topStaff.length?topStaff.map(([id,n],idx)=>(idx+1)+'. <@'+id+'> — '+n+' decisions').join('\n'):'No completed reviews yet',inline:false},
       {name:'📸 Unit Screenshots',value:fmt(shots),inline:true},
       {name:'📈 30-Day Acceptance',value:recentRate+'% ('+recentResolved.length+' decisions)',inline:true}
     ).setFooter({text:'Hosted by Daenerys • Updated on request'}).setTimestamp();
   return i.editReply({embeds:[embed],files:[new AttachmentBuilder(picture,{name:'mohgs-statistics.png'})],allowedMentions:{parse:[]}});
 }
 async function illustration(s){
   const W=1100,H=470;
   const cards=[
     ['TOTAL APPLICATIONS',fmt(s.total),'#f5f1ff'],
     ['ACCEPTED',fmt(s.accepted),'#60e2ad'],
     ['PENDING + REVIEW',fmt(s.pending+s.review),'#f7d074'],
     ['GUILD MEMBERS',fmt(s.uniqueMembers),'#99c5ff']
   ];
   const tiles=cards.map(([label,value,color],n)=>{const x=65+n*252;return `<g><rect x="${x}" y="205" width="231" height="125" rx="17" fill="#251d42" stroke="#73569c" stroke-opacity=".65"/><text x="${x+18}" y="242" font-size="15" font-weight="700" letter-spacing="1" fill="#c5b2de">${esc(label)}</text><text x="${x+18}" y="299" font-size="48" font-weight="800" fill="${color}">${esc(value)}</text></g>`}).join('');
   const width=Math.round(s.rate*9.4);
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
   <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#0e1129"/><stop offset=".52" stop-color="#2d1743"/><stop offset="1" stop-color="#101c36"/></linearGradient><radialGradient id="glow"><stop stop-color="#bc52e9" stop-opacity=".45"/><stop offset="1" stop-color="#bc52e9" stop-opacity="0"/></radialGradient><linearGradient id="progress"><stop stop-color="#ae6cf3"/><stop offset="1" stop-color="#63e6be"/></linearGradient></defs>
   <rect width="${W}" height="${H}" fill="url(#bg)"/><circle cx="930" cy="30" r="310" fill="url(#glow)"/>
   <rect x="28" y="25" width="1044" height="418" rx="24" fill="none" stroke="#8e69c2" stroke-opacity=".8" stroke-width="2"/>
   <rect x="46" y="47" width="7" height="369" rx="4" fill="#d47cff"/>
   <text x="70" y="94" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="5" fill="#db9cff">MOHGS  /  ANALYTICS</text>
   <text x="67" y="165" font-family="Arial,sans-serif" font-size="54" font-weight="800" fill="#ffffff">GUILD STATISTICS</text>
   <text x="71" y="190" font-family="Arial,sans-serif" font-size="18" fill="#c3b5dd">Recruitment performance  •  Current division membership</text>
   <g font-family="Arial,sans-serif">${tiles}</g>
   <text x="67" y="379" font-family="Arial,sans-serif" font-size="19" fill="#d9c5f2" font-weight="700">ACCEPTANCE RATE</text>
   <text x="1006" y="379" text-anchor="end" font-family="Arial,sans-serif" font-size="22" fill="#80e8c5" font-weight="700">${s.rate}%</text>
   <rect x="67" y="394" width="940" height="16" rx="8" fill="#302b4a"/><rect x="67" y="394" width="${width}" height="16" rx="8" fill="url(#progress)"/>
   </svg>`;
   return sharp(Buffer.from(svg)).png().toBuffer();
 }
 return {show};
};
