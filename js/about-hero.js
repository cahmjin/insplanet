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

  // resolved per render: the header chrome is injected by shared-ui.js on DOMContentLoaded, AFTER this script runs
  const uiEls=()=>['ci-logo','lets-talk','full-menu','scroll-hint'].map(id=>document.getElementById(id)).filter(Boolean);
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
    // flip the text/header once the card's top edge has climbed past the title area
    const covered=p>0.45;
    sec.classList.toggle('is-covered',covered);
    uiEls().forEach(el=>el.classList.toggle('on-dark',covered));
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(render);}},{passive:true});
  addEventListener('resize',render);
  render();
})();
