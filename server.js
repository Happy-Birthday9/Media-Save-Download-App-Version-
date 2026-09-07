const express=require('express');
const path=require('path');
const app=express();
const PORT=process.env.PORT||3000;
const STATIC=path.join(__dirname,'public');
app.use(express.static(STATIC));
const INSTANCES_URL='https://instances.cobalt.best/api/instances.json';
const configured=process.env.COBALT_API_URL?.replace(/\/$/,'');
function allowed(value){try{const h=new URL(value).hostname.toLowerCase().replace(/^www\./,'');return /(^|\.)tiktok\.com$/.test(h)||/(^|\.)facebook\.com$/.test(h)||h==='fb.watch'}catch{return false}}
async function cobalt(url,base){const headers={'Accept':'application/json','Content-Type':'application/json'};if(process.env.COBALT_API_KEY)headers.Authorization='Api-Key '+process.env.COBALT_API_KEY;const r=await fetch(base+'/',{method:'POST',headers,body:JSON.stringify({url,videoQuality:'1080',audioFormat:'mp3',audioBitrate:'128',downloadMode:'auto',filenameStyle:'basic',alwaysProxy:true,tiktokFullAudio:true})});const j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw new Error(j?.error?.code||`Cobalt ${r.status}`);return j}
async function candidates(){if(configured)return [configured];try{const r=await fetch(INSTANCES_URL);const list=await r.json();return list.filter(x=>x?.online?.api&&x?.url&&x?.services?.facebook).sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,5).map(x=>String(x.url).replace(/\/$/,''));}catch{return []}}
app.get('/api/download',async(req,res)=>{const url=String(req.query.url||'').trim();if(!allowed(url))return res.status(400).json({ok:false,error:'Invalid or unsupported link.'});const bases=await candidates();if(!bases.length)return res.status(503).json({ok:false,error:'No media processing server is configured. Set COBALT_API_URL on your server.'});let last='Download failed';for(const base of bases){try{const j=await cobalt(url,base);if(j.status==='tunnel'||j.status==='redirect')return res.json({ok:true,url:j.url,filename:j.filename||'media-download.mp4'});if(j.status==='picker'&&j.picker?.length){const item=j.picker.find(x=>x.type==='video')||j.picker[0];return res.json({ok:true,url:item.url,filename:'media-download.mp4'});}last=j.error?.code||'Media not available';}catch(e){last=e.message}}res.status(502).json({ok:false,error:'Could not process this link right now: '+last})});
app.get('*',(req,res)=>res.sendFile(path.join(STATIC,'index.html')));
app.listen(PORT,()=>console.log(`Media Download running on ${PORT}`));
