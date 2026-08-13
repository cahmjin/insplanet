/* tap feedback for the mobile pages — the hover-less "press feel".
   Visual spring on tap (all platforms): .is-tapped runs the m-tap keyframe (style.css ≤767).
   An ANIMATION, not an :active transition, so it can't collide with the elements' own
   reveal transitions (.mc-brief / .m-cta-arrow carry delayed transform transitions).
   NOTE: haptics were tried and removed (2026-08-13) — Android's vibrate() felt like nothing
   and iOS exposes no haptic API to web pages at all (the <input switch> toggle hack was a
   no-op on current iOS). Visual feedback only. */
(function(){
  // meaningful taps only — links, buttons, the carousel dots, header controls
  var SEL='a[href],button,.m-proj-dots span,#full-menu,#menu-close,#lets-talk';
  document.addEventListener('pointerdown',function(e){
    var el=e.target&&e.target.closest&&e.target.closest(SEL);
    if(!el)return;
    el.classList.remove('is-tapped');   // restart the spring if re-tapped mid-animation
    void el.offsetWidth;
    el.classList.add('is-tapped');
  },{passive:true});
  document.addEventListener('animationend',function(e){
    if(e.animationName==='m-tap')e.target.classList.remove('is-tapped');
  },true);
})();
