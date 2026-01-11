import{E as k,C as f,A as r,a,s as u,D as v,n,b as d}from"./diatonic-compass-bGFatcpz.js";import"./modulepreload-polyfill-B5Qt9EMX.js";class D{static isEnabled=!0;static keyMap=new Map;static activeRing="pitch";static navigationMode="normal";static setActiveRing(e){this.activeRing=e}static init(){try{this.setupKeyMap(),this.bindEvents(),this.initFocusManagement(),console.log("Keyboard navigation initialized")}catch(e){k.handle(e,f.ERROR_HANDLING.CONTEXTS.UI)}}static setupKeyMap(){this.keyMap.set("ArrowLeft",{action:"rotatePitchClass",direction:-1,description:"Rotate pitch ring left"}),this.keyMap.set("ArrowRight",{action:"rotatePitchClass",direction:1,description:"Rotate pitch ring right"}),this.keyMap.set("ArrowUp",{action:"rotateDegree",direction:1,description:"Rotate degree ring up"}),this.keyMap.set("ArrowDown",{action:"rotateDegree",direction:-1,description:"Rotate degree ring down"}),this.keyMap.set("Shift+ArrowLeft",{action:"rotateChromatic",direction:-1,description:"Rotate chromatic ring left"}),this.keyMap.set("Shift+ArrowRight",{action:"rotateChromatic",direction:1,description:"Rotate chromatic ring right"}),this.keyMap.set("Shift+ArrowUp",{action:"rotateChromatic",direction:1,description:"Rotate chromatic ring up"}),this.keyMap.set("Shift+ArrowDown",{action:"rotateChromatic",direction:-1,description:"Rotate chromatic ring down"}),this.keyMap.set("Ctrl+ArrowLeft",{action:"rotatePitchClass",direction:-3,description:"Rotate pitch ring left (large step)"}),this.keyMap.set("Ctrl+ArrowRight",{action:"rotatePitchClass",direction:3,description:"Rotate pitch ring right (large step)"}),this.keyMap.set("Ctrl+ArrowUp",{action:"rotateDegree",direction:3,description:"Rotate degree ring up (large step)"}),this.keyMap.set("Ctrl+ArrowDown",{action:"rotateDegree",direction:-3,description:"Rotate degree ring down (large step)"}),this.keyMap.set(" ",{action:"togglePlayback",description:"Play/pause scale (Space)"}),this.keyMap.set("Enter",{action:"togglePlayback",description:"Play/pause scale"}),this.keyMap.set("Escape",{action:"closeSidebar",description:"Close sidebar"}),this.keyMap.set("F1",{action:"toggleSidebar",description:"Open/close settings"}),this.keyMap.set("v",{action:"toggleOrientation",description:"Toggle vertical/horizontal layout"}),this.keyMap.set("V",{action:"toggleOrientation",description:"Toggle vertical/horizontal layout"}),this.keyMap.set("d",{action:"toggleDarkMode",description:"Toggle dark mode"}),this.keyMap.set("h",{action:"toggleHelp",description:"Show/hide keyboard shortcuts"}),this.keyMap.set("f",{action:"toggleFlat",description:"Toggle flat note names"}),this.keyMap.set("F",{action:"toggleFlat",description:"Toggle flat note names"}),this.keyMap.set("s",{action:"toggleSharp",description:"Toggle sharp note names"}),this.keyMap.set("S",{action:"toggleSharp",description:"Toggle sharp note names"}),this.keyMap.set("r",{action:"resetRings",description:"Reset all rings to starting position"}),this.keyMap.set("Home",{action:"resetRings",description:"Reset all rings to starting position"}),this.keyMap.set("Shift+f",{action:"toggleFineMode",description:"Toggle fine control mode"});for(let e=1;e<=12;e++)this.keyMap.set(e.toString(),{action:"selectNote",noteIndex:e-1,description:`Select note ${e}`})}static bindEvents(){document.addEventListener("keydown",this.handleKeyDown.bind(this)),document.addEventListener("keyup",this.handleKeyUp.bind(this)),document.addEventListener("keydown",e=>{this.shouldPreventDefault(e)&&e.preventDefault()},{capture:!0})}static initFocusManagement(){this.setupFocusIndicators()}static setupFocusIndicators(){const e=document.createElement("style");e.textContent=`
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
    `,document.head.appendChild(e)}static handleKeyDown(e){try{if(console.log("=== KeyboardManager.handleKeyDown ==="),console.log("Key pressed:",e.key),console.log("isEnabled:",this.isEnabled),!this.isEnabled){console.log("Keyboard manager disabled, returning");return}const i=this.isTextInputActive();if(console.log("isTextInputActive:",i),i){console.log("Text input active, returning");return}const t=this.getKeyString(e);console.log("Key string with modifiers:",t);const o=this.keyMap.get(t);console.log("Command found:",o),o?(console.log("Executing command:",o.action),this.executeCommand(o,e)):console.log("No command mapped for key:",t)}catch(i){console.error("Error in handleKeyDown:",i),k.handle(i,f.ERROR_HANDLING.CONTEXTS.UI)}}static handleKeyUp(e){}static getKeyString(e){const i=[];return e.ctrlKey&&i.push("Ctrl"),e.shiftKey&&i.push("Shift"),e.altKey&&i.push("Alt"),e.metaKey&&i.push("Meta"),i.push(e.key),i.join("+")}static isTextInputActive(){const e=document.activeElement;return["INPUT","TEXTAREA","SELECT"].includes(e?.tagName??"")||e?.contentEditable==="true"}static shouldPreventDefault(e){if(console.log("=== shouldPreventDefault ==="),console.log("Key:",e.key),this.isTextInputActive())return console.log("Text input active, not preventing default"),!1;const i=this.getKeyString(e),t=this.keyMap.get(i),o=!!t&&!["Escape"].includes(e.key);return console.log("Command found:",!!t),console.log("Should prevent default:",o),o}static executeCommand(e,i){const t=this.navigationMode==="fine"?.5:1,o=e.direction??0;switch(e.action){case"rotatePitchClass":this.setActiveRing("pitch"),this.rotateRingAndSnap("pitchClass",o*t),this.announceRingPosition("pitch");break;case"rotateDegree":this.setActiveRing("degree"),this.rotateRingAndSnap("degree",o*t),this.announceRingPosition("degree");break;case"rotateChromatic":this.setActiveRing("chromatic"),this.rotateAllRingsAndSnap(o*t),this.announceRingPosition("chromatic");break;case"selectNote":typeof e.noteIndex=="number"&&this.selectNoteDirectly(e.noteIndex);break;case"togglePlayback":r.togglePlayback(),this.announcePlaybackState();break;case"toggleSidebar":r.toggleSidebar(),this.announceSidebarState();break;case"closeSidebar":r.toggleSidebar(!1),this.announce("Settings closed");break;case"toggleDarkMode":r.toggleDarkMode(),this.announce(a.ui.darkMode?"Dark mode enabled":"Light mode enabled");break;case"toggleOrientation":const s=a.belts.orientation==="horizontal"?"vertical":"horizontal";r.setOrientation(s),this.announce(`Layout changed to ${s}`);break;case"toggleFlat":r.toggleAccidental("flat"),this.announce(a.display.flat?"Flat names enabled":"Flat names disabled");break;case"toggleSharp":r.toggleAccidental("sharp"),this.announce(a.display.sharp?"Sharp names enabled":"Sharp names disabled");break;case"resetRings":r.resetRings(),this.announce("All rings reset to starting position");break;case"toggleFineMode":this.navigationMode=this.navigationMode==="fine"?"normal":"fine",this.announce(`Fine control mode ${this.navigationMode==="fine"?"enabled":"disabled"}`);break;case"toggleHelp":this.toggleKeyboardHelp();break}}static rotateRingAndSnap(e,i){if(e==="degree")this.rotateDegreeRingDiatonically(i);else if(e==="pitchClass"){const t=i*(Math.PI*2/12),o=a.rings.pitchClass,s=n(o+t),l=Math.round(-s/d),c=n(-l*d);u({pitchClass:c})}}static rotateDegreeRingDiatonically(e){const{degree:i,chromatic:t}=a.rings,o=n(i-t),s=n(-o)/d;let l=0,c=1/0;v.forEach((S,A)=>{const m=Math.abs(s-S),b=Math.min(m,12-m);b<c&&(c=b,l=A)});const g=e>0?1:-1,p=(l+g+7)%7,h=v[p],M=n(-h*d),y=n(M+t);u({degree:y,highlightPosition:y})}static rotateAllRingsAndSnap(e){const i=e*(Math.PI*2/12),t=n(a.rings.pitchClass+i),o=n(a.rings.degree+i),s=n(a.rings.chromatic+i),l=Math.round(-s/d),c=n(-l*d),g=c-s,p=n(t+g),h=n(o+g);u({pitchClass:p,degree:h,chromatic:c,highlightPosition:h})}static selectNoteDirectly(e){const i=n(-e*(Math.PI*2/12));r.setRingAngle("chromatic",i),this.announce(`Selected note ${e+1}`)}static toggleKeyboardHelp(){let e=document.querySelector(".keyboard-help-overlay");if(e){e.remove(),this.announce("Keyboard help closed");return}e=document.createElement("div"),e.className="keyboard-help-overlay",e.innerHTML=this.generateHelpContent();const i=()=>{e.remove(),this.announce("Keyboard help closed")},t=e.querySelector(".keyboard-help-close");t&&t.addEventListener("click",i),document.addEventListener("keydown",o=>{o.key==="Escape"&&document.querySelector(".keyboard-help-overlay")&&i()},{once:!0}),document.body.appendChild(e),t?.focus(),this.announce("Keyboard help opened")}static generateHelpContent(){return`
      <h2>Keyboard Shortcuts</h2>
      <div class="keyboard-help-shortcuts">
        ${Array.from(this.keyMap.entries()).filter(([t,o])=>o.description).sort(([t],[o])=>t.localeCompare(o)).map(([t,o])=>`<div class="keyboard-help-key">${t}</div>
       <div class="keyboard-help-description">${o.description}</div>`).join("")}
      </div>
      <button class="keyboard-help-close">Close (Esc)</button>
    `}static announceRingPosition(e){const i=e==="pitch"?"pitchClass":e,t=Math.round((a.rings[i]||0)*180/Math.PI);this.announce(`${e} ring at ${t} degrees`)}static announcePlaybackState(){const e=a.playback.isPlaying?"Scale playing":"Playback stopped";this.announce(e)}static announceSidebarState(){const e=a.ui.sidebarOpen?"Settings opened":"Settings closed";this.announce(e)}static announce(e,i="polite"){const t=document.createElement("div");t.setAttribute("aria-live",i),t.setAttribute("aria-atomic","true"),t.className="sr-only",t.textContent=e,t.style.position="absolute",t.style.left="-10000px",t.style.width="1px",t.style.height="1px",t.style.overflow="hidden",document.body.appendChild(t),setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},1e3)}static enable(){this.isEnabled=!0,this.announce("Keyboard navigation enabled")}static disable(){this.isEnabled=!1,this.announce("Keyboard navigation disabled")}static getShortcuts(){return Array.from(this.keyMap.entries()).map(([e,i])=>({key:e,description:i.description,action:i.action}))}}export{D as KeyboardManager};
