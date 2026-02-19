import"./modulepreload-polyfill-B5Qt9EMX.js";const S=`<div id="page" class="visual-metronome">
  <header class="vm-header">
    <div class="vm-brand-wrap">
      <p class="vm-eyebrow">Quinn Fleming's</p>
      <h1>Visual Metronome Lab</h1>
      <p class="vm-subtitle">Three pulse views for seeing rhythm from different angles.</p>
    </div>
    <nav class="vm-nav" aria-label="Music Learning Tools apps">
      <a data-route="" href="/">Hub</a>
      <a data-route="diatonic-compass/" href="/diatonic-compass/">Diatonic Compass</a>
      <a data-route="student-notation/" href="/student-notation/">Student Notation</a>
      <a data-route="singing-trainer/" href="/singing-trainer/">Singing Trainer</a>
      <a data-route="visual-metronome/" href="/visual-metronome/" class="active">Visual Metronome</a>
    </nav>
  </header>

  <main class="vm-main">
    <section class="vm-stage-card">
      <div class="vm-stage-topbar">
        <div>
          <p class="vm-stage-label">Visualization</p>
          <h2 id="visual-mode-title">Arc Bounce</h2>
        </div>
        <div class="vm-readout">
          <span id="hud-tempo" class="chip">60 BPM</span>
          <span id="hud-subdivision" class="chip">1 microbeat</span>
        </div>
      </div>

      <div class="vm-stage" id="canvas-container">
        <canvas id="metronome-canvas" aria-label="Metronome visualization canvas"></canvas>
      </div>

      <div class="vm-mode-switch" role="radiogroup" aria-label="Visualization mode">
        <button class="mode-toggle selected" data-mode="arc" aria-pressed="true">Arc Bounce</button>
        <button class="mode-toggle" data-mode="pendulum" aria-pressed="false">Pendulum</button>
        <button class="mode-toggle" data-mode="orbit" aria-pressed="false">Orbit Pulse</button>
      </div>
    </section>

    <aside class="vm-controls" aria-label="Metronome controls">
      <section class="control-card">
        <h3>Tempo & Sound</h3>
        <div class="control-row">
          <button id="start-stop" class="cta">Start</button>
          <button id="tap-tempo">Tap Tempo</button>
        </div>
        <div class="control-row inline">
          <label for="bpm-select">BPM</label>
          <button id="bpm-minus" aria-label="Decrease BPM">-</button>
          <select id="bpm-select" aria-label="Beats per minute"></select>
          <button id="bpm-plus" aria-label="Increase BPM">+</button>
        </div>
        <div class="control-row inline">
          <label for="sound-select">Sound</label>
          <select id="sound-select" aria-label="Select metronome sound"></select>
        </div>
        <div class="control-row inline">
          <label for="volume-slider">Volume</label>
          <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0.25" />
        </div>
      </section>

      <section class="control-card">
        <h3>Subdivision</h3>
        <div class="control-row inline">
          <label for="microbeats-toggle">Microbeats</label>
          <div id="microbeats-toggle" aria-label="Microbeat subdivisions">
            <button data-value="1" class="microbeat-toggle selected">1</button>
            <button data-value="2" class="microbeat-toggle">2</button>
            <button data-value="3" class="microbeat-toggle">3</button>
            <button data-value="4" class="microbeat-toggle">4</button>
          </div>
        </div>
      </section>

      <section class="control-card">
        <h3>Visual Settings</h3>
        <div class="control-row inline">
          <span>Ball Size</span>
          <button id="ball-size-decrease">-</button>
          <button id="ball-size-increase">+</button>
        </div>
        <div class="control-row inline">
          <span>Path Height</span>
          <button id="path-height-decrease">-</button>
          <button id="path-height-increase">+</button>
        </div>
        <div class="control-row">
          <button id="toggle-path">Show Guide</button>
          <button id="flash-toggle">Flash: Off</button>
        </div>
        <div class="control-row inline color-row">
          <label for="left-bar-color">Left</label>
          <input type="color" id="left-bar-color" value="#2196F3" />
          <label for="right-bar-color">Right</label>
          <input type="color" id="right-bar-color" value="#4CAF50" />
        </div>
      </section>
    </aside>
  </main>
</div>\r
`,m=50,f=60,T=.25,v=75,C=5,M=150,w=1,y=1,P=4,x=150,g=1e-5,A=2e3,I=8;function p(r,t,e){return Math.min(e,Math.max(t,r))}function b(r,t,e){return Math.round(p(r,t,e))}function E(r){let t=r;return t.startsWith("/")||(t=`/${t}`),t.endsWith("/")||(t=`${t}/`),t}function R(r){const t=E(r),e="visual-metronome/";if(!t.endsWith(e))return t;const s=t.slice(0,-e.length);return s.length>0?s:"/"}function o(r,t){const e=r.querySelector(t);if(!e)throw new Error(`Visual Metronome: missing required element "${t}"`);return e}function q(){const r=window;return window.AudioContext??r.webkitAudioContext??null}class F{constructor(t){this.container=t,this.container.innerHTML=S,this.elements=this.collectElements();const e=this.elements.canvas.getContext("2d");if(!e)throw new Error("Visual Metronome: failed to acquire 2D rendering context");this.ctx=e,this.audioContext=this.createAudioContext(),this.leftBar.highlight=this.lightenColor(this.leftBar.primary,50),this.rightBar.highlight=this.lightenColor(this.rightBar.primary,50),this.soundGenerators=this.createSoundGenerators(),this.applyNavigationRoutes(),this.populateBpmSelect(),this.populateSoundSelect(),this.updateMicrobeatButtons(),this.updateCanvasSize(),this.recalculateBoundaries(!1),this.updateSpeed(),this.bindEvents(),this.draw()}elements;ctx;cleanupFns=[];timeoutIds=new Set;audioContext;soundGenerators;bpm=f;beatInterval=6e4/f;volume=T;ballRadius=v;amplitude=M;microbeats=y;currentSound="Beep 1";leftBoundary=0;rightBoundary=0;ball={x:0,radius:v,speed:0,direction:1};isPlaying=!1;showPath=!1;canvasFlashEnabled=!1;flashColor=null;leftBar={primary:"#2196F3",highlight:"#2196F3",highlighted:!1};rightBar={primary:"#4CAF50",highlight:"#4CAF50",highlighted:!1};faceAngle=0;lastTimestamp=null;rafHandle=null;tapTimes=[];lastSegmentIndex=0;destroyed=!1;destroy(){if(!this.destroyed){this.destroyed=!0,this.stopPlayback(),this.clearScheduledTimeouts();for(const t of this.cleanupFns)t();this.cleanupFns.length=0,this.tapTimes=[],this.audioContext&&this.audioContext.state!=="closed"&&this.audioContext.close().catch(()=>{}),this.container.innerHTML=""}}createAudioContext(){const t=q();return t?new t:null}collectElements(){const t=o(this.container,"#page"),e=Array.from(t.querySelectorAll(".microbeat-toggle"));if(e.length===0)throw new Error("Visual Metronome: expected microbeat toggle buttons");return{root:t,canvas:o(t,"#metronome-canvas"),canvasContainer:o(t,"#canvas-container"),tapTempo:o(t,"#tap-tempo"),bpmSelect:o(t,"#bpm-select"),bpmMinus:o(t,"#bpm-minus"),bpmPlus:o(t,"#bpm-plus"),startStop:o(t,"#start-stop"),soundSelect:o(t,"#sound-select"),volumeSlider:o(t,"#volume-slider"),ballSizeDecrease:o(t,"#ball-size-decrease"),ballSizeIncrease:o(t,"#ball-size-increase"),flashToggle:o(t,"#flash-toggle"),pathHeightDecrease:o(t,"#path-height-decrease"),pathHeightIncrease:o(t,"#path-height-increase"),togglePath:o(t,"#toggle-path"),leftBarColor:o(t,"#left-bar-color"),rightBarColor:o(t,"#right-bar-color"),microbeatButtons:e}}applyNavigationRoutes(){const t=R("/music-learning-tools/");this.elements.root.querySelectorAll("a[data-route]").forEach(s=>{const i=(s.dataset.route??"").replace(/^\/+/,"");s.href=i?`${t}${i}`:t})}populateBpmSelect(){const t=this.elements.bpmSelect;t.innerHTML="";for(let e=30;e<=220;e+=10){const s=document.createElement("option");s.value=String(e),s.textContent=String(e),t.appendChild(s)}this.syncBpmSelect()}syncBpmSelect(){const t=String(this.bpm),e=this.elements.bpmSelect;let s=e.querySelector(`option[value="${t}"]`);if(!s){s=document.createElement("option"),s.value=t,s.textContent=t;const n=Array.from(e.options).find(a=>Number(a.value)>this.bpm)??null;e.insertBefore(s,n)}e.value=t}populateSoundSelect(){const t=this.elements.soundSelect;t.innerHTML="";const e=Object.keys(this.soundGenerators);e.length>0&&!e.includes(this.currentSound)&&(this.currentSound=e[0]);for(const s of e){const i=document.createElement("option");i.value=s,i.textContent=s,t.appendChild(i)}this.currentSound&&(t.value=this.currentSound)}createSoundGenerators(){return{"Beep 1":()=>this.playTone({type:"sine",frequency:800,durationSeconds:.1}),"Beep 2":()=>this.playTone({type:"square",frequency:600,durationSeconds:.1}),Blip:()=>this.playTone({type:"triangle",frequency:1e3,durationSeconds:.07,gainScale:.8}),"Bongos 1":()=>this.playTone({type:"sine",frequency:150,durationSeconds:.2}),"Bongos 2":()=>this.playTone({type:"sine",frequency:200,durationSeconds:.2}),Clap:()=>this.playClap(),"Cowbell 1":()=>this.playTone({type:"square",frequency:800,durationSeconds:.15,bandpass:{frequency:1e3,q:10}}),"Cowbell 2":()=>this.playTone({type:"triangle",frequency:900,durationSeconds:.15,bandpass:{frequency:1100,q:8}}),Digital:()=>this.playTone({type:"square",frequency:1200,durationSeconds:.08})}}playTone(t){if(!this.audioContext)return;this.resumeAudioContext();const e=this.audioContext.currentTime,s=this.audioContext.createOscillator();s.type=t.type,s.frequency.setValueAtTime(t.frequency,e);let i=s;if(t.bandpass){const l=this.audioContext.createBiquadFilter();l.type="bandpass",l.frequency.setValueAtTime(t.bandpass.frequency,e),l.Q.setValueAtTime(t.bandpass.q,e),s.connect(l),i=l}const n=this.audioContext.createGain(),a=this.getSafeGain(this.volume*(t.gainScale??1));n.gain.setValueAtTime(a,e),n.gain.exponentialRampToValueAtTime(Math.max(a*.001,g),e+t.durationSeconds),i.connect(n),n.connect(this.audioContext.destination),s.start(e),s.stop(e+t.durationSeconds)}playClap(){if(!this.audioContext)return;this.resumeAudioContext();const t=.02,e=this.getSafeGain(this.volume),s=i=>{if(!this.audioContext)return;const n=this.audioContext.currentTime+i,a=Math.floor(this.audioContext.sampleRate*t),l=this.audioContext.createBuffer(1,a,this.audioContext.sampleRate),h=l.getChannelData(0);for(let d=0;d<a;d+=1)h[d]=Math.random()*2-1;const u=this.audioContext.createBufferSource();u.buffer=l;const c=this.audioContext.createGain();c.gain.setValueAtTime(e,n),c.gain.exponentialRampToValueAtTime(Math.max(e*.01,g),n+t),u.connect(c),c.connect(this.audioContext.destination),u.start(n),u.stop(n+t)};s(0),s(.03)}playSubdivisionSound(){this.playTone({type:"sine",frequency:600,durationSeconds:.1,gainScale:.5})}async resumeAudioContext(){if(!(!this.audioContext||this.audioContext.state!=="suspended"))try{await this.audioContext.resume()}catch{}}getSafeGain(t){return t>0?t:g}bindEvents(){this.listen(window,"resize",this.handleResize),this.listen(this.elements.tapTempo,"click",()=>this.handleTapTempo()),this.listen(this.elements.bpmSelect,"change",()=>{const t=Number(this.elements.bpmSelect.value);Number.isFinite(t)&&this.setBpm(t)}),this.listen(this.elements.bpmPlus,"click",()=>this.setBpm(this.bpm+1)),this.listen(this.elements.bpmMinus,"click",()=>this.setBpm(this.bpm-1)),this.listen(this.elements.startStop,"click",()=>this.togglePlayback()),this.listen(this.elements.soundSelect,"change",()=>{this.currentSound=this.elements.soundSelect.value}),this.listen(this.elements.volumeSlider,"input",()=>{this.volume=p(Number(this.elements.volumeSlider.value),0,1)}),this.listen(this.elements.ballSizeIncrease,"click",()=>this.setBallRadius(this.ballRadius+2)),this.listen(this.elements.ballSizeDecrease,"click",()=>this.setBallRadius(this.ballRadius-2)),this.listen(this.elements.flashToggle,"click",()=>{this.canvasFlashEnabled=!this.canvasFlashEnabled,this.elements.flashToggle.textContent=this.canvasFlashEnabled?"On":"Off",this.draw()}),this.listen(this.elements.pathHeightIncrease,"click",()=>this.setPathHeight(this.amplitude+10)),this.listen(this.elements.pathHeightDecrease,"click",()=>this.setPathHeight(this.amplitude-10)),this.listen(this.elements.togglePath,"click",()=>{this.showPath=!this.showPath,this.elements.togglePath.textContent=this.showPath?"Hide Path":"Show Path",this.draw()}),this.listen(this.elements.leftBarColor,"input",()=>{this.leftBar.primary=this.elements.leftBarColor.value,this.leftBar.highlight=this.lightenColor(this.leftBar.primary,50),this.draw()}),this.listen(this.elements.rightBarColor,"input",()=>{this.rightBar.primary=this.elements.rightBarColor.value,this.rightBar.highlight=this.lightenColor(this.rightBar.primary,50),this.draw()}),this.elements.microbeatButtons.forEach(t=>{this.listen(t,"click",()=>{const e=Number(t.dataset.value);Number.isFinite(e)&&this.setMicrobeats(e)})})}listen(t,e,s){t.addEventListener(e,s),this.cleanupFns.push(()=>{t.removeEventListener(e,s)})}handleResize=()=>{this.updateCanvasSize(),this.recalculateBoundaries(!0),this.updateSpeed(),this.draw()};updateCanvasSize(){const t=Math.max(1,this.elements.canvasContainer.clientWidth),e=Math.max(1,this.elements.canvasContainer.clientHeight);this.elements.canvas.width=t,this.elements.canvas.height=e}recalculateBoundaries(t){const e=this.rightBoundary-this.leftBoundary,s=t&&e>0?p((this.ball.x-this.leftBoundary)/e,0,1):0;this.leftBoundary=m+this.ballRadius;const i=this.elements.canvas.width-m-this.ballRadius;this.rightBoundary=Math.max(this.leftBoundary,i);const n=this.rightBoundary-this.leftBoundary,a=t?s:0;this.ball.x=this.leftBoundary+n*a,this.ball.radius=this.ballRadius,this.lastSegmentIndex=this.computeSegmentIndex(this.ball.x)}setBpm(t){this.bpm=Math.max(w,Math.round(t)),this.beatInterval=6e4/this.bpm,this.updateSpeed(),this.syncBpmSelect()}updateSpeed(){const t=this.rightBoundary-this.leftBoundary;this.ball.speed=t>0?t/this.beatInterval:0}setBallRadius(t){this.ballRadius=Math.max(C,Math.round(t)),this.recalculateBoundaries(!0),this.updateSpeed(),this.draw()}setPathHeight(t){this.amplitude=Math.max(0,Math.round(t)),this.draw()}setMicrobeats(t){this.microbeats=b(t,y,P),this.lastSegmentIndex=this.computeSegmentIndex(this.ball.x),this.updateMicrobeatButtons(),this.draw()}updateMicrobeatButtons(){this.elements.microbeatButtons.forEach(t=>{const e=Number(t.dataset.value),s=Number.isFinite(e)&&e<=this.microbeats;t.classList.toggle("selected",s)})}handleTapTempo(){const t=Date.now();if(this.tapTimes.length>0&&t-this.tapTimes[this.tapTimes.length-1]>A&&(this.tapTimes=[]),this.tapTimes.push(t),this.tapTimes.length>I&&this.tapTimes.shift(),this.tapTimes.length<2)return;const e=[];for(let i=1;i<this.tapTimes.length;i+=1)e.push(this.tapTimes[i]-this.tapTimes[i-1]);const s=e.reduce((i,n)=>i+n,0)/e.length;s>0&&this.setBpm(6e4/s)}togglePlayback(){if(this.isPlaying){this.stopPlayback();return}this.startPlayback()}startPlayback(){this.isPlaying=!0,this.lastTimestamp=null,this.elements.startStop.textContent="Stop",this.resumeAudioContext(),this.rafHandle===null&&(this.rafHandle=requestAnimationFrame(this.animate))}stopPlayback(){this.isPlaying=!1,this.elements.startStop.textContent="Start",this.lastTimestamp=null,this.rafHandle!==null&&(cancelAnimationFrame(this.rafHandle),this.rafHandle=null)}animate=t=>{if(!this.isPlaying||this.destroyed){this.rafHandle=null;return}this.lastTimestamp===null&&(this.lastTimestamp=t);const e=t-this.lastTimestamp;if(this.lastTimestamp=t,this.ball.x+=this.ball.speed*this.ball.direction*e,this.microbeats>1){const s=this.computeSegmentIndex(this.ball.x);s!==this.lastSegmentIndex&&s>0&&s<this.microbeats-1&&this.playSubdivisionSound(),this.lastSegmentIndex=s}this.ball.x>=this.rightBoundary?(this.ball.x=this.rightBoundary,this.ball.direction=-1,this.triggerBeat("right")):this.ball.x<=this.leftBoundary&&(this.ball.x=this.leftBoundary,this.ball.direction=1,this.triggerBeat("left")),this.draw(),this.rafHandle=requestAnimationFrame(this.animate)};triggerBeat(t){this.playClick();const e=t==="left"?this.leftBar:this.rightBar;e.highlighted=!0,this.canvasFlashEnabled&&(this.flashColor=e.highlight,this.scheduleTimeout(()=>{this.flashColor=null},x)),this.scheduleTimeout(()=>{e.highlighted=!1},x)}scheduleTimeout(t,e){const s=window.setTimeout(()=>{this.timeoutIds.delete(s),t()},e);this.timeoutIds.add(s)}clearScheduledTimeouts(){this.timeoutIds.forEach(t=>clearTimeout(t)),this.timeoutIds.clear()}playClick(){const t=this.soundGenerators[this.currentSound];t&&t()}draw(){const{canvas:t}=this.elements;this.ctx.clearRect(0,0,t.width,t.height),this.ctx.fillStyle=this.canvasFlashEnabled&&this.flashColor?this.flashColor:"#121212",this.ctx.fillRect(0,0,t.width,t.height),this.drawBars(),this.showPath&&this.drawPath(),this.drawBall()}drawBars(){this.ctx.fillStyle=this.leftBar.highlighted?this.leftBar.highlight:this.leftBar.primary,this.ctx.fillRect(0,0,m,this.elements.canvas.height),this.ctx.fillStyle=this.rightBar.highlighted?this.rightBar.highlight:this.rightBar.primary,this.ctx.fillRect(this.elements.canvas.width-m,0,m,this.elements.canvas.height)}drawPath(){const t=this.rightBoundary-this.leftBoundary;if(t<=0)return;this.ctx.save(),this.ctx.setLineDash([5,5]),this.ctx.strokeStyle="grey",this.ctx.lineWidth=2,this.ctx.beginPath();const e=20;for(let s=0;s<this.microbeats;s+=1){const i=this.leftBoundary+s*t/this.microbeats,n=this.leftBoundary+(s+1)*t/this.microbeats;for(let a=0;a<=e;a+=1){const l=a/e,h=i+l*(n-i),u=this.amplitude*(1-Math.pow(2*l-1,2)),c=this.elements.canvas.height/2-u;s===0&&a===0?this.ctx.moveTo(h,c):this.ctx.lineTo(h,c)}}this.ctx.stroke(),this.ctx.restore()}drawBall(){const t=this.rightBoundary-this.leftBoundary,e=this.computeBallY(t),s=(this.leftBoundary+this.rightBoundary)/2;let i=0;t>0&&(this.ball.x>=s?i=(this.ball.x-s)/(this.rightBoundary-s||1)*Math.PI:i=-((s-this.ball.x)/(s-this.leftBoundary||1))*Math.PI),this.faceAngle+=(i-this.faceAngle)*.1,this.ctx.save(),this.ctx.translate(this.ball.x,e),this.ctx.rotate(this.faceAngle),this.ctx.beginPath(),this.ctx.arc(0,0,this.ball.radius,0,Math.PI*2),this.ctx.fillStyle="#76FF03",this.ctx.fill(),this.ctx.closePath();const n=this.ball.radius*.4,a=-this.ball.radius*.3,l=this.ball.radius*.15;this.ctx.fillStyle="#000000",this.ctx.beginPath(),this.ctx.arc(-n,a,l,0,Math.PI*2),this.ctx.fill(),this.ctx.closePath(),this.ctx.beginPath(),this.ctx.arc(n,a,l,0,Math.PI*2),this.ctx.fill(),this.ctx.closePath(),this.ctx.beginPath(),this.ctx.arc(0,0,this.ball.radius*.6,.2*Math.PI,.8*Math.PI),this.ctx.strokeStyle="#000000",this.ctx.lineWidth=2,this.ctx.stroke(),this.ctx.closePath(),this.ctx.restore()}computeBallY(t){if(t<=0)return this.elements.canvas.height/2;if(this.microbeats===1){const l=this.ball.x-this.leftBoundary,h=this.amplitude*(1-Math.pow(2*l/t-1,2));return this.elements.canvas.height/2-h}const e=t/this.microbeats;if(e<=0)return this.elements.canvas.height/2;let s=Math.floor((this.ball.x-this.leftBoundary)/e);s=b(s,0,this.microbeats-1);const n=(this.ball.x-this.leftBoundary-s*e)/e,a=this.amplitude*(1-Math.pow(2*n-1,2));return this.elements.canvas.height/2-a}computeSegmentIndex(t){const e=this.rightBoundary-this.leftBoundary;if(e<=0||this.microbeats<=1)return 0;const s=e/this.microbeats;if(s<=0)return 0;const i=Math.floor((t-this.leftBoundary)/s);return b(i,0,this.microbeats-1)}lightenColor(t,e){const s=t.replace(/^#/,""),i=Number.parseInt(s,16),n=i>>16&255,a=i>>8&255,l=i&255,h=p(e,0,100)/100,u=Math.min(255,Math.floor(n+(255-n)*h)),c=Math.min(255,Math.floor(a+(255-a)*h)),d=Math.min(255,Math.floor(l+(255-l)*h));return`#${((1<<24)+(u<<16)+(c<<8)+d).toString(16).slice(1)}`}}function H(r){const t=new F(r);return{destroy:()=>t.destroy()}}const B=document.getElementById("app");B&&H(B);
