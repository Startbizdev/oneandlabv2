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
let drawing=false,lastX=0,lastY=0;
function resize(){
  const r=canvas.getBoundingClientRect();
  canvas.width=Math.max(1,Math.floor(r.width*2));
  canvas.height=Math.max(1,Math.floor(r.height*2));
  ctx.setTransform(2,0,0,2,0,0);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111';ctx.lineWidth=2.2;
}
function clearPad(){ctx.clearRect(0,0,canvas.width,canvas.height);post('cleared');}
function isEmpty(){
  const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  for(let i=3;i<d.length;i+=4){if(d[i])return false;}
  return true;
}
function exportPng(){
  if(isEmpty()){post('empty');return;}
  post('png',canvas.toDataURL('image/png'));
}
function loadPng(b64){
  clearPad();
  if(!b64)return;
  const img=new Image();
  img.onload=()=>{ctx.drawImage(img,0,0,canvas.width/2,canvas.height/2);};
  img.src=b64.startsWith('data:')?b64:'data:image/png;base64,'+b64;
}
function post(type,payload){
  const msg=JSON.stringify(payload?{type,payload}:{type});
  if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(msg);
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
  lastX=x;lastY=y;
}
function onUp(){drawing=false;}
canvas.addEventListener('mousedown',onDown);
canvas.addEventListener('mousemove',onMove);
window.addEventListener('mouseup',onUp);
canvas.addEventListener('touchstart',onDown,{passive:false});
canvas.addEventListener('touchmove',onMove,{passive:false});
canvas.addEventListener('touchend',onUp);
window.addEventListener('message',(e)=>{
  try{
    const d=JSON.parse(e.data||'{}');
    if(d.type==='clear')clearPad();
    if(d.type==='export')exportPng();
    if(d.type==='load')loadPng(d.payload||'');
  }catch(err){}
});
window.addEventListener('resize',resize);
resize();
post('ready');
<\/script></body></html>`;

export { SIGNATURE_HTML };
