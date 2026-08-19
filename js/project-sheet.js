/* ===== project-detail SHEET (prototype) =====
   Clicking a project thumbnail does NOT navigate: it fetches that project's detail HTML
   (projects/<slug>.html — a standalone doc whose <main class="pd"> is the region we inject)
   and shows it in a full-screen sheet that slides up from the bottom. Same behaviour on PC/
   tablet/mobile; wires PC `.pj-card` and mobile `.mp-card`, both of which carry data-slug (every
   card points at the slug "kb-app" for now — projects/kb-app.html; projects/test.html is a dummy kept for testing).

   URL: open -> history.pushState to `?p=<slug>` on the list page. Back (popstate w/o `p`) closes.
   Loading the list page with `?p=<slug>` already in the URL opens the sheet immediately (no push —
   we didn't create that history entry). Also closable via the fixed X and ESC. No prev/next inside
   the sheet. Closing never touches the list's own scroll/filter state (the sheet is a separate,
   position:fixed overlay outside #page-root).

   Scroll lock = the site's standard body-fixed lock (savedY + position:fixed, NOT overflow:hidden —
   that breaks position:sticky elsewhere) — ported 1:1 from js/mobile-menu.js's lockBody/lockScroll,
   including the touchmove edge-guard, retargeted at the sheet's own scroller (.ps-scroll) instead of
   the menu panel.

   ES5 (site convention for shared cross-page scripts, matches js/mobile-menu.js). */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ---- build the sheet (idempotent; appended to <body>, a SIBLING of #page-root so its
  // position:fixed stays viewport-relative and the list page underneath can be left untouched). ----
  var sheet=null, closeBtn=null, scrollEl=null, bodyEl=null, bar=null;
  function ensureSheet(){
    if(sheet)return;
    var wrap=document.createElement('div');
    wrap.id='project-sheet';
    wrap.className='ps-sheet';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');
    wrap.setAttribute('aria-hidden','true');
    wrap.inert=true;   // closed by default: out of focus order / assistive tech
    wrap.innerHTML=
      '<button type="button" class="ps-close" aria-label="닫기">'+
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M0 0L24 24M24 0L0 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
      '</button>'+
      '<div class="ps-scroll" data-lenis-prevent><div class="ps-body"></div></div>';
    bar=document.createElement('div'); bar.className='ps-bar'; bar.setAttribute('aria-hidden','true');
    document.body.appendChild(bar);
    document.body.appendChild(wrap);
    sheet=wrap;
    closeBtn=wrap.querySelector('.ps-close');
    scrollEl=wrap.querySelector('.ps-scroll');
    bodyEl=wrap.querySelector('.ps-body');
    closeBtn.addEventListener('click', requestClose);
    scrollEl.addEventListener('scroll', syncEnd, {passive:true});
    // a detail's own close control (.pd-close inside the injected main.pd) closes the sheet too
    wrap.addEventListener('click', function(e){
      var own=e.target.closest ? e.target.closest('.pd-close') : null;
      if(own){ e.preventDefault(); requestClose(); return; }
      var cp=e.target.closest ? e.target.closest('.pd-btn--copy') : null;
      if(cp){ e.preventDefault(); onCopyClick(cp); return; }
      // View Platform with no URL yet (publisher fills href): swallow the click instead of opening the current page in a new tab
      var vp=e.target.closest ? e.target.closest('.pd-btn--primary') : null;
      if(vp && !vp.getAttribute('href')){ e.preventDefault(); }
    });
  }

  // ---- scroll lock (js/mobile-menu.js lockBody/lockScroll port, retargeted at .ps-scroll) ----
  var scrollLocked=false;
  var SCROLL_KEYS={' ':1,'Spacebar':1,'PageUp':1,'PageDown':1,'Home':1,'End':1,'ArrowUp':1,'ArrowDown':1};
  function inSheetScroll(e){return e.target&&e.target.closest&&e.target.closest('.ps-scroll');}
  addEventListener('wheel',function(e){if(scrollLocked&&!inSheetScroll(e))e.preventDefault();},{passive:false});
  var startY=0;
  addEventListener('touchstart',function(e){ if(e.touches&&e.touches.length===1)startY=e.touches[0].clientY; },{passive:true});
  addEventListener('touchmove',function(e){
    if(!scrollLocked)return;
    var sc=inSheetScroll(e);
    if(!sc){e.preventDefault();return;}
    if(!e.touches||e.touches.length!==1)return;
    var dy=e.touches[0].clientY-startY, top=sc.scrollTop, max=sc.scrollHeight-sc.clientHeight;
    if(max<=0 || (top<=0&&dy>0) || (top>=max-1&&dy<0))e.preventDefault();
  },{passive:false});
  addEventListener('keydown',function(e){if(scrollLocked&&SCROLL_KEYS[e.key])e.preventDefault();},{passive:false});
  var savedY=0;
  function lockBody(on){
    var b=document.body, s=b.style;
    if(on){
      savedY=window.scrollY||window.pageYOffset||0;
      s.position='fixed';s.top=(-savedY)+'px';s.left='0';s.right='0';s.width='100%';
    } else {
      s.position='';s.top='';s.left='';s.right='';s.width='';
      window.scrollTo(0,savedY);
    }
  }
  function lockScroll(on){
    scrollLocked=on;
    if(on){ if(window.__lenis)window.__lenis.stop(); lockBody(true); }
    else {
      lockBody(false);
      // Resync Lenis. start()→reset() copies window.scrollY (already restored above) into animated/target.
      // resize() re-measures its cached dimensions NOW: while the body was position:fixed the doc was
      // viewport-tall so Lenis's ResizeObserver cached limit=0 and doesn't re-measure until a later frame.
      // (Do NOT scrollTo(savedY,{immediate}) here — with limit still 0 it clamps to 0 and calls
      // window.scrollTo(0): Lenis then sits at 0 while the page is at savedY, and the next wheel
      // animates 0→delta = "jumps to top".)
      if(window.__lenis){ window.__lenis.start(); window.__lenis.resize(); }
    }
  }

  // ---- fetch + inject projects/<slug>.html's <main class="pd"> ----
  var loadedHrefs={};   // stylesheet hrefs already appended to THIS page's <head> (append once)
  function qualifyAttr(el,attr,base){
    var v=el.getAttribute(attr);
    if(!v)return;
    if(attr==='href'&&v.charAt(0)==='#')return;   // in-page/placeholder anchors stay as-is
    if(attr==='srcset'){
      var parts=v.split(',').map(function(part){
        var seg=part.trim().split(/\s+/);
        if(seg[0]){ try{ seg[0]=new URL(seg[0],base).href; }catch(e){} }
        return seg.join(' ');
      });
      el.setAttribute(attr, parts.join(', '));
    } else {
      try{ el.setAttribute(attr, new URL(v,base).href); }catch(e){}
    }
  }
  function rewriteAssets(root,base){
    var els=root.querySelectorAll('[src],[href],[srcset]');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      if(el.hasAttribute('src'))qualifyAttr(el,'src',base);
      if(el.hasAttribute('href'))qualifyAttr(el,'href',base);
      if(el.hasAttribute('srcset'))qualifyAttr(el,'srcset',base);
    }
  }
  // progress bar (fixed, top): fetch = first 20%, then the detail's images fill the remaining 80%.
  // Two values: realP = actual load progress (fetch/images, plus a slow trickle toward the next milestone
  // while a step is in flight); shownP = what's drawn — it chases realP at a CAPPED speed so the bar
  // always takes a readable moment to fill (fast local loads no longer flash past), and the sheet only
  // reveals once shownP has arrived at 1.
  var barTimer=null, barRaf=0, realP=0, shownP=0, barLast=0, fullCb=null;
  var BAR_RATE=1.65;   // max fill speed in bar-widths per second → a full bar takes ≥ ~0.6s
  function barDraw(){ if(bar)bar.style.transform='scaleX('+Math.max(0,Math.min(1,shownP)).toFixed(3)+')'; }
  function barLoop(t){
    barRaf=0;
    var dt=barLast?Math.min(0.1,(t-barLast)/1000):0.016; barLast=t;
    var target=Math.min(1,realP);
    if(shownP<target)shownP=Math.min(target, shownP+BAR_RATE*dt);
    barDraw();
    if(fullCb && shownP>=0.999){ var cb=fullCb; fullCb=null; cb(); return; }
    barRaf=requestAnimationFrame(barLoop);
  }
  function barKick(){ if(!barRaf){ barLast=0; barRaf=requestAnimationFrame(barLoop); } }
  function barShow(){ if(!bar)return; clearTimeout(barTimer); barStopTrickle(); realP=0; shownP=0; fullCb=null; bar.style.transition='none'; bar.style.opacity='1'; barDraw(); void bar.offsetWidth; bar.style.transition=''; barKick(); }
  function barReal(p){ if(p>realP)realP=Math.min(1,p); barKick(); }
  function barComplete(cb){ barStopTrickle(); realP=1; fullCb=cb; barKick(); }   // cb fires once the DRAWN bar reaches 1
  function barDone(){ if(!bar)return; shownP=1; barDraw(); barTimer=setTimeout(function(){ bar.style.opacity='0'; barTimer=setTimeout(function(){ shownP=0; realP=0; barDraw(); },300); },180); }
  function barHide(){ if(!bar)return; clearTimeout(barTimer); barStopTrickle(); fullCb=null; if(barRaf){cancelAnimationFrame(barRaf);barRaf=0;} bar.style.opacity='0'; barTimer=setTimeout(function(){ shownP=0; realP=0; barDraw(); },300); }
  // trickle: while a step (fetch / next image) is in flight, creep realP toward the NEXT milestone so the
  // bar never sits still — asymptotic (never reaches the milestone; the real event lands it).
  var trickleTimer=null;
  function barTrickle(from,to){
    barStopTrickle(); if(realP<from)realP=from;
    trickleTimer=setInterval(function(){ realP+=(to-realP)*0.035; barKick(); },100);
  }
  function barStopTrickle(){ if(trickleTimer){clearInterval(trickleTimer);trickleTimer=null;} }

  var loadSeq=0;   // bumps on every open/close so a stale load can't reveal a closed sheet
  function fetchAndRender(slug, onReady){
    ensureSheet();
    currentSlug=slug;
    var seq=++loadSeq;
    bodyEl.classList.remove('is-loaded');
    bodyEl.innerHTML='';
    barShow(); barReal(0.08); barTrickle(0.08,0.2);
    var url='projects/'+encodeURIComponent(slug)+'.html';
    fetch(url).then(function(res){
      if(!res.ok)throw new Error('project-sheet: fetch failed ('+res.status+') for '+url);
      return res.text();
    }).then(function(html){
      if(seq!==loadSeq)return;
      var doc=new DOMParser().parseFromString(html,'text/html');
      var main=doc.querySelector('main.pd');
      if(!main)throw new Error('project-sheet: no <main class="pd"> in '+url);
      var base=new URL(url, location.href).href;
      rewriteAssets(main, base);
      // copy <style> blocks from the fetched doc's head into .ps-body (scoped-ish; fine for a prototype)
      var styleHtml='';
      if(doc.head){
        var styles=doc.head.querySelectorAll('style');
        for(var i=0;i<styles.length;i++)styleHtml+=styles[i].outerHTML;
      }
      // copy <link rel=stylesheet> not already on this page's head — append once
      if(doc.head){
        var links=doc.head.querySelectorAll('link[rel="stylesheet"]');
        for(var j=0;j<links.length;j++){
          var href=links[j].getAttribute('href');
          if(!href)continue;
          var abs; try{ abs=new URL(href, base).href; }catch(e){ continue; }
          if(loadedHrefs[abs])continue;
          loadedHrefs[abs]=true;
          var existing=document.head.querySelectorAll('link[rel="stylesheet"]'), already=false;
          for(var k=0;k<existing.length;k++){ if(existing[k].href===abs){ already=true; break; } }
          if(!already){
            var l=document.createElement('link'); l.rel='stylesheet'; l.href=abs;
            document.head.appendChild(l);
          }
        }
      }
      bodyEl.innerHTML=styleHtml;
      bodyEl.appendChild(main);   // appendChild across documents adopts the node automatically
      // detail ships its own designed close (.pd-close) -> hide the generic .ps-close (css: .is-own-close)
      sheet.classList.toggle('is-own-close', !!main.querySelector('.pd-close'));
      barStopTrickle(); barReal(0.2);
      // wait for the detail's images (the real wait) — the sheet is still offscreen, so force eager loading
      var imgs=bodyEl.querySelectorAll('img'), n=imgs.length, done=0, settled=false;
      if(n)barTrickle(0.2, 0.2+0.8*(1/n));
      function finishLoad(){
        if(settled||seq!==loadSeq)return; settled=true;
        // fonts the detail paints with must be ready too (first open: Montserrat title) — wait, capped at 1.5s
        var fontsP=Promise.resolve();
        if(document.fonts&&document.fonts.load){ try{ fontsP=Promise.race([document.fonts.load('700 96px Montserrat').catch(function(){}), new Promise(function(r){setTimeout(r,1500);})]); }catch(e){} }
        fontsP.then(function(){
          barComplete(function(){   // wait for the DRAWN bar to reach 100%, then reveal
            if(seq!==loadSeq)return;
            barDone();
            wireOwnClose();
            setupReveal();
            bodyEl.classList.add('is-loaded');
            onReady();
          });
        });
      }
      if(!n){ finishLoad(); return; }
      var guard=setTimeout(finishLoad, 8000);   // never hang the open on one stuck image
      function one(){ done++; var p=0.2+0.8*(done/n); barStopTrickle(); barReal(p); if(done>=n){ clearTimeout(guard); finishLoad(); } else barTrickle(p, 0.2+0.8*((done+1)/n)); }
      for(var m=0;m<n;m++){
        var im=imgs[m];
        im.loading='eager';
        // count an image only once it's DECODED (not just loaded) — first-open decoding of the 4K hero during the
        // slide was the flicker; decode() forces it now, while the bar is still filling
        (function(img){
          function settle(){ if(img.decode){ img.decode().then(one,one); } else one(); }
          if(img.complete&&img.naturalWidth>0)settle();
          else { img.addEventListener('load',settle,{once:true}); img.addEventListener('error',one,{once:true}); }
        })(im);
      }
    }).catch(function(err){
      if(seq!==loadSeq)return;
      barStopTrickle();
      bodyEl.innerHTML='<p class="ps-error">불러오지 못했습니다</p>';
      barDone();
      bodyEl.classList.add('is-loaded');
      onReady();
      if(window.console)console.error(err);
    });
  }

  // ---- magnetic + spring hover on the detail's own controls (.pd-close, .pd-btn) — same constants as
  // js/main.js (STRENGTH .5, STIFF .12, DAMP .78, MAX 20). .pd-close: the icon eases a little further than the
  // button (parallax); .pd-btn: the button moves, its icon stays put. Fine pointers only, off under reduced
  // motion. Re-wired on every inject (elements are replaced). ----
  var MAG_OK=matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce;
  var mags=[], magRaf=0;
  var STRENGTH=0.5, STIFF=0.12, DAMP=0.78, MAX=20, ICON=0.35;
  function magClamp(v){return Math.max(-MAX,Math.min(MAX,v));}
  function magFrame(){
    magRaf=0;
    var busy=false;
    for(var i=0;i<mags.length;i++){
      var it=mags[i];
      it.vx=(it.vx+(it.tx-it.x)*STIFF)*DAMP; it.x+=it.vx;
      it.vy=(it.vy+(it.ty-it.y)*STIFF)*DAMP; it.y+=it.vy;
      var rest=it.tx===0&&it.ty===0&&Math.abs(it.x)<.01&&Math.abs(it.y)<.01&&Math.abs(it.vx)<.01&&Math.abs(it.vy)<.01;
      if(rest){ if(!it.zeroed){ it.x=it.y=it.vx=it.vy=0; it.el.style.transform=''; if(it.icon)it.icon.style.transform=''; it.zeroed=true; } continue; }
      it.zeroed=false; busy=true;
      it.el.style.transform='translate('+it.x.toFixed(2)+'px,'+it.y.toFixed(2)+'px)';
      if(it.icon)it.icon.style.transform='translate('+(it.x*ICON).toFixed(2)+'px,'+(it.y*ICON).toFixed(2)+'px)';
    }
    if(busy)magRaf=requestAnimationFrame(magFrame);
  }
  function magKick(){ if(!magRaf)magRaf=requestAnimationFrame(magFrame); }
  function magWire(el, icon){
    var it={el:el,icon:icon,tx:0,ty:0,x:0,y:0,vx:0,vy:0,zeroed:true};
    el.addEventListener('mousemove',function(e){
      var r=el.getBoundingClientRect();
      it.tx=magClamp((e.clientX-(r.left+r.width/2-it.x))*STRENGTH);
      it.ty=magClamp((e.clientY-(r.top+r.height/2-it.y))*STRENGTH);
      magKick();
    });
    el.addEventListener('mouseleave',function(){ it.tx=0;it.ty=0;magKick(); });
    mags.push(it);
  }
  function wireOwnClose(){
    if(!MAG_OK||!bodyEl)return;
    mags=[];
    var els=bodyEl.querySelectorAll('.pd-close,.pd-btn');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      magWire(el, null);   // BUTTON-only magnet everywhere (.pd-close + .pd-btn): the icon stays put inside — user decision
    }
  }

  // ---- scroll reveal for the detail's blocks (.pd-summary, .pd-sec): time-based one-shot rise — arm with .pd.rv
  // (css/project-detail.css hides children until .in), IO rooted on the SHEET's scroller (.ps-scroll, not the
  // window), threshold 0 / rootMargin -20% bottom (fires when the card's top passes the bottom-20% line),
  // unobserve after .in. Rebuilt per open, torn down on close. ----
  var revealIO=null;
  function setupReveal(){
    teardownReveal();
    var main=bodyEl&&bodyEl.querySelector('main.pd'); if(!main)return;
    if(reduce||!('IntersectionObserver'in window))return;   // leave un-armed: everything visible
    var els=main.querySelectorAll('.pd-summary,.pd-sec'); if(!els.length)return;
    for(var i=0;i<els.length;i++){ els[i].style.opacity=''; els[i].style.transform=''; }   // no leftover inline values
    main.classList.add('rv');
    revealIO=new IntersectionObserver(function(es,o){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); o.unobserve(e.target); } });
    },{root:scrollEl,threshold:0,rootMargin:'0px 0px -10% 0px'});   // user-tuned: fires when the card top passes the bottom-10% line
    for(var j=0;j<els.length;j++)revealIO.observe(els[j]);
  }
  function teardownReveal(){ if(revealIO){revealIO.disconnect();revealIO=null;} }

  // ---- Copy URL (.pd-btn--copy inside the sheet): copies data-copy, or — when empty/'#' — the shareable
  // deep link of the current detail (list page + ?p=<slug>). Shows a brief hint bubble; the label never changes. ----
  var currentSlug=null;
  function shareUrl(){
    var u=new URL(location.href); u.hash='';
    if(currentSlug)u.searchParams.set('p', currentSlug);
    return u.href;
  }
  function copyText(text, ok){
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(ok, function(){ legacy(); }); }
    else legacy();
    function legacy(){
      var t=document.createElement('textarea'); t.value=text; t.setAttribute('readonly',''); t.style.cssText='position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); }catch(err){} document.body.removeChild(t); ok();
    }
  }
  function onCopyClick(btn){
    var url=btn.getAttribute('data-copy'); if(!url||url==='#')url=shareUrl();
    copyText(url, function(){
      // hint bubble above the button (the label itself never changes)
      var h=btn.querySelector('.pd-copy-hint');
      if(!h){ h=document.createElement('span'); h.className='pd-copy-hint'; h.setAttribute('role','status'); h.textContent='URL이 복사되었습니다'; btn.appendChild(h); }
      h.classList.add('is-on');
      clearTimeout(btn._copyT); btn._copyT=setTimeout(function(){ h.classList.remove('is-on'); },1600);
    });
  }

  // ---- open/close + URL ----
  function getSlug(){
    var m=/(?:^|[?&])p=([^&]+)/.exec(location.search);
    return m?decodeURIComponent(m[1]):null;
  }
  var openedViaPush=false;   // true only when THIS tab pushed the ?p= entry (so close() can history.back() out of it)
  var closeTimer=null;
  // expose the sheet scroller's scrollbar width so injected fixed chrome (the designed .pd-close) can
  // sit 48u from the CONTENT edge instead of over the bar
  function syncSbw(){ if(sheet&&scrollEl)sheet.style.setProperty('--ps-sbw',(scrollEl.offsetWidth-scrollEl.clientWidth)+'px'); }
  addEventListener('resize', function(){ if(sheet&&sheet.classList.contains('is-open'))syncSbw(); });
  // scroll-hint end-fade: mark the sheet once its scroller has (nearly) reached the end (site rule: the hint hides at the bottom)
  function syncEnd(){ if(!sheet||!scrollEl)return; var atEnd=scrollEl.scrollTop+scrollEl.clientHeight>=scrollEl.scrollHeight-scrollEl.clientHeight*0.5; sheet.classList.toggle('is-at-end',atEnd); }
  var pending=false;   // a load is in flight and the sheet hasn't been revealed yet
  function openSheet(slug, push){
    if(!slug)return;
    ensureSheet();
    if(push){
      var url=new URL(location.href);
      url.searchParams.set('p', slug);
      history.pushState({psSlug:slug}, '', url.pathname+url.search+url.hash);
      openedViaPush=true;
    }
    if(closeTimer){ clearTimeout(closeTimer); closeTimer=null; }
    if(sheet.classList.contains('is-open')){ fetchAndRender(slug, function(){}); return; }   // already up: just swap content
    pending=true;
    document.documentElement.classList.add('ps-open');   // drop html's scrollbar gutter NOW (during the load) so no reflow hits the slide's first frame
    // 1) load with the top progress bar while the list stays put; 2) once ready, lock + slide up
    fetchAndRender(slug, function(){
      pending=false;
      sheet.inert=false;
      sheet.setAttribute('aria-hidden','false');
      lockScroll(true);
      void sheet.offsetHeight;   // force reflow so re-opening quickly still plays the slide-up from translateY(100%)
      requestAnimationFrame(function(){ sheet.classList.add('is-open'); });   // start the slide on the NEXT frame, after the body lock has laid out
      syncSbw(); syncEnd();
      startSheetLenis();
    });
  }
  // ---- sheet-local Lenis: same elastic wheel feel as the pages (page Lenis is stopped while open) ----
  var sheetLenis=null, sheetRaf=0;
  function startSheetLenis(){
    if(sheetLenis||!window.Lenis||reduce||!scrollEl)return;
    try{
      sheetLenis=new Lenis({wrapper:scrollEl, content:bodyEl, lerp:0.09, smoothWheel:true, autoRaf:false});
      var loop=function(t){ if(!sheetLenis)return; sheetLenis.raf(t); sheetRaf=requestAnimationFrame(loop); };
      sheetRaf=requestAnimationFrame(loop);
    }catch(e){ sheetLenis=null; }
  }
  function stopSheetLenis(){
    if(sheetRaf){ cancelAnimationFrame(sheetRaf); sheetRaf=0; }
    if(sheetLenis){ try{ sheetLenis.destroy(); }catch(e){} sheetLenis=null; }
  }
  function closeSheet(){
    if(pending){ pending=false; loadSeq++; barStopTrickle(); barHide(); if(bodyEl){bodyEl.innerHTML='';} openedViaPush=false; document.documentElement.classList.remove('ps-open'); return; }   // cancelled mid-load
    if(!sheet||!sheet.classList.contains('is-open'))return;
    sheet.classList.remove('is-open');
    stopSheetLenis();   // hand scrolling back to the page Lenis right away
    sheet.setAttribute('aria-hidden','true');
    lockScroll(false);
    document.documentElement.classList.remove('ps-open');
    openedViaPush=false;
    var done=false;
    function finish(){
      if(done)return; done=true;
      sheet.removeEventListener('transitionend', onEnd);
      stopSheetLenis();
      bodyEl.innerHTML='';
      bodyEl.classList.remove('is-loaded');
      sheet.classList.remove('is-own-close');
      mags=[]; teardownReveal();
      sheet.inert=true;
    }
    function onEnd(e){ if(e.target===sheet && e.propertyName==='transform')finish(); }
    if(closeTimer)clearTimeout(closeTimer);
    if(reduce){ finish(); }
    else {
      sheet.addEventListener('transitionend', onEnd);
      closeTimer=setTimeout(finish, 1400);   // failsafe if transitionend doesn't fire (must exceed the 1.2s slide)
    }
  }
  // user-facing close (X / ESC): if we own the ?p= history entry, back out of it (popstate then
  // runs closeSheet); otherwise (sheet opened straight from a `?p=` URL on load) just strip the
  // param in place, without adding a history entry, and close directly.
  function requestClose(){
    if(!sheet||(!sheet.classList.contains('is-open')&&!pending))return;
    if(openedViaPush){ history.back(); }
    else {
      var url=new URL(location.href);
      url.searchParams.delete('p');
      history.replaceState(null,'',url.pathname+(url.search||'')+url.hash);
      closeSheet();
    }
  }

  addEventListener('popstate', function(){
    var slug=getSlug();
    if(slug)openSheet(slug, false);
    else closeSheet();
  });
  addEventListener('keydown', function(e){
    if(e.key==='Escape' && sheet && (sheet.classList.contains('is-open')||pending))requestClose();
  });
  document.addEventListener('click', function(e){
    var el=e.target.closest ? e.target.closest('[data-slug]') : null;
    if(!el)return;
    var slug=el.getAttribute('data-slug');
    if(!slug)return;
    e.preventDefault();
    openSheet(slug, true);
  });

  function initFromUrl(){
    var slug=getSlug();
    if(slug)openSheet(slug, false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded', initFromUrl);
  else initFromUrl();

  window.ProjectSheet={
    open: function(slug){ openSheet(slug, true); },
    close: function(){ requestClose(); }
  };
})();
