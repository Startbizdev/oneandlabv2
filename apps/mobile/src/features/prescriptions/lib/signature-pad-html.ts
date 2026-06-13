const SIGNATURE_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:#fff;touch-action:none}
canvas{display:block;width:100%;height:100%;background:#fff}
</style></head>
<body><canvas id="c"></canvas>
<script>
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
let drawing=false,lastX=0,lastY=0,hasInk=false,pendingLoadB64=null;
function resize(){
  const r=canvas.getBoundingClientRect();
  const w=Math.max(1,Math.floor(r.width*2));
  const h=Math.max(1,Math.floor(r.height*2));
  if(canvas.width===w&&canvas.height===h)return;
  canvas.width=w;
  canvas.height=h;
  ctx.setTransform(2,0,0,2,0,0);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111';ctx.lineWidth=2.2;
  if(pendingLoadB64)scheduleDrawPending(0);
}
function clearPad(){ctx.clearRect(0,0,canvas.width,canvas.height);hasInk=false;pendingLoadB64=null;post('cleared');}
function isEmpty(){
  if(hasInk)return false;
  const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  for(let i=3;i<d.length;i+=4){if(d[i])return false;}
  return true;
}
function exportPng(){
  if(isEmpty()){post('empty');return;}
  post('png',canvas.toDataURL('image/png'));
}
function toDataUri(b64){
  if(!b64)return '';
  return b64.startsWith('data:')?b64:'data:image/png;base64,'+b64;
}
function scheduleDrawPending(attempt){
  if(!pendingLoadB64)return;
  const r=canvas.getBoundingClientRect();
  if(r.width<4||r.height<4){
    if(attempt<48){setTimeout(()=>scheduleDrawPending(attempt+1),50);}
    return;
  }
  resize();
  const src=toDataUri(pendingLoadB64);
  const img=new Image();
  img.onload=()=>{
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width/2,canvas.height/2);
    hasInk=true;
    pendingLoadB64=null;
  };
  img.onerror=()=>{pendingLoadB64=null;};
  img.src=src;
}
function loadPng(b64){
  clearPad();
  if(!b64)return;
  pendingLoadB64=String(b64);
  scheduleDrawPending(0);
}
function post(type,payload){
  const msg=JSON.stringify(payload?{type,payload}:{type});
  if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(msg);
}
function onHostMessage(e){
  try{
    const raw=e.data;
    const d=typeof raw==='string'?JSON.parse(raw||'{}'):raw||{};
    if(d.type==='clear')clearPad();
    if(d.type==='export')exportPng();
    if(d.type==='load')loadPng(d.payload||'');
  }catch(err){}
}
function onDown(e){
  drawing=true;
  const r=canvas.getBoundingClientRect();
  lastX=(e.clientX||e.touches?.[0]?.clientX)-r.left;
  lastY=(e.clientY||e.touches?.[0]?.clientY)-r.top;
}
function onMove(e){
  if(!drawing)return;
  e.preventDefault();
  const r=canvas.getBoundingClientRect();
  const x=(e.clientX||e.touches?.[0]?.clientX)-r.left;
  const y=(e.clientY||e.touches?.[0]?.clientY)-r.top;
  ctx.beginPath();ctx.moveTo(lastX,lastY);ctx.lineTo(x,y);ctx.stroke();
  hasInk=true;
  lastX=x;lastY=y;
}
function onUp(){drawing=false;}
canvas.addEventListener('mousedown',onDown);
canvas.addEventListener('mousemove',onMove);
window.addEventListener('mouseup',onUp);
canvas.addEventListener('touchstart',onDown,{passive:false});
canvas.addEventListener('touchmove',onMove,{passive:false});
canvas.addEventListener('touchend',onUp);
window.addEventListener('message',onHostMessage);
document.addEventListener('message',onHostMessage);
window.addEventListener('resize',resize);
resize();
post('ready');
<\/script></body></html>`;

export { SIGNATURE_HTML };

export function normalizeSignaturePngBase64(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('data:')) {
    const idx = trimmed.indexOf(',');
    return idx >= 0 ? trimmed.slice(idx + 1).replace(/\s/g, '') : trimmed.replace(/\s/g, '');
  }
  return trimmed.replace(/\s/g, '');
}
