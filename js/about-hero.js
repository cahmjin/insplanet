/* ===== About hero — pinned black-hole expansion =====
   The hero is a 200vh track with a sticky 100vh stage. Scroll progress p (0..1 over the extra 100vh)
   scrubs the black-hole card from its resting wide-strip geometry (Figma: @216/933 1488x640 @1920 ->
   @218/1170 2129x900 @2560, R64) up and out to a full-viewport cover (reverse on scroll-up). Once the
   card is behind the text the section gets .is-covered (text flips light) and the fixed header
   controls get .on-dark. Values match css/about.css's --u/--g system (clientWidth-based, like vw). */
(function(){
  const sec=document.querySelector('.about-hero');
  const card=document.querySelector('.about-banner');
  if(!sec||!card)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;   // static strip; no scrub

  // NOTE: header elements are looked up per render — shared-ui.js injects them on DOMContentLoaded, AFTER this script runs
  const clamp=v=>Math.min(1,Math.max(0,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ss=x=>x*x*(3-2*x);                                            // smoothstep — soft ends, scrub-safe

  let ticking=false;
  function render(){
    ticking=false;
    const cw=document.documentElement.clientWidth, vh=innerHeight;
    const v=clamp((cw-1024)/896);                                     // == css --v (1024 -> 1920)
    const g=clamp((cw-1920)/640);                                     // == css --g (1920 -> 2560)
    const r=sec.getBoundingClientRect();
    const scrub=sec.offsetHeight-vh;                                  // the track's extra height
    const p=scrub>0?clamp(-r.top/scrub):0;
    const q=ss(p);
    // state-A card geometry (Figma; 1024 rest top nudged 744->699 to follow the hero padding-top -45): @48/699 -> @216/933 -> @218/1170
    const aTop=699+234*v+237*g, aL=48+168*v+2*g, aR=50+166*v-3*g, aH=480+160*v+260*g, aRad=32+32*v;
    card.style.top=lerp(aTop,0,q).toFixed(1)+'px';
    card.style.left=lerp(aL,0,q).toFixed(1)+'px';
    card.style.right='auto';
    card.style.width=(cw-lerp(aL+aR,0,q)).toFixed(1)+'px';
    card.style.height=lerp(aH,vh,q).toFixed(1)+'px';
    card.style.borderRadius=lerp(aRad,0,q).toFixed(1)+'px';
    // flip the text once the card's top edge has climbed past the title area (the text scrolls away
    // WITH the stage, so p alone is right for it)...
    const covered=p>0.45;
    sec.classList.toggle('is-covered',covered);
    // ...but the header controls are FIXED: once the covered stage scrolls on past the hero they sit
    // over the white sections again, so only keep them light while the dark cover is still behind
    // their band (top controls ~<=120px; SCROLL hint near the viewport bottom).
    const topOn=covered && r.bottom>120;
    const botOn=covered && r.bottom>vh-120;
    [['ci-logo',topOn],['lets-talk',topOn],['full-menu',topOn],['scroll-hint',botOn]]
      .forEach(([id,on])=>{const el=document.getElementById(id);if(el)el.classList.toggle('on-dark',on);});
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(render);}},{passive:true});
  addEventListener('resize',render);
  render();

  // load reveal (same as the home hero): wait for the serif webfont so the blur-in plays with final
  // glyphs, not the fallback; the setTimeout is a failsafe so the title is never stuck hidden.
  let revealed=false;
  const reveal=()=>{if(revealed)return;revealed=true;requestAnimationFrame(()=>sec.classList.add('in'));};
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(reveal);setTimeout(reveal,800);}
  else reveal();
})();

/* ===== closing full-bleed image (07) — PINNED EXPANSION, same shape as the hero above: a TINY
   card (state-A geometry matches css/about.css exactly, so no jump on load) — 6.25vw wide (64/120/
   160px @1024/1920/2560), landscape height = width * 0.62, radius = 20% of width capped by the hero
   banner's own radius — centered in a 100vh sticky stage grows to true full-bleed (100vw x 100vh,
   radius 0). The wrapper is EXACTLY 100vh (stage only, no extra scroll distance), so the sticky
   stage engages and releases at the SAME instant the grow finishes — no pinned full-bleed hold; it
   scrolls away like a normal section right after. Progress p: 0 when the wrapper's top reaches the
   viewport bottom (section entering), 1 when it reaches the viewport top (i.e. exactly when the
   whole 1-viewport approach is spent) — p = clamp((vh-top)/vh, 0, 1). Same rAF-throttled
   scroll-listener shape as the Contact "Join Us" doors reveal (contact.html) and the hero's own
   render() above. Eased with easeInOutCubic (NOT easeOutCubic): an ease-out front-loads the growth
   into the first half of the 1-viewport approach, so the card would visually "finish early" and just
   sit at full size for the back half of the scroll; ease-in-out instead holds it small a beat longer
   then swells through the back half too, landing full-bleed right as the approach completes. While
   the box's OWN (currently sized) rect covers the fixed header band (top 120px) / SCROLL-hint band
   (bottom 120px) it flips the chrome .on-dark — same geometry check the old closing-image script
   used, just read off the box (the thing that's actually dark) instead of the tall wrapper.
   Reduced-motion: static full-bleed end state (CSS above), no scrub, no listeners. ===== */
(function(){
  const wrap=document.querySelector('.about-fullbleed');
  const pin=document.querySelector('.about-fullbleed-pin');
  const box=document.querySelector('.about-fullbleed-box');
  const img=box&&box.querySelector('img');
  if(!wrap||!pin||!box)return;

  const clamp=v=>Math.min(1,Math.max(0,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const easeInOutCubic=x=>x<0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2;

  function setChrome(r,vh){
    const topOn=r.top<=120 && r.bottom>=120;          // covers the logo / Let's Talk / menu band
    const botOn=r.top<=vh-120 && r.bottom>=vh-120;    // covers the SCROLL hint band
    [['ci-logo',topOn],['lets-talk',topOn],['full-menu',topOn],['scroll-hint',botOn]]
      .forEach(([id,on])=>{const el=document.getElementById(id);if(el)el.classList.toggle('on-dark',on);});
  }

  if(matchMedia('(prefers-reduced-motion:reduce)').matches){
    setChrome(box.getBoundingClientRect(),innerHeight);
    return;
  }

  let ticking=false;
  function render(){
    ticking=false;
    const cw=document.documentElement.clientWidth, vh=innerHeight;
    const v=clamp((cw-1024)/896);                                // == css --v (radius only)
    const startW=cw*0.0625;                                      // TINY start card — 6.25vw (== css 6.25vw)
    const startH=startW*0.62;                                    // landscape 1:0.62
    const startRad=Math.min(32+32*v, startW*0.2);                // 20% of width, capped by the hero banner's radius
    const inset=(cw-startW)/2, topInset=(vh-startH)/2;           // centered in the 100vw x 100vh stage
    const r=wrap.getBoundingClientRect();
    const p=clamp((vh-r.top)/vh);
    const q=easeInOutCubic(p);
    box.style.left=lerp(inset,0,q).toFixed(1)+'px';
    box.style.right='auto';
    box.style.top=lerp(topInset,0,q).toFixed(1)+'px';
    box.style.width=lerp(startW,cw,q).toFixed(1)+'px';
    box.style.height=lerp(startH,vh,q).toFixed(1)+'px';
    box.style.borderRadius=lerp(startRad,0,q).toFixed(1)+'px';
    if(img)img.style.transform='scale('+lerp(1.08,1,q).toFixed(3)+')';
    setChrome(box.getBoundingClientRect(),vh);
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(render);}},{passive:true});
  addEventListener('resize',render);
  render();
})();
