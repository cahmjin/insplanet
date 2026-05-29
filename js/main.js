/* ===== custom inverting (difference) cursor, smooth follow ===== */
(function(){
  const cur=document.getElementById('cursor');
  if(!cur||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;
  addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
  // grow over interactive elements
  document.querySelectorAll('#ciLogo,#menuLogo,#letsTalk,#fullMenu,#menuClose,.m-item,.briefBtn,.pj-head').forEach(el=>{
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
  const STRENGTH=0.3, STIFF=0.12, DAMP=0.78, MAX=20; // spring: mild elastic overshoot; MAX caps pull so large elements don't over-travel
  const clamp=v=>Math.max(-MAX,Math.min(MAX,v));
  const items=[];
  document.querySelectorAll('#ciLogo,#menuLogo,#letsTalk,#fullMenu,#menuClose,.m-item').forEach(el=>{
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
  const c1=document.querySelector('#bgLine .c1');
  const c2=document.querySelector('#bgLine .c2');
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
   one JS clock drives BOTH the solid core (#menuPanel clip-path) and the canvas halftone,
   so they stay locked. dots sit on rings concentric with the menu button (matching the
   reveal's wavefront): big at the solid edge, shrinking to nothing at the leading edge. */
(function(){
  const overlay=document.getElementById('menuOverlay');
  const panel=document.getElementById('menuPanel');
  const canvas=document.getElementById('menuDots');
  const openBtn=document.getElementById('fullMenu');
  const closeBtn=document.getElementById('menuClose');
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
  const els=['headTitle','subTitle'].map(id=>document.getElementById(id)).filter(Boolean);
  if(!els.length)return;
  const reveal=()=>els.forEach(el=>el.classList.add('in'));
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){reveal();return;}
  const go=()=>requestAnimationFrame(reveal);
  // wait for the serif webfont so the reveal plays with final glyphs, not fallback
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(go);setTimeout(go,800);}
  else go();
})();
