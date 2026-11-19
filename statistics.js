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
   const picture=await illustration(stats,divisions,topStaff,recentResolved.length);
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
 async function illustration(s,divisions,topStaff,recentDecisions){
   const W=1100,H=900;
   const safe=v=>esc(String(v??'—').slice(0,44));
   const card=(x,y,w,h,label,value,color='#f5f1ff')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#211b39" stroke="#76569f" stroke-opacity=".65"/><text x="${x+18}" y="${y+30}" font-size="16" fill="#c5b2de" font-weight="700">${safe(label)}</text><text x="${x+18}" y="${y+83}" font-size="45" font-weight="800" fill="${color}">${safe(value)}</text>`;
   const topCards=[
     ['ALL APPLICATIONS',fmt(s.total),'#ffffff'],['ACCEPTED',fmt(s.accepted),'#64e3ad'],
     ['REJECTED',fmt(s.rejected),'#ff8399'],['PENDING',fmt(s.pending),'#f5cf75'],
     ['IN REVIEW',fmt(s.review),'#99c5ff'],['CLOSED',fmt(s.closed),'#c9a5e9'],
     ['LAST 7 DAYS',fmt(s.week),'#ffffff'],['LAST 30 DAYS',fmt(s.month),'#ffffff']
   ].map(([label,value,color],n)=>card(56+(n%4)*252,171+Math.floor(n/4)*116,234,103,label,value,color)).join('');
   const divisionRows=divisions.slice(0,8).map((d,n)=>`<text x="75" y="${590+n*27}" font-size="19" fill="#e4d7f5">${safe(d.g.name+' / '+d.d.name)}</text><text x="600" y="${590+n*27}" font-size="20" font-weight="700" fill="#90d8f8" text-anchor="end">${fmt(d.members)}</text>`).join('');
   const reviewerRows=topStaff.length?topStaff.map(([id,n],j)=>`<text x="678" y="${590+j*38}" font-size="19" fill="#e4d7f5">#${j+1}  ${safe(id)}</text><text x="1032" y="${590+j*38}" font-size="20" fill="#85e3bd" text-anchor="end">${n}</text>`).join(''):'<text x="680" y="590" font-size="20" fill="#c5b2de">No reviews yet</text>';
   const progress=Math.round(Math.min(100,Math.max(0,s.rate))*9.5);
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#101025"/><stop offset=".6" stop-color="#28163d"/><stop offset="1" stop-color="#0d1b31"/></linearGradient><linearGradient id="bar"><stop stop-color="#c77df9"/><stop offset="1" stop-color="#69e2c2"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect x="26" y="22" width="1048" height="854" rx="24" fill="none" stroke="#9e6ac7" stroke-width="2"/>
    <rect x="43" y="42" width="7" height="810" rx="4" fill="#c877f1"/>
    <g font-family="Arial,sans-serif">
    <text x="68" y="77" font-size="23" letter-spacing="4" fill="#dca5fb" font-weight="700">MOHGS  /  RECRUITMENT ANALYTICS</text>
    <text x="67" y="139" font-size="52" font-weight="800" fill="#ffffff">GUILD STATISTICS</text>
    ${topCards}
    <text x="70" y="428" font-size="21" font-weight="700" fill="#e9d9f7">ACCEPTANCE RATE</text>
    <text x="1030" y="428" text-anchor="end" font-size="26" font-weight="700" fill="#8de8c7">${s.rate}%</text>
    <rect x="70" y="445" width="950" height="15" rx="7" fill="#3a3152"/><rect x="70" y="445" width="${progress}" height="15" rx="7" fill="url(#bar)"/>
    <text x="70" y="493" font-size="19" fill="#c6b5dd">30-day acceptance: ${s.recentRate}% (${recentDecisions} decisions)   •   ${s.monthAccepted} accepted   •   ${s.monthRejected} rejected</text>
    <text x="70" y="539" font-size="24" font-weight="700" fill="#e7b1fa">DIVISION MEMBERS</text>
    <text x="677" y="539" font-size="24" font-weight="700" fill="#e7b1fa">TOP REVIEWERS</text>
    ${divisionRows}
    ${reviewerRows}
    <path d="M650 520V786" stroke="#6b527f" stroke-width="2"/>
    <path d="M70 795H1030" stroke="#6b527f" stroke-width="2"/>
    <text x="73" y="830" font-size="20" fill="#d7c7ea">UNIQUE MEMBERS: ${fmt(s.uniqueMembers)}   •   DIVISION MEMBERSHIPS: ${fmt(s.totalDivisionSlots)}   •   SCREENSHOTS: ${fmt(s.shots)}</text>
    <text x="73" y="856" font-size="16" fill="#a994c1">Hosted by Daenerys  •  Live data from applications and Discord roles</text>
    </g></svg>`;
   return sharp(Buffer.from(svg)).png().toBuffer();
 }
 return {show};
};
