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
  const mascot=isPanel?`<g transform="translate(755 145)">
    <!-- Rambo-inspired comic portrait: long hair, red headband, combat vest -->
    <ellipse cx="150" cy="418" rx="143" ry="22" fill="#090718" opacity=".5"/>
    <path d="M78 278 Q25 297 15 393 L287 393 Q278 303 217 277Z" fill="#314039" stroke="#a3b3a2" stroke-width="5"/>
    <path d="M101 280 L150 357 L202 279" fill="#b98765"/>
    <path d="M73 286 L109 286 L150 361 L128 393 L63 393Z" fill="#465846"/>
    <path d="M226 286 L190 286 L150 361 L174 393 L240 393Z" fill="#465846"/>
    <path d="M65 315 L101 315 M198 315 L235 315 M73 351 L116 351 M187 351 L229 351" stroke="#9c8e6a" stroke-width="8"/>
    <rect x="119" y="234" width="63" height="69" rx="20" fill="#c48b68"/>
    <path d="M54 114 Q24 52 75 32 Q97 -4 151 17 Q205 -4 231 40 Q279 75 245 146 L264 254 L219 282 L207 199 L93 199 L78 281 L36 254Z" fill="#211e25" stroke="#49323a" stroke-width="6"/>
    <ellipse cx="150" cy="170" rx="89" ry="111" fill="#d3a17c" stroke="#4b3032" stroke-width="5"/>
    <path d="M60 139 Q52 68 106 53 Q148 23 198 58 Q244 83 239 144 L211 112 Q170 88 148 104 Q99 87 70 151Z" fill="#29232b"/>
    <path d="M57 128 Q146 111 244 130 L242 152 Q150 138 59 153Z" fill="#c73c4c" stroke="#e8848e" stroke-width="3"/>
    <path d="M230 137 Q272 148 289 187 L271 193 Q253 165 230 159Z" fill="#c73c4c"/>
    <path d="M247 142 Q280 149 301 159 L283 177 L244 157Z" fill="#a72e42"/>
    <path d="M88 158 L131 173 M170 173 L212 158" stroke="#30252a" stroke-width="11" stroke-linecap="round"/>
    <path d="M91 182 Q111 177 128 184 M174 184 Q194 177 211 182" stroke="#30252a" stroke-width="5" fill="none"/>
    <circle cx="112" cy="185" r="6" fill="#211c22"/><circle cx="192" cy="185" r="6" fill="#211c22"/>
    <path d="M150 182 L139 214 L156 220" stroke="#98664e" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M119 238 Q150 222 183 238 Q185 267 151 276 Q119 268 119 238Z" fill="#4c2026" stroke="#673b36" stroke-width="5"/><path d="M126 239 Q150 235 177 239 L175 248 Q149 251 128 247Z" fill="#f5e3d6"/><path d="M138 267 Q152 260 165 267" stroke="#a94c58" stroke-width="5" fill="none"/>
    <path d="M100 355 L198 355" stroke="#8f7a60" stroke-width="11"/>
    ${textPath('RAMBO',105,390,22,'#e8c9b5','bold',3)}
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
    // One heavy machine gun across the chest; only recoil, muzzle flash and smoke move.
    // Hands are anchored to its grip and foregrip, avoiding disconnected extra limbs.
    for(let frame=0;frame<frames;frame++){
      const cycle=frame%8;
      const recoil=2.5*Math.sin(frame*Math.PI/4);
      const flash=cycle<3;
      const smoke=Array.from({length:3},(_,j)=>{
        const age=(frame+j*8)%24/24;
        return '<ellipse cx="'+(1071+age*27)+'" cy="'+(459-age*80-j*9)+'" rx="'+(8+age*15)+'" ry="'+(5+age*10)+'" fill="#b8b0c6" opacity="'+(.26*(1-age)).toFixed(3)+'"/>';
      }).join('');
      const weapon='<g transform="translate(0 '+recoil+')">'+
        '<path d="M786 475L830 466L852 480L831 497L788 493Z" fill="#303843" stroke="#aab2bd" stroke-width="4"/>'+
        '<rect x="822" y="447" width="178" height="48" rx="7" fill="#333d49" stroke="#aab5c1" stroke-width="5"/>'+
        '<path d="M840 457H985M840 469H985M840 481H985" stroke="#697786" stroke-width="4"/>'+
        '<rect x="855" y="430" width="86" height="18" rx="4" fill="#303944" stroke="#aeb9c5" stroke-width="4"/>'+
        '<path d="M896 495L914 550L950 550L948 495Z" fill="#2a303b" stroke="#98a4b1" stroke-width="4"/>'+
        '<path d="M855 493L850 531L870 531L882 493Z" fill="#222b35" stroke="#a1aeba" stroke-width="3"/>'+
        '<rect x="997" y="458" width="71" height="21" rx="4" fill="#56616e" stroke="#b6c0cb" stroke-width="4"/>'+
        '<rect x="1061" y="462" width="25" height="13" fill="#242c35" stroke="#aeb7c2" stroke-width="3"/>'+
        '<path d="M1050 450V485M1037 450V485" stroke="#99a6b3" stroke-width="4"/>'+
        '</g>';
      const arms='<path d="M818 430Q806 455 855 '+(500+recoil)+'" stroke="#c48b68" stroke-width="32" fill="none" stroke-linecap="round"/>'+
        '<path d="M989 427Q1026 447 1017 '+(483+recoil)+'" stroke="#c48b68" stroke-width="32" fill="none" stroke-linecap="round"/>';
      const hands='<ellipse cx="858" cy="'+(498+recoil)+'" rx="19" ry="16" fill="#c48b68" stroke="#8e6049" stroke-width="3"/>'+
        '<ellipse cx="1017" cy="'+(481+recoil)+'" rx="19" ry="16" fill="#c48b68" stroke="#8e6049" stroke-width="3"/>';
      const muzzle=flash?'<g><ellipse cx="1084" cy="'+(467+recoil)+'" rx="49" ry="30" fill="#ff9d31" opacity=".22"/>'+
        '<path d="M1082 '+(467+recoil)+'L1110 '+(435+recoil)+'L1105 '+(459+recoil)+'L1147 '+(447+recoil)+'L1116 '+(472+recoil)+'L1144 '+(491+recoil)+'L1104 '+(484+recoil)+'L1106 '+(506+recoil)+'Z" fill="#ffbe49" stroke="#ff7f36" stroke-width="4"/>'+
        '<path d="M1085 '+(467+recoil)+'L1125 '+(463+recoil)+'L1105 '+(473+recoil)+'Z" fill="#fff2bb"/></g>':'';
      const frameSvg=svg.replace('</svg>',arms+weapon+hands+smoke+muzzle+'</svg>');
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
