// Original MOHGS icon set. PNGs are generated from vector SVGs and registered as guild emojis.
const sharp=require('sharp');
const icons={
 ticket:['#b98aff','<path d="M10 20H54V29Q47 32 54 36V44H10V36Q17 32 10 29Z"/><path d="M25 22V42" stroke-dasharray="3 4"/>'],
 form:['#cda4ff','<rect x="16" y="12" width="32" height="43" rx="5"/><path d="M25 24H39M25 32H39M25 40H34"/><path d="M26 9H38V17H26Z"/>'],
 user:['#bca6ff','<circle cx="32" cy="23" r="9"/><path d="M15 51Q16 37 32 37Q48 37 49 51Z"/>'],
 game:['#a88aff','<path d="M17 26Q13 27 10 42Q8 52 17 51L26 44H38L47 51Q56 52 54 42Q51 27 47 26Z"/><path d="M22 31V43M16 37H28"/><circle cx="42" cy="34" r="2"/><circle cx="47" cy="40" r="2"/>'],
 clock:['#d1a0ff','<circle cx="32" cy="32" r="21"/><path d="M32 19V33L42 39"/>'],
 shield:['#b17bfa','<path d="M32 8L51 16V29Q51 46 32 56Q13 46 13 29V16Z"/><path d="M23 32L30 39L42 25"/>'],
 pin:['#c39cff','<path d="M32 8C20 8 15 17 15 27C15 42 32 56 32 56S49 42 49 27C49 17 44 8 32 8Z"/><circle cx="32" cy="27" r="7"/>'],
 check:['#81e4c6','<circle cx="32" cy="32" r="22"/><path d="M19 32L28 41L46 23"/>'],
 search:['#c8a2ff','<circle cx="27" cy="27" r="14"/><path d="M38 38L52 52"/>'],
 cross:['#ff8da9','<circle cx="32" cy="32" r="22"/><path d="M23 23L41 41M41 23L23 41"/>'],
 camera:['#c7a6ff','<rect x="9" y="19" width="46" height="32" rx="6"/><path d="M20 19L24 12H40L44 19"/><circle cx="32" cy="35" r="10"/>'],
 spark:['#d6a8ff','<path d="M32 8L37 26L56 32L37 38L32 56L26 38L8 32L26 26Z"/>'],
 info:['#bba2ff','<circle cx="32" cy="32" r="22"/><path d="M32 28V43M32 20V21"/>'],
 arrow:['#bca2ff','<path d="M10 32H51M37 18L51 32L37 46"/>'],
 chart:['#c8a0ff','<path d="M11 51H54M17 45V32H26V45M29 45V23H38V45M41 45V13H50V45"/>']
};
const fallback={ticket:'🎟️',form:'📋',user:'👤',game:'🎮',clock:'🕒',shield:'🛡️',pin:'📌',check:'✅',search:'🔎',cross:'❌',camera:'📸',spark:'✨',info:'ℹ️',arrow:'➡️',chart:'📊'};
const emojiToIcon={'🎟️':'ticket','🎟':'ticket','📋':'form','👤':'user','🎮':'game','🕹️':'game','🕹':'game','🕒':'clock','⏳':'clock','🛡️':'shield','🛡':'shield','📌':'pin','✅':'check','🔎':'search','❌':'cross','📸':'camera','✨':'spark','ℹ️':'info','➡️':'arrow','📊':'chart'};
const names=Object.fromEntries(Object.keys(icons).map(k=>[k,'mohgs_'+k]));
const ids=new Map();
const token=name=>ids.has(name)?'<:'+names[name]+':'+ids.get(name)+'>':fallback[name]||'✦';
const replace=text=>typeof text==='string'?text.replace(/🎟️|🕹️|🛡️|ℹ️|➡️|🎟|🕹|🛡|📋|👤|🎮|🕒|⏳|📌|✅|🔎|❌|📸|✨|📊/gu,e=>token(emojiToIcon[e])):text;
const ready=()=>ids.size;
const buttonEmoji=text=>{if(typeof text!=='string')return null;const found=Object.keys(emojiToIcon).find(e=>text.startsWith(e+' '));if(!found)return null;const key=emojiToIcon[found];return {label:text.slice(found.length).trim(),emoji:ids.has(key)?{id:ids.get(key),name:names[key]}:found};};
const render=async name=>{
 const [color,paths]=icons[name];
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8f2ff"/><stop offset="1" stop-color="'+color+'"/></linearGradient></defs><g fill="none" stroke="url(#g)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'+paths+'</g></svg>';
 return sharp(Buffer.from(svg)).png().toBuffer();
};
async function install(guild){
 try{
  const existing=await guild.emojis.fetch();
  for(const [key,name] of Object.entries(names)){
   const match=existing.find(e=>e.name===name);
   if(match){ids.set(key,match.id);continue;}
   try{
    const created=await guild.emojis.create({attachment:await render(key),name,reason:'MOHGS recruitment custom icon set'});
    ids.set(key,created.id);
   }catch(e){console.warn('MOHGS icon '+name+' not installed: '+e.message);}
  }
  console.log('MOHGS custom emojis available:',ids.size+'/'+Object.keys(icons).length);
 }catch(e){console.warn('MOHGS emoji access unavailable:',e.message);}
}
module.exports={install,replace,buttonEmoji,token,ready};
