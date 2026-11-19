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
  // Blonde, red-eyed guild mascot replacing the former Rambo illustration.
  const mascot=isPanel?`<g transform="translate(756 190)">
    <ellipse cx="155" cy="366" rx="144" ry="21" fill="#0c0719" opacity=".5"/>
    <path d="M46 273Q5 292 0 360H305Q301 292 257 273L212 258L151 300L92 258Z" fill="#aa82d3" stroke="#eee0ff" stroke-width="5"/>
    <path d="M65 283L102 282L149 332L126 360H36Z M238 283L204 282L154 332L177 360H269Z" fill="#ddd0f5"/>
    <path d="M120 279L151 320L183 279" fill="#30213f"/><path d="M149 306L132 328L152 355L173 328Z" fill="#b51c55"/>
    <path d="M39 129Q16 53 86 34Q128 -18 199 23Q267 31 277 116L297 183L260 202L253 268L212 294L193 244L96 245L77 296L37 270L49 208L10 190Z" fill="#f8d18c" stroke="#a96049" stroke-width="5"/>
    <path d="M50 94Q69 23 150 24Q235 18 256 98L247 195Q238 252 177 274L115 270Q61 236 52 186Z" fill="#f8adac" stroke="#a95669" stroke-width="5"/>
    <path d="M38 127Q34 53 103 33Q148 -4 213 32Q253 48 264 113L226 99L210 65L193 123L174 83L150 131L125 77L103 148L80 106L51 164Z" fill="#ffdb9c" stroke="#fff4d3" stroke-width="5"/>
    <path d="M56 174L111 158L127 182L98 202L62 194Z M175 181L195 153L246 165L236 195L194 203Z" fill="#fff5ff" stroke="#41233c" stroke-width="7"/>
    <ellipse cx="99" cy="183" rx="15" ry="19" fill="#bc1d51"/><ellipse cx="204" cy="180" rx="15" ry="19" fill="#bc1d51"/>
    <circle cx="103" cy="177" r="6" fill="#fff4ff"/><circle cx="208" cy="174" r="6" fill="#fff4ff"/>
    <path d="M62 155L121 167M180 166L243 153" stroke="#3b2138" stroke-width="10" stroke-linecap="round"/>
    <path d="M142 195L136 214L154 220" stroke="#d47580" stroke-width="5" fill="none"/>
    <path d="M111 237Q149 225 190 238L181 252Q151 258 120 252Z" fill="#fff6ff" stroke="#a84b69" stroke-width="5"/>
    <path d="M35 154L10 219L44 234L71 191M256 151L296 219L260 235L235 192" fill="#ffd69b" stroke="#b87856" stroke-width="4"/>
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
    // Smooth cyclic lift, hold, and lower; GIFEncoder loops by default.
    for(let frame=0;frame<frames;frame++){
      const t=frame/frames;
      const lift=t<.30?(.5-.5*Math.cos(Math.PI*t/.30)):t<.65?1:t<.94?(.5+.5*Math.cos(Math.PI*(t-.65)/.29)):0;
      const y=445-330*lift;
      const handY=y+25;
      const sign='<g transform="translate(0 '+y+')">'+
        '<path d="M737 0Q906 -8 1062 0L1058 115Q914 122 737 115Z" fill="#fffaf8" stroke="#c9b6d2" stroke-width="5"/>'+
        '<path d="M750 13Q900 3 1048 13" stroke="#e9dfea" stroke-width="3" fill="none"/>'+
        textPath('#Nr1',800,82,73,'#bd1650','bold',1)+
        '<path d="M793 95H1006" stroke="#e14a81" stroke-width="5"/>'+
        '</g>';
      const arms='<path d="M805 478Q758 421 753 '+handY+'" stroke="#b58bda" stroke-width="38" fill="none" stroke-linecap="round"/>'+
        '<path d="M1000 478Q1050 422 1048 '+handY+'" stroke="#b58bda" stroke-width="38" fill="none" stroke-linecap="round"/>'+
        '<ellipse cx="753" cy="'+handY+'" rx="19" ry="23" fill="#f8adac" stroke="#ba687b" stroke-width="3"/>'+
        '<ellipse cx="1048" cy="'+handY+'" rx="19" ry="23" fill="#f8adac" stroke="#ba687b" stroke-width="3"/>';
      // Draw arms behind the banner, with both hands gripping its top corners.
      const frameSvg=svg.replace('</svg>',arms+sign+'</svg>');
      const rgba=await sharp(Buffer.from(frameSvg)).resize(width,height).ensureAlpha().raw().toBuffer();
      const palette=quantize(rgba,256);
      gif.writeFrame(applyPalette(rgba,palette),width,height,{palette,delay:75});
    }
    gif.finish();
    return Buffer.from(gif.bytes());
  }
  return sharp(Buffer.from(svg)).png().toBuffer();
};
module.exports={art};
