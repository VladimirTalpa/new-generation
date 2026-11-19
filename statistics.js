const {EmbedBuilder,AttachmentBuilder}=require('discord.js');
const sharp=require('sharp');
const opentype=require('opentype.js');
const fs=require('fs');
const path=require('path');
const fontRoot=path.dirname(require.resolve('typeface-roboto/package.json'));
const loadFont=file=>{const b=fs.readFileSync(path.join(fontRoot,'files',file));return opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
const regular=loadFont('roboto-latin-400.woff');
const bold=loadFont('roboto-latin-700.woff');
const drawText=(value,x,y,size,color,maxWidth=Infinity,weight='bold',align='left')=>{
 const face=weight==='regular'?regular:bold;
 const text=String(value??'—');
 const width=face.getAdvanceWidth(text,size);
 const scale=Math.min(1,maxWidth/Math.max(1,width));
 const actualWidth=width*scale;
 const left=align==='right'?x-actualWidth:x;
 const paths=face.getPath(text,0,0,size).toPathData(2);
 return '<path d="'+paths+'" fill="'+color+'" transform="translate('+left+' '+y+') scale('+scale+' 1)"/>';
};

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
   const picture=await illustration(stats,topStaff,recentResolved.length);
   const embed=new EmbedBuilder().setColor(0xc66af1)
     .setImage('attachment://mohgs-statistics.png')
     .setFooter({text:'Hosted by Daenerys'})
     .setTimestamp();
   return i.editReply({embeds:[embed],files:[new AttachmentBuilder(picture,{name:'mohgs-statistics.png'})],allowedMentions:{parse:[]}});
 }
 async function illustration(s,topStaff,recentDecisions){
   const W=1100,H=920;
   const t=(v,x,y,size,color,width=900,weight='bold',align='left')=>drawText(v,x,y,size,color,width,weight,align);
   const card=(x,y,label,value,color)=>'<rect x="'+x+'" y="'+y+'" width="234" height="110" rx="16" fill="#241d3c" stroke="#745596"/>'+t(label,x+16,y+34,17,'#cbb5e4',202)+t(value,x+16,y+92,49,color,202);
   const metrics=[
    ['ALL APPLICATIONS',s.total,'#ffffff'],['ACCEPTED',s.accepted,'#63e3ad'],['REJECTED',s.rejected,'#ff8298'],['PENDING',s.pending,'#f6d078'],
    ['IN REVIEW',s.review,'#91c7ff'],['CLOSED',s.closed,'#d8b0ff'],['LAST 7 DAYS',s.week,'#ffffff'],['LAST 30 DAYS',s.month,'#ffffff']
   ].map(([label,v,c],n)=>card(66+n%4*253,177+Math.floor(n/4)*128,label,fmt(v),c)).join('');
   const staffRows=topStaff.length?topStaff.map(([id,n],j)=>t('#'+(j+1)+'  Reviewer '+id.slice(-6),76,610+j*52,23,'#e7d9f7',720,'regular')+t(fmt(n)+' decisions',1018,610+j*52,22,'#80e5bf',210,'bold','right')).join(''):t('No completed reviews',76,610,22,'#cbb5e4',850,'regular');
   const rate=Math.max(0,Math.min(100,s.rate));
   const content=[
    '<rect width="1100" height="920" fill="#141126"/>',
    '<rect x="26" y="22" width="1048" height="875" rx="25" fill="#211735" stroke="#8e65b8" stroke-width="2"/>',
    '<rect x="43" y="42" width="7" height="831" rx="4" fill="#c878f3"/>',
    t('MOHGS  /  RECRUITMENT ANALYTICS',69,84,24,'#dca4fb',940),
    t('GUILD STATISTICS',69,148,55,'#ffffff',940),
    metrics,
    t('ACCEPTANCE RATE',70,454,23,'#e7d9f7',700),
    t(rate+'%',1020,454,29,'#83e8c5',130,'bold','right'),
    '<rect x="70" y="474" width="950" height="16" rx="8" fill="#3c3056"/>',
    '<rect x="70" y="474" width="'+Math.round(rate*9.5)+'" height="16" rx="8" fill="#a67bee"/>',
    t('30-DAY ACCEPTANCE: '+s.recentRate+'%  /  '+recentDecisions+' DECISIONS',70,524,19,'#c9b9de',940),
    t('TOP REVIEWERS',72,567,24,'#e8b5ff',940),
    staffRows,
    '<path d="M70 818H1020" stroke="#6d547e" stroke-width="2"/>',
    t('UNIQUE MEMBERS: '+fmt(s.uniqueMembers)+'    MEMBERSHIPS: '+fmt(s.totalDivisionSlots)+'    SCREENSHOTS: '+fmt(s.shots),70,851,19,'#e0d3f0',940),
    t('Hosted by Daenerys',70,880,17,'#bba7d0',940,'regular')
   ].join('');
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">'+content+'</svg>';
   return sharp(Buffer.from(svg)).png().toBuffer();
 }
 return {show};
};
