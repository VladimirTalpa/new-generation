const sharp = require('sharp');
const esc = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cut = (v,n=32) => esc(String(v??'—').slice(0,n));
const art = (kind, details={}) => {
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
  const lines=rows.map(([k,v],i)=>`<text x="85" y="${y0+i*spacing}" font-family="sans-serif" font-size="19" font-weight="700" fill="#b8a3d7" letter-spacing="3">${cut(k)}</text><text x="85" y="${y0+34+i*spacing}" font-family="sans-serif" font-size="29" font-weight="700" fill="#fff5ff">${cut(v,44)}</text>`).join('');
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
  <text x="88" y="128" font-family="sans-serif" font-size="63" font-weight="900" fill="#ffffff" letter-spacing="9">MOHGS</text>
  <text x="88" y="175" font-family="sans-serif" font-size="26" font-weight="800" fill="#e3a6f5" letter-spacing="4">${esc(title)}</text>
  <text x="88" y="212" font-family="sans-serif" font-size="15" fill="#baa6d2" letter-spacing="4">${esc(subtitle)}</text>
  <path d="M88 229H660" stroke="url(#line)" stroke-width="2"/>${lines}
  <text x="87" y="595" font-family="sans-serif" font-size="15" fill="#bba6d3" letter-spacing="3">MOHGS  /  RECRUITMENT SYSTEM</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};
module.exports={art};
