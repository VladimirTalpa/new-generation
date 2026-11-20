const sharp = require('sharp');
const {GIFEncoder,quantize,applyPalette}=require('gifenc');
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');
const fontRoot = path.dirname(require.resolve('typeface-roboto/package.json'));
const readFont=file=>{const b=fs.readFileSync(path.join(fontRoot,'files',file));return opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
const font = readFont('roboto-latin-400.woff');
const boldFont = readFont('roboto-latin-700.woff');
const textPath=(value,x,y,size,color,weight='regular',spacing=0)=>{
  const face=weight==='bold'?boldFont:font;
  const str=String(value??'—');
  let current=x;
  let shapes='';
  for(const char of str){
    const glyph=face.charToGlyph(char);
    const outline=glyph.getPath(current,y,size).toPathData(2);
    if(outline)shapes+='<path d="'+outline+'" fill="'+color+'"/>';
    current+=glyph.advanceWidth*size/face.unitsPerEm+spacing;
  }
  return shapes;
};
// Small vector icons keep labels consistent without external image assets.
const miniIcon=(kind,x,y,color='#d6b3f0')=>{
 const paths={
 ticket:'<path d="M2 7H7A3 3 0 0 0 13 7H22V12A3 3 0 0 0 22 18V23H2V18A3 3 0 0 0 2 12Z"/><path d="M12 8V11M12 14V17M12 20V22"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6V12L16 15"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 22V19Q4 14 12 14Q20 14 20 19V22"/>',
 game:'<path d="M7 8H17Q21 8 22 13L23 18Q23 22 19 20L16 18H8L5 20Q1 22 1 18L2 13Q3 8 7 8Z"/><path d="M7 11V17M4 14H10M16 13H19"/>',
 shield:'<path d="M12 2L21 6V12Q21 19 12 23Q3 19 3 12V6Z"/><path d="M8 12L11 15L16 9"/>',
 camera:'<path d="M3 7H8L10 4H16L18 7H21V20H3Z"/><circle cx="12" cy="13" r="4"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="M7 12L11 16L17 9"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11V17M12 7V8"/>'
 };
 return '<g transform="translate('+x+' '+y+') scale(.76)" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(paths[kind]||paths.info)+'</g>';
};
const esc = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cut = (v,n=32) => esc(String(v??'—').slice(0,n));
const art = async (kind, details={}) => {
  if(kind==='guildprofile'){
    const username=String(details.username||'NOT SET').slice(0,22);
    const timezone=String(details.timezone||'NOT SET').slice(0,20);
    const display=String(details.display||'MEMBER').slice(0,23);
    const divisions=String(details.divisions||'NO DIVISION').slice(0,52);
    const games=String(details.games||'MOHGS').slice(0,45);
    const initials=display.replace(/[^a-zA-Z0-9 ]/g,'').split(/ +/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase()||'M';
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="540" viewBox="0 0 1100 540"><defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#100d21"/><stop offset=".55" stop-color="#241333"/><stop offset="1" stop-color="#10192c"/></linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f1b5ff"/><stop offset=".6" stop-color="#a973ff"/><stop offset="1" stop-color="#79c9ff"/></linearGradient>
      <radialGradient id="aura"><stop stop-color="#c26cfa" stop-opacity=".35"/><stop offset="1" stop-color="#c26cfa" stop-opacity="0"/></radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="22"/></filter>
    </defs>
    <rect width="1100" height="540" rx="30" fill="url(#bg)"/>
    <circle cx="940" cy="160" r="260" fill="url(#aura)"/>
    <path d="M660 0L1100 420M780 0L1100 300M0 480L360 0" stroke="#b782ef" stroke-opacity=".10" stroke-width="2"/>
    <rect x="26" y="25" width="1048" height="490" rx="24" fill="none" stroke="#a77adf" stroke-opacity=".68" stroke-width="2"/>
    <rect x="40" y="43" width="7" height="454" rx="4" fill="url(#accent)"/>
    ${textPath('MOHGS',76,103,55,'#ffffff','bold',7)}
    ${textPath('GUILD MEMBER PROFILE',79,138,19,'#d7a7f2','bold',3)}
    <path d="M78 161H1023" stroke="#a978d8" stroke-opacity=".6" stroke-width="2"/>
    <circle cx="909" cy="295" r="144" fill="none" stroke="#c38aff" stroke-opacity=".35" stroke-width="2"/>
    <circle cx="909" cy="295" r="119" fill="#1a1630" stroke="#b889ff" stroke-width="4"/>
    <path d="M909 194L931 264L1002 289L931 313L909 386L886 313L814 289L886 264Z" fill="#c183ff" fill-opacity=".13" stroke="#d7a1ff" stroke-opacity=".5" stroke-width="3"/>
    <circle cx="909" cy="295" r="66" fill="#32234e" stroke="#e0b6ff" stroke-width="3"/>
    ${textPath(initials,initials.length===1?887:867,318,60,'#f7e7ff','bold')}
    ${miniIcon('user',80,185)}
    ${textPath('DISCORD MEMBER',110,204,17,'#c7a6e6','bold',2)}
    ${textPath(display,80,248,39,'#ffffff','bold')}
    <path d="M80 274H625" stroke="#a978d8" stroke-opacity=".32" stroke-width="2"/>
    ${miniIcon('game',80,292)}
    ${textPath('ROBLOX USERNAME',110,310,17,'#c7a6e6','bold',2)}
    ${textPath(username,80,350,31,'#ffffff','bold')}
    ${miniIcon('clock',80,366)}
    ${textPath('TIMEZONE',110,384,17,'#c7a6e6','bold',2)}
    ${textPath(timezone,80,424,30,'#ffffff','bold')}
    ${textPath('DIVISION  /  '+divisions,80,468,17,'#e0b5ff','bold',1)}
    ${textPath('GAME  /  '+games,80,492,15,'#bca6d5','regular',1)}
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  if(kind==='roster'){
    const division=String(details.division||'DIVISION').slice(0,30);
    const game=String(details.game||'MOHGS').slice(0,40);
    const stats=String(details.members||0)+' MEMBERS  ·  '+String(details.missing||0)+' UNLINKED  ·  PAGE '+String(details.page||1)+' / '+String(details.pages||1);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="265" viewBox="0 0 1100 265"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#100e22"/><stop offset=".62" stop-color="#281637"/><stop offset="1" stop-color="#12152a"/></linearGradient><radialGradient id="glow"><stop stop-color="#d255c9" stop-opacity=".48"/><stop offset="1" stop-color="#d255c9" stop-opacity="0"/></radialGradient></defs><rect width="1100" height="265" rx="22" fill="url(#bg)"/><circle cx="975" cy="72" r="240" fill="url(#glow)"/><circle cx="957" cy="120" r="106" fill="none" stroke="#b879e8" stroke-opacity=".32" stroke-width="3"/><circle cx="957" cy="120" r="76" fill="none" stroke="#b879e8" stroke-opacity=".25"/><path d="M957 38L977 94L1035 115L977 135L957 192L937 135L879 115L937 94Z" fill="#c887e7" fill-opacity=".12" stroke="#c887e7" stroke-opacity=".4"/><rect x="32" y="28" width="1036" height="209" rx="17" fill="none" stroke="#a56bd0" stroke-opacity=".65" stroke-width="2"/><rect x="47" y="42" width="7" height="180" rx="3" fill="#cf77e7"/>${textPath('MOHGS  /  DIVISION ROSTER',78,79,23,'#d7a5f4','bold',3)}${textPath(division,78,143,48,'#ffffff','bold')}${textPath(game,78,181,23,'#cbb6df','regular')}${textPath(stats,78,219,17,'#dca9ed','bold',1)}</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  if(kind==='review'){
    const status=String(details.status||'PENDING').toLowerCase();
    const themes={
      pending:{accent:'#4c9fff',soft:'#b8d9ff',bg:'#10294b',label:'PENDING'},
      review:{accent:'#e9bb3e',soft:'#ffe49a',bg:'#433313',label:'IN REVIEW'},
      accepted:{accent:'#42c889',soft:'#a9f1cc',bg:'#103b30',label:'ACCEPTED'},
      rejected:{accent:'#ed6071',soft:'#ffc2c8',bg:'#471d30',label:'REJECTED'},
      closed:{accent:'#ed6071',soft:'#ffc2c8',bg:'#471d30',label:'CLOSED'}
    };
    const theme=themes[status]||themes.pending;
    const rows=[['ROBLOX',details.username],['GAME',details.game,'game'],['DIVISION',details.division,'shield'],['STATUS',theme.label]];
    const fields=rows.map(([label,value,icon],i)=>{
      const x=i%2===0?76:570, y=204+Math.floor(i/2)*98;
      return miniIcon(icon,x,y-16,theme.soft)+textPath(label,x+30,y,18,theme.soft,'bold',1.5)+textPath(String(value??'—').slice(0,25),x,y+36,27,'#ffffff','bold');
    }).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="390" viewBox="0 0 1100 390"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101828"/><stop offset=".65" stop-color="${theme.bg}"/><stop offset="1" stop-color="#0c1322"/></linearGradient></defs><rect width="1100" height="390" rx="26" fill="url(#bg)"/><circle cx="1030" cy="65" r="220" fill="${theme.accent}" opacity=".14"/><rect x="30" y="26" width="1040" height="338" rx="22" fill="none" stroke="${theme.accent}" stroke-width="2"/><rect x="43" y="45" width="7" height="298" rx="3" fill="${theme.accent}"/>${textPath('MOHGS',75,104,52,'#ffffff','bold',6)}${textPath('GUILD APPLICATION',75,142,19,theme.soft,'bold',3)}<path d="M75 160H1010" stroke="${theme.accent}" opacity=".65"/>${fields}</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  const isPanel=kind==='panel', isDraft=kind==='draft';
  const title=isPanel?'GUILD RECRUITMENT':isDraft?'APPLICATION PORTAL':'GUILD APPLICATION';
  const subtitle=isPanel?'YOUR NEXT ADVENTURE STARTS HERE':isDraft?'YOUR PRIVATE APPLICATION':'MOHGS RECRUITMENT REVIEW';
  const rows=isPanel?[
    ['01  SELECT','Choose game & division','game'],
    ['02  PROFILE','Roblox name & timezone','user'],
    ['03  SCREENSHOTS','Upload 1–5 unit screenshots','camera'],
    ['04  SUBMIT','Submit for review','check']
  ]:isDraft?[
    ['ROBLOX USERNAME',details.username,'user'],
    ['GAME',details.game],
    ['DIVISION',details.division],
    ['NEXT STEP','UPLOAD UNIT SCREENSHOTS','camera']
  ]:[
    ['DISCORD USER',details.discord,'user'],
    ['ROBLOX USERNAME',details.username],
    ['GAME',details.game],
    ['DIVISION',details.division],
    ['STATUS',details.status,'info']
  ];
  const y0=isPanel?270:250, spacing=isPanel?80:70;
  const lines=rows.map(([k,v,icon],i)=>miniIcon(icon||'info',87,y0-17+i*spacing,'#d8b4fa')+textPath(String(k),113,y0+i*spacing,17,'#c7b1df','bold',1.4)+textPath(String(v??'—').slice(0,isPanel?35:29),88,y0+34+i*spacing,isPanel?23:27,'#fff5ff','bold')).join('');
  // Recruitment illustration: clean ticket desk, not a character.
  const mascot=isPanel?`<g>
    <rect x="738" y="257" width="294" height="280" rx="25" fill="#16132e" stroke="#a67be4" stroke-width="4"/>
    <rect x="755" y="275" width="260" height="244" rx="17" fill="#231b3c" stroke="#58437f" stroke-width="2"/>
    <path d="M782 305H988" stroke="#b981ec" stroke-width="3" opacity=".6"/>
    ${textPath('APPLICATION',780,333,20,'#d9b3ff','bold',2)}
    <path d="M782 357H956M782 378H930M782 399H969" stroke="#75628e" stroke-width="8" stroke-linecap="round"/>
    <circle cx="958" cy="469" r="28" fill="#1c443c" stroke="#74e8bb" stroke-width="4"/>
    <path d="M943 469L954 480L974 458" fill="none" stroke="#b5ffe0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`:'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="650" viewBox="0 0 1100 650"><defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#100b22"/><stop offset=".55" stop-color="#281239"/><stop offset="1" stop-color="#090f25"/></linearGradient>
    <radialGradient id="orb"><stop stop-color="#e94bbd" stop-opacity=".65"/><stop offset="1" stop-color="#e94bbd" stop-opacity="0"/></radialGradient>
    <linearGradient id="line"><stop stop-color="#e762d4"/><stop offset="1" stop-color="#7048ef"/></linearGradient>
  </defs><rect width="1100" height="650" fill="url(#bg)"/>
  <circle cx="900" cy="200" r="350" fill="url(#orb)"/><circle cx="1010" cy="570" r="260" fill="url(#orb)" opacity=".5"/>
  <g stroke="#ab58ef" stroke-opacity=".23" fill="none"><path d="M610 0L1100 490M740 0L1100 360M870 0L1100 230M500 650L1100 50"/><circle cx="930" cy="340" r="210" stroke-width="2"/><circle cx="930" cy="340" r="165"/><circle cx="930" cy="340" r="115"/></g>
  <path d="M855 135L908 200L1000 180L968 270L1030 335L940 342L912 425L868 347L776 335L837 270L808 180Z" fill="#a66afb" fill-opacity=".10" stroke="#b985ff" stroke-opacity=".55" stroke-width="3"/>
  <rect x="40" y="38" width="1020" height="574" rx="24" fill="#120e25" fill-opacity=".45" stroke="#ad67f0" stroke-opacity=".6" stroke-width="2"/>
  <rect x="60" y="62" width="9" height="510" rx="4" fill="url(#line)"/>
  ${textPath('MOHGS',88,128,63,'#ffffff','bold',9)}
  
  ${textPath(title,88,175,26,'#e3a6f5','bold',4)}
  ${textPath(subtitle,88,212,15,'#baa6d2','regular',4)}
  <path d="M88 229H660" stroke="url(#line)" stroke-width="2"/>${lines}
  ${mascot}
  ${textPath('MOHGS  /  RECRUITMENT SYSTEM',87,595,15,'#bba6d3','regular',3)}
  </svg>`;
  if(isPanel){
    const gif=GIFEncoder();
    const width=825,height=488,frames=24;
    // Loop: new ticket slides in, is reviewed, approved, and resets.
    for(let frame=0;frame<frames;frame++){
      const t=frame/frames;
      const ease=x=>x*x*(3-2*x);
      const arrive=t<.34?ease(t/.34):1;
      const leave=t>.78?ease((t-.78)/.22):0;
      const x=1110-205*arrive+230*leave;
      const y=195+8*Math.sin(Math.PI*2*t);
      const opacity=t>.89?Math.max(0,1-(t-.89)/.11):1;
      const approved=t>.49&&t<.89;
      const progress=Math.max(0,Math.min(1,(t-.32)/.22));
      const ticket='<g transform="translate('+x+' '+y+') rotate(-8)" opacity="'+opacity+'">'+
        '<path d="M-115 -83H95V-53Q75 -45 95 -27V83H-115V-27Q-95 -45 -115 -53Z" fill="#fffafc" stroke="#d9c7ec" stroke-width="5"/>'+
        '<path d="M-75 -50H53" stroke="#b36bdc" stroke-width="5" stroke-linecap="round"/>'+
        '<path d="M-75 -25H70M-75 -5H46M-75 15H60" stroke="#b5a6c5" stroke-width="6" stroke-linecap="round"/>'+
        '<path d="M-83 37H66" stroke="#d8c6e5" stroke-width="3" stroke-dasharray="6 7"/>'+
        textPath('TICKET',-76,67,21,'#653b8e','bold',1)+
        '</g>';
      const progressBar='<rect x="782" y="423" width="205" height="11" rx="5" fill="#4b385e"/>'+
        '<rect x="782" y="423" width="'+Math.round(205*progress)+'" height="11" rx="5" fill="#b988f0"/>';
      const seal=approved?'<g transform="translate(953 470)"><circle r="35" fill="#123b34" stroke="#8af4c6" stroke-width="5"/><path d="M-18 0L-5 14L21 -15" stroke="#d5ffeb" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>':'';
      const frameSvg=svg.replace('</svg>',progressBar+ticket+seal+'</svg>');
      const rgba=await sharp(Buffer.from(frameSvg)).resize(width,height).ensureAlpha().raw().toBuffer();
      const palette=quantize(rgba,256);
      gif.writeFrame(applyPalette(rgba,palette),width,height,{palette,delay:85});
    }
    gif.finish();
    return Buffer.from(gif.bytes());
  }
  return sharp(Buffer.from(svg)).png().toBuffer();
};
module.exports={art};
