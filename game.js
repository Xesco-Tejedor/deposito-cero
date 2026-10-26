'use strict';
/* =====================================================================
   DEPÓSITO CERO — aventura gráfica noir ochentera
   Motor + contenido. Sin dependencias externas salvo la tipografía.
   Arte: SVG original, estética neón/CRT/VHS años 80.
   Música: sintetizada con WebAudio.
   ===================================================================== */

const $  = s => document.querySelector(s);
const byId = id => document.getElementById(id);

/* ============================ AUDIO ============================ */
const AudioEngine = {
  ctx:null, master:null, musicBus:null, playing:true, timer:null, beat:0, rainNode:null,
  init(){
    if(this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = .9;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = .8;
    this.musicBus.connect(this.master);
    this.startMusic();
  },
  now(){ return this.ctx ? this.ctx.currentTime : 0; },
  env(g,t,a,peak,d){
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(peak,t+a);
    g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);
  },
  tone(freq,t,dur,type='triangle',peak=.15,detune=0){
    if(!this.ctx) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.value=freq; o.detune.value=detune;
    this.env(g,t,.01,peak,dur);
    o.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t+dur+.1);
  },
  noise(t,dur,freq=3000,q=1,peak=.12,dest=null){
    if(!this.ctx) return;
    const len = Math.max(1,(dur*this.ctx.sampleRate)|0);
    const buf = this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=q;
    const g=this.ctx.createGain(); this.env(g,t,.005,peak,dur);
    src.connect(f); f.connect(g); g.connect(dest||this.master);
    src.start(t); src.stop(t+dur+.05);
  },
  /* ---- loop noir en La menor, 72 bpm ---- */
  bassline:[
    [110.00,110.00,130.81,164.81],
    [110.00,110.00,130.81,164.81],
    [146.83,146.83,174.61,220.00],
    [146.83,146.83,174.61,196.00],
    [ 87.31, 87.31,110.00,130.81],
    [ 87.31, 87.31,110.00,130.81],
    [ 82.41, 82.41,103.83,123.47],
    [ 82.41, 98.00,103.83,123.47],
  ],
  chords:[[220,261.63,329.63,493.88],[220,261.63,329.63,493.88],[293.66,349.23,440,587.33],[293.66,349.23,440,523.25],
          [174.61,220,261.63,349.23],[174.61,220,261.63,349.23],[164.81,207.65,246.94,329.63],[164.81,207.65,246.94,415.30]],
  startMusic(){
    if(!this.ctx || this.timer) return;
    const beatDur = 60/72;
    this.timer = setInterval(()=>{
      if(!this.playing) return;
      const t = this.now()+.05;
      const bar = (this.beat>>2)%8, q = this.beat%4;
      this.tone(this.bassline[bar][q], t, beatDur*.95, 'triangle', .16);
      this.tone(this.bassline[bar][q]/2, t, beatDur*.95, 'sine', .10);
      if(q===1||q===3) this.noise(t,.09,4200,.7,.05,this.musicBus);
      if(q===0 && bar%2===0){
        this.chords[bar].forEach((f,i)=>this.tone(f*2, t+i*.012, beatDur*1.8, 'triangle', .035, i*4));
      }
      this.beat++;
    }, (60/72)*1000);
  },
  toggleMusic(){
    this.playing = !this.playing;
    if(this.musicBus) this.musicBus.gain.value = this.playing ? .8 : 0;
    return this.playing;
  },
  rain(on){
    if(!this.ctx) return;
    if(on && !this.rainNode){
      const len = this.ctx.sampleRate*2;
      const buf = this.ctx.createBuffer(1,len,this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*.5;
      const src=this.ctx.createBufferSource(); src.buffer=buf; src.loop=true;
      const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900;
      const g=this.ctx.createGain(); g.gain.value=.045;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
      this.rainNode={src,g};
    } else if(!on && this.rainNode){
      try{this.rainNode.src.stop();}catch(e){}
      this.rainNode=null;
    }
  },
  click(){ this.init(); if(!this.ctx)return; this.tone(660,this.now(),.05,'square',.06); },
  pickup(){ this.init(); if(!this.ctx)return; const t=this.now(); this.tone(523.25,t,.09,'triangle',.12); this.tone(783.99,t+.09,.14,'triangle',.12); },
  deny(){ this.init(); if(!this.ctx)return; const t=this.now(); this.tone(196,t,.12,'sawtooth',.08); this.tone(185,t+.12,.18,'sawtooth',.08); },
  glitch(){ this.init(); if(!this.ctx)return; const t=this.now();
    this.tone(55,t,.35,'sawtooth',.16,12); this.noise(t,.3,900,2,.14); this.tone(61.7,t+.05,.3,'sawtooth',.1,-18); },
  success(){ this.init(); if(!this.ctx)return; const t=this.now();
    [220,277.18,329.63,440].forEach((f,i)=>this.tone(f,t+i*.1,.22,'triangle',.13)); },
  screech(){ this.init(); if(!this.ctx)return; const t=this.now();
    this.noise(t,1.1,1400,6,.10); this.noise(t+.15,.9,2600,8,.07); this.tone(1200,t,.9,'sine',.04,30); },
};

/* ============================ SVG: ESCENAS ============================ */
/* viewBox común 0 0 1600 900. Hotspots: formas con clase .hs y data-hs */

function rainLines(n,y0,y1,cls){
  let s=`<g class="rain ${cls||''}">`;
  for(let i=0;i<n;i++){
    const x=(i*97)%1600, y=y0+((i*173)%(y1-y0));
    s+=`<line x1="${x}" y1="${y}" x2="${x-14}" y2="${y+64}" style="animation-delay:${(i%10)*0.13}s"/>`;
  }
  return s+'</g>';
}
const NEON_DEFS = `
  <filter id="neonP" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="neonC" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="4" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

function svgTaller(){
return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#232035"/><stop offset=".7" stop-color="#191624"/><stop offset="1" stop-color="#141120"/>
  </linearGradient>
  <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2b1f2a"/><stop offset="1" stop-color="#120d14"/>
  </linearGradient>
  <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1c2a48"/><stop offset=".6" stop-color="#101a30"/><stop offset="1" stop-color="#0a1220"/>
  </linearGradient>
  <linearGradient id="posterSun" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd76a"/><stop offset=".5" stop-color="#ff2e88"/><stop offset="1" stop-color="#8a4bff"/>
  </linearGradient>
  <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e8a33d" stop-opacity=".28"/><stop offset="1" stop-color="#e8a33d" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="woodT" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4a3244"/><stop offset="1" stop-color="#31222f"/>
  </linearGradient>
  <radialGradient id="moonG" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#f4ead2"/><stop offset=".8" stop-color="#d9cbaa"/><stop offset="1" stop-color="#d9cbaa" stop-opacity="0"/>
  </radialGradient>
  ${NEON_DEFS}
</defs>
<rect width="1600" height="900" fill="#0b0b10"/>
<rect width="1600" height="600" fill="url(#wallG)"/>
<rect y="560" width="1600" height="10" fill="#0e0c16"/>
<rect y="570" width="1600" height="30" fill="#1c1826" stroke="#0a0a12" stroke-width="3"/>
<g stroke="#100d1a" stroke-width="2" opacity=".6">
  ${Array.from({length:24},(_,i)=>`<line x1="${i*70}" y1="572" x2="${i*70+24}" y2="598"/>`).join('')}
</g>
<polygon points="0,600 1600,600 1600,900 0,900" fill="url(#floorG)"/>
<g stroke="#0d0a10" stroke-width="4" opacity=".85">
  ${Array.from({length:11},(_,i)=>`<line x1="0" y1="${628+i*30}" x2="1600" y2="${636+i*30}"/>`).join('')}
</g>
<g stroke="#3a2a38" stroke-width="2" opacity=".5">
  ${Array.from({length:11},(_,i)=>`<line x1="0" y1="${630+i*30}" x2="1600" y2="${638+i*30}"/>`).join('')}
</g>
<!-- puerta del archivo -->
<g>
  <rect x="1440" y="264" width="170" height="510" fill="#0d0b14" stroke="#0a0a12" stroke-width="6"/>
  <rect x="1456" y="280" width="138" height="478" rx="4" fill="#241d31" stroke="#0a0a12" stroke-width="5"/>
  <rect x="1472" y="300" width="106" height="180" rx="3" fill="#2b2238" stroke="#0a0a12" stroke-width="4"/>
  <rect x="1484" y="314" width="82" height="152" rx="2" fill="#151020"/>
  <rect x="1484" y="314" width="82" height="152" rx="2" fill="#e8a33d" opacity=".12"/>
  <rect x="1472" y="508" width="106" height="210" rx="3" fill="#2b2238" stroke="#0a0a12" stroke-width="4"/>
  <rect x="1472" y="508" width="106" height="210" rx="3" fill="#0a0a12" opacity=".25"/>
  <circle cx="1572" cy="520" r="9" fill="#e8a33d" stroke="#0a0a12" stroke-width="3"/>
  <rect x="1456" y="758" width="138" height="8" fill="#e8a33d" opacity=".55"/>
</g>
<!-- percha con gabardina -->
<g>
  <line x1="1408" y1="290" x2="1408" y2="310" stroke="#0a0a12" stroke-width="6" stroke-linecap="round"/>
  <path d="M 1408 310 q -14 4 -16 22 l -6 190 q 0 16 16 16 l 12 0 q 14 0 14 -16 l -6 -190 q -2 -18 -16 -22 Z" fill="#1d212e" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
  <path d="M 1388 300 q 20 -22 40 0 q -6 8 -20 8 q -14 0 -20 -8 Z" fill="#171a26" stroke="#0a0a12" stroke-width="4"/>
</g>
<!-- ventana con persiana -->
<g>
  <rect x="96" y="116" width="340" height="420" fill="#0d0b14" stroke="#0a0a12" stroke-width="6"/>
  <rect x="112" y="132" width="308" height="388" fill="url(#night)" stroke="#0a0a12" stroke-width="4"/>
  <circle cx="356" cy="196" r="30" fill="url(#moonG)" opacity=".95"/>
  <g fill="#0a0e18">
    <rect x="120" y="330" width="70" height="190"/><rect x="198" y="280" width="52" height="240"/>
    <rect x="258" y="350" width="78" height="170"/><rect x="344" y="300" width="60" height="220"/>
  </g>
  <g fill="#2de2ff" opacity=".65">
    ${Array.from({length:12},(_,i)=>`<rect x="${128+(i*53)%260}" y="${300+(i*71)%200}" width="7" height="10" rx="1"/>`).join('')}
  </g>
  <g fill="#ffd76a" opacity=".7">
    ${Array.from({length:8},(_,i)=>`<rect x="${140+(i*67)%240}" y="${316+(i*97)%180}" width="7" height="10" rx="1"/>`).join('')}
  </g>
  <g fill="#ff2e88" opacity=".6">
    ${Array.from({length:5},(_,i)=>`<rect x="${156+(i*83)%220}" y="${330+(i*59)%170}" width="7" height="10" rx="1"/>`).join('')}
  </g>
  <g>
    <rect x="112" y="132" width="308" height="150" fill="#262b3a" stroke="#0a0a12" stroke-width="4"/>
    <g stroke="#141826" stroke-width="4">
      ${Array.from({length:9},(_,i)=>`<line x1="116" y1="${146+i*15}" x2="416" y2="${146+i*15}"/>`).join('')}
    </g>
    <rect x="112" y="276" width="308" height="12" fill="#1a1e2c" stroke="#0a0a12" stroke-width="3"/>
    <line x1="266" y1="288" x2="266" y2="340" stroke="#c9bda3" stroke-width="3"/>
    <circle cx="266" cy="346" r="6" fill="#c9bda3" stroke="#0a0a12" stroke-width="2.4"/>
  </g>
  <rect x="262" y="132" width="8" height="388" fill="#0d0b14"/>
  <rect x="96" y="528" width="340" height="18" fill="#1c1826" stroke="#0a0a12" stroke-width="4"/>
  <path d="M 96 110 q 30 130 6 250 q -12 90 8 186 l -34 0 q -14 -220 4 -436 Z" fill="#3a1f3a" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
  <g fill="#e8a33d" opacity=".10">
    <polygon points="150,546 190,546 400,900 330,900"/>
    <polygon points="230,546 270,546 520,900 450,900"/>
    <polygon points="310,546 350,546 640,900 570,900"/>
  </g>
</g>
<!-- poster retrowave -->
<g transform="rotate(-1.2 620 220)">
  <rect x="500" y="140" width="250" height="170" fill="#0b0b10" stroke="#0a0a12" stroke-width="6"/>
  <rect x="508" y="148" width="234" height="154" fill="#141026" stroke="#2de2ff" stroke-width="2" opacity=".95"/>
  <circle cx="625" cy="216" r="52" fill="url(#posterSun)"/>
  <g fill="#141026">
    ${Array.from({length:4},(_,i)=>`<rect x="569" y="${224+i*11}" width="112" height="${2+i*2.4}"/>`).join('')}
  </g>
  <polygon points="530,292 580,240 628,292" fill="#1d1030" stroke="#ff2e88" stroke-width="2"/>
  <polygon points="596,292 654,232 716,292" fill="#170c26" stroke="#2de2ff" stroke-width="2"/>
  <text x="625" y="172" fill="#2de2ff" font-size="15" letter-spacing="4" text-anchor="middle" filter="url(#neonC)">MAÑANA ES 1987</text>
  <rect x="512" y="132" width="34" height="14" fill="#c9bda3" opacity=".8" transform="rotate(-40 529 139)"/>
  <rect x="704" y="132" width="34" height="14" fill="#c9bda3" opacity=".8" transform="rotate(40 721 139)"/>
</g>
<!-- corcho de investigacion -->
<g transform="rotate(1 880 260)">
  <rect x="782" y="152" width="200" height="226" rx="4" fill="#4a3428" stroke="#0a0a12" stroke-width="6"/>
  <rect x="792" y="162" width="180" height="206" fill="#6b4c38"/>
  <g transform="rotate(-4 830 220)"><rect x="806" y="190" width="52" height="60" fill="#c9c9c9" stroke="#0a0a12" stroke-width="2.6"/><rect x="812" y="196" width="40" height="40" fill="#3a3a44"/><circle cx="832" cy="184" r="5" fill="#ff5a4e" stroke="#0a0a12" stroke-width="2"/></g>
  <g transform="rotate(3 930 230)"><rect x="904" y="200" width="52" height="60" fill="#c9c9c9" stroke="#0a0a12" stroke-width="2.6"/><rect x="910" y="206" width="40" height="40" fill="#2b3a44"/><circle cx="930" cy="194" r="5" fill="#2de2ff" stroke="#0a0a12" stroke-width="2"/></g>
  <g transform="rotate(-2 870 320)"><rect x="838" y="288" width="66" height="46" fill="#efe6cc" stroke="#0a0a12" stroke-width="2.4"/>
    ${Array.from({length:4},(_,i)=>`<line x1="846" y1="${298+i*9}" x2="896" y2="${298+i*9}" stroke="#7a6f57" stroke-width="1.8"/>`).join('')}
    <circle cx="872" cy="284" r="5" fill="#ffd76a" stroke="#0a0a12" stroke-width="2"/></g>
  <g transform="rotate(5 940 320)"><rect x="914" y="292" width="48" height="58" fill="#d8cba8" stroke="#0a0a12" stroke-width="2.4"/>
    ${Array.from({length:5},(_,i)=>`<line x1="920" y1="${302+i*10}" x2="956" y2="${302+i*10}" stroke="#5e534a" stroke-width="1.6"/>`).join('')}
    <circle cx="938" cy="288" r="5" fill="#ff2e88" stroke="#0a0a12" stroke-width="2"/></g>
  <path d="M 832 184 L 872 284 L 930 194 L 938 288 L 832 184" fill="none" stroke="#d33" stroke-width="2.2" opacity=".85"/>
</g>
<!-- reloj -->
<g>
  <circle cx="1030" cy="212" r="38" fill="#efe6cc" stroke="#0a0a12" stroke-width="6"/>
  <circle cx="1030" cy="212" r="4" fill="#0a0a12"/>
  <line x1="1030" y1="212" x2="1030" y2="188" stroke="#0a0a12" stroke-width="4" stroke-linecap="round"/>
  <line x1="1030" y1="212" x2="1048" y2="222" stroke="#0a0a12" stroke-width="4" stroke-linecap="round"/>
  <g><line x1="1030" y1="212" x2="1030" y2="182" stroke="#ff2e88" stroke-width="2.4" stroke-linecap="round"/><animateTransform attributeName="transform" type="rotate" from="0 1030 212" to="360 1030 212" dur="60s" repeatCount="indefinite"/></g>
</g>
<!-- calendario -->
<g transform="rotate(2 1330 240)">
  <rect x="1296" y="196" width="74" height="92" fill="#efe6cc" stroke="#0a0a12" stroke-width="4"/>
  <rect x="1296" y="196" width="74" height="22" fill="#ff2e88" stroke="#0a0a12" stroke-width="3"/>
  <text x="1333" y="212" fill="#efe6cc" font-size="13" letter-spacing="2" text-anchor="middle" font-weight="700">OCT</text>
  <text x="1333" y="248" fill="#14111c" font-size="13" text-anchor="middle" font-weight="700">1987</text>
  <g stroke="#b9b4a4" stroke-width="1.6">
    ${Array.from({length:3},(_,i)=>`<line x1="1304" y1="${258+i*10}" x2="1362" y2="${258+i*10}"/>`).join('')}
  </g>
  <circle cx="1346" cy="268" r="8" fill="none" stroke="#d33" stroke-width="2.6"/>
</g>
<!-- estanteria de cintas -->
<g>
  <rect x="462" y="318" width="306" height="332" fill="#241a20" stroke="#0a0a12" stroke-width="7"/>
  <rect x="474" y="330" width="282" height="308" fill="#171019"/>
  ${[0,1,2,3].map(r=>`<rect x="474" y="${438+r*52}" width="282" height="12" fill="#3a2a2e" stroke="#0a0a12" stroke-width="2.6"/>`).join('')}
  ${Array.from({length:4},(_,r)=>Array.from({length:12},(_,c)=>{
    const h=36+((r*13+c*7)%4)*7, w=17+((r*5+c)%3)*4, x=480+c*23, y=438+r*52-h;
    const col=['#8a5c33','#7a3a4a','#3a5a7e','#5a3a7b','#5e6840','#a8722e'][(r*3+c)%6];
    const lean=(r===1&&c===9)?' transform="rotate(9 '+(x+w/2)+' '+(y+h)+')"':'';
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${col}" stroke="#0a0a12" stroke-width="2.4"${lean}/>`;
  }).join('')).join('')}
  <rect x="462" y="310" width="306" height="12" fill="#3a2a2e" stroke="#0a0a12" stroke-width="4"/>
  <rect x="470" y="306" width="290" height="6" fill="#2de2ff" filter="url(#neonC)" opacity=".9"/>
  <text x="617" y="344" fill="#ff9ec7" font-size="16" letter-spacing="4" text-anchor="middle">ARXIU · 1983-1992</text>
  <g transform="rotate(-2 720 288)">
    <rect x="676" y="266" width="88" height="42" fill="#6b5a3a" stroke="#0a0a12" stroke-width="4"/>
    <rect x="706" y="278" width="28" height="14" fill="#efe6cc" stroke="#0a0a12" stroke-width="2"/>
    <text x="720" y="289" fill="#14111c" font-size="9" text-anchor="middle">1987</text>
  </g>
</g>
<!-- lampara colgante -->
<g>
  <line x1="900" y1="0" x2="900" y2="126" stroke="#0a0a12" stroke-width="6"/>
  <path d="M 848 176 Q 900 110 952 176 L 940 190 Q 900 150 860 190 Z" fill="#2b3a5e" stroke="#0a0a12" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="900" cy="182" rx="30" ry="10" fill="#ffd76a" stroke="#0a0a12" stroke-width="3"/>
  <line x1="946" y1="186" x2="958" y2="232" stroke="#c9bda3" stroke-width="2.6"/>
  <circle cx="960" cy="238" r="6" fill="#e8a33d" stroke="#0a0a12" stroke-width="2.4"/>
  <polygon points="862,192 938,192 1080,760 720,760" fill="url(#lampCone)"/>
  <g fill="#ffd76a">
    <circle class="mote m1" cx="880" cy="330" r="3"/>
    <circle class="mote m2" cx="930" cy="420" r="2.4"/>
    <circle class="mote m3" cx="895" cy="510" r="2.8"/>
    <circle class="mote m4" cx="950" cy="600" r="2.2"/>
  </g>
</g>
<!-- alfombra -->
<g>
  <polygon points="930,690 1470,690 1520,870 880,870" fill="#3a1f2e" stroke="#0a0a12" stroke-width="5"/>
  <polygon points="960,712 1440,712 1478,848 922,848" fill="none" stroke="#e8a33d" stroke-width="3" opacity=".45"/>
  <polygon points="990,732 1410,732 1440,830 960,830" fill="none" stroke="#ff2e88" stroke-width="2" opacity=".3"/>
</g>
<!-- maceta con ficus -->
<g>
  <path d="M 796 700 L 848 700 L 840 772 L 804 772 Z" fill="#7a3a2e" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
  <path d="M 822 700 q -6 -40 -26 -58 M 822 700 q 4 -46 24 -64 M 822 700 q 0 -34 2 -52" fill="none" stroke="#0a0a12" stroke-width="4" stroke-linecap="round"/>
  <circle cx="794" cy="636" r="22" fill="#2e5e3a" stroke="#0a0a12" stroke-width="3.4"/>
  <circle cx="848" cy="630" r="24" fill="#35704a" stroke="#0a0a12" stroke-width="3.4"/>
  <circle cx="822" cy="612" r="26" fill="#2e5e3a" stroke="#0a0a12" stroke-width="3.4"/>
</g>
<!-- mesita con el contestador -->
<g>
  <rect x="812" y="600" width="160" height="16" fill="#3a2a2e" stroke="#0a0a12" stroke-width="4"/>
  <rect x="826" y="616" width="14" height="128" fill="#241a20" stroke="#0a0a12" stroke-width="3"/>
  <rect x="944" y="616" width="14" height="128" fill="#241a20" stroke="#0a0a12" stroke-width="3"/>
  <rect x="822" y="548" width="140" height="54" rx="8" fill="#232c38" stroke="#0a0a12" stroke-width="5"/>
  <rect x="834" y="560" width="56" height="28" rx="3" fill="#0b0b10" stroke="#0a0a12" stroke-width="2.4"/>
  <g class="reelS"><circle cx="849" cy="574" r="7" fill="none" stroke="#c9bda3" stroke-width="2.6"/><line x1="849" y1="568" x2="849" y2="580" stroke="#c9bda3" stroke-width="2"/></g>
  <g class="reelS"><circle cx="875" cy="574" r="7" fill="none" stroke="#c9bda3" stroke-width="2.6"/><line x1="875" y1="567" x2="875" y2="581" stroke="#c9bda3" stroke-width="2"/></g>
  <rect x="900" y="560" width="50" height="10" rx="3" fill="#0b0b10" stroke="#0a0a12" stroke-width="2"/>
  <rect x="900" y="576" width="50" height="10" rx="3" fill="#3a3a4a" stroke="#0a0a12" stroke-width="2"/>
  <circle cx="952" cy="556" r="5" fill="#ff2e88" filter="url(#neonP)">
    <animate attributeName="opacity" values="1;.12;1" dur="1.6s" repeatCount="indefinite"/>
  </circle>
  <text x="892" y="632" fill="#c9bda3" font-size="12" text-anchor="middle" opacity=".8" letter-spacing="3">CONTESTADOR</text>
</g>
<!-- escritorio -->
<g>
  <rect x="980" y="566" width="424" height="28" fill="url(#woodT)" stroke="#0a0a12" stroke-width="5"/>
  <rect x="980" y="566" width="424" height="8" fill="#5e4256" opacity=".8"/>
  <rect x="996" y="594" width="18" height="218" fill="#241a20" stroke="#0a0a12" stroke-width="4"/>
  <rect x="1350" y="594" width="18" height="218" fill="#241a20" stroke="#0a0a12" stroke-width="4"/>
  <rect x="1036" y="594" width="178" height="160" fill="#2b2033" stroke="#0a0a12" stroke-width="5"/>
  <rect x="1048" y="608" width="154" height="60" rx="3" fill="#352741" stroke="#0a0a12" stroke-width="3.4"/>
  <rect x="1048" y="680" width="154" height="60" rx="3" fill="#2e2138" stroke="#0a0a12" stroke-width="3.4"/>
  <rect x="1102" y="634" width="46" height="9" rx="4" fill="#e8a33d" stroke="#0a0a12" stroke-width="2.4"/>
  <rect x="1102" y="706" width="46" height="9" rx="4" fill="#e8a33d" stroke="#0a0a12" stroke-width="2.4"/>
  <rect x="1056" y="614" width="40" height="16" fill="#efe6cc" opacity=".85" transform="rotate(-2 1076 622)"/>
  <!-- CRT fosforo -->
  <g>
    <rect x="1172" y="418" width="208" height="152" rx="12" fill="#3a3244" stroke="#0a0a12" stroke-width="6"/>
    <rect x="1172" y="418" width="208" height="152" rx="12" fill="#ffffff" opacity=".05"/>
    <rect x="1192" y="438" width="168" height="112" rx="6" fill="#0a140d" stroke="#0a0a12" stroke-width="4"/>
    <rect x="1192" y="438" width="168" height="112" rx="6" fill="#59d98c" opacity=".07"/>
    <text class="crt-line1" x="1202" y="462" fill="#59d98c" font-size="14" font-family="monospace" opacity=".95">READY.</text>
    <text x="1202" y="484" fill="#59d98c" font-size="12" font-family="monospace" opacity=".6">LOAD "",8,1</text>
    <text x="1202" y="502" fill="#59d98c" font-size="12" font-family="monospace" opacity=".45">SEARCHING...</text>
    <rect class="cursorBlk" x="1202" y="516" width="12" height="16" fill="#59d98c"/>
    <circle cx="1352" cy="556" r="4" fill="#59d98c"/>
    <rect x="1246" y="570" width="60" height="10" fill="#2b2333" stroke="#0a0a12" stroke-width="2.4"/>
    <rect x="1366" y="440" width="26" height="26" fill="#ffd76a" stroke="#0a0a12" stroke-width="2" transform="rotate(6 1379 453)"/>
    <rect x="1366" y="474" width="26" height="26" fill="#ff9ec7" stroke="#0a0a12" stroke-width="2" transform="rotate(-5 1379 487)"/>
  </g>
  <polygon points="1150,596 1336,596 1350,622 1136,622" fill="#c9bda3" stroke="#0a0a12" stroke-width="4"/>
  ${Array.from({length:12},(_,i)=>`<rect x="${1156+i*15}" y="600" width="11" height="8" rx="1.6" fill="#8f8266"/>`).join('')}
  ${Array.from({length:11},(_,i)=>`<rect x="${1162+i*15}" y="611" width="11" height="7" rx="1.6" fill="#8f8266"/>`).join('')}
  <!-- osciloscopio -->
  <g>
    <rect x="984" y="464" width="158" height="108" rx="8" fill="#1b1626" stroke="#0a0a12" stroke-width="5"/>
    <rect x="996" y="476" width="134" height="62" rx="4" fill="#050d08" stroke="#0a0a12" stroke-width="3"/>
    <path d="M 1000 508 q 10 -18 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0" fill="none" stroke="#59d98c" stroke-width="2.6"/>
    <circle cx="1008" cy="552" r="6" fill="#ff2e88" stroke="#0a0a12" stroke-width="2">
      <animate attributeName="opacity" values="1;.3;1" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="1030" cy="552" r="6" fill="#3a3044" stroke="#0a0a12" stroke-width="2"/>
    <circle cx="1106" cy="552" r="7" fill="#c9bda3" stroke="#0a0a12" stroke-width="2.4"/>
    <circle cx="1126" cy="552" r="7" fill="#c9bda3" stroke="#0a0a12" stroke-width="2.4"/>
    <text x="1063" y="532" fill="#59d98c" font-size="11" text-anchor="middle" opacity=".85" letter-spacing="2">MOD-R1</text>
  </g>
  <!-- libreta abierta -->
  <g transform="translate(1148,516) rotate(-4)">
    <path d="M 0 0 L 44 -4 L 88 0 L 88 48 L 44 44 L 0 48 Z" fill="#efe6cc" stroke="#0a0a12" stroke-width="3.4" stroke-linejoin="round"/>
    <line x1="44" y1="-4" x2="44" y2="44" stroke="#0a0a12" stroke-width="2.4"/>
    ${Array.from({length:4},(_,i)=>`<line x1="6" y1="${9+i*9}" x2="38" y2="${7+i*9}" stroke="#7a6f57" stroke-width="1.8"/>`).join('')}
    ${Array.from({length:4},(_,i)=>`<line x1="52" y1="${7+i*9}" x2="82" y2="${9+i*9}" stroke="#7a6f57" stroke-width="1.8"/>`).join('')}
    <rect x="58" y="-14" width="34" height="7" rx="3" fill="#e8a33d" stroke="#0a0a12" stroke-width="2" transform="rotate(14 75 -10)"/>
  </g>
  <!-- la cinta -->
  <g transform="translate(1252,496)">
    <rect width="112" height="70" rx="8" fill="#d8cba8" stroke="#0a0a12" stroke-width="4"/>
    <rect x="12" y="10" width="88" height="30" rx="3" fill="#0b0b10" stroke="#0a0a12" stroke-width="2.4"/>
    <g class="reelS"><circle cx="36" cy="25" r="10" fill="none" stroke="#d8cba8" stroke-width="3.4"/><line x1="36" y1="16" x2="36" y2="34" stroke="#d8cba8" stroke-width="2.6"/></g>
    <g class="reelS"><circle cx="76" cy="25" r="10" fill="none" stroke="#d8cba8" stroke-width="3.4"/><line x1="76" y1="16" x2="76" y2="34" stroke="#d8cba8" stroke-width="2.6"/></g>
    <path d="M 8 50 L 104 50 L 95 68 L 17 68 Z" fill="#0b0b10" opacity=".85"/>
    <text x="56" y="65" fill="#d8cba8" font-size="11" text-anchor="middle" letter-spacing="1">EL PRIORATO</text>
  </g>
  <!-- taza con vapor -->
  <g transform="translate(1158,528)">
    <path d="M 0 6 L 26 6 L 23 34 L 3 34 Z" fill="#b43a4e" stroke="#0a0a12" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M 26 12 q 12 2 10 10 q -2 8 -12 6" fill="none" stroke="#0a0a12" stroke-width="3.4"/>
    <path class="steam" d="M 8 -2 q -5 -10 2 -16 q 6 -6 2 -14" fill="none" stroke="#c9bda3" stroke-width="2.6" stroke-linecap="round"/>
    <path class="steam s2" d="M 17 -2 q 5 -10 -1 -16 q -5 -6 0 -14" fill="none" stroke="#c9bda3" stroke-width="2.2" stroke-linecap="round"/>
  </g>
</g>
<!-- mesa auxiliar con el Spectrum -->
<g>
  <polygon points="1342,640 1548,640 1560,668 1330,668" fill="#3a2a2e" stroke="#0a0a12" stroke-width="4"/>
  <rect x="1350" y="668" width="16" height="110" fill="#241a20" stroke="#0a0a12" stroke-width="3"/>
  <rect x="1528" y="668" width="16" height="110" fill="#241a20" stroke="#0a0a12" stroke-width="3"/>
  <polygon points="1358,612 1536,612 1550,640 1346,640" fill="#c9c9d2" stroke="#0a0a12" stroke-width="4"/>
  <polygon points="1358,612 1536,612 1544,626 1352,626" fill="#e8e8ee" opacity=".5"/>
  ${Array.from({length:16},(_,i)=>`<rect x="${1366+i*10}" y="630" width="7" height="8" rx="1.4" fill="#3a3a44"/>`).join('')}
  <rect x="1352" y="600" width="60" height="16" rx="3" fill="#2b2333" stroke="#0a0a12" stroke-width="2.6"/>
  <text x="1445" y="600" fill="#2de2ff" font-size="14" letter-spacing="3" text-anchor="middle" opacity=".85">ZX · 48K</text>
</g>
<path d="M 900 700 Q 1000 762 1150 732 T 1400 800" fill="none" stroke="#0d0a10" stroke-width="9" stroke-linecap="round"/>
<path d="M 900 700 Q 1000 762 1150 732 T 1400 800" fill="none" stroke="#26262e" stroke-width="5" stroke-linecap="round"/>
<path d="M 700 730 Q 850 792 1050 772" fill="none" stroke="#0d0a10" stroke-width="8" stroke-linecap="round"/>
<path d="M 700 730 Q 850 792 1050 772" fill="none" stroke="#1d1d2e" stroke-width="4" stroke-linecap="round"/>
<!-- primer plano: respaldo de silla -->
<g opacity=".92">
  <path d="M 0 900 L 0 780 Q 90 730 180 780 L 180 900 Z" fill="#0e0c14" stroke="#050408" stroke-width="4"/>
</g>
<!-- HOTSPOTS -->
<g id="hotspots">
  <rect class="hs hs-pulse" data-hs="contestador" x="806" y="530" width="180" height="150"/>
  <rect class="hs hs-pulse" data-hs="estanteria"  x="458"  y="300" width="314" height="355"/>
  <rect class="hs hs-pulse" data-hs="libreta"     x="1140" y="496" width="104" height="76"/>
  <rect class="hs hs-pulse" data-hs="osciloscopio" x="980"  y="458" width="166" height="120"/>
  <rect class="hs hs-pulse" data-hs="crt"          x="1168" y="412" width="218" height="168"/>
  <rect class="hs hs-pulse" data-hs="cinta"        x="1244" y="488" width="126" height="86"/>
  <rect class="hs hs-pulse" data-hs="cajon"        x="1032" y="590" width="186" height="168"/>
  <rect class="hs hs-pulse" data-hs="spectrum"     x="1328" y="592" width="236" height="100"/>
  <rect class="hs hs-pulse" data-hs="puerta"       x="1436" y="258" width="180" height="520"/>
</g>
</svg>`;
}
function svgCalle(){
return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a1240"/><stop offset=".5" stop-color="#17102e"/><stop offset="1" stop-color="#0d0a1a"/>
  </linearGradient>
  <linearGradient id="wetG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1c1626"/><stop offset="1" stop-color="#0a0810"/>
  </linearGradient>
  <linearGradient id="shopG2" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#241d33"/><stop offset="1" stop-color="#16121f"/>
  </linearGradient>
  <linearGradient id="awnG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7a2e4a"/><stop offset="1" stop-color="#4a1c30"/>
  </linearGradient>
  <linearGradient id="winShop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1c3a2e"/><stop offset="1" stop-color="#0c1a14"/>
  </linearGradient>
  <radialGradient id="moonH" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#f4ead2" stop-opacity=".5"/><stop offset="1" stop-color="#f4ead2" stop-opacity="0"/>
  </radialGradient>
  ${NEON_DEFS}
</defs>
<rect width="1600" height="900" fill="url(#skyG)"/>
<!-- nubes -->
<g fill="#241a3a" opacity=".85">
  <ellipse cx="380" cy="150" rx="190" ry="34"/>
  <ellipse cx="520" cy="128" rx="130" ry="26"/>
  <ellipse cx="1120" cy="90" rx="220" ry="30"/>
  <ellipse cx="1250" cy="70" rx="120" ry="22"/>
</g>
<!-- luna con halo -->
<circle cx="1330" cy="150" r="110" fill="url(#moonH)"/>
<circle cx="1330" cy="150" r="58" fill="#efe6cc" stroke="#0a0a12" stroke-width="4"/>
<circle cx="1312" cy="136" r="10" fill="#d9cbaa"/>
<circle cx="1348" cy="166" r="7" fill="#d9cbaa"/>
<circle cx="1326" cy="172" r="5" fill="#e0d4b4"/>
<!-- estrellas -->
<g fill="#f0e9d8">
  ${Array.from({length:22},(_,i)=>`<circle cx="${(i*167)%1600}" cy="${30+(i*89)%280}" r="${1+(i%3)*.7}" opacity="${.3+(i%5)*.14}"/>`).join('')}
</g>
<!-- skyline lejano -->
<g fill="#120d20" stroke="#0a0a12" stroke-width="4">
  <path d="M -20 620 V 380 h 70 v -56 h 56 v 56 h 66 V 620 Z"/>
  <path d="M 210 620 V 260 h 56 v -48 h 48 v -42 h 42 v 42 h 48 v 48 h 56 V 620 Z"/>
  <path d="M 1090 620 V 300 h 60 v -48 h 50 v -42 h 44 v 42 h 50 v 48 h 60 V 620 Z"/>
  <path d="M 1420 620 V 380 h 52 v -44 h 44 v 44 h 52 V 620 Z"/>
</g>
<!-- antenas -->
<g stroke="#0a0a12" stroke-width="5" stroke-linecap="round">
  <line x1="335" y1="170" x2="335" y2="96"/><line x1="320" y1="120" x2="350" y2="120"/>
  <line x1="1244" y1="210" x2="1244" y2="140"/><line x1="1228" y1="164" x2="1260" y2="164"/>
</g>
<circle cx="335" cy="94" r="6" fill="#ff5a4e"><animate attributeName="opacity" values="1;.1;1" dur="2.4s" repeatCount="indefinite"/></circle>
<circle cx="1244" cy="138" r="6" fill="#ff5a4e"><animate attributeName="opacity" values=".1;1;.1" dur="3.1s" repeatCount="indefinite"/></circle>
<!-- ventanas skyline -->
<g fill="#2de2ff" opacity=".55">
  ${Array.from({length:14},(_,i)=>{const x=[20,50,80,250,280,310,340,1120,1150,1180,1210,1240,1440,1490][i%14]+((i*37)%5)*8; const y=300+((i*89)%280); return `<rect x="${x}" y="${y}" width="9" height="13" rx="1.5"/>`;}).join('')}
</g>
<g fill="#ffd76a" opacity=".55">
  ${Array.from({length:10},(_,i)=>{const x=[35,265,325,1135,1195,1255,1465][i%7]+((i*53)%5)*8; const y=320+((i*113)%250); return `<rect x="${x}" y="${y}" width="9" height="13" rx="1.5"/>`;}).join('')}
</g>
<g fill="#ff2e88" opacity=".5">
  ${Array.from({length:6},(_,i)=>{const x=[65,295,1165,1225,1480,1520][i%6]+((i*29)%4)*8; const y=340+((i*97)%220); return `<rect x="${x}" y="${y}" width="9" height="13" rx="1.5"/>`;}).join('')}
</g>
<!-- calle mojada -->
<rect y="620" width="1600" height="280" fill="url(#wetG)"/>
<!-- reflejos verticales de los letreros -->
<g opacity=".5">
  <polygon points="700,640 780,640 760,900 690,900" fill="#ff2e88" opacity=".28"/>
  <polygon points="820,640 880,640 870,900 810,900" fill="#2de2ff" opacity=".28"/>
  <polygon points="620,640 660,640 630,900 590,900" fill="#ff2e88" opacity=".14"/>
  <polygon points="250,640 280,640 250,900 220,900" fill="#e8a33d" opacity=".3"/>
  <polygon points="1310,640 1360,640 1350,900 1290,900" fill="#efe6cc" opacity=".10"/>
</g>
<!-- lineas de calzada y bordillo -->
<rect y="620" width="1600" height="14" fill="#241d33" stroke="#0a0a12" stroke-width="3"/>
<g stroke="#c9bda3" stroke-width="6" stroke-dasharray="60 46" opacity=".35">
  <line x1="0" y1="790" x2="1600" y2="790"/>
</g>
<!-- charcos -->
<g>
  <ellipse cx="420" cy="830" rx="120" ry="16" fill="#1c2a48" opacity=".8"/>
  <ellipse cx="420" cy="830" rx="120" ry="16" fill="none" stroke="#2de2ff" stroke-opacity=".25" stroke-width="2.4"/>
  <ellipse cx="420" cy="827" rx="70" ry="8" fill="#2de2ff" opacity=".14"/>
  <ellipse cx="1080" cy="860" rx="150" ry="18" fill="#241236" opacity=".8"/>
  <ellipse cx="1080" cy="860" rx="150" ry="18" fill="none" stroke="#ff2e88" stroke-opacity=".25" stroke-width="2.4"/>
  <ellipse cx="1080" cy="856" rx="84" ry="9" fill="#ff2e88" opacity=".14"/>
</g>
<!-- fachada de la tienda -->
<g>
  <path d="M 520 640 V 250 h 560 V 640 Z" fill="url(#shopG2)" stroke="#0a0a12" stroke-width="7"/>
  <rect x="520" y="238" width="560" height="18" fill="#312843" stroke="#0a0a12" stroke-width="4"/>
  <g stroke="#0a0a12" stroke-width="2.4" opacity=".5">
    ${Array.from({length:7},(_,i)=>`<line x1="530" y1="${420+i*30}" x2="1070" y2="${420+i*30}"/>`).join('')}
  </g>
  <!-- cornisa con remates -->
  <g fill="#312843" stroke="#0a0a12" stroke-width="4">
    <rect x="510" y="226" width="580" height="16" rx="4"/>
    <circle cx="540" cy="226" r="10"/><circle cx="1060" cy="226" r="10"/>
  </g>
  <!-- rotulos de neon -->
  <text x="800" y="308" fill="#ff2e88" font-size="42" letter-spacing="6" text-anchor="middle" font-weight="500" filter="url(#neonP)">ELECTRÒNICA</text>
  <text x="800" y="352" fill="#2de2ff" font-size="35" letter-spacing="10" text-anchor="middle" filter="url(#neonC)">P<tspan class="flick">O</tspan>RTELL</text>
  <text x="800" y="384" fill="#b9b4a4" font-size="14" letter-spacing="6" text-anchor="middle" opacity=".85">COMPONENTS · DES DE 1974</text>
  <!-- toldo -->
  <g>
    <path d="M 548 400 L 1052 400 L 1020 452 L 580 452 Z" fill="url(#awnG)" stroke="#0a0a12" stroke-width="5" stroke-linejoin="round"/>
    <g stroke="#0a0a12" stroke-width="3" opacity=".55">
      ${Array.from({length:8},(_,i)=>`<line x1="${580+i*62}" y1="400" x2="${596+i*56}" y2="452"/>`).join('')}
    </g>
    <path d="M 580 452 q 30 18 62 0 q 30 18 62 0 q 30 18 62 0 q 30 18 62 0 q 30 18 62 0 q 30 18 62 0 q 30 18 70 0" fill="none" stroke="#0a0a12" stroke-width="5"/>
  </g>
</g>
<!-- escaparate -->
<g>
  <rect x="556" y="466" width="228" height="162" fill="url(#winShop)" stroke="#0a0a12" stroke-width="6"/>
  <line x1="670" y1="466" x2="670" y2="628" stroke="#0a0a12" stroke-width="5"/>
  <rect x="566" y="476" width="96" height="142" fill="#59d98c" opacity=".07"/>
  <g opacity=".9">
    ${Array.from({length:2},(_,r)=>Array.from({length:4},(_,c)=>`<rect x="${576+c*24}" y="${486+r*56}" width="18" height="42" rx="3" fill="#3d6b5e" stroke="#0a0a12" stroke-width="2.2"/>`).join('')).join('')}
    ${Array.from({length:3},(_,i)=>`<circle cx="${700+i*26}" cy="${500+i*30}" r="9" fill="#8a5c33" stroke="#0a0a12" stroke-width="2.2"/>`).join('')}
    <rect x="690" y="566" width="80" height="46" rx="4" fill="#241c30" stroke="#0a0a12" stroke-width="2.6"/>
    <circle cx="706" cy="589" r="12" fill="#0b0b10" stroke="#e8a33d" stroke-width="2.4"/>
    <rect x="726" y="578" width="34" height="8" rx="2" fill="#ffd76a" opacity=".8"/>
  </g>
  <!-- reflejo del cristal -->
  <polygon points="570,470 640,470 600,626 556,626" fill="#cfefff" opacity=".08"/>
</g>
<!-- puerta de la tienda -->
<g>
  <rect x="826" y="466" width="136" height="174" fill="#17141f" stroke="#0a0a12" stroke-width="6"/>
  <rect x="838" y="478" width="112" height="120" fill="#101a20" stroke="#2de2ff" stroke-width="3" filter="url(#neonC)" opacity=".95"/>
  <polygon points="844,482 896,482 856,596 838,596" fill="#cfefff" opacity=".09"/>
  <rect x="868" y="600" width="12" height="36" rx="6" fill="#e8a33d" stroke="#0a0a12" stroke-width="3"/>
  <g transform="rotate(-4 895 520)">
    <rect x="850" y="500" width="90" height="36" rx="6" fill="#0b0b10" stroke="#ff2e88" stroke-width="3" filter="url(#neonP)"/>
    <text x="895" y="526" fill="#ff2e88" font-size="19" letter-spacing="4" text-anchor="middle">OBERT</text>
  </g>
  <rect x="816" y="636" width="156" height="12" fill="#312843" stroke="#0a0a12" stroke-width="3"/>
</g>
<!-- farola de sodio -->
<g>
  <ellipse cx="255" cy="664" rx="120" ry="20" fill="#e8a33d" opacity=".14"/>
  <polygon points="246,352 264,352 330,664 180,664" fill="#e8a33d" opacity=".10"/>
  <rect x="248" y="340" width="14" height="316" fill="#14111c" stroke="#0a0a12" stroke-width="4"/>
  <path d="M 220 340 Q 255 310 290 340 L 282 356 Q 255 336 228 356 Z" fill="#1d1d2e" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="255" cy="350" rx="14" ry="8" fill="#ffd76a" stroke="#0a0a12" stroke-width="3"/>
  <rect x="236" y="470" width="38" height="50" fill="#241d33" stroke="#0a0a12" stroke-width="3" transform="rotate(-3 255 495)"/>
  <text x="255" y="502" fill="#b9b4a4" font-size="11" text-anchor="middle" letter-spacing="1" transform="rotate(-3 255 495)">1987</text>
</g>
<!-- contenedor y bolsas -->
<g>
  <rect x="1120" y="560" width="130" height="92" rx="8" fill="#1d2b26" stroke="#0a0a12" stroke-width="5"/>
  <rect x="1120" y="560" width="130" height="18" rx="8" fill="#28443a" stroke="#0a0a12" stroke-width="4"/>
  <rect x="1136" y="592" width="98" height="10" rx="5" fill="#0e1a16"/>
  <path d="M 1262 640 q -4 -34 20 -40 q 26 -6 24 20 q 24 -2 22 24 l 0 8 l -66 0 Z" fill="#14111c" stroke="#0a0a12" stroke-width="4"/>
  <circle cx="1290" cy="612" r="3.4" fill="#0a0a12"/>
</g>
<!-- vapor de alcantarilla -->
<g>
  <ellipse cx="700" cy="760" rx="60" ry="10" fill="#0a0810" stroke="#26262e" stroke-width="3"/>
  <path class="steam" d="M 686 740 q -8 -16 2 -26 q 10 -10 2 -24" fill="none" stroke="#8a8aa0" stroke-width="4" stroke-linecap="round" opacity=".5"/>
  <path class="steam s2" d="M 712 742 q 8 -16 -2 -26 q -8 -10 0 -24" fill="none" stroke="#8a8aa0" stroke-width="3.4" stroke-linecap="round" opacity=".45"/>
</g>
<!-- coche ochentero aparcado -->
<g transform="translate(1180,556)">
  <ellipse cx="130" cy="118" rx="150" ry="14" fill="#05040a" opacity=".7"/>
  <path d="M 0 84 L 16 44 L 70 30 L 102 4 L 182 4 L 214 30 L 266 40 L 280 84 Z" fill="#4a1c3a" stroke="#0a0a12" stroke-width="5" stroke-linejoin="round"/>
  <path d="M 16 44 L 70 30 L 102 4 L 182 4 L 214 30 L 266 40 L 262 48 L 20 52 Z" fill="#6b2c55" opacity=".9"/>
  <rect x="72" y="14" width="62" height="26" rx="4" fill="#12222e" stroke="#0a0a12" stroke-width="3.4"/>
  <rect x="142" y="14" width="60" height="26" rx="4" fill="#12222e" stroke="#0a0a12" stroke-width="3.4"/>
  <polygon points="76,16 106,16 84,38 72,38" fill="#cfefff" opacity=".14"/>
  <rect x="262" y="52" width="16" height="12" rx="3" fill="#ff5a4e" stroke="#0a0a12" stroke-width="2.4" filter="url(#neonP)"/>
  <rect x="2" y="52" width="16" height="12" rx="3" fill="#ffd76a" stroke="#0a0a12" stroke-width="2.4"/>
  <circle cx="64" cy="86" r="24" fill="#0b0b10" stroke="#0a0a12" stroke-width="5"/>
  <circle cx="64" cy="86" r="10" fill="#3a3a44" stroke="#0a0a12" stroke-width="3"/>
  <circle cx="216" cy="86" r="24" fill="#0b0b10" stroke="#0a0a12" stroke-width="5"/>
  <circle cx="216" cy="86" r="10" fill="#3a3a44" stroke="#0a0a12" stroke-width="3"/>
  <rect x="120" y="60" width="40" height="8" rx="4" fill="#e8a33d" opacity=".8"/>
</g>
<!-- gato negro junto al contenedor -->
<g transform="translate(1030,612)">
  <path d="M 8 26 Q 6 6 22 4 L 40 4 Q 56 6 54 26 L 52 34 L 10 34 Z" fill="#0d0b14" stroke="#050408" stroke-width="3"/>
  <circle cx="16" cy="6" r="11" fill="#0d0b14" stroke="#050408" stroke-width="3"/>
  <polygon points="8,0 6,-12 16,-4" fill="#0d0b14" stroke="#050408" stroke-width="2.4"/>
  <polygon points="22,-4 28,-14 30,-2" fill="#0d0b14" stroke="#050408" stroke-width="2.4"/>
  <circle cx="12" cy="5" r="2.2" fill="#59d98c"/>
  <circle cx="20" cy="5" r="2.2" fill="#59d98c"/>
  <path d="M 54 22 q 22 -6 18 -26" fill="none" stroke="#0d0b14" stroke-width="7" stroke-linecap="round"/>
</g>
<!-- cartel de vuelta -->
<g>
  <polygon points="30,770 190,770 170,830 30,830" fill="#12101c" stroke="#0a0a12" stroke-width="4"/>
  <polygon points="30,770 190,770 170,830 30,830" fill="none" stroke="#2de2ff" stroke-width="2" filter="url(#neonC)"/>
  <text x="108" y="808" fill="#2de2ff" font-size="22" letter-spacing="3" text-anchor="middle" filter="url(#neonC)">← TALLER</text>
</g>
${rainLines(46,-80,900)}
${rainLines(30,-80,900,'slow')}
<!-- primer plano: esquina de edificio -->
<path d="M 1600 900 L 1600 690 L 1540 660 L 1500 900 Z" fill="#08070c"/>
<!-- HOTSPOTS -->
<g id="hotspots">
  <rect class="hs hs-pulse" data-hs="escaparate"  x="550"  y="458" width="240" height="180"/>
  <rect class="hs hs-pulse" data-hs="puerta_tienda" x="816" y="458" width="156" height="190"/>
  <rect class="hs hs-pulse" data-hs="farola"      x="200"  y="300" width="110" height="380"/>
  <rect class="hs hs-pulse" data-hs="a_taller"    x="24"   y="762" width="176" height="76"/>
</g>
</svg>`;
}
function svgTienda(){
return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="shopG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1c1930"/><stop offset="1" stop-color="#100e1a"/>
  </linearGradient>
  <linearGradient id="tileG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1a1624"/><stop offset="1" stop-color="#0c0a12"/>
  </linearGradient>
  <linearGradient id="counterG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#43304a"/><stop offset="1" stop-color="#2a1e30"/>
  </linearGradient>
  <linearGradient id="posterSun2" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd76a"/><stop offset="1" stop-color="#ff2e88"/>
  </linearGradient>
  ${NEON_DEFS}
</defs>
<rect width="1600" height="900" fill="url(#shopG)"/>
<!-- techo con vigas -->
<rect width="1600" height="90" fill="#14111e"/>
<g fill="#0e0c16" stroke="#0a0a12" stroke-width="3">
  <rect x="0" y="86" width="1600" height="12"/>
  <rect x="200" y="0" width="30" height="90"/><rect x="800" y="0" width="30" height="90"/><rect x="1400" y="0" width="30" height="90"/>
</g>
<!-- cables colgando -->
<path d="M 400 90 q 60 70 150 26" fill="none" stroke="#0d0a10" stroke-width="7" stroke-linecap="round"/>
<path d="M 400 90 q 60 70 150 26" fill="none" stroke="#26262e" stroke-width="3.6" stroke-linecap="round"/>
<path d="M 1150 90 q -50 80 -130 30" fill="none" stroke="#0d0a10" stroke-width="7" stroke-linecap="round"/>
<path d="M 1150 90 q -50 80 -130 30" fill="none" stroke="#26262e" stroke-width="3.6" stroke-linecap="round"/>
<!-- fluorescente -->
<g>
  <rect x="620" y="60" width="360" height="18" rx="9" fill="#1d1d2e" stroke="#0a0a12" stroke-width="4"/>
  <rect class="fluor" x="632" y="65" width="336" height="9" rx="4" fill="#cfefff" filter="url(#neonC)"/>
  <polygon points="640,86 960,86 1160,720 440,720" fill="#2de2ff" opacity=".05"/>
</g>
<!-- suelo de damero -->
<polygon points="0,700 1600,700 1600,900 0,900" fill="url(#tileG)"/>
<g stroke="#241d33" stroke-width="3" opacity=".9">
  ${Array.from({length:14},(_,i)=>`<line x1="${i*125}" y1="700" x2="${i*125-90}" y2="900"/>`).join('')}
  ${Array.from({length:6},(_,i)=>`<line x1="0" y1="${716+i*34}" x2="1600" y2="${716+i*34}"/>`).join('')}
</g>
<g opacity=".16" fill="#cfefff">
  ${Array.from({length:12},(_,i)=>`<polygon points="${i*140+20},${730+(i%3)*40} ${i*140+90},${730+(i%3)*40} ${i*140+70},${762+(i%3)*40} ${i*140},${762+(i%3)*40}"/>`).join('')}
</g>
<!-- estanteria de cajones -->
<g>
  <rect x="80" y="150" width="520" height="520" fill="#1c1626" stroke="#0a0a12" stroke-width="7"/>
  <rect x="92" y="162" width="496" height="496" fill="#120e1a"/>
  ${Array.from({length:6},(_,r)=>Array.from({length:5},(_,c)=>{
    const tilt=((r*7+c*3)%11===0)?' transform="rotate(-1.5 '+(140+c*100)+' '+(194+r*80)+')"':'';
    return `<g${tilt}><rect x="${96+c*100}" y="${166+r*80}" width="88" height="66" rx="3" fill="${['#241d33','#2a2138','#201a2c'][(r+c)%3]}" stroke="#0a0a12" stroke-width="3.4"/>
     <rect x="${126+c*100}" y="${190+r*80}" width="28" height="6" rx="3" fill="#e8a33d" opacity=".75"/>
     <text x="${140+c*100}" y="${220+r*80}" fill="#b9b4a4" font-size="10" text-anchor="middle" opacity=".7">${['RESIST.','CONDENS.','XIPS','CINTES','VALVES'][c]}</text></g>`;
  }).join('')).join('')}
  <rect x="80" y="144" width="520" height="8" fill="#ff2e88" filter="url(#neonP)" opacity=".85"/>
  <rect x="80" y="144" width="520" height="8" fill="#0a0a12" opacity=".25"/>
</g>
<!-- caja de valvulas encima -->
<g transform="rotate(2 420 128)">
  <rect x="350" y="104" width="140" height="44" fill="#6b5a3a" stroke="#0a0a12" stroke-width="4"/>
  <text x="420" y="132" fill="#efe6cc" font-size="13" letter-spacing="2" text-anchor="middle">VÀLVULES</text>
</g>
<!-- escalera de mano -->
<g stroke="#0a0a12" stroke-width="5" stroke-linecap="round">
  <line x1="624" y1="300" x2="590" y2="680"/>
  <line x1="664" y1="300" x2="640" y2="680"/>
  ${Array.from({length:5},(_,i)=>`<line x1="${618-i*6}" y1="${360+i*70}" x2="${658-i*4}" y2="${360+i*70}"/>`).join('')}
</g>
<g stroke="#8a5c33" stroke-width="3" stroke-linecap="round">
  ${Array.from({length:5},(_,i)=>`<line x1="${618-i*6}" y1="${360+i*70}" x2="${658-i*4}" y2="${360+i*70}"/>`).join('')}
</g>
<!-- ventana al fondo con persiana y lluvia -->
<g>
  <rect x="1150" y="130" width="330" height="240" fill="#0d0b14" stroke="#0a0a12" stroke-width="6"/>
  <rect x="1164" y="144" width="302" height="212" fill="#101a30" stroke="#0a0a12" stroke-width="3"/>
  <g stroke="#59d98c" stroke-opacity=".25" stroke-width="2.4">
    ${Array.from({length:12},(_,i)=>`<line x1="${1180+(i*83)%270}" y1="${150+(i*47)%60}" x2="${1170+(i*83)%270}" y2="${210+(i*47)%60}"/>`).join('')}
  </g>
  <circle cx="1420" cy="190" r="24" fill="#efe6cc" opacity=".85"/>
  <g stroke="#262b3a" stroke-width="7">
    ${Array.from({length:8},(_,i)=>`<line x1="1164" y1="${158+i*26}" x2="1466" y2="${158+i*26}"/>`).join('')}
  </g>
  <rect x="1150" y="356" width="330" height="14" fill="#1c1826" stroke="#0a0a12" stroke-width="3"/>
</g>
<!-- cartel OBERT y carteles -->
<text x="1360" y="420" fill="#ff2e88" font-size="34" letter-spacing="8" text-anchor="middle" filter="url(#neonP)" transform="rotate(3 1360 420)">OBERT</text>
<g transform="rotate(-3 1085 240)">
  <rect x="1030" y="180" width="110" height="120" fill="#efe6cc" stroke="#0a0a12" stroke-width="4"/>
  <circle cx="1085" cy="226" r="30" fill="#ff2e88" opacity=".85"/>
  <circle cx="1085" cy="226" r="30" fill="none" stroke="#0a0a12" stroke-width="3"/>
  <line x1="1064" y1="247" x2="1106" y2="205" stroke="#0a0a12" stroke-width="6"/>
  <text x="1085" y="286" fill="#14111c" font-size="12" letter-spacing="1" text-anchor="middle" font-weight="700">NO FUMAR</text>
</g>
<g transform="rotate(2 690 200)">
  <rect x="640" y="150" width="100" height="104" fill="#141026" stroke="#0a0a12" stroke-width="4"/>
  <circle cx="690" cy="196" r="30" fill="url(#posterSun2)"/>
  <text x="690" y="242" fill="#2de2ff" font-size="12" letter-spacing="2" text-anchor="middle">SINTHO 87</text>
</g>
<!-- ventilador de techo -->
<g>
  <line x1="1280" y1="90" x2="1280" y2="120" stroke="#0a0a12" stroke-width="6"/>
  <g class="fanSpin">
    <path d="M 1280 126 L 1352 110 Q 1362 122 1350 128 L 1280 132 Z" fill="#3a3a44" stroke="#0a0a12" stroke-width="3"/>
    <path d="M 1280 126 L 1214 158 Q 1208 146 1218 140 L 1282 122 Z" fill="#3a3a44" stroke="#0a0a12" stroke-width="3"/>
    <path d="M 1280 126 L 1240 68 Q 1252 62 1258 72 L 1286 124 Z" fill="#3a3a44" stroke="#0a0a12" stroke-width="3"/>
    <animateTransform attributeName="transform" type="rotate" from="0 1280 126" to="360 1280 126" dur="2.6s" repeatCount="indefinite"/>
  </g>
  <circle cx="1280" cy="126" r="12" fill="#3a3a44" stroke="#0a0a12" stroke-width="3.4"/>
</g>
<!-- PORTELL detras del mostrador -->
<g>
  <!-- cuerpo -->
  <path d="M 1040 580 L 1062 420 Q 1125 380 1188 420 L 1210 580 Z" fill="#2e4038" stroke="#0a0a12" stroke-width="6" stroke-linejoin="round"/>
  <path d="M 1062 420 Q 1125 380 1188 420 L 1182 448 Q 1125 414 1068 448 Z" fill="#3d574d" opacity=".9"/>
  <!-- delantal -->
  <path d="M 1084 470 L 1166 470 L 1176 580 L 1074 580 Z" fill="#4a3428" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
  <rect x="1096" y="500" width="58" height="40" rx="4" fill="#3a2a20" stroke="#0a0a12" stroke-width="3"/>
  <path d="M 1096 470 q 29 18 58 0" fill="none" stroke="#0a0a12" stroke-width="3.4"/>
  <!-- camisa y corbata -->
  <path d="M 1102 418 L 1148 418 L 1125 446 Z" fill="#e8e0cc" stroke="#0a0a12" stroke-width="3.4" stroke-linejoin="round"/>
  <polygon points="1116,424 1134,424 1125,470" fill="#ff2e88" stroke="#0a0a12" stroke-width="3" stroke-linejoin="round"/>
  <!-- brazos apoyados -->
  <path d="M 1050 470 q -34 30 -26 74 l 40 6 q -2 -40 18 -62 Z" fill="#2e4038" stroke="#0a0a12" stroke-width="5" stroke-linejoin="round"/>
  <path d="M 1200 470 q 34 30 26 74 l -40 6 q 2 -40 -18 -62 Z" fill="#2e4038" stroke="#0a0a12" stroke-width="5" stroke-linejoin="round"/>
  <!-- cabeza grande caricaturesca -->
  <g>
    <ellipse cx="1125" cy="330" rx="78" ry="74" fill="#d9a872" stroke="#0a0a12" stroke-width="6"/>
    <path d="M 1052 330 q -14 4 -12 20 q 2 14 18 12" fill="#d9a872" stroke="#0a0a12" stroke-width="4"/>
    <path d="M 1198 330 q 14 4 12 20 q -2 14 -18 12" fill="#d9a872" stroke="#0a0a12" stroke-width="4"/>
    <!-- calva con pelo gris a los lados -->
    <path d="M 1052 318 q -6 -52 36 -66 q -30 26 -24 66 Z" fill="#c9c9c9" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 1198 318 q 6 -52 -36 -66 q 30 26 24 66 Z" fill="#c9c9c9" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 1076 268 q 49 -28 98 0 q -49 -14 -98 0 Z" fill="#c9a06a" opacity=".7"/>
    <!-- cejas pobladas -->
    <path d="M 1068 308 q 22 -14 44 -4" fill="none" stroke="#8f8f8f" stroke-width="9" stroke-linecap="round"/>
    <path d="M 1138 304 q 22 -10 44 4" fill="none" stroke="#8f8f8f" stroke-width="9" stroke-linecap="round"/>
    <!-- gafas redondas -->
    <circle cx="1092" cy="334" r="24" fill="#cfefff" fill-opacity=".14" stroke="#14111c" stroke-width="5"/>
    <circle cx="1158" cy="334" r="24" fill="#cfefff" fill-opacity=".14" stroke="#14111c" stroke-width="5"/>
    <line x1="1116" y1="334" x2="1134" y2="334" stroke="#14111c" stroke-width="5"/>
    <line x1="1068" y1="330" x2="1050" y2="324" stroke="#14111c" stroke-width="4"/>
    <line x1="1182" y1="330" x2="1200" y2="324" stroke="#14111c" stroke-width="4"/>
    <polygon points="1078,322 1092,318 1084,330" fill="#ffffff" opacity=".6"/>
    <!-- ojos con parpadeo -->
    <g class="eyesP">
      <circle cx="1092" cy="336" r="6" fill="#14111c"/>
      <circle cx="1158" cy="336" r="6" fill="#14111c"/>
    </g>
    <!-- nariz -->
    <path d="M 1125 340 q -8 16 -2 24 q 6 6 14 2" fill="none" stroke="#0a0a12" stroke-width="4" stroke-linecap="round"/>
    <!-- bigote y sonrisa -->
    <path d="M 1096 378 q 14 -12 29 -2 q 15 -10 29 2 q -6 16 -29 12 q -23 4 -29 -12 Z" fill="#c9c9c9" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 1108 392 q 17 10 34 0" fill="none" stroke="#0a0a12" stroke-width="4" stroke-linecap="round"/>
  </g>
</g>
<!-- mostrador -->
<g>
  <polygon points="700,580 1440,580 1496,740 646,740" fill="url(#counterG)" stroke="#0a0a12" stroke-width="6" stroke-linejoin="round"/>
  <polygon points="700,580 1440,580 1452,606 688,606" fill="#5a4260" opacity=".8"/>
  <polygon points="646,740 1496,740 1496,786 646,786" fill="#241a2c" stroke="#0a0a12" stroke-width="5"/>
  <line x1="700" y1="580" x2="1440" y2="580" stroke="#2de2ff" stroke-width="3" filter="url(#neonC)"/>
  <!-- vitrina de cristales -->
  <g transform="translate(760,498)">
    <polygon points="0,64 190,64 178,0 12,0" fill="#0c1a14" stroke="#0a0a12" stroke-width="5" stroke-linejoin="round"/>
    <polygon points="10,10 60,10 40,58 4,58" fill="#cfefff" opacity=".1"/>
    ${Array.from({length:4},(_,i)=>`<rect x="${26+i*38}" y="24" width="24" height="16" rx="3" fill="#59d98c" opacity="${.4+i*.13}" stroke="#0a0a12" stroke-width="2"/>`).join('')}
    <text x="95" y="86" fill="#b9b4a4" font-size="12" letter-spacing="2" text-anchor="middle" opacity=".75">CRISTALLS DE QUARS</text>
  </g>
  <!-- soldador con vapor -->
  <g transform="translate(986,540)">
    <rect x="-10" y="26" width="70" height="12" rx="4" fill="#241c30" stroke="#0a0a12" stroke-width="3"/>
    <path d="M 4 28 L 14 4 L 24 6 L 16 30 Z" fill="#b43a4e" stroke="#0a0a12" stroke-width="3" stroke-linejoin="round"/>
    <line x1="22" y1="6" x2="34" y2="-6" stroke="#c9bda3" stroke-width="3.4" stroke-linecap="round"/>
    <path class="steam" d="M 36 -10 q -6 -12 2 -18 q 7 -6 2 -16" fill="none" stroke="#8a8aa0" stroke-width="2.8" stroke-linecap="round" opacity=".6"/>
    <circle cx="0" cy="32" r="3" fill="#ff5a4e"><animate attributeName="opacity" values="1;.2;1" dur="1.8s" repeatCount="indefinite"/></circle>
  </g>
  <!-- radio de valvulas -->
  <g transform="translate(1260,486)">
    <rect width="126" height="80" rx="10" fill="#2e2138" stroke="#0a0a12" stroke-width="5"/>
    <rect x="6" y="6" width="114" height="68" rx="6" fill="#241c30"/>
    <circle cx="34" cy="40" r="22" fill="#0b0b10" stroke="#0a0a12" stroke-width="3"/>
    <circle cx="34" cy="40" r="13" fill="#e8a33d" opacity=".9">
      <animate attributeName="opacity" values=".9;.55;.9" dur="3s" repeatCount="indefinite"/>
    </circle>
    <rect x="64" y="18" width="50" height="16" rx="3" fill="#0b0b10" stroke="#0a0a12" stroke-width="2.4"/>
    <rect x="66" y="21" width="32" height="9" rx="2" fill="#ffd76a" opacity=".85"/>
    <circle cx="74" cy="54" r="8" fill="#0b0b10" stroke="#0a0a12" stroke-width="2.6"/>
    <circle cx="100" cy="54" r="8" fill="#0b0b10" stroke="#0a0a12" stroke-width="2.6"/>
    <path d="M 10 -2 L 60 -26" stroke="#0a0a12" stroke-width="3.4" stroke-linecap="round"/>
  </g>
  <!-- catalogo y calculadora -->
  <g transform="translate(700,520) rotate(-3)">
    <rect width="56" height="70" rx="3" fill="#5a3a7b" stroke="#0a0a12" stroke-width="3.4"/>
    <text x="28" y="30" fill="#efe6cc" font-size="10" text-anchor="middle">CAT.</text>
    <text x="28" y="46" fill="#efe6cc" font-size="10" text-anchor="middle">1987</text>
  </g>
</g>
<!-- carretes en el suelo -->
<g>
  <circle cx="360" cy="800" r="46" fill="#4a3428" stroke="#0a0a12" stroke-width="5"/>
  <circle cx="360" cy="800" r="16" fill="#241a20" stroke="#0a0a12" stroke-width="4"/>
  <path d="M 360 754 q 60 10 88 60" fill="none" stroke="#0d0a10" stroke-width="7" stroke-linecap="round"/>
  <path d="M 360 754 q 60 10 88 60" fill="none" stroke="#26262e" stroke-width="3.6" stroke-linecap="round"/>
</g>
<!-- salida -->
<g>
  <polygon points="30,770 200,770 180,830 30,830" fill="#12101c" stroke="#0a0a12" stroke-width="4"/>
  <polygon points="30,770 200,770 180,830 30,830" fill="none" stroke="#2de2ff" stroke-width="2" filter="url(#neonC)"/>
  <text x="112" y="808" fill="#2de2ff" font-size="22" letter-spacing="3" text-anchor="middle" filter="url(#neonC)">← CARRER</text>
</g>
<!-- primer plano: borde de estanteria -->
<path d="M 0 900 L 0 600 L 44 584 L 60 900 Z" fill="#08070c"/>
<path d="M 0 900 L 0 600 L 44 584 L 60 900 Z" fill="none" stroke="#050408" stroke-width="4"/>
<!-- HOTSPOTS -->
<g id="hotspots">
  <rect class="hs hs-pulse" data-hs="portell"      x="1010" y="250" width="240" height="330"/>
  <rect class="hs hs-pulse" data-hs="cajones"      x="80"   y="140" width="520" height="540"/>
  <rect class="hs hs-pulse" data-hs="cristales"    x="750"  y="486" width="210" height="120"/>
  <rect class="hs hs-pulse" data-hs="radio"        x="1250" y="472" width="146" height="104"/>
  <rect class="hs hs-pulse" data-hs="a_calle"      x="24"   y="762" width="186" height="76"/>
</g>
</svg>`;
}
function svgDeposito(doorsOpen){
  let grid='';
  for(let i=0;i<=16;i++){
    const x=i*100;
    grid+=`<line x1="800" y1="470" x2="${x*2-800}" y2="900" stroke="#ff2e88" stroke-width="2.4" opacity=".38"/>`;
  }
  for(let i=0;i<9;i++){
    const y=470+Math.pow(i/8,1.8)*430;
    grid+=`<line x1="0" y1="${y}" x2="1600" y2="${y}" stroke="#ff2e88" stroke-width="2.4" opacity="${.2+i*.04}"/>`;
  }
return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="vaultBg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#141126"/><stop offset="1" stop-color="#0b0b14"/>
  </linearGradient>
  <linearGradient id="sunV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd76a"/><stop offset=".5" stop-color="#ff2e88"/><stop offset="1" stop-color="#8a4bff"/>
  </linearGradient>
  <radialGradient id="sunHalo" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#ff2e88" stop-opacity=".45"/><stop offset="1" stop-color="#ff2e88" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="beamG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e8a33d" stop-opacity=".3"/><stop offset="1" stop-color="#e8a33d" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="doorG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1c1830"/><stop offset="1" stop-color="#0e0d16"/>
  </linearGradient>
  ${NEON_DEFS}
</defs>
<rect width="1600" height="900" fill="url(#vaultBg)"/>
<!-- estrellas tenues -->
<g fill="#f0e9d8">
  ${Array.from({length:16},(_,i)=>`<circle cx="${(i*211)%1600}" cy="${24+(i*97)%300}" r="${1+(i%3)*.6}" opacity="${.2+(i%4)*.1}"/>`).join('')}
</g>
<!-- sol rayado con halo -->
<circle cx="800" cy="420" r="260" fill="url(#sunHalo)"/>
<circle cx="800" cy="420" r="168" fill="url(#sunV)"/>
<g fill="#0e0d1c">
  ${Array.from({length:7},(_,i)=>`<rect x="616" y="${438+i*17}" width="368" height="${4+i*3.2}"/>`).join('')}
</g>
<circle cx="800" cy="420" r="168" fill="none" stroke="#0a0a12" stroke-width="6"/>
<!-- rejilla en perspectiva -->
${grid}
<!-- reflejo del sol en el suelo -->
<polygon points="760,470 840,470 900,900 700,900" fill="#ff2e88" opacity=".12"/>
<!-- paredes laterales con tuberias -->
<g>
  <rect x="0" y="0" width="180" height="900" fill="#100e1c"/>
  <rect x="1420" y="0" width="180" height="900" fill="#100e1c"/>
  <g stroke="#0a0a12" stroke-width="4">
    <path d="M 60 0 V 900" fill="none" stroke="#241d33" stroke-width="14"/>
    <path d="M 110 0 V 900" fill="none" stroke="#1c2b33" stroke-width="10"/>
    <path d="M 1490 0 V 900" fill="none" stroke="#241d33" stroke-width="14"/>
    <path d="M 1540 0 V 900" fill="none" stroke="#1c2b33" stroke-width="10"/>
  </g>
  <g fill="#3a3044" stroke="#0a0a12" stroke-width="3">
    <rect x="46" y="200" width="42" height="18" rx="6"/><rect x="46" y="520" width="42" height="18" rx="6"/>
    <rect x="1476" y="260" width="42" height="18" rx="6"/><rect x="1476" y="600" width="42" height="18" rx="6"/>
  </g>
</g>
<!-- paneles de control parpadeantes -->
<g>
  <rect x="220" y="330" width="120" height="170" rx="8" fill="#17131f" stroke="#0a0a12" stroke-width="5"/>
  ${Array.from({length:4},(_,r)=>Array.from({length:3},(_,c)=>`<circle cx="${252+c*34}" cy="${362+r*38}" r="7" fill="${['#ff2e88','#2de2ff','#59d98c'][(r+c)%3]}" opacity="${.3+((r*3+c)%4)*.2}"><animate attributeName="opacity" values="${.3+((r*3+c)%4)*.2};.15;${.3+((r*3+c)%4)*.2}" dur="${1.4+((r+c)%3)*.7}s" repeatCount="indefinite"/></circle>`).join('')).join('')}
  <rect x="1260" y="330" width="120" height="170" rx="8" fill="#17131f" stroke="#0a0a12" stroke-width="5"/>
  ${Array.from({length:4},(_,r)=>Array.from({length:3},(_,c)=>`<circle cx="${1292+c*34}" cy="${362+r*38}" r="7" fill="${['#2de2ff','#59d98c','#ff2e88'][(r+c)%3]}" opacity="${.3+((r*2+c)%4)*.2}"><animate attributeName="opacity" values="${.3+((r*2+c)%4)*.2};.15;${.3+((r*2+c)%4)*.2}" dur="${1.1+((r+c)%3)*.8}s" repeatCount="indefinite"/></circle>`).join('')).join('')}
</g>
<!-- dintel monolitico -->
<g>
  <rect x="552" y="462" width="496" height="344" rx="10" fill="url(#doorG)" stroke="#0a0a12" stroke-width="8"/>
  <rect x="552" y="462" width="496" height="344" rx="10" fill="none" stroke="#2de2ff" stroke-width="4" filter="url(#neonC)"/>
  ${Array.from({length:6},(_,i)=>`<rect x="584" y="${496+i*48}" width="432" height="10" rx="5" fill="#2de2ff" opacity="${.22+i*.06}"/>`).join('')}
  <g fill="#3a3044" stroke="#0a0a12" stroke-width="2.6">
    ${Array.from({length:8},(_,i)=>`<circle cx="${580+i*62}" cy="478" r="6"/>`).join('')}
    ${Array.from({length:8},(_,i)=>`<circle cx="${580+i*62}" cy="790" r="6"/>`).join('')}
  </g>
  <!-- franja de advertencia -->
  <g>
    <rect x="552" y="806" width="496" height="22" fill="#e8a33d"/>
    <g fill="#0b0b10">
      ${Array.from({length:12},(_,i)=>`<polygon points="${560+i*42},806 ${580+i*42},806 ${568+i*42},828 ${548+i*42},828"/>`).join('')}
    </g>
    <rect x="552" y="806" width="496" height="22" fill="none" stroke="#0a0a12" stroke-width="4"/>
  </g>
</g>
<!-- haz de luz cenital -->
<polygon points="764,60 836,60 906,880 694,880" fill="url(#beamG)"/>
<g fill="#ffd76a">
  <circle class="mote m1" cx="780" cy="260" r="3"/>
  <circle class="mote m2" cx="830" cy="380" r="2.4"/>
  <circle class="mote m3" cx="796" cy="520" r="2.8"/>
  <circle class="mote m4" cx="846" cy="640" r="2.2"/>
</g>
<!-- cables serpenteando al atril -->
<path d="M 240 860 Q 420 780 560 840 T 740 820" fill="none" stroke="#0d0a10" stroke-width="10" stroke-linecap="round"/>
<path d="M 240 860 Q 420 780 560 840 T 740 820" fill="none" stroke="#26262e" stroke-width="5" stroke-linecap="round"/>
<path d="M 1360 860 Q 1180 790 1040 840 T 880 826" fill="none" stroke="#0d0a10" stroke-width="10" stroke-linecap="round"/>
<path d="M 1360 860 Q 1180 790 1040 840 T 880 826" fill="none" stroke="#26262e" stroke-width="5" stroke-linecap="round"/>
<!-- atril con la cinta -->
<g>
  <ellipse cx="800" cy="876" rx="130" ry="16" fill="#05040a" opacity=".8"/>
  <polygon points="762,756 838,756 906,880 694,880" fill="#1c1722" stroke="#0a0a12" stroke-width="6" stroke-linejoin="round"/>
  <polygon points="762,756 838,756 906,880 694,880" fill="#2de2ff" opacity=".05"/>
  <polygon points="736,712 864,712 840,756 760,756" fill="#31243d" stroke="#0a0a12" stroke-width="5" stroke-linejoin="round"/>
  <polygon points="736,712 864,712 856,726 744,726" fill="#4a3a5e" opacity=".9"/>
  <g transform="translate(744,636)">
    <rect width="112" height="70" rx="8" fill="#d8cba8" stroke="#0a0a12" stroke-width="4"/>
    <rect x="12" y="10" width="88" height="30" rx="3" fill="#0b0b10" stroke="#0a0a12" stroke-width="2.4"/>
    <g class="reelS"><circle cx="36" cy="25" r="10" fill="none" stroke="#d8cba8" stroke-width="3.4"/><line x1="36" y1="16" x2="36" y2="34" stroke="#d8cba8" stroke-width="2.6"/></g>
    <g class="reelS"><circle cx="76" cy="25" r="10" fill="none" stroke="#d8cba8" stroke-width="3.4"/><line x1="76" y1="16" x2="76" y2="34" stroke="#d8cba8" stroke-width="2.6"/></g>
    <path d="M 8 50 L 104 50 L 95 68 L 17 68 Z" fill="#0b0b10" opacity=".85"/>
  </g>
  <text x="800" y="620" fill="#2de2ff" font-size="20" letter-spacing="6" text-anchor="middle" filter="url(#neonC)">EL PRIORATO DE LA CULPA</text>
  <text x="800" y="592" fill="#ff2e88" font-size="15" letter-spacing="6" text-anchor="middle" filter="url(#neonP)">DEPÒSIT ZERO</text>
</g>
${doorsOpen?`
<!-- dos puertas: dos hipotesis -->
<g>
  <ellipse cx="390" cy="816" rx="130" ry="14" fill="#05040a" opacity=".8"/>
  <rect x="292" y="472" width="196" height="336" rx="8" fill="url(#doorG)" stroke="#0a0a12" stroke-width="7"/>
  <rect x="292" y="472" width="196" height="336" rx="8" fill="none" stroke="#ff2e88" stroke-width="4" filter="url(#neonP)"/>
  <rect x="322" y="506" width="136" height="120" rx="6" fill="#0b0b12" stroke="#ff2e88" stroke-opacity=".5" stroke-width="3"/>
  <path d="M 352 566 q 20 -34 40 0 q 20 30 36 -8" fill="none" stroke="#ff2e88" stroke-width="5" stroke-linecap="round" filter="url(#neonP)"/>
  <circle cx="390" cy="690" r="16" fill="#ff2e88" opacity=".8"/>
  <circle cx="390" cy="690" r="16" fill="none" stroke="#0a0a12" stroke-width="4"/>
  <rect x="330" y="742" width="120" height="10" rx="5" fill="#ff2e88" opacity=".6"/>
  <text x="390" y="856" fill="#ff2e88" font-size="18" letter-spacing="3" text-anchor="middle" filter="url(#neonP)">LA MÀ DE L'ALTRE</text>
  <ellipse cx="1210" cy="816" rx="130" ry="14" fill="#05040a" opacity=".8"/>
  <rect x="1112" y="472" width="196" height="336" rx="8" fill="url(#doorG)" stroke="#0a0a12" stroke-width="7"/>
  <rect x="1112" y="472" width="196" height="336" rx="8" fill="none" stroke="#2de2ff" stroke-width="4" filter="url(#neonC)"/>
  <rect x="1142" y="506" width="136" height="120" rx="6" fill="#0b0b12" stroke="#2de2ff" stroke-opacity=".5" stroke-width="3"/>
  <path d="M 1172 566 q 20 -34 40 0 q 20 30 36 -8" fill="none" stroke="#2de2ff" stroke-width="5" stroke-linecap="round" filter="url(#neonC)"/>
  <circle cx="1210" cy="690" r="16" fill="#2de2ff" opacity=".8"/>
  <circle cx="1210" cy="690" r="16" fill="none" stroke="#0a0a12" stroke-width="4"/>
  <rect x="1150" y="742" width="120" height="10" rx="5" fill="#2de2ff" opacity=".6"/>
  <text x="1210" y="856" fill="#2de2ff" font-size="18" letter-spacing="3" text-anchor="middle" filter="url(#neonC)">LA MEVA MÀ</text>
</g>`:''}
<!-- HOTSPOTS -->
<g id="hotspots">
  <rect class="hs hs-pulse" data-hs="missatge" x="700" y="590" width="200" height="200"/>
  ${doorsOpen?`<rect class="hs hs-pulse" data-hs="porta_altre" x="286" y="462" width="208" height="400"/>
  <rect class="hs hs-pulse" data-hs="porta_meua" x="1106" y="462" width="208" height="400"/>`:''}
</g>
</svg>`;
}
/* ============================ RETRATOS ============================ */
function portraitNicolau(){
return `<svg viewBox="0 0 120 120"><rect width="120" height="120" fill="#12121c"/>
<rect width="120" height="120" fill="#2de2ff" opacity=".05"/>
<path d="M 22 120 L 30 82 Q 60 66 90 82 L 98 120 Z" fill="#232c38" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
<path d="M 44 78 L 60 92 L 76 78 L 70 74 L 60 82 L 50 74 Z" fill="#e8e0cc" stroke="#0a0a12" stroke-width="3" stroke-linejoin="round"/>
<polygon points="54,86 66,86 60,106" fill="#ff2e88" stroke="#0a0a12" stroke-width="2.6" stroke-linejoin="round"/>
<ellipse cx="60" cy="50" rx="32" ry="30" fill="#d9a872" stroke="#0a0a12" stroke-width="4"/>
<path d="M 28 52 q -10 2 -8 12 q 2 9 12 7" fill="#d9a872" stroke="#0a0a12" stroke-width="3"/>
<path d="M 92 52 q 10 2 8 12 q -2 9 -12 7" fill="#d9a872" stroke="#0a0a12" stroke-width="3"/>
<path d="M 28 46 Q 32 16 60 14 Q 90 16 92 46 Q 80 30 60 30 Q 40 30 28 46 Z" fill="#241d2e" stroke="#0a0a12" stroke-width="3.6" stroke-linejoin="round"/>
<path d="M 36 40 q 10 -8 20 -6" fill="none" stroke="#0a0a12" stroke-width="4" stroke-linecap="round"/>
<path d="M 64 34 q 10 -2 20 6" fill="none" stroke="#0a0a12" stroke-width="4" stroke-linecap="round"/>
<rect x="34" y="46" width="22" height="15" rx="4" fill="#cfefff" fill-opacity=".12" stroke="#14111c" stroke-width="3.4"/>
<rect x="64" y="46" width="22" height="15" rx="4" fill="#cfefff" fill-opacity=".12" stroke="#14111c" stroke-width="3.4"/>
<line x1="56" y1="52" x2="64" y2="52" stroke="#14111c" stroke-width="3.4"/>
<polygon points="38,49 48,47 42,55" fill="#ffffff" opacity=".55"/>
<polygon points="68,49 78,47 72,55" fill="#ffffff" opacity=".55"/>
<g class="eyesN">
  <circle cx="45" cy="54" r="3.4" fill="#14111c"/>
  <circle cx="75" cy="54" r="3.4" fill="#14111c"/>
</g>
<path d="M 60 56 q -4 8 0 12" fill="none" stroke="#0a0a12" stroke-width="3" stroke-linecap="round"/>
<path d="M 48 74 Q 60 80 72 74" fill="none" stroke="#0a0a12" stroke-width="3.4" stroke-linecap="round"/>
</svg>`;
}
function portraitPortell(){
return `<svg viewBox="0 0 120 120"><rect width="120" height="120" fill="#12121c"/>
<rect width="120" height="120" fill="#ff2e88" opacity=".05"/>
<path d="M 26 120 L 34 86 Q 60 72 86 86 L 94 120 Z" fill="#2e4038" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
<path d="M 46 84 L 74 84 L 78 120 L 42 120 Z" fill="#4a3428" stroke="#0a0a12" stroke-width="3" stroke-linejoin="round"/>
<path d="M 48 82 L 60 92 L 72 82 L 66 78 L 60 84 L 54 78 Z" fill="#e8e0cc" stroke="#0a0a12" stroke-width="3" stroke-linejoin="round"/>
<polygon points="55,88 65,88 60,104" fill="#ff2e88" stroke="#0a0a12" stroke-width="2.6" stroke-linejoin="round"/>
<ellipse cx="60" cy="50" rx="33" ry="31" fill="#d9a872" stroke="#0a0a12" stroke-width="4"/>
<path d="M 27 50 q -10 2 -8 12 q 2 9 12 7" fill="#d9a872" stroke="#0a0a12" stroke-width="3"/>
<path d="M 93 50 q 10 2 8 12 q -2 9 -12 7" fill="#d9a872" stroke="#0a0a12" stroke-width="3"/>
<path d="M 28 44 q -6 -26 18 -32 q -14 14 -10 32 Z" fill="#c9c9c9" stroke="#0a0a12" stroke-width="3.4" stroke-linejoin="round"/>
<path d="M 92 44 q 6 -26 -18 -32 q 14 14 10 32 Z" fill="#c9c9c9" stroke="#0a0a12" stroke-width="3.4" stroke-linejoin="round"/>
<path d="M 34 36 q 12 -8 22 -4" fill="none" stroke="#8f8f8f" stroke-width="6" stroke-linecap="round"/>
<path d="M 64 32 q 12 -4 22 4" fill="none" stroke="#8f8f8f" stroke-width="6" stroke-linecap="round"/>
<circle cx="45" cy="50" r="12" fill="#cfefff" fill-opacity=".14" stroke="#14111c" stroke-width="3.4"/>
<circle cx="75" cy="50" r="12" fill="#cfefff" fill-opacity=".14" stroke="#14111c" stroke-width="3.4"/>
<line x1="57" y1="50" x2="63" y2="50" stroke="#14111c" stroke-width="3.4"/>
<polygon points="39,44 47,42 42,50" fill="#ffffff" opacity=".55"/>
<g class="eyesP2">
  <circle cx="45" cy="51" r="3.2" fill="#14111c"/>
  <circle cx="75" cy="51" r="3.2" fill="#14111c"/>
</g>
<path d="M 60 54 q -4 8 0 11" fill="none" stroke="#0a0a12" stroke-width="3" stroke-linecap="round"/>
<path d="M 42 72 q 9 -8 18 -2 q 9 -6 18 2 q -4 12 -18 9 q -14 3 -18 -9 Z" fill="#c9c9c9" stroke="#0a0a12" stroke-width="3.4" stroke-linejoin="round"/>
<path d="M 50 80 q 10 6 20 0" fill="none" stroke="#0a0a12" stroke-width="3" stroke-linecap="round"/>
</svg>`;
}
/* ============================ ICONOS DE INVENTARIO ============================ */
const ICONS = {
  cinta:`<svg viewBox="0 0 48 48"><rect x="3" y="8" width="42" height="32" rx="4" fill="#d8cba8" stroke="#8f8266" stroke-width="2"/><rect x="9" y="13" width="30" height="11" rx="2" fill="#0b0b10"/><circle cx="17" cy="18.5" r="3.4" fill="none" stroke="#d8cba8" stroke-width="1.6"/><circle cx="31" cy="18.5" r="3.4" fill="none" stroke="#d8cba8" stroke-width="1.6"/><path d="M 8 28 L 40 28 L 37 38 L 11 38 Z" fill="#0b0b10" opacity=".85"/></svg>`,
  placa:`<svg viewBox="0 0 48 48"><rect x="5" y="10" width="38" height="28" rx="3" fill="#3d6b5e" stroke="#2a4a40" stroke-width="2"/><rect x="12" y="17" width="14" height="14" rx="2" fill="#0b0b10"/><g stroke="#2de2ff" stroke-width="1.4">${Array.from({length:5},(_,i)=>`<line x1="${30+i*3}" y1="14" x2="${30+i*3}" y2="34"/>`).join('')}</g></svg>`,
  z80:`<svg viewBox="0 0 48 48"><rect x="10" y="12" width="28" height="24" rx="2" fill="#0b0b10" stroke="#3a3a44" stroke-width="2"/><text x="24" y="28" fill="#c9bda3" font-size="9" text-anchor="middle" font-family="monospace">Z80A</text><g stroke="#c9bda3" stroke-width="2">${Array.from({length:6},(_,i)=>`<line x1="${13+i*4.4}" y1="6" x2="${13+i*4.4}" y2="12"/><line x1="${13+i*4.4}" y1="36" x2="${13+i*4.4}" y2="42"/>`).join('')}</g></svg>`,
  cristal:`<svg viewBox="0 0 48 48"><rect x="14" y="14" width="20" height="16" rx="4" fill="#c9bda3" stroke="#8f8266" stroke-width="2"/><line x1="18" y1="30" x2="18" y2="40" stroke="#c9bda3" stroke-width="3"/><line x1="30" y1="30" x2="30" y2="40" stroke="#c9bda3" stroke-width="3"/><text x="24" y="25" fill="#0b0b10" font-size="7.5" text-anchor="middle" font-family="monospace">3.5M</text></svg>`,
  cable:`<svg viewBox="0 0 48 48"><path d="M 6 34 Q 14 14 24 24 T 42 20" fill="none" stroke="#2de2ff" stroke-width="4"/><rect x="2" y="30" width="8" height="10" rx="2" fill="#3a3a44"/><rect x="38" y="14" width="8" height="10" rx="2" fill="#3a3a44"/></svg>`,
  modulo:`<svg viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="28" rx="4" fill="#17131f" stroke="#2de2ff" stroke-width="2"/><rect x="11" y="16" width="18" height="10" rx="2" fill="#050d08"/><path d="M 13 21 q 3 -5 6 0 t 6 0" fill="none" stroke="#59d98c" stroke-width="1.6"/><circle cx="35" cy="20" r="2.6" fill="#ff2e88"/><circle cx="35" cy="28" r="2.6" fill="#59d98c"/></svg>`,
  libreta:`<svg viewBox="0 0 48 48"><rect x="9" y="6" width="30" height="36" rx="2" fill="#c9bda3"/><rect x="9" y="6" width="6" height="36" fill="#8f8266"/><g stroke="#7a6f57" stroke-width="1.6">${Array.from({length:4},(_,i)=>`<line x1="19" y1="${14+i*7}" x2="35" y2="${14+i*7}"/>`).join('')}</g></svg>`,
};

/* ============================ ESTADO ============================ */
const SAVE_KEY = 'deposito-cero-v1';
const ITEM_NAMES = {
  cinta:'Cinta «El Priorato de la Culpa»', placa:'Placa de pruebas', cable:'Cable de bus',
  z80:'Z80A', cristal:'Cristal 3,5 MHz', chasis:'Chasis MOD-R1', modulo:'MOD-R1 completo'
};
const state = { scene:'taller', inventory:[], selItem:null, flags:{} };
const F = state.flags;

function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify({scene:state.scene, inventory:state.inventory, flags:state.flags})); }catch(e){} }
function load(){
  try{
    const s = JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(s && s.flags){ state.scene=s.scene||'taller'; state.inventory=s.inventory||[]; state.flags=s.flags; Object.assign(F, s.flags); return true; }
  }catch(e){}
  return false;
}
function wipe(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }

function toast(msg, ms=2600){
  const t = byId('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(t._tm); t._tm = setTimeout(()=>{ t.hidden = true; }, ms);
}
function addItem(id){
  if(!state.inventory.includes(id)){ state.inventory.push(id); AudioEngine.pickup(); toast('Recogido: '+ITEM_NAMES[id]); renderInventory(); save(); }
}
function hasItem(id){ return state.inventory.includes(id); }
function removeItems(ids){
  state.inventory = state.inventory.filter(i=>!ids.includes(i));
  if(ids.includes(state.selItem)) state.selItem=null;
  renderInventory();
}
function renderInventory(){
  const inv = byId('inventory'); inv.innerHTML='';
  state.inventory.forEach(id=>{
    const d = document.createElement('div');
    d.className = 'inv-slot'+(state.selItem===id?' sel':'');
    d.innerHTML = (ICONS[id]||'')+`<span class="inv-tip">${ITEM_NAMES[id]||id}</span>`;
    d.addEventListener('click', ev=>{
      ev.stopPropagation(); AudioEngine.click();
      state.selItem = state.selItem===id ? null : id;
      renderInventory();
    });
    inv.appendChild(d);
  });
}
function objective(){
  if(!F.intro) return 'Escucha el contestador.';
  if(!F.cinta_vista) return 'Examina la cinta y la nota.';
  if(!F.emulador_fallado) return 'Prueba a volcar la cinta en el emulador (CRT).';
  if(!F.real_fallado) return 'Prueba la máquina original (el ZX de la mesa auxiliar).';
  if(!F.modulo) return 'Reconstruye el MOD-R1: chasis, placa, cable, un Z80A y un cristal.';
  if(!F.sync_ok) return 'Conecta el MOD-R1 al ZX y sincroniza la latencia exacta.';
  if(!F.dump_ok) return 'Vuelca la cinta.';
  if(!F.premis_ok) return 'Reconstruye la cabecera anómala en el CRT.';
  if(!F.missatge) return 'Cruza la puerta que se ha abierto.';
  return 'Elige qué crees.';
}
function renderObjective(){ byId('objective-text').textContent = objective(); }

/* ============================ ESCENAS ============================ */
const SCENES = {
  taller:  ()=>svgTaller(),
  calle:   ()=>svgCalle(),
  tienda:  ()=>svgTienda(),
  deposito:()=>svgDeposito(!!F.missatge),
};
function go(scene){
  state.scene = scene;
  nico.x = NICO_ENTRY[scene] ?? 50;
  renderScene(); AudioEngine.rain(scene==='calle'); save();
}
function renderScene(){
  byId('stage').innerHTML = SCENES[state.scene]();
  renderObjective();
}

/* ============================ DIÁLOGOS ============================ */
const dlg = { lines:[], i:0, onDone:null, typing:false, full:'' };
const PORTRAITS = { NICOLAU:portraitNicolau, PORTELL:portraitPortell };

function say(lines, onDone){
  dlg.lines = lines; dlg.i = 0; dlg.onDone = onDone||null;
  byId('dialog').hidden = false;
  showLine();
}
function showLine(){
  const L = dlg.lines[dlg.i];
  byId('dialog-speaker').textContent = L.who||'';
  const p = PORTRAITS[L.who];
  byId('dialog-portrait').innerHTML = p ? p() : '';
  byId('dialog-choices').innerHTML = '';
  byId('dialog-next').style.display = 'block';
  const box = byId('dialog-text');
  box.innerHTML=''; dlg.full = L.text; dlg.typing = true;
  let i=0;
  clearInterval(dlg._tm);
  dlg._tm = setInterval(()=>{
    i += 2;
    box.innerHTML = dlg.full.slice(0,i)+'<span class="cursor">▊</span>';
    if(i>=dlg.full.length){ finishType(); }
  }, 18);
}
function finishType(){
  clearInterval(dlg._tm); dlg.typing=false;
  byId('dialog-text').textContent = dlg.full;
  const L = dlg.lines[dlg.i];
  if(L.choices){
    const box = byId('dialog-choices'); box.innerHTML='';
    byId('dialog-next').style.display='none';
    L.choices.forEach(c=>{
      const b = document.createElement('button');
      b.className='deco-btn'; b.type='button'; b.textContent=c.text;
      b.addEventListener('click', ev=>{
        ev.stopPropagation(); AudioEngine.click();
        if(c.action) c.action();
        if(c.goto==='end'){ closeDialog(); }
        else if(typeof c.goto==='number'){ dlg.i=c.goto; showLine(); }
      });
      box.appendChild(b);
    });
  }
}
function advanceDialog(){
  if(dlg.typing){ finishType(); return; }
  const L = dlg.lines[dlg.i];
  if(L.choices) return;
  if(L.action) L.action();
  dlg.i++;
  if(dlg.i>=dlg.lines.length){ closeDialog(); }
  else showLine();
}
function closeDialog(){
  byId('dialog').hidden = true;
  const cb = dlg.onDone; dlg.onDone=null; dlg.lines=[];
  renderObjective(); save();
  if(cb) cb();
}
byId('dialog').addEventListener('click', advanceDialog);

/* ============================ HOTSPOTS ============================ */
function useItemOn(item, hs){
  /* usos con objeto seleccionado */
  if(item==='cinta' && hs==='crt'){ tryDump('emulador'); return true; }
  if(item==='cinta' && hs==='spectrum'){ tryDump('real'); return true; }
  if(item==='modulo' && hs==='spectrum'){ openSync(); return true; }
  return false;
}
function handleHotspot(hs){
  AudioEngine.click();
  if(state.selItem){
    const item = state.selItem;
    if(useItemOn(item, hs)){ state.selItem=null; renderInventory(); return; }
    state.selItem=null; renderInventory();
    say([{who:'NICOLAU', text:'No encaja ahí. Mi metodología es mía, pero la física es de todos.'}]);
    return;
  }
  const fn = HS[hs];
  if(fn) fn();
}
document.addEventListener('DOMContentLoaded', ()=>{
  byId('stage').addEventListener('click', e=>{
    const hs = e.target.closest('.hs');
    const sr = byId('stage').getBoundingClientRect();
    if(!hs){
      const xPct = Math.max(4, Math.min(96, (e.clientX - sr.left)/sr.width*100));
      walkTo(xPct);
      return;
    }
    const r = hs.getBoundingClientRect();
    const xPct = Math.max(4, Math.min(96, (r.left + r.width/2 - sr.left)/sr.width*100));
    walkTo(xPct, ()=>handleHotspot(hs.dataset.hs));
  });
  byId('stage').addEventListener('pointerover', e=>{
    const hs = e.target.closest('.hs');
    const lab = byId('hs-label');
    if(hs){ lab.textContent = hs.dataset.label||''; lab.hidden = !hs.dataset.label; }
  });
  byId('stage').addEventListener('pointerout', ()=>{ byId('hs-label').hidden = true; });
});

/* volcado: el código sabe qué máquina lo está leyendo */
function tryDump(kind){
  if(!F.cinta_vista){ say([{who:'NICOLAU', text:'Primero miro la cinta. Siempre primero se mira.'}]); return; }
  AudioEngine.glitch();
  if(kind==='emulador'){
    F.emulador_fallado = true;
    say([
      {who:'NICOLAU', text:'Volcado al 14 % y… bloqueo del procesador. El emulador entero, congelado en el mismo ciclo. No es una lectura defectuosa: es una negativa.'},
      {who:'NICOLAU', text:'El código comprueba la máquina antes de dejarse leer. Interesante. Muy interesante.'},
    ]);
  } else {
    F.real_fallado = true;
    say([
      {who:'NICOLAU', text:'Ni siquiera en el 48K original: el Z80 se detiene igual, en el mismo punto. El código sabe qué máquina lo está leyendo… y ninguna le sirve.'},
      {who:'NICOLAU', text:'«Desincronización calculada». Solo hay una manera de domar los ciclos de este bus: mi módulo de ralentización microtemporal. El MOD-R1. Está a medias, como tantas cosas.'},
      {who:'NICOLAU', text:'Necesito el chasis del cajón, placa y cable de la estantería, y un Z80A y un cristal decente. A esta hora solo abre Portell.'},
    ]);
  }
  renderObjective(); save();
}

const HS = {
  /* ---------- TALLER ---------- */
  contestador(){
    if(!F.intro){
      F.intro = true; save();
      say([
        {who:'NICOLAU', text:'Otra madrugada sin caso. Tres meses volcando cintas sanas: nada muere en mi mesa, y eso, en este oficio, casi decepciona.'},
        {who:'NICOLAU', text:'Esta mañana alguien dejó un paquete en la puerta. Sin remitente. Dentro, una cinta degradada… y una nota.'},
        {who:'NICOLAU', text:'«Sé que no desecharás una cinta degradada. Sé que no la subirás a ningún servidor. Sé que construirás el puente tú mismo. Cárgala.»'},
        {who:'NICOLAU', text:'«El Priorato de la Culpa», 1987. No consta en ningún catálogo. Y quien escribe conoce mi metodología mejor que yo.'},
      ]);
    } else {
      say([{who:'NICOLAU', text:'El LED rojo sigue parpadeando, pero el mensaje ya es mío: me lo sé palabra a palabra. Ahora, a trabajar.'}]);
    }
  },
  cinta(){
    if(!F.cinta_vista){
      F.cinta_vista = true; addItem('cinta');
      say([
        {who:'NICOLAU', text:'«El Priorato de la Culpa», 1987. Carcasa reventada por décadas de sótano, banda arrugada… y aun así alguien la ha empaquetado con mimo. Sin remitente.'},
        {who:'NICOLAU', text:'La nota dice: «Sé que no desecharás una cinta degradada. Sé que no la subirás a ningún servidor. Sé que construirás el puente tú mismo. Cárgala.»'},
        {who:'NICOLAU', text:'No consta en ningún catálogo. Y quien escribe esto conoce mi metodología al milímetro.'},
      ]);
    } else {
      say([{who:'NICOLAU', text:'La cinta espera. Casi puedo oír cómo sabe que la estoy mirando.'}]);
    }
  },
  crt(){
    if(F.dump_ok && !F.premis_ok){ openPremis(); return; }
    if(F.sync_ok && !F.dump_ok){ runDump(); return; }
    say([{who:'NICOLAU', text:'Mi emulador de cabecera. Fiel, rápido y, sospecho, hoy inútil: esta cinta huele a trampa de hardware, no de software.'}]);
  },
  spectrum(){
    if(!F.cinta_vista){ say([{who:'NICOLAU', text:'El 48K que me acompaña desde siempre. Hoy tiene trabajo, en cuanto decida con qué alimentarlo.'}]); return; }
    say([{who:'NICOLAU', text:'Sin el MOD-R1 no vuelvo a intentarlo: esta cinta castiga el hardware que no reconoce.'}]);
  },
  osciloscopio(){
    if(F.modulo){ say([{who:'NICOLAU', text:'El MOD-R1 respira, listo para el bus. Solo falta conectarlo al ZX y ajustar la latencia exacta.'}]); return; }
    if(!F.real_fallado){ say([{who:'NICOLAU', text:'El osciloscopio espera señal. La onda de hoy aún no ha nacido.'}]); return; }
    const parts = ['chasis','placa','cable','z80','cristal'];
    const missing = parts.filter(p=>!hasItem(p));
    if(missing.length){
      say([
        {who:'NICOLAU', text:'El banco de montaje del MOD-R1. Mi diseño: nadie más fabrica este hardware. Me faltan piezas: '+missing.map(p=>ITEM_NAMES[p].toLowerCase()).join(', ')+'.'},
        {who:'NICOLAU', text:'Chasis en el cajón; placa y cable, en la estantería. Para el Z80A y el cristal: Electrònica Portell, calle abajo, abierto hasta las tantas.'},
      ]);
      return;
    }
    removeItems(['chasis','placa','cable','z80','cristal']);
    addItem('modulo'); F.modulo = true;
    say([
      {who:'NICOLAU', text:'Zócalo, cristal, bus, alimentación… cerrado. El MOD-R1 vuelve a existir. Un puente hecho a mi medida — la única llave que esta puerta acepta.'},
      {who:'NICOLAU', text:'Ahora: conectarlo al ZX y encontrar la latencia exacta. Mi libreta guarda los valores… aunque esa página no recuerdo haberla escrito.'},
    ]);
  },
  cajon(){
    if(hasItem('chasis')||F.modulo){ say([{who:'NICOLAU', text:'Tornillos, cinta aislante y un recorte de 1989. Nada más que me sirva.'}]); return; }
    addItem('chasis');
    say([{who:'NICOLAU', text:'El chasis del MOD-R1, serigrafiado por mí: «ralentiment microtemporal». Mi diseño, mi nomenclatura. Le faltan las tripas.'}]);
  },
  estanteria(){
    if(!F.real_fallado){ say([{who:'NICOLAU', text:'Nueve años de software español de 8 bits, ordenado por editorial y estado de conservación. Manías: cada cinta tiene ficha, y cada ficha, mi letra.'}]); return; }
    let took=[];
    if(!hasItem('placa')&&!F.modulo){ addItem('placa'); took.push('la placa de pruebas'); }
    if(!hasItem('cable')&&!F.modulo){ addItem('cable'); took.push('el cable de bus'); }
    if(took.length){ say([{who:'NICOLAU', text:'Detrás de «La Abadía», donde siempre: '+took.join(' y ')+'. Cada cosa en su ficha.'}]); }
    else { say([{who:'NICOLAU', text:'El archivo duerme. Nada más que sacar de aquí hoy.'}]); }
  },
  libreta(){
    F.nota_leida = true;
    say([
      {who:'NICOLAU', text:'Mi libreta de banco. Esquemas del MOD-R1, constantes del bus… y una página al final que no recuerdo haber escrito: «D÷4 · R2 · φ90°».'},
      {who:'NICOLAU', text:'La letra es la mía. La tinta, más vieja que la libreta. Anoto la combinación igualmente: divisor 4, retardo 2 ciclos, fase 90°.'},
    ]);
  },
  puerta(){
    if(!F.real_fallado){ say([{who:'NICOLAU', text:'No pienso salir hasta saber por qué esta cinta se niega a hablar.'}]); return; }
    if(F.premis_ok){ say([{who:'NICOLAU', text:'No hay calle que me interese ahora. La puerta que importa está dentro de la cinta.'}]); return; }
    go('calle');
  },

  /* ---------- CALLE ---------- */
  escaparate(){ say([{who:'NICOLAU', text:'Chips en cajas de cerillas, cristales como pendientes. El escaparate de Portell no cambia desde que tengo memoria. Eso tranquiliza.'}]); },
  farola(){ say([{who:'NICOLAU', text:'Luz de sodio y lluvia. La ciudad parece un negativo mal fijado. Esta hora es mía: nadie pregunta, nadie mira.'}]); },
  puerta_tienda(){ go('tienda'); },
  a_taller(){ go('taller'); },

  /* ---------- TIENDA ---------- */
  radio(){ say([{who:'PORTELL', text:'«…temps de pluja per a tota la nit…» La radio de Portell solo sintoniza madrugadas.'}]); },
  a_calle(){ go('calle'); },
  cajones(){
    if(!F.portell_ok){ say([{who:'NICOLAU', text:'Tocar los cajones de Portell sin permiso es pedir un sermón de veinte minutos. Mejor hablo con él.'}]); return; }
    if(hasItem('z80')||F.modulo){ say([{who:'NICOLAU', text:'Ya tengo el chip. El resto son válvulas y nostalgia.'}]); return; }
    say([
      {who:'PORTELL', text:'Tres me quedan del lote. Tú dirás, forense.'},
      {who:'NICOLAU', text:'Veamos…', choices:[
        {text:'El Z80B, el de 6 MHz.', action(){ say([{who:'PORTELL', text:'El B corre más que tu placa y te desincroniza el bus entero. Para tu cacharro: no. Mira otra vez.'}]); }, goto:'end'},
        {text:'El Z80A, el clásico de 4 MHz.', action(){
          addItem('z80'); AudioEngine.success();
          say([{who:'PORTELL', text:'Ese. El A. Aguanta los 3,5 megahercios sin despeinarse y se deja domar por un puente como el tuyo. Buen ojo.'}]);
        }, goto:'end'},
        {text:'El clon CMOS, más moderno.', action(){ say([{who:'PORTELL', text:'Moderno y mentiroso: los tiempos internos no son los mismos. Tu cinta lo notaría. El clásico, nano.'}]); }, goto:'end'},
      ]},
    ]);
  },
  cristales(){
    if(!F.portell_ok){ say([{who:'NICOLAU', text:'La vitrina está cerrada. Primero convenzo a Portell de que me fíe.'}]); return; }
    if(hasItem('cristal')||F.modulo){ say([{who:'NICOLAU', text:'Ya tengo mi cristal de 3,5 MHz. El resto, para otras máquinas y otras madrugadas.'}]); return; }
    say([{who:'PORTELL', text:'¿Cuál era, nano? Dímelo tú, que para eso eres el forense.', choices:[
      {text:'El de 3,5 MHz. El 48K respira a 3,5 exactos.', action(){
        addItem('cristal'); AudioEngine.success();
        say([{who:'PORTELL', text:'3,5 exactos. El 48K respira a eso. Tuyo es. Y no le digas a nadie que abro a estas horas.'}]);
      }, goto:'end'},
      {text:'El de 3,5469 MHz.', action(){ say([{who:'PORTELL', text:'Eso es el 128K, nano. El 48K va a 3,5. Míralo otra vez, que lo sabes.'}]); }, goto:'end'},
      {text:'El de 4 MHz y ya lo forzaré.', action(){ say([{who:'PORTELL', text:'¿Forzar un bus? El reloj no perdona. Piensa, que es gratis.'}]); }, goto:'end'},
    ]}]);
  },
  portell(){
    if(F.portell_ok){ say([{who:'PORTELL', text:'El cajón de los xips y la vitrina, a tu disposición. Y joven: quien dejó esa nota sabía que vendrías. Nadie me pregunta por cristales desde 1989.'}]); return; }
    say([
      {who:'PORTELL', text:'Cierro en diez minutos desde hace doce años, Nicolau. Qué.'},
      {who:'NICOLAU', text:'Necesito un Z80A y un cristal. Es para un volcado… delicado.'},
      {who:'PORTELL', text:'¿Delicado? Tú y tus cintas muertas. Te los doy si me dices la frecuencia correcta, que la última vez me liaste con un 128K.'},
      {who:'NICOLAU', text:'Trato hecho.', action(){ F.portell_ok = true; renderObjective(); save(); }},
    ]);
  },

  /* ---------- DEPÓSITO ---------- */
  missatge(){
    if(!F.missatge){
      F.missatge = true;
      say([
        {who:'NICOLAU', text:'«Si estás leyendo esto, el puente funcionó. Esta puerta no se abrió sola: exige tu módulo, tu latencia exacta, tu paciencia con las cintas heridas. Nadie más fabrica esa llave.»'},
        {who:'NICOLAU', text:'«La cabecera que has reconstruido no es de 1987. La ontología es tuya: PREMIS, catalán, tu nomenclatura exacta. Alguien documentó tu manera de trabajar y la escribió aquí… o la escribiste tú.»'},
        {who:'NICOLAU', text:'«Dos lecturas caben en esta cinta: una mano de la industria original que te observó y te citó aquí, o una paradoja — que tú mismo forjaras y escondieras este artefacto para obligarte a encontrar el Depósito Cero en tu momento más débil.»'},
        {who:'NICOLAU', text:'«No dejé respuesta. Dejé una puerta a tu medida.»'},
      ], ()=>{ renderScene(); });
    } else {
      say([{who:'NICOLAU', text:'La cinta ya ha dicho todo lo que va a decir. El resto es elección mía.'}]);
    }
  },
  porta_altre(){ showEnding('altre'); },
  porta_meua(){ showEnding('meua'); },
};

/* etiquetas flotantes de los hotspots */
const HS_LABELS = {
  contestador:'CONTESTADOR',
  cinta:'LA CINTA', crt:'EMULADOR (CRT)', spectrum:'ZX 48K', osciloscopio:'BANCO MOD-R1',
  cajon:'CAJÓN', estanteria:'ARCHIVO 1983-1992', libreta:'LIBRETA', puerta:'SALIR',
  escaparate:'ESCAPARATE', puerta_tienda:'ENTRAR', farola:'FAROLA', a_taller:'VOLVER AL TALLER',
  portell:'SR. PORTELL', cajones:'CAJONES DE XIPS', cristales:'VITRINA DE CRISTALES', radio:'RADIO', a_calle:'VOLVER A LA CALLE',
  missatge:'EL MENSAJE', porta_altre:"LA MÀ DE L'ALTRE", porta_meua:'LA MEVA MÀ',
};
function tagLabels(){
  document.querySelectorAll('.hs').forEach(h=>{ h.dataset.label = HS_LABELS[h.dataset.hs]||''; });
}
const _renderScene = renderScene;
renderScene = function(){
  _renderScene(); tagLabels(); renderWalker();
};

/* ============================ NICOLAU CAMINANTE ============================ */
function svgNicolauWalk(){
return `<svg viewBox="0 0 120 240">
<g class="fig">
  <g class="legB">
    <path d="M 66 148 L 78 148 L 80 210 L 64 210 Z" fill="#1a1626" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 62 206 L 86 206 Q 94 210 92 220 L 92 224 L 62 224 Z" fill="#0d0c13" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
  </g>
  <g class="legA">
    <path d="M 40 148 L 54 148 L 56 210 L 38 210 Z" fill="#241f33" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 34 206 L 60 206 Q 68 210 66 220 L 66 224 L 34 224 Z" fill="#131019" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
  </g>
  <g class="armB">
    <path d="M 84 92 Q 100 112 94 148 Q 92 158 84 156 Q 78 154 80 144 Q 84 118 74 100 Z" fill="#1c1828" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
  </g>
  <!-- abrigo -->
  <path d="M 32 84 Q 60 68 88 84 L 96 156 Q 60 172 24 156 Z" fill="#2b3244" stroke="#0a0a12" stroke-width="5" stroke-linejoin="round"/>
  <path d="M 32 84 Q 60 68 88 84 L 90 100 Q 60 84 30 100 Z" fill="#3a4258" opacity=".9"/>
  <path d="M 24 156 Q 60 172 96 156 L 94 168 Q 60 184 26 168 Z" fill="#1c1828" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
  <!-- solapas y corbata -->
  <path d="M 46 82 L 60 96 L 74 82 L 68 76 L 60 84 L 52 76 Z" fill="#e8e0cc" stroke="#0a0a12" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="54,90 66,90 60,118" fill="#ff2e88" stroke="#0a0a12" stroke-width="3" stroke-linejoin="round"/>
  <line x1="60" y1="96" x2="60" y2="160" stroke="#0a0a12" stroke-width="2.4" opacity=".5"/>
  <!-- cinturon -->
  <rect x="30" y="138" width="62" height="10" fill="#171420" stroke="#0a0a12" stroke-width="3"/>
  <rect x="54" y="138" width="14" height="10" fill="#e8a33d" stroke="#0a0a12" stroke-width="2.4"/>
  <g class="armA">
    <path d="M 36 92 Q 18 110 26 146 Q 28 156 36 154 Q 44 152 40 142 Q 34 116 46 100 Z" fill="#2b3244" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="33" cy="150" r="8" fill="#d9a872" stroke="#0a0a12" stroke-width="3.4"/>
  </g>
  <!-- cabeza grande -->
  <g>
    <ellipse cx="60" cy="50" rx="32" ry="30" fill="#d9a872" stroke="#0a0a12" stroke-width="4.4"/>
    <path d="M 30 52 q -8 2 -7 10 q 2 8 10 6" fill="#d9a872" stroke="#0a0a12" stroke-width="3"/>
    <path d="M 29 46 Q 33 16 60 14 Q 89 16 92 46 Q 80 30 60 30 Q 41 30 29 46 Z" fill="#241d2e" stroke="#0a0a12" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 36 40 q 9 -7 18 -5" fill="none" stroke="#0a0a12" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M 66 35 q 9 -2 18 5" fill="none" stroke="#0a0a12" stroke-width="3.6" stroke-linecap="round"/>
    <rect x="36" y="46" width="20" height="14" rx="4" fill="#cfefff" fill-opacity=".12" stroke="#14111c" stroke-width="3.2"/>
    <rect x="66" y="46" width="20" height="14" rx="4" fill="#cfefff" fill-opacity=".12" stroke="#14111c" stroke-width="3.2"/>
    <line x1="56" y1="52" x2="66" y2="52" stroke="#14111c" stroke-width="3.2"/>
    <polygon points="40,49 49,47 44,55" fill="#ffffff" opacity=".55"/>
    <g class="eyesW">
      <circle cx="46" cy="53" r="3.2" fill="#14111c"/>
      <circle cx="76" cy="53" r="3.2" fill="#14111c"/>
    </g>
    <path d="M 61 56 q -4 7 0 11" fill="none" stroke="#0a0a12" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M 50 72 Q 60 77 71 72" fill="none" stroke="#0a0a12" stroke-width="3" stroke-linecap="round"/>
  </g>
</g>
</svg>`;
}
const NICO_ENTRY = { taller:84, calle:8, tienda:58, deposito:50 };
const nico = { x:78 };
function renderWalker(){
  const stage = byId('stage');
  let w = byId('nico');
  if(!w){
    w = document.createElement('div');
    w.id = 'nico'; w.className = 'walker';
    w.innerHTML = svgNicolauWalk();
    stage.appendChild(w);
  }
  w.style.transitionDuration = '0s';
  w.style.left = nico.x + '%';
}
function walkTo(xPct, done){
  const w = byId('nico');
  if(!w){ done && done(); return; }
  const dist = Math.abs(xPct - nico.x);
  if(dist < 1){ done && done(); return; }
  w.classList.toggle('flip', xPct < nico.x);
  const dur = Math.min(1.4, .3 + dist * .014);
  w.style.transitionDuration = dur + 's';
  w.classList.add('walking');
  nico.x = xPct;
  w.style.left = xPct + '%';
  clearTimeout(w._wtm);
  w._wtm = setTimeout(()=>{ w.classList.remove('walking'); done && done(); }, dur*1000+50);
}

/* ============================ VOLCADO ============================ */
function runDump(){
  F.dump_ok = true;
  AudioEngine.screech();
  const line = document.querySelector('.crt-line1') || document.querySelector('#stage text');
  say([
    {who:'NICOLAU', text:'El MOD-R1 traga los ciclos uno a uno. La banda canta, el bus respira a la latencia exacta… y esta vez nadie cierra la puerta.'},
    {who:'NICOLAU', text:'VOLCADO 100 %. Y ahí está lo imposible: un directorio oculto tras el cargador. La cabecera ROM estándar… omitida. En su lugar, metadatos.'},
  ], ()=>{ openPremis(); });
  renderObjective(); save();
}

/* ============================ PUZLE: LATENCIA EXACTA ============================ */
const SYNC_TARGET = { div:4, ret:2, fase:90 };
function wavePath(div, ret, fase, amp, color, width){
  const lambda = 40*div, phi = (ret*15 + fase*0.8)*Math.PI/180;
  let d='';
  for(let x=0;x<=600;x+=6){
    const y = 100 + amp*Math.sin((x/lambda)*2*Math.PI + phi);
    d += (x===0?'M':'L')+x.toFixed(1)+' '+y.toFixed(1)+' ';
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}
function drawScope(){
  const div = +byId('dial-div').value, ret = +byId('dial-ret').value, fase = +byId('dial-fase').value;
  byId('out-div').textContent = div;
  byId('out-ret').textContent = ret;
  byId('out-fase').textContent = fase+'°';
  let s = '<g stroke="#12301c" stroke-width="1">';
  for(let x=0;x<=600;x+=50) s+=`<line x1="${x}" y1="0" x2="${x}" y2="200"/>`;
  for(let y=0;y<=200;y+=50) s+=`<line x1="0" y1="${y}" x2="600" y2="${y}"/>`;
  s+='</g>';
  s += wavePath(SYNC_TARGET.div, SYNC_TARGET.ret, SYNC_TARGET.fase, 60, 'rgba(89,217,140,.25)', 3);
  s += wavePath(div, ret, fase, 60, '#59d98c', 3);
  byId('scope').innerHTML = s;
  const ok = div===SYNC_TARGET.div && ret===SYNC_TARGET.ret && fase===SYNC_TARGET.fase;
  byId('sync-lamp').classList.toggle('on', ok);
  byId('sync-msg').textContent = ok ? 'SINCRONÍA EXACTA' : 'SIN SINCRONÍA — la libreta guarda los valores';
  byId('btn-apply-sync').disabled = !ok;
}
function openSync(){
  byId('sync-overlay').hidden = false;
  drawScope();
}
function closeSync(){ byId('sync-overlay').hidden = true; }

/* ============================ PUZLE: PREMIS ============================ */
const PREMIS = [
  {id:'t1', text:'Cinta de casset — «El Priorato de la Culpa» (1987)', entity:'objecte'},
  {id:'t2', text:'Desconegut — usa la meua pròpia nomenclatura', entity:'agent'},
  {id:'t3', text:'Volcament forense — hui, 03:47', entity:'esdeveniment'},
  {id:'t4', text:'Desconeguts — possible obra orfe', entity:'drets'},
  {id:'t5', text:'Oscil·loscopi de sobretaula', entity:null},
  {id:'t6', text:'Guia d\'estil del carregador', entity:null},
];
let premisSel = null;
function openPremis(){
  byId('premis-overlay').hidden = false;
  renderPremis();
}
function renderPremis(){
  const tk = byId('premis-tokens'); tk.innerHTML='';
  PREMIS.filter(t=>!t.done).forEach(t=>{
    const b=document.createElement('button');
    b.type='button'; b.className='premis-token'+(premisSel===t.id?' sel':'');
    b.textContent=t.text;
    b.addEventListener('click', ()=>{ AudioEngine.click(); premisSel = premisSel===t.id?null:t.id; renderPremis(); });
    tk.appendChild(b);
  });
  document.querySelectorAll('.premis-entity').forEach(en=>{
    const slot = en.querySelector('.slot'); slot.innerHTML='';
    const placed = PREMIS.filter(t=>t.done===en.dataset.entity);
    placed.forEach(t=>{
      const c=document.createElement('div'); c.className='premis-token placed'; c.textContent=t.text; slot.appendChild(c);
    });
  });
  const done = PREMIS.filter(t=>t.done).length;
  byId('premis-lamp').classList.toggle('on', done===4);
  byId('premis-msg').textContent = done===4 ? 'CABECERA RECONSTRUIDA — LA PUERTA ESTÁ ABIERTA' : 'FALTAN '+(4-done)+' ETIQUETAS POR COLOCAR';
}
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.premis-entity').forEach(en=>{
    en.addEventListener('click', ()=>{
      if(!premisSel) return;
      const t = PREMIS.find(x=>x.id===premisSel);
      if(t.entity===en.dataset.entity){
        t.done = t.entity; premisSel=null; AudioEngine.success();
        en.classList.add('flash-ok'); setTimeout(()=>en.classList.remove('flash-ok'),700);
        renderPremis();
        if(PREMIS.filter(x=>x.done).length===4){
          F.premis_ok = true; save();
          setTimeout(()=>{
            byId('premis-overlay').hidden = true;
            go('deposito');
            say([
              {who:'NICOLAU', text:'Las etiquetas encajan y el cargador… cede. Un segundo programa se despliega sobre la memoria: una sala que no estaba en el mapa del juego.'},
              {who:'NICOLAU', text:'Bienvenido al Depósito Cero.'},
            ]);
          }, 1200);
        }
      } else {
        AudioEngine.deny();
        en.classList.add('flash-bad'); setTimeout(()=>en.classList.remove('flash-bad'),700);
        premisSel=null; renderPremis();
      }
    });
  });
});

/* ============================ FINALES ============================ */
function showEnding(kind){
  const title = kind==='altre' ? "LA MÀ DE L'ALTRE" : 'LA MEVA MÀ';
  const body = kind==='altre'
    ? ['Nicolau archiva la cinta bajo «Agent: desconegut». Durante semanas repasa ferias, nóminas y fanzines del 87 buscando quién pudo observarle trabajar. No encuentra un nombre: encuentra hábitos. Los suyos, descritos con cariño de manual.',
       'La última página de su libreta sigue sin cuadrar. La letra es la suya. La fecha, anterior a que aprendiera a soldar.']
    : ['Nicolau archiva la cinta bajo «Agent: desconegut». Por las noches relee sus cuadernos buscando la página que no recuerda haber escrito. La encuentra cada vez más veces. O la recuerda cada vez mejor; ya no sabe si eso es distinto.',
       'Si fue él, lo hizo por una razón que aún no ha ocurrido. Si no fue él, alguien le conoce hasta la letra.'];
  byId('ending-title').textContent = title;
  byId('ending-text').innerHTML =
    body.map(p=>`<p>${p}</p>`).join('')+
    '<p>En la ficha de inventario, bajo «Agent», alguien ha escrito su nombre con su propia letra.</p>'+
    '<p>La cinta sabe qué máquina la está leyendo.</p>'+
    '<p class="firm">— FIN —</p>';
  byId('ending-overlay').hidden = false;
  AudioEngine.success();
  wipe();
}

/* ============================ ARRANQUE ============================ */
document.addEventListener('DOMContentLoaded', ()=>{
  renderInventory();
  ['dial-div','dial-ret','dial-fase'].forEach(id=>byId(id).addEventListener('input', drawScope));
  byId('btn-apply-sync').addEventListener('click', ()=>{
    F.sync_ok = true; save(); closeSync(); AudioEngine.success();
    say([{who:'NICOLAU', text:'La onda verde cubre a la fantasma. Latencia exacta. Ahora sí: la cinta y yo vamos a hablar. Al CRT.'}]);
    renderObjective();
  });
  byId('btn-sync-close').addEventListener('click', closeSync);
  byId('btn-premis-close').addEventListener('click', ()=>{ byId('premis-overlay').hidden = true; });
  byId('btn-guide').addEventListener('click', ()=>{ byId('guide-overlay').hidden = false; });
  byId('btn-guide2').addEventListener('click', ()=>{ byId('guide-overlay').hidden = false; });
  byId('btn-guide-close').addEventListener('click', ()=>{ byId('guide-overlay').hidden = true; });
  byId('btn-sound').addEventListener('click', function(){
    AudioEngine.init();
    const on = AudioEngine.toggleMusic();
    this.setAttribute('aria-pressed', on?'true':'false');
  });
  byId('btn-reset').addEventListener('click', ()=>{
    if(confirm('¿Reiniciar la partida? Se borra el progreso guardado.')){ wipe(); location.reload(); }
  });
  byId('btn-ending-restart').addEventListener('click', ()=>{ location.reload(); });
  byId('btn-start').addEventListener('click', ()=>{
    AudioEngine.init();
    wipe();
    state.scene='taller'; state.inventory=[]; state.selItem=null;
    Object.keys(F).forEach(k=>delete F[k]);
    renderInventory();
    byId('title-screen').hidden = true;
    go('taller');
  });
  const has = (()=>{ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } })();
  byId('btn-continue').hidden = !has;
  byId('btn-continue').addEventListener('click', ()=>{
    AudioEngine.init(); load();
    byId('title-screen').hidden = true;
    go(state.scene);
  });
  document.addEventListener('keydown', e=>{
    if(e.key==='m'||e.key==='M'){
      AudioEngine.init();
      const on = AudioEngine.toggleMusic();
      byId('btn-sound').setAttribute('aria-pressed', on?'true':'false');
    }
  });
  renderScene();
});
