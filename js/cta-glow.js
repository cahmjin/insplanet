/* "Say Hello!" CTA background — animated horizon glow (WebGL fragment shader).
   Settings were tuned in glow-lab.html and frozen here. Renders only while the section is on
   screen (the rAF keeps ticking cheaply, the GL draw is skipped when off-screen). If WebGL is
   unavailable the <canvas> stays transparent and the CSS background PNG shows through. */
(function(){
  const canvas = document.querySelector('canvas.cta-glow');
  if(!canvas) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;   // CSS PNG fallback stays

  let started=false;
  function start(){
  if(started) return; started=true;
  const gl = canvas.getContext('webgl', {alpha:true, antialias:false, premultipliedAlpha:false});
  if(!gl) return;

  /* frozen settings (from glow-lab) */
  const S = {
    horizon:0.3, curve:8.0, scale:0.4, rim:0.0024, rimBlur:1.2, rimY:0.02, rimSize:0.81,
    planetGlow:1.0, planetReach:0.09, bloom:0.36, sunWidth:0.7, edge:0.32,
    shimmer:0.0, speed:0.8, intensity:0.55, colorMix:0.8, colorFlow:1.2, lift:0.23,
    colA:'#7a3dd6', colA2:'#40d8e2', colA3:'#ec32b1', colB:'#b397dd'
  };
  const hex = h => { const n=parseInt(h.slice(1),16); return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255]; };

  const VERT = 'attribute vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }';
  const FRAG = `
  precision highp float;
  uniform vec2 uRes; uniform float uTime;
  uniform float uHorizon, uCurve, uScale, uRim, uRimBlur, uRimY, uRimSize, uPlanetGlow, uPlanetReach, uBloom, uSunWidth, uEdge, uShimmer, uSpeed, uIntensity, uColorMix, uColorFlow, uLift;
  uniform vec3 uColA, uColA2, uColA3, uColB;
  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p);
    float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.0+vec2(11.3,7.1); a*=.5; } return v; }
  void main(){
    vec2 uv = gl_FragCoord.xy/uRes;
    float aspect = uRes.x/uRes.y;
    vec2 p = vec2((uv.x-0.5)*aspect, uv.y);
    p = (p - vec2(0.0, uHorizon))/uScale + vec2(0.0, uHorizon);
    float R = uCurve;
    vec2 c = vec2(0.0, uHorizon - R);
    float d = length(p-c) - R;
    float t = uTime*uSpeed;
    float flow  = fbm(vec2(p.x*2.0, t*0.6)) - 0.5;
    float flow2 = fbm(vec2(p.x*5.0 - t, t*0.9 + 5.0));
    d += flow*uShimmer;
    float above = max(d, 0.0);
    vec2 pRim   = vec2(p.x / uRimSize, p.y);                 // rim-only horizontal width (bigger = wider arc)
    float dRim  = (length(pRim - c) - R) - uRimY;            // rim distance: width-scaled + vertical shift
    float rim   = pow(exp(-dRim*dRim/uRim), 2.0 - uRimBlur); // thin bright line; uRimBlur softens it
    float bloom = exp(-above/uBloom);
    float centerW = exp(-p.x*p.x/(uSunWidth*2.0));
    float sun   = exp(-p.x*p.x/(uSunWidth*0.5)) * exp(-above/(uBloom*0.35));
    float flick = 0.7 + 0.6*flow2;
    float cf = uTime*uColorFlow;
    float m1 = fbm(vec2(p.x*1.3 + cf*0.40, cf*0.25 + 9.0));
    float m2 = fbm(vec2(p.x*0.8 - cf*0.30, cf*0.18 + 21.0));
    vec3 palette = uColA;
    palette = mix(palette, uColA2, clamp((m1-0.25)*2.0, 0.0, 1.0)*uColorMix);
    palette = mix(palette, uColA3, clamp((m2-0.40)*2.0, 0.0, 1.0)*uColorMix);
    float taper = exp(-pow(abs(p.x), 4.0) * uEdge);          // sharper L/R points
    // SKY: atmosphere glow + bright rim (drawn first; planet will cover it)
    vec3 sky = vec3(0.0);
    sky += palette * bloom * centerW * 1.2 * flick * taper;
    sky += palette * sun   * 1.3 * flick;
    sky += uColB   * rim   * (0.7 + 0.6*centerW);
    sky += uColB   * sun   * 0.6;
    // PLANET body: dark sphere whose limb catches a little light
    float surf = exp(min(d, 0.0) / max(uPlanetReach, 0.001));
    vec3 planet = palette * surf * uPlanetGlow * centerW * flick;
    // composite: planet disc sits IN FRONT, occluding everything below its limb (d<0)
    float planetCover = smoothstep(0.006, -0.006, d);
    vec3 col = mix(sky, planet, planetCover);
    col *= uIntensity;
    col *= smoothstep(0.0, max(uLift,0.001), uv.y);
    gl_FragColor = vec4(vec3(0.0784) + col, 1.0);   // #141414 base + additive glow
  }`;

  function compile(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  let prog;
  try{
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  }catch(e){ return; }   // fall back to the CSS PNG
  gl.useProgram(prog);

  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog,'a'); gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uRes','uTime','uHorizon','uCurve','uScale','uRim','uRimBlur','uRimY','uRimSize','uPlanetGlow','uPlanetReach','uBloom','uSunWidth','uEdge','uShimmer','uSpeed','uIntensity','uColorMix','uColorFlow','uLift','uColA','uColA2','uColA3','uColB']
    .forEach(n=> U[n]=gl.getUniformLocation(prog,n));

  // static uniforms (set once)
  gl.useProgram(prog);
  gl.uniform1f(U.uHorizon, S.horizon);   gl.uniform1f(U.uCurve, S.curve);
  gl.uniform1f(U.uScale, S.scale);       gl.uniform1f(U.uRim, S.rim);
  gl.uniform1f(U.uRimBlur, S.rimBlur);   gl.uniform1f(U.uRimY, S.rimY);
  gl.uniform1f(U.uRimSize, S.rimSize);
  gl.uniform1f(U.uPlanetGlow, S.planetGlow); gl.uniform1f(U.uPlanetReach, S.planetReach);
  gl.uniform1f(U.uBloom, S.bloom);       gl.uniform1f(U.uSunWidth, S.sunWidth);
  gl.uniform1f(U.uEdge, S.edge);
  gl.uniform1f(U.uShimmer, S.shimmer);   gl.uniform1f(U.uSpeed, S.speed);
  gl.uniform1f(U.uIntensity, S.intensity); gl.uniform1f(U.uColorMix, S.colorMix);
  gl.uniform1f(U.uColorFlow, S.colorFlow); gl.uniform1f(U.uLift, S.lift);
  gl.uniform3fv(U.uColA, hex(S.colA));   gl.uniform3fv(U.uColA2, hex(S.colA2));
  gl.uniform3fv(U.uColA3, hex(S.colA3)); gl.uniform3fv(U.uColB, hex(S.colB));

  const RS = 0.75;   // render scale — the glow is soft, so a smaller buffer is invisible & cheaper
  function resize(){
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth*dpr*RS));
    const h = Math.max(1, Math.round(canvas.clientHeight*dpr*RS));
    if(canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h; gl.viewport(0,0,w,h); }
  }
  function onScreen(){ const r=canvas.getBoundingClientRect(); return r.bottom>0 && r.top<window.innerHeight; }

  const t0 = performance.now();
  function draw(){
    resize();
    gl.useProgram(prog);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, (performance.now()-t0)/1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  draw();   // one paint up front so it's ready before it scrolls in
  (function loop(){ if(onScreen()) draw(); requestAnimationFrame(loop); })();
  }  // end start()

  // Defer creating the WebGL context until the CTA is near. iOS Safari keeps only a few live WebGL
  // contexts and can drop an older one (the Insight shader) when a new one is made on load; this
  // keeps just blob + Insight alive until you actually scroll down to the CTA.
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ io.disconnect(); start(); } }, {rootMargin:'100% 0px'});
    io.observe(canvas);
  } else { start(); }
})();
