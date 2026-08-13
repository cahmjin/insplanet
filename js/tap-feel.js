/* tap feedback for the mobile pages — the hover-less "press feel" experiment.
   1) haptic buzz on tap:
      - Android (Chrome/Samsung Internet): navigator.vibrate(8) — official API
      - iOS: no Vibration API. Best-effort fallback = the Safari 17.4+ <input switch> toggle
        haptic (undocumented side effect; if Apple patches it this silently does nothing)
   2) visual spring on tap (all platforms): .is-tapped runs the m-tap keyframe (style.css ≤767).
      An ANIMATION, not an :active transition, so it can't collide with the elements' own
      reveal transitions (.mc-brief / .m-cta-arrow carry delayed transform transitions).
   Restore point: commit c07d11d — revert the commit that added this file to remove the experiment. */
(function(){
  // iOS switch-hack element (visually hidden but NOT display:none — that kills the haptic)
  var sw=null;
  try{
    var host=document.createElement('div');
    host.style.cssText='position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:.01;pointer-events:none';
    host.setAttribute('aria-hidden','true');
    host.innerHTML='<input type="checkbox" switch>';
    document.body.appendChild(host);
    sw=host.firstChild;
  }catch(e){}

  function buzz(){
    if(navigator.vibrate){ try{navigator.vibrate(8);}catch(e){} return; }   // 8ms: one crisp tick, not a buzz
    if(sw){ try{sw.click();}catch(e){} }                                    // iOS fallback (may be a no-op)
  }

  // meaningful taps only — links, buttons, the carousel dots, header controls
  var SEL='a[href],button,.m-proj-dots span,#full-menu,#menu-close,#lets-talk';
  document.addEventListener('pointerdown',function(e){
    var el=e.target&&e.target.closest&&e.target.closest(SEL);
    if(!el)return;
    buzz();
    el.classList.remove('is-tapped');   // restart the spring if re-tapped mid-animation
    void el.offsetWidth;
    el.classList.add('is-tapped');
  },{passive:true});
  document.addEventListener('animationend',function(e){
    if(e.animationName==='m-tap')e.target.classList.remove('is-tapped');
  },true);
})();
