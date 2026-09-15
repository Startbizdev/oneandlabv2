const fs = require('node:fs');
const {getIconData, iconToSVG} = require('@iconify/utils');
(async () => {
 const source=fs.readFileSync('frontend/pages/admin/categories/index.vue','utf8');
 const groups={lucide:'LUCIDE_MEDICAL_ICON_NAMES','medical-icon':'MEDICAL_ICON_NAMES',healthicons:'HEALTH_ICON_NAMES',covid:'COVID_ICON_NAMES'};
 const output={}; const licenses={};
 for(const [prefix,variable] of Object.entries(groups)) {
  const names=[...source.match(new RegExp(`const ${variable} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
  if(prefix==='lucide')names.push('shower-head');
  const response=await fetch(`https://api.iconify.design/${prefix}.json?icons=${names.join(',')}`);
  if(!response.ok)throw Error(`${prefix}: ${response.status}`);
  const set=await response.json();
  for(const name of names){
   const data=getIconData(set,name);if(!data)throw Error(`Missing ${prefix}:${name}`);
   const svg=iconToSVG(data, {height:'unset',width:'unset'});
   output[`${prefix}:${name}`]=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${svg.attributes.viewBox}">${svg.body}</svg>`;
  }
  const info=await (await fetch(`https://api.iconify.design/collection?prefix=${prefix}&info=true`)).json();
  licenses[prefix]=info.info;
 }
 fs.mkdirSync('apps/mobile/src/assets',{recursive:true});
 fs.writeFileSync('apps/mobile/src/assets/care-icons.json',JSON.stringify(output,null,2)+'\n');
 fs.writeFileSync('apps/mobile/src/assets/care-icons-attribution.json',JSON.stringify(licenses,null,2)+'\n');
 console.log(`${Object.keys(output).length} selected catalogue icons bundled for offline native display`);
})().catch(e=>{console.error(e);process.exitCode=1});
