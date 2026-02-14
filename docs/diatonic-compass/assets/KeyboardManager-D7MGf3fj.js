var w=Object.defineProperty;var E=(l,t,e)=>t in l?w(l,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):l[t]=e;var p=(l,t,e)=>E(l,typeof t!="symbol"?t+"":t,e);import{E as v,C as S,A as r,a as o,s as b,D as R,n,b as h}from"./index-i4fIpNwx.js";class y{static setActiveRing(t){this.activeRing=t}static init(){try{this.setupKeyMap(),this.bindEvents(),this.initFocusManagement()}catch(t){v.handle(t,S.ERROR_HANDLING.CONTEXTS.UI)}}static setupKeyMap(){this.keyMap.set("ArrowLeft",{action:"rotatePitchClass",direction:-1,description:"Rotate pitch ring left"}),this.keyMap.set("ArrowRight",{action:"rotatePitchClass",direction:1,description:"Rotate pitch ring right"}),this.keyMap.set("ArrowUp",{action:"rotateDegree",direction:1,description:"Rotate degree ring up"}),this.keyMap.set("ArrowDown",{action:"rotateDegree",direction:-1,description:"Rotate degree ring down"}),this.keyMap.set("Shift+ArrowLeft",{action:"rotateChromatic",direction:-1,description:"Rotate chromatic ring left"}),this.keyMap.set("Shift+ArrowRight",{action:"rotateChromatic",direction:1,description:"Rotate chromatic ring right"}),this.keyMap.set("Shift+ArrowUp",{action:"rotateChromatic",direction:1,description:"Rotate chromatic ring up"}),this.keyMap.set("Shift+ArrowDown",{action:"rotateChromatic",direction:-1,description:"Rotate chromatic ring down"}),this.keyMap.set("Ctrl+ArrowLeft",{action:"rotatePitchClass",direction:-3,description:"Rotate pitch ring left (large step)"}),this.keyMap.set("Ctrl+ArrowRight",{action:"rotatePitchClass",direction:3,description:"Rotate pitch ring right (large step)"}),this.keyMap.set("Ctrl+ArrowUp",{action:"rotateDegree",direction:3,description:"Rotate degree ring up (large step)"}),this.keyMap.set("Ctrl+ArrowDown",{action:"rotateDegree",direction:-3,description:"Rotate degree ring down (large step)"}),this.keyMap.set(" ",{action:"togglePlayback",description:"Play/pause scale (Space)"}),this.keyMap.set("Enter",{action:"togglePlayback",description:"Play/pause scale"}),this.keyMap.set("Escape",{action:"closeSidebar",description:"Close sidebar"}),this.keyMap.set("F1",{action:"toggleSidebar",description:"Open/close settings"}),this.keyMap.set("v",{action:"toggleOrientation",description:"Toggle vertical/horizontal layout"}),this.keyMap.set("V",{action:"toggleOrientation",description:"Toggle vertical/horizontal layout"}),this.keyMap.set("d",{action:"toggleDarkMode",description:"Toggle dark mode"}),this.keyMap.set("h",{action:"toggleHelp",description:"Show/hide keyboard shortcuts"}),this.keyMap.set("f",{action:"toggleFlat",description:"Toggle flat note names"}),this.keyMap.set("F",{action:"toggleFlat",description:"Toggle flat note names"}),this.keyMap.set("s",{action:"toggleSharp",description:"Toggle sharp note names"}),this.keyMap.set("S",{action:"toggleSharp",description:"Toggle sharp note names"}),this.keyMap.set("r",{action:"resetRings",description:"Reset all rings to starting position"}),this.keyMap.set("Home",{action:"resetRings",description:"Reset all rings to starting position"}),this.keyMap.set("Shift+f",{action:"toggleFineMode",description:"Toggle fine control mode"});for(let t=1;t<=12;t++)this.keyMap.set(t.toString(),{action:"selectNote",noteIndex:t-1,description:`Select note ${t}`})}static bindEvents(){document.addEventListener("keydown",this.handleKeyDown.bind(this)),document.addEventListener("keyup",this.handleKeyUp.bind(this)),document.addEventListener("keydown",t=>{this.shouldPreventDefault(t)&&t.preventDefault()},{capture:!0})}static initFocusManagement(){this.setupFocusIndicators()}static setupFocusIndicators(){const t=document.createElement("style");t.textContent=`
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
    `,document.head.appendChild(t)}static handleKeyDown(t){try{if(!this.isEnabled||this.isTextInputActive())return;const e=this.getKeyString(t),i=this.keyMap.get(e);i&&this.executeCommand(i,t)}catch(e){console.error("Error in handleKeyDown:",e),v.handle(e,S.ERROR_HANDLING.CONTEXTS.UI)}}static handleKeyUp(t){}static getKeyString(t){const e=[];return t.ctrlKey&&e.push("Ctrl"),t.shiftKey&&e.push("Shift"),t.altKey&&e.push("Alt"),t.metaKey&&e.push("Meta"),e.push(t.key),e.join("+")}static isTextInputActive(){const t=document.activeElement;return["INPUT","TEXTAREA","SELECT"].includes((t==null?void 0:t.tagName)??"")||(t==null?void 0:t.contentEditable)==="true"}static shouldPreventDefault(t){if(this.isTextInputActive())return!1;const e=this.getKeyString(t);return!!this.keyMap.get(e)&&!["Escape"].includes(t.key)}static executeCommand(t,e){const i=this.navigationMode==="fine"?.5:1,a=t.direction??0;switch(t.action){case"rotatePitchClass":this.setActiveRing("pitch"),this.rotateRingAndSnap("pitchClass",a*i),this.announceRingPosition("pitch");break;case"rotateDegree":this.setActiveRing("degree"),this.rotateRingAndSnap("degree",a*i),this.announceRingPosition("degree");break;case"rotateChromatic":this.setActiveRing("chromatic"),this.rotateAllRingsAndSnap(a*i),this.announceRingPosition("chromatic");break;case"selectNote":typeof t.noteIndex=="number"&&this.selectNoteDirectly(t.noteIndex);break;case"togglePlayback":r.togglePlayback(),this.announcePlaybackState();break;case"toggleSidebar":r.toggleSidebar(),this.announceSidebarState();break;case"closeSidebar":r.toggleSidebar(!1),this.announce("Settings closed");break;case"toggleDarkMode":r.toggleDarkMode(),this.announce(o.ui.darkMode?"Dark mode enabled":"Light mode enabled");break;case"toggleOrientation":const s=o.belts.orientation==="horizontal"?"vertical":"horizontal";r.setOrientation(s),this.announce(`Layout changed to ${s}`);break;case"toggleFlat":r.toggleAccidental("flat"),this.announce(o.display.flat?"Flat names enabled":"Flat names disabled");break;case"toggleSharp":r.toggleAccidental("sharp"),this.announce(o.display.sharp?"Sharp names enabled":"Sharp names disabled");break;case"resetRings":r.resetRings(),this.announce("All rings reset to starting position");break;case"toggleFineMode":this.navigationMode=this.navigationMode==="fine"?"normal":"fine",this.announce(`Fine control mode ${this.navigationMode==="fine"?"enabled":"disabled"}`);break;case"toggleHelp":this.toggleKeyboardHelp();break}}static rotateRingAndSnap(t,e){if(t==="degree")this.rotateDegreeRingDiatonically(e);else if(t==="pitchClass"){const i=e*(Math.PI*2/12),a=o.rings.pitchClass,s=n(a+i),d=Math.round(-s/h),c=n(-d*h);b({pitchClass:c})}}static rotateDegreeRingDiatonically(t){const{degree:e,chromatic:i}=o.rings,a=n(e-i),s=n(-a)/h;let d=0,c=1/0;R.forEach((C,D)=>{const f=Math.abs(s-C),M=Math.min(f,12-f);M<c&&(c=M,d=D)});const g=t>0?1:-1,m=(d+g+7)%7,u=R[m],A=n(-u*h),k=n(A+i);b({degree:k,highlightPosition:k})}static rotateAllRingsAndSnap(t){const e=t*(Math.PI*2/12),i=n(o.rings.pitchClass+e),a=n(o.rings.degree+e),s=n(o.rings.chromatic+e),d=Math.round(-s/h),c=n(-d*h),g=c-s,m=n(i+g),u=n(a+g);b({pitchClass:m,degree:u,chromatic:c,highlightPosition:u})}static selectNoteDirectly(t){const e=n(-t*(Math.PI*2/12));r.setRingAngle("chromatic",e),this.announce(`Selected note ${t+1}`)}static toggleKeyboardHelp(){let t=document.querySelector(".keyboard-help-overlay");if(t){t.remove(),this.announce("Keyboard help closed");return}t=document.createElement("div"),t.className="keyboard-help-overlay",t.innerHTML=this.generateHelpContent();const e=()=>{t.remove(),this.announce("Keyboard help closed")},i=t.querySelector(".keyboard-help-close");i&&i.addEventListener("click",e),document.addEventListener("keydown",a=>{a.key==="Escape"&&document.querySelector(".keyboard-help-overlay")&&e()},{once:!0}),document.body.appendChild(t),i==null||i.focus(),this.announce("Keyboard help opened")}static generateHelpContent(){return`
      <h2>Keyboard Shortcuts</h2>
      <div class="keyboard-help-shortcuts">
        ${Array.from(this.keyMap.entries()).filter(([i,a])=>a.description).sort(([i],[a])=>i.localeCompare(a)).map(([i,a])=>`<div class="keyboard-help-key">${i}</div>
       <div class="keyboard-help-description">${a.description}</div>`).join("")}
      </div>
      <button class="keyboard-help-close">Close (Esc)</button>
    `}static announceRingPosition(t){const e=t==="pitch"?"pitchClass":t,i=Math.round((o.rings[e]||0)*180/Math.PI);this.announce(`${t} ring at ${i} degrees`)}static announcePlaybackState(){const t=o.playback.isPlaying?"Scale playing":"Playback stopped";this.announce(t)}static announceSidebarState(){const t=o.ui.sidebarOpen?"Settings opened":"Settings closed";this.announce(t)}static announce(t,e="polite"){const i=document.createElement("div");i.setAttribute("aria-live",e),i.setAttribute("aria-atomic","true"),i.className="sr-only",i.textContent=t,i.style.position="absolute",i.style.left="-10000px",i.style.width="1px",i.style.height="1px",i.style.overflow="hidden",document.body.appendChild(i),setTimeout(()=>{i.parentNode&&i.parentNode.removeChild(i)},1e3)}static enable(){this.isEnabled=!0,this.announce("Keyboard navigation enabled")}static disable(){this.isEnabled=!1,this.announce("Keyboard navigation disabled")}static getShortcuts(){return Array.from(this.keyMap.entries()).map(([t,e])=>({key:t,description:e.description,action:e.action}))}}p(y,"isEnabled",!0),p(y,"keyMap",new Map),p(y,"activeRing","pitch"),p(y,"navigationMode","normal");export{y as KeyboardManager};
//# sourceMappingURL=KeyboardManager-D7MGf3fj.js.map
