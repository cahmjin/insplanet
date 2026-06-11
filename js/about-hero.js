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
    if(cw<=1040){                                                     // mobile layout (1024 Figma TBD): no pin/scrub
      card.style.cssText='';
      sec.classList.remove('is-covered');
      return;
    }
    const u=Math.max(0.7,Math.min(cw/1920,1));                        // == css --u
    const g=clamp((cw-1920)/640);                                     // == css --g
    const r=sec.getBoundingClientRect();
    const scrub=sec.offsetHeight-vh;                                  // the track's extra height
    const p=scrub>0?clamp(-r.top/scrub):0;
    const q=ss(p);
    const aTop=933*u+237*g, aL=216*u+2*g, aR=216*u-3*g, aH=640*u+260*g, aRad=64*u;
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
