/* ===== WebGL blob sphere (from blob_sphere.html, UI removed, params fixed,
        outside-of-sphere made transparent so background line shows through) ===== */
const canvas=document.getElementById('blob');
const gl=canvas.getContext('webgl',{antialias:false,premultipliedAlpha:true,alpha:true,powerPreference:'high-performance'});

/* fixed params (source default values) */
const P={
  sSize:1600, sSpeed:48, sBlur:24, sWarp:20,
  lSize:13, lWarp:2.1, lSpeed:64, lPoints:8, lBlur:4
};

/* size the drawing buffer to the canvas' actual (responsive) pixel size */
function setSize(){
  canvas.width=Math.max(1,canvas.clientWidth);
  canvas.height=Math.max(1,canvas.clientHeight);
}
setSize();

let fboTex,fbo;
function initFBO(){
  if(fboTex)gl.deleteTexture(fboTex);
  if(fbo)gl.deleteFramebuffer(fbo);
  fboTex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,fboTex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,canvas.width,canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  fbo=gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,fboTex,0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
initFBO();

/* on resize: re-size buffer + rebuild FBO (debounced) */
let rt;
window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{setSize();initFBO();},150);});

const V=`attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const F1=`precision mediump float;
uniform vec2 u_res;
uniform float u_st,u_ss,u_sb,u_sw,u_s;
void main(){
  vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);
  vec2 C=u_res*0.5;
  float S=u_s;
  float MR=S*u_ss;
  float t=u_st;
  vec2 bp[6];
  bp[0]=C+vec2(sin(t*.41)*.30+cos(t*.27)*.15,cos(t*.38)*.28+sin(t*.19)*.12)*MR;
  bp[1]=C+vec2(sin(t*.33+1.2)*.32+cos(t*.61)*.14,cos(t*.29+.5)*.28+sin(t*.44)*.12)*MR;
  bp[2]=C+vec2(sin(t*.37+2.5)*.34+cos(t*.53)*.16,cos(t*.43+1.1)*.30+sin(t*.28)*.14)*MR;
  bp[3]=C+vec2(sin(t*.29+4.)*.30+cos(t*.61)*.13,cos(t*.35+2.3)*.26+sin(t*.47)*.12)*MR;
  bp[4]=C+vec2(sin(t*.51+3.1)*.28+cos(t*.38)*.14,cos(t*.44+1.7)*.24+sin(t*.33)*.12)*MR;
  bp[5]=C+vec2(sin(t*.45+5.2)*.26+cos(t*.72)*.12,cos(t*.39+3.8)*.22+sin(t*.56)*.10)*MR;
  float br[6];
  br[0]=MR*(.55+sin(t*.5)*.05);br[1]=MR*(.48+sin(t*.6+1.)*.04);
  br[2]=MR*(.44+sin(t*.7+2.)*.04);br[3]=MR*(.44+sin(t*.8+3.)*.04);
  br[4]=MR*(.38+sin(t*.9+4.)*.03);br[5]=MR*(.34+sin(t*1.+5.)*.03);
  float sph[6];sph[0]=0.;sph[1]=1.05;sph[2]=2.1;sph[3]=3.15;sph[4]=4.2;sph[5]=5.25;
  float sfr[6];sfr[0]=.73;sfr[1]=.61;sfr[2]=.89;sfr[3]=.67;sfr[4]=.95;sfr[5]=.79;
  vec3 cl[6];
  cl[0]=vec3(1.,1.,1.);cl[1]=vec3(.72,.60,1.);cl[2]=vec3(1.,.10,.82);
  cl[3]=vec3(.05,.82,1.);cl[4]=vec3(.38,.78,1.);cl[5]=vec3(1.,.42,.95);
  float tw=0.;vec3 tc=vec3(0.);
  for(int i=0;i<6;i++){
    vec2 dv=px-bp[i];float d=length(dv);float a=atan(dv.y,dv.x);
    float r=br[i]*(1.+(sin(a*2.+t*sfr[i]*1.3+sph[i])*.18+sin(a*3.-t*sfr[i]*.9+sph[i]*1.3)*.12+sin(a*5.+t*sfr[i]*1.7+sph[i]*.7)*.07+cos(a*4.-t*sfr[i]*1.1+sph[i]*1.6)*.09)*u_sw);
    r=max(r,1.);float nd=d/r;float fs=1.-u_sb*.75;float alpha=smoothstep(1.,fs,nd);
    tw+=alpha;tc+=mix(vec3(1.),cl[i],alpha)*alpha;
  }
  vec3 col=tw>0.001?tc/tw:vec3(1.);
  gl_FragColor=vec4(col,clamp(tw,0.,1.));
}`;

/* F2: identical math, but final alpha = sphere mask (bigA) instead of 1.0
   so the area outside the sphere is transparent and the bg line shows through */
const F2=`precision mediump float;
uniform vec2 u_res;
uniform sampler2D u_tex;
uniform float u_ph,u_ls,u_lb,u_lw,u_lp,u_s;
void main(){
  vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 C=u_res*0.5;
  float S=u_s;
  float R=S*u_ls;
  vec2 dv=px-C;float d=length(dv);float ang=atan(dv.y,dv.x);
  float w=u_lw;float p=u_lp;float ph=u_ph;
  float deform=
    sin(ang*2.+ph      )*.18
   +sin(ang*3.-ph*1.13 )*.12
   +sin(ang*5.+ph*.87  )*.07
   +cos(ang*4.-ph*1.6  )*.09;
  float bigR=max(R,1.);
  float nd=d/(bigR*(1.+deform*w*.06));
  float blurWave=sin(ang*2.+ph*0.7)*.4+sin(ang*3.-ph*0.5)*.3+cos(ang*5.+ph*0.9)*.2;
  float blurAmount=max(u_lb*(1.0+blurWave),0.0);
  float fs=1.-blurAmount*.65;
  float bigA=smoothstep(1.,fs,nd);
  vec4 s=texture2D(u_tex,uv);
  // 작은 구체(메타볼)의 알파를 그대로 살려서 큰 구체 마스크와 곱함 → 최종 알파
  float a=s.a*bigA;
  // 색은 흰색을 섞지 않은 순수 블롭색. 프리멀티플라이드(색*알파)로 출력
  gl_FragColor=vec4(s.rgb*a,a);
}`;

function compile(t,s){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return sh;}
function mkprog(fs){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,V));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);return p;}
const p1=mkprog(F1),p2=mkprog(F2);

const buf=gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER,buf);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
function bq(p){const l=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);}

const u1={res:gl.getUniformLocation(p1,'u_res'),st:gl.getUniformLocation(p1,'u_st'),ss:gl.getUniformLocation(p1,'u_ss'),sb:gl.getUniformLocation(p1,'u_sb'),sw:gl.getUniformLocation(p1,'u_sw'),s:gl.getUniformLocation(p1,'u_s')};
const u2={res:gl.getUniformLocation(p2,'u_res'),tex:gl.getUniformLocation(p2,'u_tex'),ph:gl.getUniformLocation(p2,'u_ph'),ls:gl.getUniformLocation(p2,'u_ls'),lb:gl.getUniformLocation(p2,'u_lb'),lw:gl.getUniformLocation(p2,'u_lw'),lp:gl.getUniformLocation(p2,'u_lp'),s:gl.getUniformLocation(p2,'u_s')};

/* blob size basis: design baseline (min side = 1080), clamped to 80%~120%. */
const BASE=1080;
function blobS(W,H){return Math.max(BASE*0.8,Math.min(Math.min(W,H),BASE*1.2));}

/* precomputed fixed param values */
const ss=Math.max(.001,P.sSize/1000);
const sb=P.sBlur/20;
const sw=P.sWarp/20;
const ls=P.lSize/20*.5;
const lb=P.lBlur/20;
const lw=P.lWarp;
const lp=P.lPoints;
const sSpd=P.sSpeed/100;
const lSpd=P.lSpeed/100;

let st=0,phase=0,last=performance.now();
/* skip the (heavy) shader render once the menu has fully covered the blob (overlay '.covered').
   keep the rAF alive so it resumes instantly on close; reset `last` to avoid a time jump. */
const _menu=document.getElementById('menu-overlay');
/* pause the (heavy) shader when the hero canvas is scrolled off screen — keep the rAF alive
   so it resumes instantly; reset `last` to avoid a time jump on return. */
let _onScreen=true;
if('IntersectionObserver'in window){
  new IntersectionObserver(es=>{_onScreen=es[0].isIntersecting;},{threshold:0.01}).observe(canvas);
}
function draw(now){
  requestAnimationFrame(draw);
  if(!_onScreen||(_menu&&_menu.classList.contains('covered'))){last=now;return;}
  const dt=Math.min((now-last)/1000,.05);last=now;
  st+=dt*(0.5+sSpd*3.0);
  phase+=dt*(lSpd*lSpd*8.0);
  const W=canvas.width,H=canvas.height;
  const S=blobS(W,H);

  // pass 1 -> FBO
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.viewport(0,0,W,H);
  gl.disable(gl.BLEND);
  gl.useProgram(p1);bq(p1);
  gl.uniform2f(u1.res,W,H);gl.uniform1f(u1.st,st);
  gl.uniform1f(u1.ss,ss);gl.uniform1f(u1.sb,sb);gl.uniform1f(u1.sw,sw);
  gl.uniform1f(u1.s,S);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

  // pass 2 -> screen (transparent outside sphere)
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.viewport(0,0,W,H);
  gl.clearColor(0,0,0,0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(p2);bq(p2);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,fboTex);
  gl.uniform1i(u2.tex,0);gl.uniform2f(u2.res,W,H);
  gl.uniform1f(u2.ph,phase);gl.uniform1f(u2.ls,ls);
  gl.uniform1f(u2.lb,lb);gl.uniform1f(u2.lw,lw);gl.uniform1f(u2.lp,lp);
  gl.uniform1f(u2.s,S);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
requestAnimationFrame(draw);
