// Fixed UTC/GMT offsets used for guild coordination (not daylight-saving-aware IANA zones).
const normalizeTimezone=value=>{
 const match=/^(?:GMT|UTC)?\s*([+-])\s*(\d{1,2})(?::?([0-5]\d))?$/i.exec(String(value||'').trim());
 if(!match)return null;
 const hours=Number(match[2]),minutes=Number(match[3]||0);
 if(hours>14||(hours===14&&minutes!==0))return null;
 const sign=match[1],suffix=minutes?':'+String(minutes).padStart(2,'0'):'';
 return 'GMT'+sign+hours+suffix;
};
module.exports={normalizeTimezone};
