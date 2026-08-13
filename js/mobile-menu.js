/* ===== mobile full-menu overlay (shared) =====
   Mobile-only (≤767) full-menu: circular reveal + radial halftone edge, opened from the
   #full-menu hamburger that every mobile page's header chrome ships. Separate from
   js/shared-ui.js, which injects/drives the DESKTOP full-menu (different markup, 2-col
   .menu-inner layout, cursor-anchored origin) — do not merge the two.
   Loaded by every ≤767 page (mobile.html, mobile-contact.html, …) after that page's own
   Lenis setup (so window.__lenis is already exposed for the scroll lock below). On run,
   injects the #menu-overlay markup at the end of #page-root (or body) if it isn't already
   on the page, then wires up open/close. ES5 (matches the inline-script convention used
   across the mobile pages). */
(function(){
  var MARKUP =
    '<div id="menu-overlay" aria-hidden="true">' +
      '<canvas id="menu-dots"></canvas>' +
      '<div id="menu-panel"></div>' +
      '<div class="m-menu-scroll" data-lenis-prevent>' +
        '<nav class="m-menu-nav">' +
          '<a class="m-menu-item" href="#"><span>Projects</span><span class="m-menu-badge">42</span></a>' +
          '<a class="m-menu-item" href="#"><span>About</span></a>' +
          '<a class="m-menu-item" href="mobile-contact.html"><span>Contact</span></a>' +   // Projects/About stay "#" until their mobile pages exist
        '</nav>' +
        '<ul class="m-menu-family">' +
          '<li><span>RoAI</span><span class="m-menu-fam-ico"><img src="assets/icon_arrow_round.svg" alt=""></span></li>' +
          '<li><span>Inspick</span><span class="m-menu-fam-ico"><img src="assets/icon_arrow_round.svg" alt=""></span></li>' +
          '<li><span>Archy</span><span class="m-menu-fam-ico"><img src="assets/icon_arrow_round.svg" alt=""></span></li>' +
        '</ul>' +
        '<div class="m-menu-bottom">' +
          '<a class="m-menu-brief" href="#">Company Brief Download<span class="m-menu-brief-ico"><img src="assets/icon_download.svg" alt=""></span></a>' +
          '<p class="m-menu-copy">Ⓒ 2026. Insplanet all right reserved.</p>' +
        '</div>' +
      '</div>' +
      '<img id="menu-logo" src="assets/ci_logo_white.svg" alt="Insplanet">' +
      '<button id="menu-close" type="button" aria-label="메뉴 닫기"><img src="assets/menu_close.svg" alt=""></button>' +
    '</div>';

  if(!document.getElementById('menu-overlay')){
    var host=document.getElementById('page-root')||document.body;
    host.insertAdjacentHTML('beforeend', MARKUP);
  }

  // full-menu overlay: circular reveal + radial halftone edge (port of js/main.js's menu IIFE).
  // Same clock drives BOTH the solid core (#menu-panel clip-path) and the canvas halftone dots.
  // ORIGIN is recentred on the mobile hamburger (#full-menu: right:12px/top:16px, 48×48 ->
  // center at calc(100% - 36px) 40px) instead of the desktop button. Desktop-only bits (page-
  // transition zoom on nav, cursor, "fresh return to top" on the logo) are dropped — mobile
  // pages have no #page-root transition system and the nav links are placeholders (href="#"),
  // so only the open/close triggers are wired.
  (function(){
    var overlay=document.getElementById('menu-overlay');
    var panel=document.getElementById('menu-panel');
    var canvas=document.getElementById('menu-dots');
    var openBtn=document.getElementById('full-menu');
    var closeBtn=document.getElementById('menu-close');
    if(!overlay||!openBtn||!closeBtn)return;
    var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
    var ctx=(!reduce&&canvas&&canvas.getContext)?canvas.getContext('2d'):null;
    var ORIGIN='at calc(100% - 36px) 40px';
    var TAU=6.2831853;
    var RINGGAP=70, ARC=70, DOTMIN=0, DOTMAX=41, FRINGE=500, DUR=600; // ring/arc spacing, dot min/max radius, fringe band, ms

    var cx=0,cy=0,W=0,H=0,maxR=1;
    function resize(){
      W=innerWidth;H=innerHeight;cx=W-36;cy=40;
      var far=Math.hypot(Math.max(cx,W-cx),Math.max(cy,H-cy));
      maxR=far+FRINGE+80;           // solid (=wave-FRINGE) still covers the far corner at full open
      if(!ctx)return;
      var dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    resize();
    var rt;
    addEventListener('resize',function(){
      clearTimeout(rt);
      rt=setTimeout(function(){
        resize();
        if(overlay.classList.contains('open')){ if(raf===0){R=toR=maxR;} else {toR=maxR;} }
        render(R);
      },200);
    });

    function render(waveR){
      if(!ctx)return;                       // reduced-motion uses the CSS panel instead
      ctx.clearRect(0,0,W,H);
      if(waveR<=0)return;
      var solidR=Math.max(0,waveR-FRINGE);
      ctx.fillStyle='#3E3F44';
      ctx.beginPath();ctx.arc(cx,cy,solidR,0,TAU);ctx.fill();
      var innerSkip=solidR-RINGGAP;
      for(var ringIndex=1, r=RINGGAP; r<=waveR; ringIndex++, r+=RINGGAP){
        if(r<innerSkip)continue;                        // covered by the solid core (perf)
        var t=Math.min(1,(waveR-r)/FRINGE);
        var dr=DOTMIN+(DOTMAX-DOTMIN)*t;                // max near the solid edge -> min at the leading edge
        if(dr<0.4)continue;
        var n=Math.max(6,Math.round(TAU*r/ARC));
        var off=(ringIndex&1)*(Math.PI/n);              // stagger alternate rings (stable per ring)
        for(var k=0;k<n;k++){
          var a=k*TAU/n+off, x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
          if(x<-DOTMAX||x>W+DOTMAX||y<-DOTMAX||y>H+DOTMAX)continue; // cull off-screen
          ctx.beginPath();ctx.arc(x,y,dr,0,TAU);ctx.fill();
        }
      }
    }

    // one fixed-duration eased clock; continues smoothly if reversed mid-flight
    var raf=0,R=0,fromR=0,toR=0,t0=0;
    function ease(p){return 1-Math.pow(1-p,3);} // easeOutCubic
    function tick(now){
      if(!t0)t0=now;
      var p=(now-t0)/DUR; if(p>1)p=1;
      R=fromR+(toR-fromR)*ease(p);
      render(R);
      if(p<1){raf=requestAnimationFrame(tick);return;}
      raf=0;R=toR;render(R);
      if(toR>=maxR)overlay.classList.add('covered'); // fully covered -> blob may pause
      else if(toR===0&&ctx)ctx.clearRect(0,0,W,H);
    }
    function animate(t){fromR=R;toR=t;t0=0;if(!raf)raf=requestAnimationFrame(tick);}

    // lock the background page while the menu is open (modal), WITHOUT touching overflow —
    // block the scroll inputs: Lenis.stop() kills wheel/touch, and we swallow scroll keys.
    var scrollLocked=false;
    var SCROLL_KEYS={' ':1,'Spacebar':1,'PageUp':1,'PageDown':1,'Home':1,'End':1,'ArrowUp':1,'ArrowDown':1};
    // allow wheel/touch INSIDE the menu's own scroll container; only block inputs aimed at the
    // locked page behind the overlay.
    function inMenuScroll(e){return e.target&&e.target.closest&&e.target.closest('.m-menu-scroll');}
    addEventListener('wheel',function(e){if(scrollLocked&&!inMenuScroll(e))e.preventDefault();},{passive:false});
    addEventListener('touchmove',function(e){if(scrollLocked&&!inMenuScroll(e))e.preventDefault();},{passive:false});
    addEventListener('keydown',function(e){if(scrollLocked&&SCROLL_KEYS[e.key])e.preventDefault();},{passive:false});
    function lockScroll(on){
      scrollLocked=on;
      if(window.__lenis){ if(on)window.__lenis.stop(); else window.__lenis.start(); }
    }
    overlay.inert=true;   // closed by default: keep it out of focus order / assistive tech
    function open(){
      overlay.inert=false;
      overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
      lockScroll(true);
      if(reduce){if(panel)panel.style.clipPath='circle(150vmax '+ORIGIN+')';overlay.classList.add('covered');}
      else animate(maxR);
      closeBtn.focus({preventScroll:true});   // move focus into the dialog
    }
    function close(){
      // move focus out BEFORE hiding, so a focused descendant isn't trapped under aria-hidden/inert
      if(overlay.contains(document.activeElement))openBtn.focus({preventScroll:true});
      overlay.classList.remove('open','covered');overlay.setAttribute('aria-hidden','true');
      overlay.inert=true;
      lockScroll(false);
      if(reduce){if(panel)panel.style.clipPath='circle(0 '+ORIGIN+')';}
      else animate(0);
    }
    openBtn.addEventListener('click',open);
    closeBtn.addEventListener('click',close);

    // menu logo -> home, PC parity (main.js #menu-logo): on the mobile HOME close + return to the
    // top (the jump happens while the dark panel still covers, so it reads as a clean re-entry);
    // on any other mobile page navigate home.
    var logo=document.getElementById('menu-logo');
    if(logo){
      logo.style.cursor='pointer';
      logo.addEventListener('click',function(){
        if(/(^|\/)mobile(\.html)?$/.test(location.pathname)){
          close();   // first: restarts Lenis (a stopped Lenis ignores scrollTo) — the panel still covers while it shrinks, hiding the jump
          if(window.__lenis)window.__lenis.scrollTo(0,{immediate:true,force:true});
          else window.scrollTo(0,0);
        } else {
          location.href='mobile.html';
        }
      });
    }
    addEventListener('keydown',function(e){if(e.key==='Escape'&&overlay.classList.contains('open'))close();});
  })();
})();
