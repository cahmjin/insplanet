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
  function magnetic(el){
    let tx=0,ty=0,x=0,y=0,vx=0,vy=0;
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      // subtract current translate (x,y) to get the untransformed center -> no feedback drift
      tx=clamp((e.clientX-(r.left+r.width/2-x))*STRENGTH);
      ty=clamp((e.clientY-(r.top+r.height/2-y))*STRENGTH);
    });
    el.addEventListener('mouseleave',()=>{tx=0;ty=0;});
    // persistent spring loop (cheap; always converges to tx/ty, springs back on leave)
    (function frame(){
      vx=(vx+(tx-x)*STIFF)*DAMP; vy=(vy+(ty-y)*STIFF)*DAMP;
      x+=vx; y+=vy;
      el.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px)';
      requestAnimationFrame(frame);
    })();
  }
  document.querySelectorAll('#ciLogo,#menuLogo,#letsTalk,#fullMenu,#menuClose,.m-item')
    .forEach(magnetic);
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

/* ===== full-screen menu: circular reveal open/close ===== */
(function(){
  const overlay=document.getElementById('menuOverlay');
  const openBtn=document.getElementById('fullMenu');
  const closeBtn=document.getElementById('menuClose');
  if(!overlay||!openBtn||!closeBtn)return;
  const open=()=>{overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');};
  const close=()=>{overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');};
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
