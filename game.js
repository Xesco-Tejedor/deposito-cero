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
    <stop offset="0" stop-color="#15151f"/><stop offset="1" stop-color="#0f0f17"/>
  </linearGradient>
  <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#17141f"/><stop offset="1" stop-color="#0c0a11"/>
  </linearGradient>
  <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#141c2e"/><stop offset="1" stop-color="#0a1220"/>
  </linearGradient>
  <linearGradient id="posterSun" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd76a"/><stop offset=".5" stop-color="#ff2e88"/><stop offset="1" stop-color="#8a4bff"/>
  </linearGradient>
  ${NEON_DEFS}
</defs>
<rect width="1600" height="900" fill="#0b0b10"/>
<rect width="1600" height="640" fill="url(#wallG)"/>
<polygon points="0,640 1600,640 1600,900 0,900" fill="url(#floorG)"/>
<g stroke="#1d1d2e" stroke-width="3" opacity=".8">
  ${Array.from({length:9},(_,i)=>`<line x1="0" y1="${668+i*28}" x2="1600" y2="${668+i*28}"/>`).join('')}
</g>
<!-- ventana con persiana: la ciudad de noche -->
<g>
  <rect x="120" y="150" width="310" height="390" fill="url(#night)" stroke="#06060a" stroke-width="10"/>
  <g fill="#0a0e18">
    <rect x="150" y="330" width="60" height="210"/><rect x="220" y="280" width="46" height="260"/>
    <rect x="276" y="350" width="70" height="190"/><rect x="356" y="300" width="50" height="240"/>
  </g>
  <g fill="#2de2ff" opacity=".55">
    ${Array.from({length:14},(_,i)=>`<rect x="${158+(i*53)%250}" y="${300+(i*71)%220}" width="6" height="9"/>`).join('')}
  </g>
  <g fill="#ff2e88" opacity=".55">
    ${Array.from({length:8},(_,i)=>`<rect x="${176+(i*67)%230}" y="${320+(i*97)%200}" width="6" height="9"/>`).join('')}
  </g>
  <g stroke="#06060a" stroke-width="9">
    ${Array.from({length:12},(_,i)=>`<line x1="126" y1="${186+i*29}" x2="424" y2="${186+i*29}"/>`).join('')}
  </g>
  <rect x="120" y="150" width="310" height="26" fill="#06060a"/>
  <g fill="#e8a33d" opacity=".09">
    <polygon points="180,560 240,560 420,900 320,900"/>
    <polygon points="260,560 320,560 540,900 440,900"/>
    <polygon points="340,560 400,560 660,900 560,900"/>
  </g>
</g>
<!-- póster retrowave -->
<g>
  <rect x="520" y="180" width="240" height="300" fill="#0b0b10" stroke="#2de2ff" stroke-width="3" opacity=".95"/>
  <circle cx="640" cy="330" r="86" fill="url(#posterSun)"/>
  <g fill="#0b0b10">
    ${Array.from({length:5},(_,i)=>`<rect x="548" y="${352+i*14}" width="184" height="${3+i*3}"/>`).join('')}
  </g>
  <polygon points="560,430 610,370 660,430" fill="#1d1030" stroke="#ff2e88" stroke-width="2"/>
  <polygon points="630,430 690,360 740,430" fill="#170c26" stroke="#2de2ff" stroke-width="2"/>
  <text x="640" y="466" fill="#2de2ff" font-size="16" letter-spacing="5" text-anchor="middle" filter="url(#neonC)">MAÑANA ES 1987</text>
</g>
<!-- lámpara colgante cálida -->
<g>
  <line x1="900" y1="0" x2="900" y2="130" stroke="#26262e" stroke-width="5"/>
  <path d="M 852 170 L 948 170 L 922 130 L 878 130 Z" fill="#1d1d2e" stroke="#3a3a4a" stroke-width="3"/>
  <ellipse cx="900" cy="176" rx="26" ry="8" fill="#ffd76a"/>
  <polygon points="874,178 926,178 1010,640 790,640" fill="#e8a33d" opacity=".07"/>
</g>
<!-- estantería de cintas con tira de neón -->
<g>
  <rect x="470" y="300" width="290" height="330" fill="#12121c" stroke="#26262e" stroke-width="6"/>
  <rect x="470" y="296" width="290" height="6" fill="#2de2ff" filter="url(#neonC)" opacity=".9"/>
  ${[0,1,2,3].map(r=>`<rect x="478" y="${368+r*66}" width="274" height="8" fill="#26262e"/>`).join('')}
  ${Array.from({length:4},(_,r)=>Array.from({length:11},(_,c)=>{
    const h=44+((r*11+c)%3)*8, w=16+((r*7+c)%3)*4, x=484+c*24, y=368+r*66-h;
    const col=['#7a5c33','#6b3a4a','#3a4a5e','#4a3a6b','#5e6840'][(r+c)%5];
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" stroke="#0b0b10"/>`;
  }).join('')).join('')}
  <text x="615" y="330" fill="#ff2e88" font-size="17" letter-spacing="4" text-anchor="middle" filter="url(#neonP)">ARXIU · 1983-1992</text>
</g>
<!-- mesa auxiliar con el Spectrum -->
<g>
  <rect x="1330" y="668" width="230" height="20" fill="#26202e"/>
  <rect x="1350" y="688" width="14" height="120" fill="#17141f"/>
  <rect x="1526" y="688" width="14" height="120" fill="#17141f"/>
  <polygon points="1352,640 1538,640 1550,668 1340,668" fill="#23232a" stroke="#3a3a44" stroke-width="3"/>
  <rect x="1358" y="646" width="160" height="14" rx="3" fill="#15151a"/>
  ${Array.from({length:16},(_,i)=>`<rect x="${1362+i*10}" y="648" width="7" height="10" fill="#c9bda3" opacity=".5"/>`).join('')}
  <text x="1445" y="630" fill="#2de2ff" font-size="14" letter-spacing="3" text-anchor="middle" opacity=".8">ZX · 48K</text>
</g>
<!-- escritorio -->
<g>
  <rect x="980" y="560" width="420" height="26" fill="#2b2333"/>
  <rect x="980" y="586" width="420" height="10" fill="#1c1722"/>
  <rect x="1000" y="596" width="16" height="212" fill="#1c1722"/>
  <rect x="1340" y="596" width="16" height="212" fill="#1c1722"/>
  <rect x="1040" y="596" width="170" height="150" fill="#211a29" stroke="#33293d" stroke-width="4"/>
  <rect x="1052" y="610" width="146" height="56" fill="#1a1520" stroke="#33293d" stroke-width="3"/>
  <rect x="1052" y="676" width="146" height="56" fill="#1a1520" stroke="#33293d" stroke-width="3"/>
  <rect x="1105" y="634" width="40" height="6" fill="#2de2ff" opacity=".7"/>
  <rect x="1105" y="700" width="40" height="6" fill="#2de2ff" opacity=".7"/>
  <!-- CRT fósforo -->
  <rect x="1180" y="428" width="192" height="142" rx="8" fill="#221c2b" stroke="#3a3044" stroke-width="5"/>
  <rect x="1198" y="446" width="156" height="106" rx="4" fill="#0a140d"/>
  <rect x="1198" y="446" width="156" height="106" rx="4" fill="#59d98c" opacity=".08"/>
  ${Array.from({length:6},(_,i)=>`<line x1="1200" y1="${452+i*17}" x2="1352" y2="${452+i*17}" stroke="#59d98c" stroke-opacity="${i%2?0.14:0.05}"/>`).join('')}
  <text x="1208" y="470" fill="#59d98c" font-size="13" font-family="monospace" opacity=".9">READY.</text>
  <rect x="1240" y="570" width="70" height="12" fill="#221c2b"/>
  <polygon points="1150,596 1330,596 1342,616 1138,616" fill="#23232a" stroke="#3a3a44" stroke-width="2"/>
  <!-- osciloscopio -->
  <rect x="988" y="468" width="150" height="102" rx="6" fill="#17131f" stroke="#33293d" stroke-width="4"/>
  <rect x="1000" y="480" width="126" height="58" rx="3" fill="#050d08"/>
  <path d="M 1004 510 q 10 -18 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0" fill="none" stroke="#59d98c" stroke-width="2.4"/>
  <circle cx="1008" cy="552" r="5" fill="#ff2e88"/>
  <circle cx="1026" cy="552" r="5" fill="#3a3044"/>
  <text x="1063" y="558" fill="#c9bda3" font-size="11" text-anchor="middle" opacity=".8">MOD-R1</text>
  <!-- libreta -->
  <g transform="translate(1150,512) rotate(-4)">
    <rect width="86" height="46" rx="3" fill="#c9bda3"/>
    ${Array.from({length:5},(_,i)=>`<line x1="8" y1="${10+i*8}" x2="78" y2="${10+i*8}" stroke="#7a6f57" stroke-width="1.6"/>`).join('')}
    <rect x="0" y="0" width="10" height="46" fill="#8f8266"/>
  </g>
  <!-- la cinta -->
  <g transform="translate(1252,498)">
    <rect width="104" height="64" rx="6" fill="#d8cba8" stroke="#8f8266" stroke-width="3"/>
    <rect x="12" y="10" width="80" height="26" rx="3" fill="#0b0b10"/>
    <circle cx="34" cy="23" r="9" fill="none" stroke="#d8cba8" stroke-width="3"/>
    <circle cx="70" cy="23" r="9" fill="none" stroke="#d8cba8" stroke-width="3"/>
    <path d="M 8 46 L 96 46 L 88 62 L 16 62 Z" fill="#0b0b10" opacity=".85"/>
    <text x="52" y="59" fill="#d8cba8" font-size="10" text-anchor="middle" letter-spacing="1">EL PRIORATO</text>
  </g>
</g>
<!-- mesita con el contestador -->
<g>
  <rect x="822" y="600" width="150" height="14" fill="#26202e"/>
  <rect x="838" y="614" width="12" height="130" fill="#17141f"/>
  <rect x="944" y="614" width="12" height="130" fill="#17141f"/>
  <g>
    <rect x="830" y="556" width="132" height="46" rx="6" fill="#1b1624" stroke="#3a3044" stroke-width="3"/>
    <rect x="842" y="568" width="52" height="22" rx="3" fill="#0b0b10"/>
    <circle cx="856" cy="579" r="6" fill="none" stroke="#c9bda3" stroke-width="2.4"/>
    <circle cx="880" cy="579" r="6" fill="none" stroke="#c9bda3" stroke-width="2.4"/>
    <rect x="906" y="570" width="44" height="8" rx="2" fill="#0b0b10"/>
    <rect x="906" y="584" width="44" height="8" rx="2" fill="#26262e"/>
    <circle cx="954" cy="566" r="4" fill="#ff2e88" filter="url(#neonP)">
      <animate attributeName="opacity" values="1;.15;1" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <text x="896" y="618" fill="#c9bda3" font-size="11" text-anchor="middle" opacity=".75" letter-spacing="2">CONTESTADOR</text>
  </g>
</g>
<!-- cables por el suelo -->
<path d="M 900 700 Q 1000 760 1150 730 T 1400 800" fill="none" stroke="#26262e" stroke-width="6"/>
<path d="M 700 730 Q 850 790 1050 770" fill="none" stroke="#1d1d2e" stroke-width="6"/>
<!-- HOTSPOTS -->
<g id="hotspots">
  <rect class="hs hs-pulse" data-hs="contestador" x="800" y="530" width="180" height="150"/>
  <rect class="hs hs-pulse" data-hs="estanteria"  x="470"  y="290" width="290" height="345"/>
  <rect class="hs hs-pulse" data-hs="libreta"     x="1136" y="500" width="110" height="62"/>
  <rect class="hs hs-pulse" data-hs="osciloscopio" x="984"  y="462" width="160" height="112"/>
  <rect class="hs hs-pulse" data-hs="crt"          x="1174" y="422" width="204" height="152"/>
  <rect class="hs hs-pulse" data-hs="cinta"        x="1244" y="490" width="120" height="80"/>
  <rect class="hs hs-pulse" data-hs="cajon"        x="1036" y="592" width="180" height="158"/>
  <rect class="hs hs-pulse" data-hs="spectrum"     x="1330" y="600" width="230" height="90"/>
  <rect class="hs hs-pulse" data-hs="puerta"       x="1452" y="310" width="148" height="450"/>
</g>
</svg>`;
}

function svgCalle(){
return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#150a24"/><stop offset=".6" stop-color="#0d0a1a"/><stop offset="1" stop-color="#0b0b10"/>
  </linearGradient>
  <linearGradient id="wetG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#14101f"/><stop offset="1" stop-color="#08070c"/>
  </linearGradient>
  ${NEON_DEFS}
</defs>
<rect width="1600" height="900" fill="url(#skyG)"/>
<circle cx="1330" cy="140" r="52" fill="#e8ddc0" opacity=".85"/>
<!-- skyline ochentera -->
<g fill="#0a0812">
  <path d="M 60 640 V 300 h 60 v -50 h 50 v 50 h 60 V 640 Z"/>
  <path d="M 230 640 V 220 h 50 v -46 h 44 v -40 h 40 v 40 h 44 v 46 h 50 V 640 Z"/>
  <path d="M 1150 640 V 260 h 56 v -44 h 48 v -44 h 40 v 44 h 48 v 44 h 56 V 640 Z"/>
  <path d="M 1400 640 V 330 h 46 v -40 h 40 v 40 h 46 V 640 Z"/>
</g>
<g fill="#2de2ff" opacity=".5">
  ${Array.from({length:16},(_,i)=>{const x=[90,120,150,260,290,320,350,1180,1210,1240,1270,1300,1420,1450][i%14]+((i*37)%5)*8; const y=240+((i*89)%360); return `<rect x="${x}" y="${y}" width="7" height="10"/>`;}).join('')}
</g>
<g fill="#ff2e88" opacity=".5">
  ${Array.from({length:10},(_,i)=>{const x=[105,275,335,1195,1255,1315,1435][i%7]+((i*53)%5)*8; const y=260+((i*113)%330); return `<rect x="${x}" y="${y}" width="7" height="10"/>`;}).join('')}
</g>
<!-- calle mojada -->
<rect y="640" width="1600" height="260" fill="url(#wetG)"/>
<g opacity=".2">
  ${Array.from({length:9},(_,i)=>`<line x1="${240+i*140}" y1="660" x2="${220+i*140}" y2="880" stroke="${i%2?'#ff2e88':'#2de2ff'}" stroke-width="${3+(i%3)}"/>`).join('')}
</g>
<!-- coche ochentero aparcado -->
<g transform="translate(1120,600)">
  <path d="M 0 70 L 14 34 L 66 22 L 96 0 L 176 0 L 206 22 L 258 30 L 270 70 Z" fill="#12121c" stroke="#26262e" stroke-width="3"/>
  <rect x="66" y="12" width="60" height="22" fill="#1b2b33"/>
  <rect x="136" y="12" width="56" height="22" fill="#1b2b33"/>
  <circle cx="60" cy="72" r="18" fill="#0b0b10" stroke="#3a3a44" stroke-width="4"/>
  <circle cx="212" cy="72" r="18" fill="#0b0b10" stroke="#3a3a44" stroke-width="4"/>
  <rect x="252" y="40" width="14" height="10" fill="#ff5a4e" filter="url(#neonP)"/>
</g>
<!-- fachada con rótulo de neón -->
<g>
  <path d="M 520 640 V 240 h 560 V 640 Z" fill="#12101c" stroke="#26262e" stroke-width="5"/>
  <rect x="520" y="240" width="560" height="10" fill="#1d1d2e"/>
  <text x="800" y="312" fill="#ff2e88" font-size="40" letter-spacing="6" text-anchor="middle" font-weight="500" filter="url(#neonP)">ELECTRÒNICA</text>
  <text x="800" y="356" fill="#2de2ff" font-size="34" letter-spacing="10" text-anchor="middle" filter="url(#neonC)">PORTELL</text>
  <text x="800" y="388" fill="#b9b4a4" font-size="14" letter-spacing="6" text-anchor="middle" opacity=".8">COMPONENTS · DES DE 1974</text>
  <!-- escaparate -->
  <rect x="560" y="420" width="220" height="200" fill="#0a1210" stroke="#26262e" stroke-width="5"/>
  <g opacity=".85">
    ${Array.from({length:3},(_,r)=>Array.from({length:4},(_,c)=>`<rect x="${578+c*50}" y="${438+r*56}" width="38" height="42" fill="none" stroke="#59d98c" stroke-opacity=".3" stroke-width="2"/>`).join('')).join('')}
    ${Array.from({length:12},(_,i)=>`<circle cx="${597+(i%4)*50}" cy="${459+((i/4)|0)*56}" r="7" fill="#3d6b5e" opacity=".55"/>`).join('')}
  </g>
  <!-- puerta -->
  <rect x="830" y="420" width="130" height="220" fill="#17141f" stroke="#2de2ff" stroke-width="2" opacity=".95"/>
  <rect x="830" y="420" width="130" height="220" fill="none" stroke="#2de2ff" stroke-width="4" filter="url(#neonC)" opacity=".8"/>
  <rect x="872" y="490" width="10" height="110" rx="5" fill="#e8a33d"/>
  <text x="895" y="460" fill="#ff2e88" font-size="17" letter-spacing="3" text-anchor="middle" filter="url(#neonP)">OBERT</text>
</g>
<!-- farola de sodio -->
<g>
  <rect x="250" y="330" width="10" height="330" fill="#0a0a0f"/>
  <rect x="222" y="322" width="66" height="14" rx="7" fill="#12121c" stroke="#26262e" stroke-width="3"/>
  <ellipse cx="255" cy="340" rx="10" ry="6" fill="#ffd76a"/>
  <polygon points="245,346 265,346 330,660 180,660" fill="#e8a33d" opacity=".08"/>
</g>
<!-- cartel de vuelta -->
<g>
  <polygon points="30,770 190,770 170,830 30,830" fill="#12101c" stroke="#2de2ff" stroke-width="2"/>
  <text x="108" y="808" fill="#2de2ff" font-size="22" letter-spacing="3" text-anchor="middle" filter="url(#neonC)">← TALLER</text>
</g>
${rainLines(46,-80,900)}
${rainLines(30,-80,900,'slow')}
<!-- HOTSPOTS -->
<g id="hotspots">
  <rect class="hs hs-pulse" data-hs="escaparate"  x="552"  y="412" width="236" height="216"/>
  <rect class="hs hs-pulse" data-hs="puerta_tienda" x="822" y="412" width="146" height="232"/>
  <rect class="hs hs-pulse" data-hs="farola"      x="200"  y="300" width="110" height="370"/>
  <rect class="hs hs-pulse" data-hs="a_taller"    x="24"   y="762" width="176" height="76"/>
</g>
</svg>`;
}

function svgTienda(){
return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="shopG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#131222"/><stop offset="1" stop-color="#0d0c15"/>
  </linearGradient>
  ${NEON_DEFS}
</defs>
<rect width="1600" height="900" fill="url(#shopG)"/>
<polygon points="0,720 1600,720 1600,900 0,900" fill="#0e0d14"/>
<g stroke="#1d1d2e" stroke-width="3" opacity=".8">
  ${Array.from({length:12},(_,i)=>`<line x1="${i*140}" y1="720" x2="${i*140-60}" y2="900"/>`).join('')}
</g>
<!-- fluorescente del techo -->
<g>
  <rect x="620" y="60" width="360" height="16" rx="8" fill="#1d1d2e" stroke="#26262e" stroke-width="3"/>
  <rect class="fluor" x="632" y="64" width="336" height="8" rx="4" fill="#cfefff" filter="url(#neonC)"/>
  <polygon points="640,80 960,80 1120,720 480,720" fill="#2de2ff" opacity=".045"/>
</g>
<!-- estantería de cajones -->
<g>
  <rect x="80" y="140" width="520" height="540" fill="#12121c" stroke="#26262e" stroke-width="6"/>
  <rect x="80" y="136" width="520" height="5" fill="#ff2e88" filter="url(#neonP)" opacity=".8"/>
  ${Array.from({length:6},(_,r)=>Array.from({length:5},(_,c)=>
    `<rect x="${96+c*100}" y="${156+r*88}" width="88" height="76" fill="#1a1726" stroke="#2b2438" stroke-width="3"/>
     <rect x="${126+c*100}" y="${182+r*88}" width="28" height="5" fill="#e8a33d" opacity=".6"/>
     <text x="${140+c*100}" y="${214+r*88}" fill="#b9b4a4" font-size="10" text-anchor="middle" opacity=".65">${['RESIST.','CONDENS.','XIPS','CINTES','VALVES'][c]}</text>`
  ).join('')).join('')}
</g>
<!-- cartel OBERT en la pared -->
<text x="1360" y="200" fill="#ff2e88" font-size="34" letter-spacing="8" text-anchor="middle" filter="url(#neonP)" transform="rotate(3 1360 200)">OBERT</text>
<!-- Portell detrás del mostrador -->
<g transform="translate(980,260)">
  <path d="M 60 260 L 160 260 L 150 130 Q 110 96 70 130 Z" fill="#232c38"/>
  <circle cx="110" cy="86" r="52" fill="#c9a06a"/>
  <path d="M 62 78 Q 110 30 158 78 L 158 62 Q 110 18 62 62 Z" fill="#1a1726"/>
  <circle cx="90" cy="88" r="13" fill="none" stroke="#14111c" stroke-width="4"/>
  <circle cx="130" cy="88" r="13" fill="none" stroke="#14111c" stroke-width="4"/>
  <line x1="103" y1="88" x2="117" y2="88" stroke="#14111c" stroke-width="4"/>
  <path d="M 96 122 Q 110 130 124 122" fill="none" stroke="#14111c" stroke-width="4"/>
  <path d="M 96 118 Q 110 136 124 118" fill="#14111c" opacity=".9"/>
  <polygon points="96,150 124,150 110,166" fill="#ff2e88"/>
</g>
<!-- mostrador -->
<g>
  <polygon points="700,560 1440,560 1490,720 650,720" fill="#2b2333"/>
  <polygon points="650,720 1490,720 1490,760 650,760" fill="#1c1722"/>
  <line x1="700" y1="560" x2="1440" y2="560" stroke="#2de2ff" stroke-width="3" filter="url(#neonC)"/>
  <!-- radio de válvulas -->
  <g transform="translate(1260,486)">
    <rect width="120" height="74" rx="8" fill="#241c30" stroke="#14111c" stroke-width="4"/>
    <circle cx="30" cy="37" r="20" fill="#0b0b10"/>
    <circle cx="30" cy="37" r="12" fill="#e8a33d" opacity=".85"/>
    <rect x="60" y="18" width="46" height="14" rx="3" fill="#0b0b10"/>
    <rect x="62" y="21" width="30" height="8" rx="2" fill="#ffd76a" opacity=".8"/>
    <circle cx="70" cy="48" r="7" fill="#0b0b10"/><circle cx="94" cy="48" r="7" fill="#0b0b10"/>
  </g>
  <!-- vitrina de cristales -->
  <g transform="translate(760,500)">
    <polygon points="0,60 180,60 170,0 10,0" fill="#0a1210" stroke="#26262e" stroke-width="4"/>
    ${Array.from({length:4},(_,i)=>`<rect x="${24+i*36}" y="20" width="22" height="14" rx="3" fill="#59d98c" opacity="${.35+i*.12}"/>`).join('')}
    <text x="90" y="82" fill="#b9b4a4" font-size="12" letter-spacing="2" text-anchor="middle" opacity=".7">CRISTALLS DE QUARS</text>
  </g>
</g>
<!-- salida -->
<g>
  <polygon points="30,770 200,770 180,830 30,830" fill="#12101c" stroke="#2de2ff" stroke-width="2"/>
  <text x="112" y="808" fill="#2de2ff" font-size="22" letter-spacing="3" text-anchor="middle" filter="url(#neonC)">← CARRER</text>
</g>
<!-- HOTSPOTS -->
<g id="hotspots">
  <rect class="hs hs-pulse" data-hs="portell"      x="1000" y="250" width="250" height="310"/>
  <rect class="hs hs-pulse" data-hs="cajones"      x="80"   y="140" width="520" height="540"/>
  <rect class="hs hs-pulse" data-hs="cristales"    x="750"  y="490" width="200" height="110"/>
  <rect class="hs hs-pulse" data-hs="radio"        x="1250" y="480" width="140" height="90"/>
  <rect class="hs hs-pulse" data-hs="a_calle"      x="24"   y="762" width="186" height="76"/>
</g>
</svg>`;
}

function svgDeposito(doorsOpen){
  /* rejilla en perspectiva hasta un punto de fuga central */
  let grid='';
  for(let i=0;i<=16;i++){
    const x=i*100;
    grid+=`<line x1="800" y1="470" x2="${x*2-800}" y2="900" stroke="#ff2e88" stroke-width="1.6" opacity=".3"/>`;
  }
  for(let i=0;i<9;i++){
    const y=470+Math.pow(i/8,1.8)*430;
    grid+=`<line x1="0" y1="${y}" x2="1600" y2="${y}" stroke="#ff2e88" stroke-width="1.6" opacity="${.15+i*.03}"/>`;
  }
return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="vaultBg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0b0b14"/><stop offset="1" stop-color="#0b0b10"/>
  </linearGradient>
  <linearGradient id="sunV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd76a"/><stop offset=".5" stop-color="#ff2e88"/><stop offset="1" stop-color="#8a4bff"/>
  </linearGradient>
  ${NEON_DEFS}
</defs>
<rect width="1600" height="900" fill="url(#vaultBg)"/>
${grid}
<!-- sol rayado tras el dintel -->
<g>
  <circle cx="800" cy="430" r="150" fill="url(#sunV)" opacity=".85"/>
  <g fill="#0b0b14">
    ${Array.from({length:6},(_,i)=>`<rect x="636" y="${452+i*16}" width="328" height="${4+i*3}"/>`).join('')}
  </g>
</g>
<!-- dintel monolítico con marco de neón -->
<g>
  <rect x="560" y="470" width="480" height="330" fill="#0e0d16"/>
  <rect x="560" y="470" width="480" height="330" fill="none" stroke="#2de2ff" stroke-width="4" filter="url(#neonC)"/>
  ${Array.from({length:6},(_,i)=>`<rect x="588" y="${500+i*46}" width="424" height="8" fill="#2de2ff" opacity="${.25+i*.06}"/>`).join('')}
</g>
<!-- haz de luz sobre el atril -->
<polygon points="770,120 830,120 900,880 700,880" fill="#e8a33d" opacity=".10"/>
<!-- atril con la cinta -->
<g>
  <polygon points="760,760 840,760 900,880 700,880" fill="#17141f" stroke="#33293d" stroke-width="4"/>
  <polygon points="740,720 860,720 840,760 760,760" fill="#2b2333" stroke="#33293d" stroke-width="4"/>
  <g transform="translate(748,646)">
    <rect width="104" height="64" rx="6" fill="#d8cba8" stroke="#8f8266" stroke-width="3"/>
    <rect x="12" y="10" width="80" height="26" rx="3" fill="#0b0b10"/>
    <circle cx="34" cy="23" r="9" fill="none" stroke="#d8cba8" stroke-width="3"/>
    <circle cx="70" cy="23" r="9" fill="none" stroke="#d8cba8" stroke-width="3"/>
    <path d="M 8 46 L 96 46 L 88 62 L 16 62 Z" fill="#0b0b10" opacity=".85"/>
  </g>
  <text x="800" y="632" fill="#2de2ff" font-size="19" letter-spacing="6" text-anchor="middle" filter="url(#neonC)">EL PRIORATO DE LA CULPA</text>
  <text x="800" y="606" fill="#ff2e88" font-size="14" letter-spacing="6" text-anchor="middle" filter="url(#neonP)">DEPÒSIT ZERO</text>
</g>
${doorsOpen?`
<!-- dos puertas: dos hipótesis -->
<g>
  <rect x="300" y="480" width="180" height="320" fill="#0e0d16" stroke="#ff2e88" stroke-width="3" filter="url(#neonP)"/>
  <rect x="330" y="530" width="120" height="8" fill="#ff2e88" opacity=".7"/>
  <text x="390" y="850" fill="#ff2e88" font-size="17" letter-spacing="3" text-anchor="middle" filter="url(#neonP)">LA MÀ DE L'ALTRE</text>
  <rect x="1120" y="480" width="180" height="320" fill="#0e0d16" stroke="#2de2ff" stroke-width="3" filter="url(#neonC)"/>
  <rect x="1150" y="530" width="120" height="8" fill="#2de2ff" opacity=".7"/>
  <text x="1210" y="850" fill="#2de2ff" font-size="17" letter-spacing="3" text-anchor="middle" filter="url(#neonC)">LA MEVA MÀ</text>
</g>`:''}
<!-- HOTSPOTS -->
<g id="hotspots">
  <rect class="hs hs-pulse" data-hs="missatge" x="700" y="600" width="200" height="180"/>
  ${doorsOpen?`<rect class="hs hs-pulse" data-hs="porta_altre" x="300" y="470" width="180" height="380"/>
  <rect class="hs hs-pulse" data-hs="porta_meua" x="1120" y="470" width="180" height="380"/>`:''}
</g>
</svg>`;
}

/* ============================ RETRATOS ============================ */
function portraitNicolau(){
return `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#12121c"/>
<path d="M 20 100 L 26 66 Q 50 52 74 66 L 80 100 Z" fill="#232c38"/>
<circle cx="50" cy="44" r="24" fill="#c9a06a"/>
<path d="M 28 40 Q 50 16 72 40 L 72 30 Q 50 8 28 30 Z" fill="#1a1726"/>
<rect x="20" y="26" width="60" height="7" rx="3" fill="#1a1726"/>
<rect x="36" y="42" width="12" height="9" rx="2" fill="none" stroke="#14111c" stroke-width="2.4"/>
<rect x="54" y="42" width="12" height="9" rx="2" fill="none" stroke="#14111c" stroke-width="2.4"/>
<line x1="48" y1="46" x2="54" y2="46" stroke="#14111c" stroke-width="2.4"/>
<path d="M 42 62 Q 50 66 58 62" fill="none" stroke="#14111c" stroke-width="2.6"/>
<polygon points="40,72 60,72 50,84" fill="#ff2e88" opacity=".9"/>
</svg>`;
}
function portraitPortell(){
return `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#12121c"/>
<path d="M 24 100 L 30 70 Q 50 58 70 70 L 76 100 Z" fill="#1d2b26"/>
<circle cx="50" cy="44" r="24" fill="#c9a06a"/>
<path d="M 27 42 Q 50 22 73 42 L 73 34 Q 50 12 27 34 Z" fill="#d8cba8" opacity=".25"/>
<circle cx="40" cy="44" r="7" fill="none" stroke="#14111c" stroke-width="2.4"/>
<circle cx="60" cy="44" r="7" fill="none" stroke="#14111c" stroke-width="2.4"/>
<line x1="47" y1="44" x2="53" y2="44" stroke="#14111c" stroke-width="2.4"/>
<path d="M 38 58 Q 50 68 62 58" fill="none" stroke="#14111c" stroke-width="3"/>
<path d="M 40 60 Q 50 74 60 60" fill="#d8cba8" opacity=".85"/>
<polygon points="42,74 58,74 50,82" fill="#ff2e88"/>
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
return `<svg viewBox="0 0 100 210">
<g class="fig">
  <g class="legB"><rect x="56" y="150" width="12" height="52" rx="5" fill="#14121c"/><rect x="52" y="196" width="20" height="10" rx="4" fill="#0d0c13"/></g>
  <g class="legA"><rect x="34" y="150" width="12" height="52" rx="5" fill="#14121c"/><rect x="30" y="196" width="20" height="10" rx="4" fill="#0d0c13"/></g>
  <path d="M 28 78 Q 50 66 72 78 L 78 158 Q 50 172 22 158 Z" fill="#1d1a28" stroke="#2de2ff" stroke-opacity=".28" stroke-width="2"/>
  <path d="M 28 82 Q 16 108 24 136" fill="none" stroke="#1d1a28" stroke-width="10" stroke-linecap="round"/>
  <path d="M 72 82 Q 84 108 76 136" fill="none" stroke="#1d1a28" stroke-width="10" stroke-linecap="round"/>
  <polygon points="38,80 62,80 50,104" fill="#ff2e88"/>
  <path d="M 60 82 L 74 120 L 66 124 L 56 88 Z" fill="#d11e6e"/>
  <circle cx="50" cy="52" r="24" fill="#c9a06a"/>
  <path d="M 27 46 Q 50 22 73 46 L 73 38 Q 50 12 27 38 Z" fill="#171420"/>
  <circle cx="41" cy="54" r="7" fill="none" stroke="#0d0c13" stroke-width="2.6"/>
  <circle cx="59" cy="54" r="7" fill="none" stroke="#0d0c13" stroke-width="2.6"/>
  <line x1="48" y1="54" x2="52" y2="54" stroke="#0d0c13" stroke-width="2.6"/>
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
