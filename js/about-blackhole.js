/* ===== About hero banner — live WebGL black-hole shader =====
   Ports the blackhole-singularity fragment shader into the About banner's <canvas>. Sizes to the
   canvas's CSS box (not the window), pauses rendering while the banner is off-screen. The banner has a
   black background, so when WebGL is unavailable or reduced-motion is requested it simply stays black. */
(function(){
  const canvas=document.getElementById('about-blackhole');
  if(!canvas)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;   // keep the static poster

  const gl=canvas.getContext('webgl2');
  const isGL2=!!gl;
  const ctx=gl||canvas.getContext('webgl')||canvas.getContext('experimental-webgl');
  if(!ctx)return;   // no WebGL -> the <img> poster behind the canvas stays visible

  const VS2=`#version 300 es
    in vec2 position; void main(){ gl_Position=vec4(position,0,1); }`;
  const FS2=`#version 300 es
    precision highp float;
    uniform vec2 u_resolution; uniform float u_time; out vec4 outColor;
    void main(){
      vec2 F=gl_FragCoord.xy; float i=0.2; float a;
      vec2 r=u_resolution.xy; vec2 p=(F+F-r)/r.y/0.7; vec2 d=vec2(-1.0,1.0); vec2 b=p-i*d;
      float k_val=0.1+i/dot(b,b);
      vec2 c=vec2(p.x+p.y*d.x/k_val, p.y*d.y/k_val);
      a=dot(c,c); float t=0.5*log(a)+u_time*i;
      vec4 rot=cos(t+vec4(0.0,33.0,11.0,0.0));
      mat2 m_rot=mat2(rot.x,rot.y,rot.z,rot.w);
      vec2 v=(c*m_rot)/i; vec2 w=vec2(0.0); float li=i;
      for(int k=0;k<12;k++){ v+=0.7*sin(v.yx*(li+1.0)+u_time)/(li+1.0)+0.5; w+=1.0+sin(v); li+=1.0; }
      float disk=length(sin(v/0.3)*0.4+c*(3.0+d));
      vec4 cg=c.x*vec4(0.6,-0.4,-1.0,0.0);
      vec4 ev=exp(cg)/w.xyyx/(2.0+disk*disk/4.0-disk)/(0.5+1.0/a)/(0.03+abs(length(p)-0.7));
      outColor=vec4(1.0-exp(-ev.rgb),1.0);
    }`;
  const VS1=`attribute vec2 position; void main(){ gl_Position=vec4(position,0,1); }`;
  const FS1=`precision highp float;
    uniform vec2 u_resolution; uniform float u_time;
    void main(){
      vec2 F=gl_FragCoord.xy; float i=0.2; float a;
      vec2 r=u_resolution.xy; vec2 p=(F+F-r)/r.y/0.7; vec2 d=vec2(-1.0,1.0); vec2 b=p-i*d;
      float k_val=0.1+i/dot(b,b);
      vec2 c=vec2(p.x+p.y*d.x/k_val, p.y*d.y/k_val);
      a=dot(c,c); float t=0.5*log(a)+u_time*i;
      vec4 rot=cos(t+vec4(0.0,33.0,11.0,0.0));
      vec2 v=vec2(c.x*rot.x+c.y*rot.z, c.x*rot.y+c.y*rot.w)/i;
      vec2 w=vec2(0.0); float li=1.2;
      for(int k=0;k<12;k++){ v+=0.7*sin(vec2(v.y,v.x)*li+u_time)/li+0.5; w+=1.0+sin(v); li+=1.0; }
      float disk=length(sin(v/0.3)*0.4+c*(3.0+d));
      vec3 cg=c.x*vec3(0.6,-0.4,-1.0);
      vec3 ev=exp(cg)/w.xyy/(2.0+disk*disk/4.0-disk)/(0.5+1.0/a)/(0.03+abs(length(p)-0.7));
      gl_FragColor=vec4(1.0-exp(-ev),1.0);
    }`;

  function shader(type,src){const s=ctx.createShader(type);ctx.shaderSource(s,src);ctx.compileShader(s);
    if(!ctx.getShaderParameter(s,ctx.COMPILE_STATUS)){console.error(ctx.getShaderInfoLog(s));return null;}return s;}
  const prog=ctx.createProgram();
  ctx.attachShader(prog,shader(ctx.VERTEX_SHADER,isGL2?VS2:VS1));
  ctx.attachShader(prog,shader(ctx.FRAGMENT_SHADER,isGL2?FS2:FS1));
  ctx.linkProgram(prog);
  if(!ctx.getProgramParameter(prog,ctx.LINK_STATUS)){console.error(ctx.getProgramInfoLog(prog));return;}

  const buf=ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER,buf);
  ctx.bufferData(ctx.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),ctx.STATIC_DRAW);
  const posLoc=ctx.getAttribLocation(prog,'position');
  const resLoc=ctx.getUniformLocation(prog,'u_resolution');
  const timeLoc=ctx.getUniformLocation(prog,'u_time');

  const DPR=Math.min(window.devicePixelRatio||1, 1.5);   // cap DPR — full-bleed banner stays light on retina
  function resize(){
    const w=Math.max(1,Math.round(canvas.clientWidth*DPR));
    const h=Math.max(1,Math.round(canvas.clientHeight*DPR));
    if(canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; ctx.viewport(0,0,w,h); }
  }
  window.addEventListener('resize',resize);

  // pause while the banner is scrolled out of view
  let onScreen=true, running=false;
  if('IntersectionObserver'in window){
    new IntersectionObserver(es=>{onScreen=es[0].isIntersecting; if(onScreen)start();})
      .observe(canvas);
  }
  function frame(t){
    if(!onScreen){running=false;return;}
    if(document.documentElement.classList.contains('pg-anim')){requestAnimationFrame(frame);return;}  // hold during a page transition
    resize();
    ctx.useProgram(prog);
    ctx.enableVertexAttribArray(posLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER,buf);
    ctx.vertexAttribPointer(posLoc,2,ctx.FLOAT,false,0,0);
    ctx.uniform2f(resLoc,canvas.width,canvas.height);
    ctx.uniform1f(timeLoc,t*0.001);
    ctx.drawArrays(ctx.TRIANGLES,0,6);
    requestAnimationFrame(frame);
  }
  function start(){ if(running)return; running=true; requestAnimationFrame(frame); }
  canvas.classList.add('is-live');   // reveal the canvas over the poster once we're set up
  resize(); start();
})();
