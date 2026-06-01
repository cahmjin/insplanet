/* ===== Frame 27 "fractal glass" background (ported from fractal_glass_final.html).
   Two gradient torus "donuts" rendered with Three.js, then a per-bar blur + gradient
   overlay on a 2D canvas gives the refracted-glass look. UI panel removed, params fixed,
   sized to the .frame27-card element, self-animating (continuous rotation). The rAF only
   runs while the card is on screen (IntersectionObserver). Degrades to a single static
   frame for reduced-motion / no-WebGL. */
(function(){
  const scene$=document.getElementById('fg-scene');
  const overlay=document.getElementById('fg-overlay');
  const card=document.querySelector('.frame27-card');
  if(typeof THREE==='undefined'||!scene$||!overlay||!card)return;

  /* fixed params (the lab's final tuned values) */
  const state={
    blur:90, barCount:28, gradAlpha:0.30,
    gradStops:[
      {color:'#ffffff', pos:0,    alpha:1.0},
      {color:'#09152c', pos:0.28, alpha:1.0},
      {color:'#ffffff', pos:1.0,  alpha:1.0}
    ],
    d1:{x:-1.2, y:0.2,  size:1.9, rx:-0.47, ry:0.61, sx:0.45, sy:0.37, ca:'#0000ff', cb:'#8b0030'},
    d2:{x:1.2,  y:-1.2, size:1.2, rx:-0.93, ry:0.53, sx:0.68, sy:0.00, ca:'#888800', cb:'#006688'}
  };
  const DESIGN_W=1486;   // card width in the Figma design — blur scales relative to this

  const renderer=new THREE.WebGLRenderer({canvas:scene$,antialias:true,alpha:true});
  renderer.setClearColor(0x0f0e0e,1);   // matches the card background (#0F0E0E)
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,0.1,100);
  camera.position.z=8;

  function makeTorusMesh(outerR,tube,colorA,colorB){
    const geo=new THREE.TorusGeometry(outerR,tube,64,128);
    const colors=[],pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i);
      const t=(Math.atan2(y,x)/(Math.PI*2)+0.5);
      const t2=t<0.5?t*2:(1-t)*2;
      const c=new THREE.Color(colorA).lerp(new THREE.Color(colorB),t2);
      colors.push(c.r,c.g,c.b);
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    return new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true}));
  }
  const torus1=makeTorusMesh(1.0,0.44,state.d1.ca,state.d1.cb);
  const torus2=makeTorusMesh(1.0,0.42,state.d2.ca,state.d2.cb);
  const place=(m,d)=>{m.position.set(d.x,d.y,0);m.scale.setScalar(d.size);};
  place(torus1,state.d1); torus1.rotation.x=state.d1.rx; torus1.rotation.y=state.d1.ry;
  place(torus2,state.d2); torus2.rotation.x=state.d2.rx; torus2.rotation.y=state.d2.ry;
  scene.add(torus1,torus2);

  const ctx=overlay.getContext('2d');
  let W=0,H=0,dpr=1,blurPx=90;
  function resize(){
    // measure the canvas itself (fixed full size, board-scaled) — NOT the card, which
    // animates its size on entry. This keeps the fractal rendering at full size throughout.
    const r=scene$.getBoundingClientRect();
    if(!r.width||!r.height)return;
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=Math.round(r.width*dpr); H=Math.round(r.height*dpr);
    blurPx=state.blur*(r.width/DESIGN_W)*dpr;   // keep the glass softness proportional to the card
    renderer.setPixelRatio(dpr);
    renderer.setSize(r.width,r.height,false);
    camera.aspect=r.width/r.height; camera.updateProjectionMatrix();
    overlay.width=W; overlay.height=H;
  }
  resize();
  let rt; window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{resize();if(!running)frame(0);},150);});

  function paintBars(){
    const barW=W/state.barCount, pad=blurPx*2;
    // 1) blur the whole scene ONCE (every bar uses the same blurred image — no need to
    //    re-blur per bar; this is the key perf win, ~barCount x less blur work per frame)
    ctx.clearRect(0,0,W,H);
    ctx.filter=`blur(${blurPx}px)`;
    ctx.drawImage(scene$,-pad,-pad,W+pad*2,H+pad*2);
    ctx.filter='none';
    // 2) per-bar gradient slats (cheap fillRects, 'overlay' blend over the blurred image)
    ctx.globalCompositeOperation='overlay';
    ctx.globalAlpha=state.gradAlpha;
    for(let i=0;i<state.barCount;i++){
      const x=i*barW;
      const grad=ctx.createLinearGradient(x,0,x+barW,0);
      state.gradStops.forEach(s=>{
        const h=s.color.replace('#','');
        const rr=parseInt(h.slice(0,2),16),gg=parseInt(h.slice(2,4),16),bb=parseInt(h.slice(4,6),16);
        grad.addColorStop(Math.min(Math.max(s.pos,0),1),`rgba(${rr},${gg},${bb},${s.alpha})`);
      });
      ctx.fillStyle=grad;
      ctx.fillRect(x,0,barW,H);
    }
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=1;
  }

  let last=null;
  function frame(ts){
    if(!last)last=ts;
    const dt=Math.min((ts-last)/1000,0.05); last=ts;
    torus1.rotation.x+=state.d1.sx*dt; torus1.rotation.y+=state.d1.sy*dt;
    torus2.rotation.x+=state.d2.sx*dt; torus2.rotation.y+=state.d2.sy*dt;
    renderer.render(scene,camera);
    paintBars();
  }

  // run the loop only while the card is visible; one static frame otherwise
  let running=false,raf=0;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function tick(ts){ if(!running)return; frame(ts); raf=requestAnimationFrame(tick); }
  function start(){ if(running||reduce)return; running=true; last=null; raf=requestAnimationFrame(tick); }
  function stop(){ running=false; if(raf)cancelAnimationFrame(raf); raf=0; }

  frame(0);   // initial paint so it's there before scrolling in
  if(reduce)return;
  if('IntersectionObserver'in window){
    new IntersectionObserver(es=>{es.forEach(e=>e.isIntersecting?start():stop());},{threshold:0.01})
      .observe(card);
  }else start();
})();
