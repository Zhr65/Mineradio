
/* ---- 水晶球 + 音波指纹 ---- */
(function() {
  var canvas = document.getElementById('crystalCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W=300, H=200, cx=150, cy=90, ballR=60, t=0;
  var pts = [];
  var spec = new Uint8Array(128);
  var aid;
  for (var i=0;i<50;i++) pts.push({
    a:Math.random()*Math.PI*2, d:Math.random()*0.8, y:(Math.random()-.5)*1.2,
    s:0.2+Math.random()*0.6, sz:0.3+Math.random()*1.2, al:0.3+Math.random()*0.7, tw:Math.random()*Math.PI*2
  });
  function rs() {
    var r=canvas.parentElement.getBoundingClientRect();
    W=Math.max(r.width,200); H=Math.max(r.height,200);
    canvas.width=W*(window.devicePixelRatio||1);
    canvas.height=H*(window.devicePixelRatio||1);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(window.devicePixelRatio||1,window.devicePixelRatio||1);
    cx=W/2; cy=H/2-10; ballR=Math.min(W,H)*0.22;
  }
  rs();
  function gb(l,h){var s=0;for(var i=l;i<h&&i<spec.length;i++)s+=spec[i];return s/(h-l)/255;}
  function dr() {
    aid=requestAnimationFrame(dr); t+=0.016;
    if (typeof analyser!=='undefined'&&analyser) analyser.getByteFrequencyData(spec);
    ctx.clearRect(0,0,W,H);
    var bass=gb(0,10), mid=gb(10,50), high=gb(50,110), e=bass*0.5+mid*0.3+high*0.2;
    var bg=ctx.createRadialGradient(cx,cy,ballR*0.5,cx,cy,Math.max(W,H));
    bg.addColorStop(0,'rgba(10,15,25,0)');bg.addColorStop(0.5,'rgba(5,8,14,0.3)');bg.addColorStop(1,'rgba(2,3,6,0.85)');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    for(var r=0;r<16;r++){
      var bv=gb(r*6,(r+1)*6);
      var rr=ballR*1.15+r*(ballR*0.18)+bv*ballR*0.6;
      ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);
      ctx.strokeStyle='rgba(0,245,212,'+(0.06+bv*0.18)+')';ctx.lineWidth=0.5+bv*1.8;ctx.stroke();
      if(bv>0.25){
        var ha=r*0.6+t*0.3;
        ctx.beginPath();ctx.arc(cx,cy,rr,ha,ha+bv*Math.PI);
        ctx.strokeStyle='rgba(244,210,138,'+(0.12+bv*0.3)+')';ctx.lineWidth=(0.5+bv*1.8)*1.5;ctx.stroke();
      }
    }
    var bG=ctx.createRadialGradient(cx-ballR*0.25,cy-ballR*0.35,ballR*0.1,cx,cy,ballR);
    bG.addColorStop(0,'rgba(255,255,255,0.12)');bG.addColorStop(0.25,'rgba(0,245,212,0.06)');
    bG.addColorStop(0.5,'rgba(10,20,35,0.4)');bG.addColorStop(0.8,'rgba(0,180,200,0.08)');
    bG.addColorStop(1,'rgba(0,245,212,'+(0.12+e*0.1)+')');
    ctx.beginPath();ctx.arc(cx,cy,ballR,0,Math.PI*2);ctx.fillStyle=bG;ctx.fill();
    ctx.beginPath();ctx.arc(cx,cy,ballR,0,Math.PI*2);
    ctx.strokeStyle='rgba(0,245,212,'+(0.25+e*0.35)+')';ctx.lineWidth=1.2+e*1.5;ctx.stroke();
    var hl=ctx.createRadialGradient(cx-ballR*0.3,cy-ballR*0.35,0,cx-ballR*0.3,cy-ballR*0.35,ballR*0.22);
    hl.addColorStop(0,'rgba(255,255,255,0.35)');hl.addColorStop(1,'rgba(255,255,255,0)');
    ctx.beginPath();ctx.arc(cx-ballR*0.3,cy-ballR*0.35,ballR*0.22,0,Math.PI*2);ctx.fillStyle=hl;ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,ballR*0.92,0,Math.PI*2);ctx.clip();
    for(var i=0;i<pts.length;i++){
      var p=pts[i];p.a+=p.s*0.02*(1+e*3);p.tw+=0.05;
      var px=cx+Math.cos(p.a)*ballR*p.d, py=cy+Math.sin(p.a*1.3)*ballR*p.d*0.7+p.y*ballR*0.5;
      var pa=p.al*(0.6+0.4*Math.sin(p.tw))*(0.5+e);
      var pG=ctx.createRadialGradient(px,py,0,px,py,ballR*p.sz*0.03);
      pG.addColorStop(0,'rgba(0,245,212,'+pa+')');pG.addColorStop(1,'rgba(0,245,212,0)');
      ctx.beginPath();ctx.arc(px,py,ballR*p.sz*0.03,0,Math.PI*2);ctx.fillStyle=pG;ctx.fill();
    }
    ctx.restore();
    if(e>0.15){
      var pG2=ctx.createRadialGradient(cx,cy,ballR*0.95,cx,cy,ballR*1.25);
      pG2.addColorStop(0,'rgba(0,245,212,0)');pG2.addColorStop(1,'rgba(0,245,212,'+(e*0.12)+')');
      ctx.beginPath();ctx.arc(cx,cy,ballR*1.25,0,Math.PI*2);ctx.fillStyle=pG2;ctx.fill();
    }
    var song=null;
    if(typeof playQueue!=='undefined'&&typeof currentIdx!=='undefined') song=playQueue[currentIdx];
    var ne=document.getElementById('crystalSongName'), ae=document.getElementById('crystalSongArtist');
    if(song){if(ne)ne.textContent=song.name||'';if(ae)ae.textContent=song.artist||'';}
    else{if(ne)ne.textContent='未在播放';if(ae)ae.textContent='导入或搜索音乐开始';}
  }
  function start(){if(aid)return;rs();dr();}
  function stop(){if(aid){cancelAnimationFrame(aid);aid=null;}}
  window.addEventListener('resize',rs);
  new ResizeObserver(rs).observe(canvas.parentElement);
  new MutationObserver(function(){
    if(document.body.classList.contains('empty-home-active'))start();else stop();
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  if(document.body.classList.contains('empty-home-active'))start();
  else setTimeout(start,1000);
})();
