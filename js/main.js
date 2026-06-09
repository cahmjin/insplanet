/* ===== smooth momentum scroll (Lenis): adds elastic inertia to scrolling (up and down).
   real-scroll mode -> sticky pins, fixed header, and scrollY-based handlers all keep working.
   skipped for reduced-motion. */
(function(){
  if(typeof Lenis==='undefined')return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const lenis=new Lenis({lerp:0.09,smoothWheel:true});
  window.__lenis=lenis;   // exposed so the menu overlay can lock/unlock scroll
  (function raf(t){lenis.raf(t);requestAnimationFrame(raf);})();
})();

/* ===== custom inverting (difference) cursor, smooth follow ===== */
(function(){
  const cur=document.getElementById('cursor');
  if(!cur||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;
  addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
  // Decide the cursor MODE each frame from the topmost element under the pointer (single source of
  // truth via elementFromPoint) instead of per-element mouseenter/leave. The top buttons overlap the
  // project panel AND drift (magnetic hover), which made enter/leave race and flicker is-view<->grow.
  const GROW_SEL='#ci-logo,#menu-logo,#lets-talk,#full-menu,#menu-close,.menu-item,.brief-btn,.project-head,.footer-links a';
  let mode='';
  // smooth follow (no momentum): moves fast when far, decelerates to a soft stick as it nears.
  const FOLLOW=0.13;
  (function loop(){
    const el=document.elementFromPoint(mx,my);
    let m='';
    if(el){
      if(el.closest('.cta-arrow'))m='hide';              // the CTA arrow IS the cursor here -> hide the dot
      else if(el.closest(GROW_SEL))m='grow';
      else if(el.closest('.proj-visual'))m='view';
    }
    if(m!==mode){
      mode=m;
      cur.classList.toggle('is-view', m==='view');
      cur.style.opacity = m==='hide' ? '0' : '';         // reappears on leave
      cur.style.width = m==='grow' ? '80px' : '';        // grow=80 inline; view(96)/normal(32) from CSS
      cur.style.height = m==='grow' ? '80px' : '';
    }
    cx+=(mx-cx)*FOLLOW;cy+=(my-cy)*FOLLOW;
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
  document.querySelectorAll('#ci-logo,#menu-logo,#lets-talk,#full-menu,#menu-close,.menu-item,.cta-arrow,.footer-links a').forEach(el=>{
    const sMax=el.classList.contains('cta-arrow')?1.4:1;   // the CTA arrow also grows on hover (scale folded into the spring)
    const it={el,tx:0,ty:0,x:0,y:0,vx:0,vy:0,sMax,s:1,sTo:1,zeroed:true};
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      // subtract current translate (x,y) to get the untransformed center -> no feedback drift
      it.tx=clamp((e.clientX-(r.left+r.width/2-it.x))*STRENGTH);
      it.ty=clamp((e.clientY-(r.top+r.height/2-it.y))*STRENGTH);
      it.sTo=sMax;
    });
    el.addEventListener('mouseleave',()=>{it.tx=0;it.ty=0;it.sTo=1;});
    items.push(it);
  });
  if(!items.length)return;
  // single shared spring loop; skip the transform write once an element is fully at rest
  (function frame(){
    for(let i=0;i<items.length;i++){
      const it=items[i];
      it.vx=(it.vx+(it.tx-it.x)*STIFF)*DAMP; it.x+=it.vx;
      it.vy=(it.vy+(it.ty-it.y)*STIFF)*DAMP; it.y+=it.vy;
      it.s+=(it.sTo-it.s)*0.2;                              // smooth scale toward target (1 or sMax)
      if(it.tx===0&&it.ty===0&&it.sTo===1&&Math.abs(it.x)<.01&&Math.abs(it.y)<.01&&Math.abs(it.vx)<.01&&Math.abs(it.vy)<.01&&Math.abs(it.s-1)<.001){
        if(!it.zeroed){it.x=it.y=it.vx=it.vy=0;it.s=1;it.el.style.transform=it.sMax>1?'translate(0,0) scale(1)':'translate(0,0)';it.zeroed=true;}
        continue;
      }
      it.zeroed=false;
      it.el.style.transform='translate('+it.x.toFixed(2)+'px,'+it.y.toFixed(2)+'px)'+(it.sMax>1?' scale('+it.s.toFixed(3)+')':'');
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
  const RINGGAP=34, ARC=34, DOTMIN=2, DOTMAX=18, FRINGE=240, DUR=600; // ring/arc spacing, dot min/max radius, fringe band, ms

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
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{
    resize();
    // if the menu is open, keep the reveal radius at the NEW full size so it still covers
    // (settled -> snap R; mid-open-animation -> retarget toR). prevents stale-radius gaps.
    if(overlay.classList.contains('open')){ if(raf===0){R=toR=maxR;} else {toR=maxR;} }
    render(R);
  },200);});

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
  const ease=p=>1-Math.pow(1-p,3); // easeOutCubic — moves immediately on click (no slow ease-in start)
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

  // lock the background page while the menu is open (modal), WITHOUT touching overflow —
  // hiding the scrollbar would change the page width and make content judder. Instead we
  // block the scroll inputs: Lenis.stop() kills wheel/touch, and we swallow scroll keys.
  let scrollLocked=false;
  const SCROLL_KEYS=new Set([' ','Spacebar','PageUp','PageDown','Home','End','ArrowUp','ArrowDown']);
  // allow wheel/touch INSIDE the menu's own scroll container (overscroll-behavior:contain stops
  // it chaining to the page); only block inputs aimed at the locked page behind the overlay.
  const inMenuScroll=e=>e.target&&e.target.closest&&e.target.closest('.menu-scroll');
  addEventListener('wheel',e=>{if(scrollLocked&&!inMenuScroll(e))e.preventDefault();},{passive:false});
  addEventListener('touchmove',e=>{if(scrollLocked&&!inMenuScroll(e))e.preventDefault();},{passive:false});
  addEventListener('keydown',e=>{if(scrollLocked&&SCROLL_KEYS.has(e.key))e.preventDefault();},{passive:false});
  const lockScroll=on=>{
    scrollLocked=on;
    if(window.__lenis)on?window.__lenis.stop():window.__lenis.start();
  };
  overlay.inert=true;   // closed by default: keep it out of focus order / assistive tech
  const open=()=>{
    overlay.inert=false;
    overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
    lockScroll(true);
    if(reduce){if(panel)panel.style.clipPath='circle(150vmax '+ORIGIN+')';overlay.classList.add('covered');}
    else animate(maxR);
    closeBtn.focus({preventScroll:true});   // move focus into the dialog
  };
  const close=()=>{
    // move focus out BEFORE hiding, so a focused descendant isn't trapped under aria-hidden/inert
    if(overlay.contains(document.activeElement))openBtn.focus({preventScroll:true});
    overlay.classList.remove('open','covered');overlay.setAttribute('aria-hidden','true');
    overlay.inert=true;
    lockScroll(false);
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
  const chapter=document.querySelector('.beyond-swap');
  if(!chapter)return;
  const bLines=[...chapter.querySelectorAll('.beyond-title .line-1,.beyond-title .line-2')];
  const fLines=[...chapter.querySelectorAll('.beyond-statement span')];
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

/* ===== Frame 27 board scale: same min/max clamp as the hero background
   (k = clamp(min(W,H)/1080, 0.8, 1.2)) — NOT a fit-to-viewport scale. */
(function(){
  const board=document.querySelector('.insight-board');
  if(!board)return;
  const k=()=>board.style.setProperty('--insight-scale',
    Math.max(0.8,Math.min(Math.min(innerWidth,innerHeight)/1080,1.2)));
  k();
  addEventListener('resize',k);
})();

/* ===== Our Services frame scale: SAME factor as the Insight board, so the 1486px content frame
   lines up with the Insight card's left/right edges at every viewport size. ===== */
(function(){
  const sec=document.querySelector('.services');
  if(!sec)return;
  const k=()=>sec.style.setProperty('--svc-k',
    Math.max(0.8,Math.min(Math.min(innerWidth,innerHeight)/1080,1.2)));
  k();
  addEventListener('resize',k);
})();

/* ===== Frame 27 entry: grow the fractal card from 576x576 to full, once the pinned stage
   is in view (one-shot per entry via .is-grown on the board). */
(function(){
  const board=document.querySelector('.insight-board');
  const stage=document.querySelector('.pin-insight-stage');
  if(!board||!stage)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches||!('IntersectionObserver'in window)){
    board.classList.add('is-grown'); return;
  }
  // The grow animation should play ONLY on a downward entry. To avoid any flicker on an upward
  // entry, we pre-set the off-screen state based on WHICH edge the section left by:
  //   left via TOP (scrolled down past it)  -> keep it FULL  -> a later upward entry shows no change
  //   left via BOTTOM (scrolled up past it) -> reset to SMALL -> a later downward entry animates grow
  // The off-screen state change is wrapped in .no-anim so it's instant (and invisible anyway).
  new IntersectionObserver(es=>{
    es.forEach(e=>{
      if(e.isIntersecting && e.intersectionRatio>=0.5){
        board.classList.add('is-grown');        // small -> animates on the way in; already full -> no-op
      } else if(!e.isIntersecting){
        const r=stage.getBoundingClientRect();
        board.classList.add('no-anim');
        if(r.top>=innerHeight) board.classList.remove('is-grown');   // below viewport -> arm small
        else if(r.bottom<=0)   board.classList.add('is-grown');      // above viewport -> keep full
        void board.offsetWidth;                 // commit the no-transition state
        board.classList.remove('no-anim');
      }
    });
  },{threshold:[0,0.5]}).observe(stage);
})();

/* ===== Frame 27 pinned scroll: progress p (0..1 through the pin) drives the step swap
   (01 -> 02 -> 03 …, blur/fade with a hold per step). Pin height scales with step count.
   (The faint tagline marquee now auto-animates via CSS, independent of scroll.) */
(function(){
  const sec=document.querySelector('.pin-insight');
  const steps=[...document.querySelectorAll('.insight-step')];
  if(!sec||!steps.length)return;
  const N=steps.length;
  sec.style.height=(N*90)+'vh';               // 0.9 viewport of scroll per step (snappier swap)
  const clamp=v=>Math.min(1,Math.max(0,v));
  const EXIT_Y=48;                             // px the leaving text slides down as it fades
  const STAGGER=0.10;                          // title trails the eyebrow on exit (elastic cascade)
  const easeIn=x=>x*x;                          // accelerate downward — no upward wind-up
  const parts=steps.map(el=>({
    step:el,
    eyebrow:el.querySelector('.insight-eyebrow'),
    title:el.querySelector('.insight-title')
  }));
  const dots=[...document.querySelectorAll('.insight-indicator .insight-dot')];
  const setActiveDot=i=>dots.forEach((d,k)=>d.classList.toggle('is-active',k===i));
  // enter: text blurs + fades in place. exit: text accelerates DOWN + fades (no blur), title leading
  // and eyebrow trailing slightly for an elastic cascade. The 01/02/03 number swaps in place, no blur/move.
  const exitText=(el,e,delay)=>{
    if(!el)return;
    const eShift=clamp((e-delay)/(1-delay));
    el.style.filter='none';
    el.style.transform='translateY('+(easeIn(eShift)*EXIT_Y).toFixed(2)+'px)';
  };
  const enterText=(el,s)=>{
    if(!el)return;
    el.style.filter='blur('+(16*(1-s)).toFixed(2)+'px)';
    el.style.transform='none';
  };
  const setStep=(part,s,leaving)=>{
    part.step.style.opacity=s.toFixed(3);
    if(leaving){
      const e=1-s;                             // 0..1 as the step leaves
      exitText(part.title,e,0);
      exitText(part.eyebrow,e,STAGGER);
    }else{
      enterText(part.eyebrow,s);
      enterText(part.title,s);
    }
  };

  if(matchMedia('(prefers-reduced-motion:reduce)').matches){
    parts.forEach((part,i)=>setStep(part,i===0?1:0,false)); setActiveDot(0); return;
  }
  let ticking=false;
  function update(){
    ticking=false;
    const track=sec.offsetHeight-innerHeight;
    const p=track>0?clamp(-sec.getBoundingClientRect().top/track):0;
    // step swap: each step holds visible around its slot, crossfading to the next
    const sp=p*(N>1?N-1:1);                    // 0..N-1
    parts.forEach((part,i)=>setStep(part, N>1?clamp((0.75-Math.abs(sp-i))/0.5):1, sp>i));
    setActiveDot(Math.max(0,Math.min(N-1,Math.round(sp))));  // current step's dot fills
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});
  addEventListener('resize',update);
  update();
})();

/* ===== Our Services (Frame 31 -> 28): scrub the title scale big->small as you enter the section.
   origin top-left + a translateY so it starts big & vertically-centered and settles small at its
   sticky top-left resting spot. After that the sticky label keeps it fixed while the cards scroll. ===== */
(function(){
  const sec=document.querySelector('.services');
  const title=document.querySelector('.services-title');
  if(!sec||!title)return;
  const clamp=v=>Math.min(1,Math.max(0,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  // shrink TARGET (small label) + resting top per the 3 design anchors (1024/1920/2560).
  // the big title is fluid (96/132/160), so the scale is target/bigPx, recomputed live.
  const labelSize=w=> w<=1024?32 : w<=1920?lerp(32,48,(w-1024)/896) : w<=2560?lerp(48,56,(w-1920)/640) : 56;
  const restTop =w=> w<=1024?160 : w<=1920?lerp(160,240,(w-1024)/896) : 240;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){
    title.style.opacity='1';title.style.filter='none';return;
  }
  let ticking=false;
  function update(){
    ticking=false;
    const vh=innerHeight;
    const scrolled=-sec.getBoundingClientRect().top;
    const bi=clamp(scrolled/(0.25*vh));              // blur IN over the first 0.25 screen (like Beyond)
    const q=clamp((scrolled-0.65*vh)/(0.45*vh));     // HOLD sharp & full-size to 0.65, then SHRINK to 1.1
                                                     // (clear pause before it shrinks; cards rise after)
    const bigPx=parseFloat(getComputedStyle(title).fontSize)||160;
    const SMALL=labelSize(innerWidth)/bigPx;         // big(fluid) -> small label (32/48/56)
    const s=1+(SMALL-1)*q;                            // full size -> shrunk label
    const bigH=title.offsetHeight;
    const ty=(-bigH/2)*(1-q)+(restTop(innerWidth)-vh/2)*q; // centered -> small at the anchor's top (160/240)
    title.style.opacity=bi.toFixed(3);
    title.style.filter='blur('+(16*(1-bi)).toFixed(2)+'px)';
    title.style.transform='translateY('+ty.toFixed(1)+'px) scale('+s.toFixed(3)+')';
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});
  addEventListener('resize',update);
  update();
})();

/* ===== Our Services cards (Frame 28): each card rises in with an elastic ease as it enters view.
   one-shot per card; they sit far apart so they reveal sequentially as you scroll. ===== */
(function(){
  const cards=[...document.querySelectorAll('.svc-card')];
  if(!cards.length)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches||!('IntersectionObserver'in window)){
    cards.forEach(c=>c.classList.add('in')); return;
  }
  const io=new IntersectionObserver(es=>{
    es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:0.2});
  cards.forEach(c=>io.observe(c));
})();

/* ===== Our Partners (Frame 48): pinned reveal. The section is a 200vh track; the top edge scrolling
   from 0 to -(track-100vh) is the pin progress p (0..1). title+desc fade/de-blur in over the first
   slice, then the 5 logo rows rise in row-by-row (top -> down). At p=1 all settled; the sticky then
   releases and the whole section scrolls on. Also sets --logo-k (0.8@1024 -> 1.0@1920). ===== */
(function(){
  const sec=document.querySelector('.partners');
  const inner=document.querySelector('.partners-inner');
  const title=document.querySelector('.partners-title');
  const desc=document.querySelector('.partners-desc');
  const grid=document.querySelector('.partner-grid');
  if(!sec||!inner||!grid)return;
  const imgs=[...grid.querySelectorAll('img')];
  const clamp=v=>Math.min(1,Math.max(0,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=x=>1-Math.pow(1-x,3);                       // easeOutCubic
  const logoK=w=> w<=1024?0.8 : w<=1920?lerp(0.8,1,(w-1024)/896) : 1;
  const setK=()=>sec.style.setProperty('--logo-k', logoK(innerWidth).toFixed(4));
  setK(); addEventListener('resize',setK);
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;   // CSS shows everything static

  const COLS=5;
  const TH0=0.08, TH1=0.28;                               // title fade-in window (empty beat -> title appears, centered)
  const DH0=0.18, DH1=0.38;                               // desc fade-in window (sequential — just after the title, in place)
  const LOGO0=0.50;                                       // logos start fading in (in place, below the desc) here
  const ROLLSTART=0.66;                                   // block roll-up (scroll) starts LATER — once ~2 rows are in
  const STAG=0.06, RDUR=0.14;                             // per-row stagger + duration (cascade spans ~0.38: 0.50 -> ~0.88)
  const LRISE=60;                                         // px each logo rises from (lower start = more "rising up")
  let ticking=false;
  function update(){
    ticking=false;
    const vh=innerHeight;
    const p=clamp(-sec.getBoundingClientRect().top/((sec.offsetHeight-vh)||1));
    // 1) header appears, centered (like the other interstitials): title fades/de-blurs, then the desc
    const ht=clamp((p-TH0)/(TH1-TH0));
    title.style.opacity=ht.toFixed(3);
    title.style.filter='blur('+(16*(1-ht)).toFixed(2)+'px)';
    if(desc){ const hd=clamp((p-DH0)/(DH1-DH0)); desc.style.opacity=hd.toFixed(3); desc.style.filter='blur('+(8*(1-hd)).toFixed(2)+'px)'; }   // fades + de-blurs in place
    // 2) roll up: the whole block slides from header-centered to content-centered, lifting the grid
    //    into view from below
    const headerH=grid.offsetTop, contentH=inner.offsetHeight;
    const y0=(vh-headerH)/2, y1=(vh-contentH)/2;
    // LINEAR roll (not easeOut): easeOut finishes ~95% by the time the logos are in, leaving a near-
    // static tail before the pin releases ("stops then jumps"). Linear keeps it moving steadily to
    // the release, so the handoff to normal scroll reads continuous.
    const roll=clamp((p-ROLLSTART)/(1-ROLLSTART));
    inner.style.transform='translateY('+lerp(y0,y1,roll).toFixed(1)+'px)';
    // 3) logos fade in row-by-row (top -> down), in place below the desc; the roll-up (above) only
    //    kicks in once ~2 rows are settled, so they don't scroll the instant they appear
    for(let i=0;i<imgs.length;i++){
      const t=ease(clamp((p-LOGO0-Math.floor(i/COLS)*STAG)/RDUR));
      imgs[i].style.opacity=t.toFixed(3);
      imgs[i].style.transform='translateY('+(LRISE*(1-t)).toFixed(1)+'px)';
    }
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});
  addEventListener('resize',update);
  update();
})();

/* ===== Our Projects (Frame 39 -> 40): pinned. The big title blurs in then SHRINKS to the small
   top-left label (Services scrub); the split showcase reveals; then scrolling SWAPS through the 3
   projects (text slides + visual colour layers cross-fade) with the layout fixed. ===== */
(function(){
  const sec=document.querySelector('.projects');
  const title=document.querySelector('.projects-title');
  const visual=document.querySelector('.proj-visual');
  const info=document.querySelector('.proj-info');
  const projDots=[...document.querySelectorAll('.proj-indicator .proj-dot')];
  if(!sec||!title)return;
  const vises=[...sec.querySelectorAll('.proj-vis')];
  const slides=[...sec.querySelectorAll('.proj-slide')];
  // adaptive header UI: sample each project image's luminance where the fixed controls sit (top-right
  // for Let's Talk/menu, bottom-right for SCROLL) -> flip them to white over dark images.
  const ui={lt:document.getElementById('lets-talk'),fm:document.getElementById('full-menu'),sh:document.getElementById('scroll-hint'),ci:document.getElementById('ci-logo')};
  const cta=document.querySelector('.contact-cta');   // solid-dark CTA after projects -> also flips UI white
  const footer=document.querySelector('.footer');     // logo reveal when scrolled into view (one-shot)
  const imgEls=[...sec.querySelectorAll('.proj-img')];
  const lum=imgEls.map(()=>({top:false,bot:false}));
  const projInd=document.querySelector('.proj-indicator');   // right-centre step dots, recoloured per image
  function sampleImg(img,idx){
    try{
      const cw=64,ch=Math.round(cw*img.naturalHeight/img.naturalWidth)||72;
      const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;
      const c=cv.getContext('2d');c.drawImage(img,0,0,cw,ch);
      const at=(rx,ry)=>{const d=c.getImageData(Math.round(rx*(cw-1)),Math.round(ry*(ch-1)),1,1).data;return 0.299*d[0]+0.587*d[1]+0.114*d[2];};
      lum[idx]={top:at(0.86,0.06)<110, bot:at(0.86,0.94)<110};
    }catch(e){}
  }
  imgEls.forEach((img,i)=>{ if(img.complete&&img.naturalWidth)sampleImg(img,i); else img.addEventListener('load',()=>sampleImg(img,i),{once:true}); });
  const clamp=v=>Math.min(1,Math.max(0,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=x=>x*x*x*(x*(x*6.0-15.0)+10.0);           // smootherstep (C2) — gentler ease in/out than smoothstep
  const labelSize=w=> w<=1024?32 : w<=1920?lerp(32,48,(w-1024)/896) : w<=2560?lerp(48,56,(w-1920)/640) : 56;
  const restTop =w=> w<=1024?160 : w<=1920?lerp(160,240,(w-1024)/896) : 240;
  // the swap is AUTO-PLAYED (see startTween/animLoop below): crossing a scroll threshold tweens the
  // active project over a fixed time, so the slide motion is constant & smooth regardless of scroll.
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){
    title.style.opacity='1';title.style.filter='none';
    if(visual)visual.style.opacity='1'; if(info)info.style.opacity='1';
    if(vises[0]){vises[0].style.transform='translateY(0) scale(1)';vises[0].style.opacity='1';} if(slides[0])slides[0].style.opacity='1';
    return;
  }
  let topOn=false, botOn=false, logoOn=false;             // current adaptive-UI state (hysteresis below)
  // NOTE: the logo (top-LEFT) is tracked separately from Let's Talk/menu (top-RIGHT). In projects the
  // image only fills the RIGHT half, so the logo sits over the light left column and must NOT follow
  // the right-side darkness; only a fully-dark section (CTA) flips it.
  const SLIDE=62, CARD=0.72;                              // card slide distance (% of panel) + card scale
  // a visual layer's state by distance d = af - i : full when active, card+slide during a swap.
  // all eased (smoothstep) over wide windows so the grow/shrink feels smooth, not snappy.
  function visState(d){
    if(d<=-1) return [SLIDE,CARD,0];                      // upcoming, parked below
    if(d>= 1) return [-SLIDE,CARD,0];                     // gone, lifted out the top
    if(d<=0){                                             // incoming: rise from below, then grow to full
      const u=d+1;                                        // 0..1
      const ty=lerp(SLIDE,0, smooth(clamp(u/0.82)));      // rise (eased), settled by ~0.82
      const s =lerp(CARD,1, smooth(clamp((u-0.4)/0.6)));  // grow over the second half (eased, gentle)
      return [ty, s, clamp(u/0.2)];
    }
    // outgoing: shrink to a centred card (eased, wide), then lift up & out
    const s =lerp(1,CARD, smooth(clamp(d/0.6)));
    const ty=lerp(0,-SLIDE, smooth(clamp((d-0.18)/0.82)));
    return [ty, s, 1-clamp((d-0.6)/0.4)];
  }
  let ticking=false;
  // ---- one-cut swap: scroll only picks WHICH project (threshold zones); each change AUTO-PLAYS the
  //      full slide to the next over a fixed time (smootherstep). No scrubbing — clean cut per step. ----
  const AF_DUR=800;                                        // ms per auto-played cut
  const TR=[0.33, 0.66];                                   // pp thresholds: P1|P2 and P2|P3
  const HYST=0.05;                                         // hysteresis so a boundary can't flip-flop
  function targetFromPp(pp){
    const t=afTo;                                          // bias by the current target (only switch past the edge)
    if(t<=0) return pp > TR[0]        ? 1 : 0;
    if(t===1) return pp > TR[1]       ? 2 : (pp < TR[0]-HYST ? 0 : 1);
    return            pp < TR[1]-HYST ? 1 : 2;
  }
  let afAnim=0, afFrom=0, afTo=0, afT0=0, playing=false, lastRev=0;
  function setTarget(t){
    if(t===afTo) return;
    afFrom=afAnim; afTo=t; afT0=performance.now();
    if(!playing){ playing=true; requestAnimationFrame(animLoop); }
  }
  function animLoop(now){
    const k=clamp((now-afT0)/AF_DUR);
    afAnim=afFrom+(afTo-afFrom)*smooth(k);
    renderAf();
    if(k<1){ requestAnimationFrame(animLoop); }
    else { afAnim=afTo; renderAf(); playing=false; }
  }
  // apply the visual layers + text slides + adaptive header contrast for the current `afAnim`
  function renderAf(){
    const vh=innerHeight, af=afAnim;
    const active=Math.max(0,Math.min(2,Math.round(af)));   // step indicator: nearest project
    for(let i=0;i<projDots.length;i++) projDots[i].classList.toggle('is-active', i===active);
    for(let i=0;i<3;i++){
      const d=af-i;
      // visual: full while active; shrinks to a card + crosses (out up / in from below) on swap
      if(vises[i]){ const v=visState(d);
        vises[i].style.transform='translateY('+v[0].toFixed(2)+'%) scale('+v[1].toFixed(3)+')';
        vises[i].style.opacity=v[2].toFixed(3); }
      // text: OUTGOING blurs + fades IN PLACE; only the INCOMING rises from below.
      const sl=slides[i]; if(!sl)continue;
      const ad=Math.abs(d);
      sl.style.opacity=clamp(1-ad).toFixed(3);
      sl.style.filter='blur('+(ad*9).toFixed(2)+'px)';
      const rise=d<0?-d:0;
      const name=sl.querySelector('.proj-name'), meta=sl.querySelector('.proj-meta');
      if(name)name.style.transform='translateY('+(rise*40).toFixed(1)+'px)';
      if(meta)meta.style.transform='translateY('+(rise*64).toFixed(1)+'px)';
    }
    // flip the fixed header controls white over a DARK part of the active image (continuous settle +
    // hysteresis). Uses the last scroll-derived rev so it stays correct during a time-only tween.
    const r=sec.getBoundingClientRect();
    let tTop=0, tBot=0, tLogo=0;   // tLogo only from a fully-dark section (logo isn't over the image)
    if(r.top<=0 && r.bottom>=vh-4 && lastRev>0.5){
      const hi=Math.max(0,Math.min(2,Math.round(af)));
      const settle=clamp(1-Math.abs(af-hi)/0.18);
      tTop=settle*(lum[hi].top?1:0); tBot=settle*(lum[hi].bot?1:0);
    }
    if(cta){
      const cr=cta.getBoundingClientRect();
      if(cr.top<=56 && cr.bottom>=56){ tTop=1; tLogo=1; }
      if(cr.top<=vh-72 && cr.bottom>=vh-72) tBot=1;
      if(cr.top < vh*0.3) cta.classList.add('in');
    }
    if(footer){
      const ft=footer.getBoundingClientRect().top;
      if(ft < vh*0.35) footer.classList.add('in');              // reveal logo
      if(ui.sh) ui.sh.classList.toggle('is-hidden', ft < vh*0.5); // hide SCROLL hint at the page end
    }
    if(tTop>0.6)topOn=true; else if(tTop<0.35)topOn=false;
    if(tBot>0.6)botOn=true; else if(tBot<0.35)botOn=false;
    if(tLogo>0.6)logoOn=true; else if(tLogo<0.35)logoOn=false;
    if(ui.lt)ui.lt.classList.toggle('on-dark',topOn);      // top-right: over the project image
    if(ui.fm)ui.fm.classList.toggle('on-dark',topOn);
    if(ui.ci)ui.ci.classList.toggle('on-dark',logoOn);     // top-left: only a fully-dark section
    if(ui.sh)ui.sh.classList.toggle('on-dark',botOn);
    if(projInd)projInd.classList.toggle('on-dark',topOn);  // indicator: SAME state as Let's Talk/hamburger
  }
  function update(){
    ticking=false;
    const vh=innerHeight;
    const scrolled=-sec.getBoundingClientRect().top;
    // INTRO (title shrink + showcase reveal) runs over a FIXED scroll length, independent of the
    // section height — so making the section taller only slows the SWAP, not the intro.
    const INTRO=1.4*vh;
    const ip=clamp(scrolled/INTRO);
    // title: blur in (0->0.22), then shrink big->small label (0.30->0.72)
    const bi=clamp(ip/0.22);
    const q=clamp((ip-0.30)/0.42);
    const bigPx=parseFloat(getComputedStyle(title).fontSize)||160;
    const s=1+(labelSize(innerWidth)/bigPx-1)*q;
    const bigH=title.offsetHeight;
    const ty=(-bigH/2)*(1-q)+(restTop(innerWidth)-vh/2)*q;
    title.style.opacity=bi.toFixed(3);
    title.style.filter='blur('+(16*(1-bi)).toFixed(2)+'px)';
    title.style.transform='translateY('+ty.toFixed(1)+'px) scale('+s.toFixed(3)+')';
    // showcase reveals as the title finishes shrinking (0.62->0.92)
    const rev=clamp((ip-0.62)/0.30);
    if(visual){visual.style.opacity=rev.toFixed(3);
      visual.style.pointerEvents=rev>0.5?'auto':'none';}
    if(info){info.style.opacity=rev.toFixed(3);info.style.transform='translateY('+(30*(1-rev)).toFixed(1)+'px)';}
    lastRev=rev;
    // scroll only picks the project; crossing a threshold auto-plays the full cut (see setTarget)
    const pp=clamp((scrolled-INTRO)/((sec.offsetHeight-vh-INTRO)||1));
    setTarget(targetFromPp(pp));
    renderAf();
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});
  addEventListener('resize',update);
  update();
})();
