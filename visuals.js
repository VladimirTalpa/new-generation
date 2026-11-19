const sharp = require('sharp');
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
const esc = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cut = (v,n=32) => esc(String(v??'—').slice(0,n));
const art = (kind, details={}) => {
  if(kind==='roster'){
    const division=String(details.division||'DIVISION').slice(0,30);
    const game=String(details.game||'MOHGS').slice(0,40);
    const stats=String(details.members||0)+' MEMBERS  /  '+String(details.missing||0)+' WITHOUT ROBLOX  /  PAGE '+String(details.page||1)+' OF '+String(details.pages||1);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="265" viewBox="0 0 1100 265"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#100e22"/><stop offset=".62" stop-color="#281637"/><stop offset="1" stop-color="#12152a"/></linearGradient><radialGradient id="glow"><stop stop-color="#d255c9" stop-opacity=".48"/><stop offset="1" stop-color="#d255c9" stop-opacity="0"/></radialGradient></defs><rect width="1100" height="265" rx="22" fill="url(#bg)"/><circle cx="975" cy="72" r="240" fill="url(#glow)"/><circle cx="957" cy="120" r="106" fill="none" stroke="#b879e8" stroke-opacity=".32" stroke-width="3"/><circle cx="957" cy="120" r="76" fill="none" stroke="#b879e8" stroke-opacity=".25"/><path d="M957 38L977 94L1035 115L977 135L957 192L937 135L879 115L937 94Z" fill="#c887e7" fill-opacity=".12" stroke="#c887e7" stroke-opacity=".4"/><rect x="32" y="28" width="1036" height="209" rx="17" fill="none" stroke="#a56bd0" stroke-opacity=".65" stroke-width="2"/><rect x="47" y="42" width="7" height="180" rx="3" fill="#cf77e7"/>${textPath('MOHGS  /  DIVISION ROSTER',78,79,23,'#d7a5f4','bold',3)}${textPath(division,78,143,48,'#ffffff','bold')}${textPath(game,78,181,23,'#cbb6df','regular')}${textPath(stats,78,219,17,'#dca9ed','bold',1)}</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  if(kind==='review'){
    const rows=[['ROBLOX',details.username],['GAME',details.game],['DIVISION',details.division],['STATUS',details.status]];
    const fields=rows.map(([label,value],i)=>{
      const x=i%2===0?76:570, y=204+Math.floor(i/2)*98;
      return textPath(label,x,y,18,'#c6a9ed','bold',2)+textPath(String(value??'—').slice(0,25),x,y+36,28,'#ffffff','bold');
    }).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="390" viewBox="0 0 1100 390"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#120e29"/><stop offset=".65" stop-color="#341a4e"/><stop offset="1" stop-color="#0c1025"/></linearGradient></defs><rect width="1100" height="390" rx="26" fill="url(#bg)"/><circle cx="1030" cy="65" r="220" fill="#a63ccf" opacity=".14"/><rect x="30" y="26" width="1040" height="338" rx="22" fill="none" stroke="#a05cd7" stroke-width="2"/><rect x="43" y="45" width="7" height="298" rx="3" fill="#d46af5"/>${textPath('MOHGS',75,104,52,'#ffffff','bold',6)}${textPath('GUILD APPLICATION',75,142,19,'#dcacf8','bold',3)}<path d="M75 160H1010" stroke="#a76ac9" opacity=".65"/>${fields}</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  const isPanel=kind==='panel', isDraft=kind==='draft';
  const title=isPanel?'GUILD RECRUITMENT':isDraft?'APPLICATION PORTAL':'GUILD APPLICATION';
  const subtitle=isPanel?'YOUR NEXT ADVENTURE STARTS HERE':isDraft?'YOUR PRIVATE APPLICATION':'MOHGS RECRUITMENT REVIEW';
  const rows=isPanel?[
    ['COMMUNITY','MOHGS'],
    ['GAMES','ANIME ADVENTURES / CRUSADERS X'],
    ['NEXT STEP','SELECT APPLY OR INFORMATION']
  ]:isDraft?[
    ['ROBLOX USERNAME',details.username],
    ['GAME',details.game],
    ['DIVISION',details.division],
    ['ACTION','UPLOAD YOUR UNIT SCREENSHOTS']
  ]:[
    ['DISCORD USER',details.discord],
    ['ROBLOX USERNAME',details.username],
    ['GAME',details.game],
    ['DIVISION',details.division],
    ['STATUS',details.status]
  ];
  const y0=isPanel?278:250, spacing=isPanel?90:70;
  const lines=rows.map(([k,v],i)=>textPath(String(k),85,y0+i*spacing,19,'#b8a3d7','bold',2)+textPath(String(v).slice(0,44),85,y0+34+i*spacing,29,'#fff5ff','bold')).join('');
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
  ${textPath('MOHGS  /  RECRUITMENT SYSTEM',87,595,15,'#bba6d3','regular',3)}
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};
module.exports={art};
