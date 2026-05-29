/* ===== smooth momentum scroll (Lenis): adds elastic inertia to scrolling (up and down).
   real-scroll mode -> sticky pins, fixed header, and scrollY-based handlers all keep working.
   skipped for reduced-motion. */
(function(){
  if(typeof Lenis==='undefined')return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const lenis=new Lenis({lerp:0.09,smoothWheel:true});
  (function raf(t){lenis.raf(t);requestAnimationFrame(raf);})();
})();

/* ===== custom inverting (difference) cursor, smooth follow ===== */
(function(){
  const cur=document.getElementById('cursor');
  if(!cur||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;
  addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
  // grow over interactive elements
  document.querySelectorAll('#ci-logo,#menu-logo,#lets-talk,#full-menu,#menu-close,.menu-item,.brief-btn,.project-head').forEach(el=>{
    el.addEventListener('mouseenter',()=>{cur.style.width='80px';cur.style.height='80px';});
    el.addEventListener('mouseleave',()=>{cur.style.width='32px';cur.style.height='32px';});
  });
  (function loop(){
    cx+=(mx-cx)*0.32;cy+=(my-cy)*0.32;
    const r=cur.offsetWidth/2;
    cur.style.transform='translate3d('+(cx-r)+'px,'+(cy-r)+'px,0)';
    requestAnimationFrame(loop);
  })();
})();

/* ===== magnetic + spring hover on interactive elements =====
   pulls the element toward the cursor while hovering, then springs back
   (slight overshoot) on leave. subtle. desktop/fine-pointer only. */
(function(){
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const STRENGTH=0.5, STIFF=0.12, DAMP=0.78, MAX=20; // spring: mild elastic overshoot; MAX caps pull (large elements clamp here; higher STRENGTH lets small ones pull more)
  const clamp=v=>Math.max(-MAX,Math.min(MAX,v));
  const items=[];
  document.querySelectorAll('#ci-logo,#menu-logo,#lets-talk,#full-menu,#menu-close,.menu-item').forEach(el=>{
    const it={el,tx:0,ty:0,x:0,y:0,vx:0,vy:0,zeroed:true};
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      // subtract current translate (x,y) to get the untransformed center -> no feedback drift
      it.tx=clamp((e.clientX-(r.left+r.width/2-it.x))*STRENGTH);
      it.ty=clamp((e.clientY-(r.top+r.height/2-it.y))*STRENGTH);
    });
    el.addEventListener('mouseleave',()=>{it.tx=0;it.ty=0;});
    items.push(it);
  });
  if(!items.length)return;
  // single shared spring loop; skip the transform write once an element is fully at rest
  (function frame(){
    for(let i=0;i<items.length;i++){
      const it=items[i];
      it.vx=(it.vx+(it.tx-it.x)*STIFF)*DAMP; it.x+=it.vx;
      it.vy=(it.vy+(it.ty-it.y)*STIFF)*DAMP; it.y+=it.vy;
      if(it.tx===0&&it.ty===0&&Math.abs(it.x)<.01&&Math.abs(it.y)<.01&&Math.abs(it.vx)<.01&&Math.abs(it.vy)<.01){
        if(!it.zeroed){it.x=it.y=it.vx=it.vy=0;it.el.style.transform='translate(0,0)';it.zeroed=true;}
        continue;
      }
      it.zeroed=false;
      it.el.style.transform='translate('+it.x.toFixed(2)+'px,'+it.y.toFixed(2)+'px)';
    }
    requestAnimationFrame(frame);
  })();
})();

/* ===== background circles =====
   scale with the SAME factor as the blob: k = clamp(min(W,H),864,1296)/1080,
   positioned around the viewport center (like the blob), + subtle mouse parallax. */
(function(){
  const c1=document.querySelector('#bg-line .circ-1');
  const c2=document.querySelector('#bg-line .circ-2');
  if(!c1||!c2)return;
  const R=718; // design circle radius (px @ 1080 baseline)
  // design circle centers as offset from the 1920x1080 frame center (960,540)
  const C=[{el:c1,ox:520.5,oy:-340.5},{el:c2,ox:210.5,oy:-210.5}];
  function k(){return Math.max(0.8,Math.min(Math.min(innerWidth,innerHeight)/1080,1.2));} // == blob factor
  function layout(){
    const f=k(),r=R*f,d=r*2,cx=innerWidth/2,cy=innerHeight/2;
    C.forEach(o=>{
      o.el.style.width=d+'px';o.el.style.height=d+'px';
      o.el.style.left=(cx+o.ox*f-r)+'px';
      o.el.style.top =(cy+o.oy*f-r)+'px';
    });
  }
  layout();
  window.addEventListener('resize',layout);
  window.addEventListener('mousemove',e=>{
    const mx=(e.clientX/innerWidth-0.5)*2;   // -1..1
    const my=(e.clientY/innerHeight-0.5)*2;  // -1..1
    c1.style.transform='translate('+(mx*14)+'px,'+(my*14)+'px)';
    c2.style.transform='translate('+(mx*-22)+'px,'+(my*20)+'px)';
  });
})();

/* ===== full-screen menu: circular reveal + radial (polar) halftone edge =====
   one JS clock drives BOTH the solid core (#menu-panel clip-path) and the canvas halftone,
   so they stay locked. dots sit on rings concentric with the menu button (matching the
   reveal's wavefront): big at the solid edge, shrinking to nothing at the leading edge. */
(function(){
  const overlay=document.getElementById('menu-overlay');
  const panel=document.getElementById('menu-panel');
  const canvas=document.getElementById('menu-dots');
  const openBtn=document.getElementById('full-menu');
  const closeBtn=document.getElementById('menu-close');
  if(!overlay||!openBtn||!closeBtn)return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const ctx=(!reduce&&canvas&&canvas.getContext)?canvas.getContext('2d'):null;
  const ORIGIN='at calc(100% - 76px) 60px';
  const TAU=6.2831853;
  const RINGGAP=34, ARC=34, DOTMIN=2, DOTMAX=18, FRINGE=240, DUR=900; // ring/arc spacing, dot min/max radius, fringe band, ms

  let cx=0,cy=0,W=0,H=0,maxR=1;
  function resize(){
    W=innerWidth;H=innerHeight;cx=W-76;cy=60;
    const far=Math.hypot(Math.max(cx,W-cx),Math.max(cy,H-cy));
    maxR=far+FRINGE+80;           // solid (=wave-FRINGE) still covers the far corner at full open
    if(!ctx)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{resize();render(R);},200);});

  function render(waveR){
    if(!ctx)return;                       // reduced-motion uses the CSS panel instead
    ctx.clearRect(0,0,W,H);
    if(waveR<=0)return;
    const solidR=Math.max(0,waveR-FRINGE);
    ctx.fillStyle='#3E3F44';
    // solid core drawn on the SAME canvas (no per-frame clip-path -> no circle collapse/flicker)
    ctx.beginPath();ctx.arc(cx,cy,solidR,0,TAU);ctx.fill();
    // FIXED ring radii (multiples of RINGGAP) so rings never slide; only dot radius animates.
    const innerSkip=solidR-RINGGAP;
    for(let ringIndex=1, r=RINGGAP; r<=waveR; ringIndex++, r+=RINGGAP){
      if(r<innerSkip)continue;                        // covered by the solid core (perf)
      const t=Math.min(1,(waveR-r)/FRINGE);
      const dr=DOTMIN+(DOTMAX-DOTMIN)*t;              // max near the solid edge -> min at the leading edge
      if(dr<0.4)continue;
      const n=Math.max(6,Math.round(TAU*r/ARC));
      const off=(ringIndex&1)*(Math.PI/n);            // stagger alternate rings (stable per ring)
      for(let k=0;k<n;k++){
        const a=k*TAU/n+off, x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
        if(x<-DOTMAX||x>W+DOTMAX||y<-DOTMAX||y>H+DOTMAX)continue; // cull off-screen
        ctx.beginPath();ctx.arc(x,y,dr,0,TAU);ctx.fill();
      }
    }
  }

  // one fixed-duration eased clock; continues smoothly if reversed mid-flight
  let raf=0,R=0,fromR=0,toR=0,t0=0;
  const ease=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2; // easeInOutCubic
  function tick(now){
    if(!t0)t0=now;
    let p=(now-t0)/DUR; if(p>1)p=1;
    R=fromR+(toR-fromR)*ease(p);
    render(R);
    if(p<1){raf=requestAnimationFrame(tick);return;}
    raf=0;R=toR;render(R);
    if(toR>=maxR)overlay.classList.add('covered'); // fully covered -> blob may pause
    else if(toR===0&&ctx)ctx.clearRect(0,0,W,H);
  }
  function animate(t){fromR=R;toR=t;t0=0;if(!raf)raf=requestAnimationFrame(tick);}

  const open=()=>{
    overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
    if(reduce){if(panel)panel.style.clipPath='circle(150vmax '+ORIGIN+')';overlay.classList.add('covered');}
    else animate(maxR);
  };
  const close=()=>{
    overlay.classList.remove('open','covered');overlay.setAttribute('aria-hidden','true');
    if(reduce){if(panel)panel.style.clipPath='circle(0 '+ORIGIN+')';}
    else animate(0);
  };
  openBtn.addEventListener('click',open);
  closeBtn.addEventListener('click',close);
  addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close();});
})();

/* ===== intro reveal: headline then subtitle settle in from a soft blur ===== */
(function(){
  const els=['head-title','sub-title'].map(id=>document.getElementById(id)).filter(Boolean);
  if(!els.length)return;
  const reveal=()=>els.forEach(el=>el.classList.add('in'));
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){reveal();return;}
  const go=()=>requestAnimationFrame(reveal);
  // wait for the serif webfont so the reveal plays with final glyphs, not fallback
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(go);setTimeout(go,800);}
  else go();
})();

/* ===== pinned swap chapter: blur SCRUBBED by scroll through the pin -> always synced with
   scroll speed (fast scroll = fast sequence, no lag). pinned & centered, so only the blur
   changes (text doesn't move). sequential: Beyond in -> hold -> out, then Frame 26 in. */
(function(){
  const chapter=document.querySelector('.sec-swap');
  if(!chapter)return;
  const bLines=[...chapter.querySelectorAll('.beyond-title .line-1,.beyond-title .line-2')];
  const fLines=[...chapter.querySelectorAll('.frame26-title span')];
  const clamp=v=>Math.min(1,Math.max(0,v));
  const set=(l,s)=>{l.style.opacity=s.toFixed(3);l.style.filter='blur('+(16*(1-s)).toFixed(2)+'px)';};
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){bLines.forEach(l=>set(l,0));fLines.forEach(l=>set(l,1));return;}
  let ticking=false;
  function update(){
    ticking=false;
    const scrub=chapter.offsetHeight-innerHeight;                 // pin distance
    const p=scrub>0?clamp(-chapter.getBoundingClientRect().top/scrub):0;
    // Beyond: blur IN (0 -> 0.22), hold, blur OUT (0.45 -> 0.62); per-line stagger
    bLines.forEach((l,i)=>{const o=i*0.06; set(l, clamp(p<0.33 ? (p-o)/0.20 : 1-(p-0.45-o)/0.15));});
    // Frame 26: blur IN after Beyond has left (0.62 -> 0.82); per-line stagger
    fLines.forEach((l,i)=>set(l, clamp((p-0.62-i*0.06)/0.18)));
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});
  addEventListener('resize',update);
  update();
})();

/* ===== hero parallax exit: layers leave at different speeds (depth) as you scroll away.
   mapped DIRECTLY to scroll position (no per-layer easing) — the elastic smoothness comes from
   Lenis, so every layer moves together with the smoothed scroll instead of lagging separately. */
(function(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const layers=[
    {el:document.getElementById('blob'),      rate: 120},  // background: moves least
    {el:document.getElementById('sub-title'), rate:-130},
    {el:document.getElementById('head-title'),rate:-250},
    {el:document.getElementById('symbol'),    rate:-380}   // foreground: moves most
  ].filter(l=>l.el);
  if(!layers.length)return;
  let ticking=false;
  function update(){
    ticking=false;
    const p=Math.min(1,(window.scrollY||0)/innerHeight); // 0 at top -> 1 after one viewport
    for(const l of layers) l.el.style.transform='translateY('+(p*l.rate).toFixed(1)+'px)';
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});
  update();
})();

/* ===== section parallax: [data-parallax] elements drift with inertia as they pass the
   viewport (same eased feel as the hero), so scrolling up/down isn't a flat 1:1 move. */
(function(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const items=[...document.querySelectorAll('[data-parallax]')].map(el=>({
    el, rate:parseFloat(el.dataset.parallax)||0, ease:0.09, cur:0, base:0
  }));
  if(!items.length)return;
  function measure(){ // doc-space center of each element, with current transform removed
    for(const it of items){const r=it.el.getBoundingClientRect();it.base=r.top+window.scrollY-it.cur+r.height/2;}
  }
  measure();
  let mt;addEventListener('resize',()=>{clearTimeout(mt);mt=setTimeout(measure,200);});
  let raf=0;
  function loop(){
    const vc=window.scrollY+innerHeight/2; // viewport center in doc space
    let moving=false;
    for(const it of items){
      // only ease on the way OUT (element above viewport center); entering from below = no drift,
      // so the clean blur-reveal plays untouched.
      const target=Math.min(0,(it.base-vc)/innerHeight)*it.rate;
      it.cur+=(target-it.cur)*it.ease;
      if(Math.abs(target-it.cur)>0.1)moving=true;
      it.el.style.transform='translateY('+it.cur.toFixed(2)+'px)';
    }
    raf=moving?requestAnimationFrame(loop):0;
  }
  const kick=()=>{if(!raf)raf=requestAnimationFrame(loop);};
  addEventListener('scroll',kick,{passive:true});
  kick();
})();
