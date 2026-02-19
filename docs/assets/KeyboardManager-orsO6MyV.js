import{E as k,C as f,A as r,a as o,s as u,D as M,n,b as d}from"./diatonic-compass-DCHYgOcX.js";import"./modulepreload-polyfill-B5Qt9EMX.js";import"./index-DVcuFY1-.js";class w{static isEnabled=!0;static keyMap=new Map;static activeRing="pitch";static navigationMode="normal";static setActiveRing(t){this.activeRing=t}static init(){try{this.setupKeyMap(),this.bindEvents(),this.initFocusManagement()}catch(t){k.handle(t,f.ERROR_HANDLING.CONTEXTS.UI)}}static setupKeyMap(){this.keyMap.set("ArrowLeft",{action:"rotatePitchClass",direction:-1,description:"Rotate pitch ring left"}),this.keyMap.set("ArrowRight",{action:"rotatePitchClass",direction:1,description:"Rotate pitch ring right"}),this.keyMap.set("ArrowUp",{action:"rotateDegree",direction:1,description:"Rotate degree ring up"}),this.keyMap.set("ArrowDown",{action:"rotateDegree",direction:-1,description:"Rotate degree ring down"}),this.keyMap.set("Shift+ArrowLeft",{action:"rotateChromatic",direction:-1,description:"Rotate chromatic ring left"}),this.keyMap.set("Shift+ArrowRight",{action:"rotateChromatic",direction:1,description:"Rotate chromatic ring right"}),this.keyMap.set("Shift+ArrowUp",{action:"rotateChromatic",direction:1,description:"Rotate chromatic ring up"}),this.keyMap.set("Shift+ArrowDown",{action:"rotateChromatic",direction:-1,description:"Rotate chromatic ring down"}),this.keyMap.set("Ctrl+ArrowLeft",{action:"rotatePitchClass",direction:-3,description:"Rotate pitch ring left (large step)"}),this.keyMap.set("Ctrl+ArrowRight",{action:"rotatePitchClass",direction:3,description:"Rotate pitch ring right (large step)"}),this.keyMap.set("Ctrl+ArrowUp",{action:"rotateDegree",direction:3,description:"Rotate degree ring up (large step)"}),this.keyMap.set("Ctrl+ArrowDown",{action:"rotateDegree",direction:-3,description:"Rotate degree ring down (large step)"}),this.keyMap.set(" ",{action:"togglePlayback",description:"Play/pause scale (Space)"}),this.keyMap.set("Enter",{action:"togglePlayback",description:"Play/pause scale"}),this.keyMap.set("Escape",{action:"closeSidebar",description:"Close sidebar"}),this.keyMap.set("F1",{action:"toggleSidebar",description:"Open/close settings"}),this.keyMap.set("v",{action:"toggleOrientation",description:"Toggle vertical/horizontal layout"}),this.keyMap.set("V",{action:"toggleOrientation",description:"Toggle vertical/horizontal layout"}),this.keyMap.set("d",{action:"toggleDarkMode",description:"Toggle dark mode"}),this.keyMap.set("h",{action:"toggleHelp",description:"Show/hide keyboard shortcuts"}),this.keyMap.set("f",{action:"toggleFlat",description:"Toggle flat note names"}),this.keyMap.set("F",{action:"toggleFlat",description:"Toggle flat note names"}),this.keyMap.set("s",{action:"toggleSharp",description:"Toggle sharp note names"}),this.keyMap.set("S",{action:"toggleSharp",description:"Toggle sharp note names"}),this.keyMap.set("r",{action:"resetRings",description:"Reset all rings to starting position"}),this.keyMap.set("Home",{action:"resetRings",description:"Reset all rings to starting position"}),this.keyMap.set("Shift+f",{action:"toggleFineMode",description:"Toggle fine control mode"});for(let t=1;t<=12;t++)this.keyMap.set(t.toString(),{action:"selectNote",noteIndex:t-1,description:`Select note ${t}`})}static bindEvents(){document.addEventListener("keydown",this.handleKeyDown.bind(this)),document.addEventListener("keyup",this.handleKeyUp.bind(this)),document.addEventListener("keydown",t=>{this.shouldPreventDefault(t)&&t.preventDefault()},{capture:!0})}static initFocusManagement(){this.setupFocusIndicators()}static setupFocusIndicators(){const t=document.createElement("style");t.textContent=`
      .keyboard-help-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--color-surface);
        color: var(--color-text-primary);
        padding: 2rem;
        border-radius: var(--radius-medium);
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 3000;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        border: 2px solid #33c6dc;
      }

      .keyboard-help-overlay h2 {
        margin-top: 0;
        color: #33c6dc;
      }

      .keyboard-help-shortcuts {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.5rem 1rem;
        margin: 1rem 0;
      }

      .keyboard-help-key {
        background: #f0f0f0;
        color: #333;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-family: monospace;
        font-weight: bold;
        text-align: center;
        min-width: 3rem;
      }

      .keyboard-help-description {
        padding: 0.25rem 0;
      }

      .keyboard-help-close {
        background: #33c6dc;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
      }
    `,document.head.appendChild(t)}static handleKeyDown(t){try{if(!this.isEnabled||this.isTextInputActive())return;const i=this.getKeyString(t),e=this.keyMap.get(i);e&&this.executeCommand(e,t)}catch(i){console.error("Error in handleKeyDown:",i),k.handle(i,f.ERROR_HANDLING.CONTEXTS.UI)}}static handleKeyUp(t){}static getKeyString(t){const i=[];return t.ctrlKey&&i.push("Ctrl"),t.shiftKey&&i.push("Shift"),t.altKey&&i.push("Alt"),t.metaKey&&i.push("Meta"),i.push(t.key),i.join("+")}static isTextInputActive(){const t=document.activeElement;return["INPUT","TEXTAREA","SELECT"].includes(t?.tagName??"")||t?.contentEditable==="true"}static shouldPreventDefault(t){if(this.isTextInputActive())return!1;const i=this.getKeyString(t);return!!this.keyMap.get(i)&&!["Escape"].includes(t.key)}static executeCommand(t,i){const e=this.navigationMode==="fine"?.5:1,a=t.direction??0;switch(t.action){case"rotatePitchClass":this.setActiveRing("pitch"),this.rotateRingAndSnap("pitchClass",a*e),this.announceRingPosition("pitch");break;case"rotateDegree":this.setActiveRing("degree"),this.rotateRingAndSnap("degree",a*e),this.announceRingPosition("degree");break;case"rotateChromatic":this.setActiveRing("chromatic"),this.rotateAllRingsAndSnap(a*e),this.announceRingPosition("chromatic");break;case"selectNote":typeof t.noteIndex=="number"&&this.selectNoteDirectly(t.noteIndex);break;case"togglePlayback":r.togglePlayback(),this.announcePlaybackState();break;case"toggleSidebar":r.toggleSidebar(),this.announceSidebarState();break;case"closeSidebar":r.toggleSidebar(!1),this.announce("Settings closed");break;case"toggleDarkMode":r.toggleDarkMode(),this.announce(o.ui.darkMode?"Dark mode enabled":"Light mode enabled");break;case"toggleOrientation":const s=o.belts.orientation==="horizontal"?"vertical":"horizontal";r.setOrientation(s),this.announce(`Layout changed to ${s}`);break;case"toggleFlat":r.toggleAccidental("flat"),this.announce(o.display.flat?"Flat names enabled":"Flat names disabled");break;case"toggleSharp":r.toggleAccidental("sharp"),this.announce(o.display.sharp?"Sharp names enabled":"Sharp names disabled");break;case"resetRings":r.resetRings(),this.announce("All rings reset to starting position");break;case"toggleFineMode":this.navigationMode=this.navigationMode==="fine"?"normal":"fine",this.announce(`Fine control mode ${this.navigationMode==="fine"?"enabled":"disabled"}`);break;case"toggleHelp":this.toggleKeyboardHelp();break}}static rotateRingAndSnap(t,i){if(t==="degree")this.rotateDegreeRingDiatonically(i);else if(t==="pitchClass"){const e=i*(Math.PI*2/12),a=o.rings.pitchClass,s=n(a+e),l=Math.round(-s/d),c=n(-l*d);u({pitchClass:c})}}static rotateDegreeRingDiatonically(t){const{degree:i,chromatic:e}=o.rings,a=n(i-e),s=n(-a)/d;let l=0,c=1/0;M.forEach((S,R)=>{const m=Math.abs(s-S),b=Math.min(m,12-m);b<c&&(c=b,l=R)});const h=t>0?1:-1,g=(l+h+7)%7,p=M[g],v=n(-p*d),y=n(v+e);u({degree:y,highlightPosition:y})}static rotateAllRingsAndSnap(t){const i=t*(Math.PI*2/12),e=n(o.rings.pitchClass+i),a=n(o.rings.degree+i),s=n(o.rings.chromatic+i),l=Math.round(-s/d),c=n(-l*d),h=c-s,g=n(e+h),p=n(a+h);u({pitchClass:g,degree:p,chromatic:c,highlightPosition:p})}static selectNoteDirectly(t){const i=n(-t*(Math.PI*2/12));r.setRingAngle("chromatic",i),this.announce(`Selected note ${t+1}`)}static toggleKeyboardHelp(){let t=document.querySelector(".keyboard-help-overlay");if(t){t.remove(),this.announce("Keyboard help closed");return}t=document.createElement("div"),t.className="keyboard-help-overlay",t.innerHTML=this.generateHelpContent();const i=()=>{t.remove(),this.announce("Keyboard help closed")},e=t.querySelector(".keyboard-help-close");e&&e.addEventListener("click",i),document.addEventListener("keydown",a=>{a.key==="Escape"&&document.querySelector(".keyboard-help-overlay")&&i()},{once:!0}),document.body.appendChild(t),e?.focus(),this.announce("Keyboard help opened")}static generateHelpContent(){return`
      <h2>Keyboard Shortcuts</h2>
      <div class="keyboard-help-shortcuts">
        ${Array.from(this.keyMap.entries()).filter(([e,a])=>a.description).sort(([e],[a])=>e.localeCompare(a)).map(([e,a])=>`<div class="keyboard-help-key">${e}</div>
       <div class="keyboard-help-description">${a.description}</div>`).join("")}
      </div>
      <button class="keyboard-help-close">Close (Esc)</button>
    `}static announceRingPosition(t){const i=t==="pitch"?"pitchClass":t,e=Math.round((o.rings[i]||0)*180/Math.PI);this.announce(`${t} ring at ${e} degrees`)}static announcePlaybackState(){const t=o.playback.isPlaying?"Scale playing":"Playback stopped";this.announce(t)}static announceSidebarState(){const t=o.ui.sidebarOpen?"Settings opened":"Settings closed";this.announce(t)}static announce(t,i="polite"){const e=document.createElement("div");e.setAttribute("aria-live",i),e.setAttribute("aria-atomic","true"),e.className="sr-only",e.textContent=t,e.style.position="absolute",e.style.left="-10000px",e.style.width="1px",e.style.height="1px",e.style.overflow="hidden",document.body.appendChild(e),setTimeout(()=>{e.parentNode&&e.parentNode.removeChild(e)},1e3)}static enable(){this.isEnabled=!0,this.announce("Keyboard navigation enabled")}static disable(){this.isEnabled=!1,this.announce("Keyboard navigation disabled")}static getShortcuts(){return Array.from(this.keyMap.entries()).map(([t,i])=>({key:t,description:i.description,action:i.action}))}}export{w as KeyboardManager};
