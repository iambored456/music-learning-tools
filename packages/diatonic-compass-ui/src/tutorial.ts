import { gsap } from "gsap";
import { appState } from './state/appState.ts';
import { ActionController } from './core/ActionController.ts';
import type { RingName } from './types.ts';
import {
    createTalkingAvatarController,
    defaultAvatarAssets,
    type TalkingAvatarController
} from '@mlt/talking-avatar';

type TutorialStep = {
    text: string;
    highlightTarget?: string;
    waitFor?: (token: number) => Promise<void>;
};

// Module-level state
let avatar: TalkingAvatarController | null = null;
let currentStepIndex = 0;
let isExecutingStep = false;
let currentHighlightTarget: string | null = null;
let activeToken = 0;
let pendingAdvanceTimeout: number | null = null;

// Tutorial steps definition
const tutorialSteps: TutorialStep[] = [
    { text: "Welcome to the <strong>Diatonic Compass!</strong>" },
    { text: "Rotate the <strong>Pitch</strong> belt so we leave <strong>C Major.</strong>", highlightTarget: ".pitch-belt", waitFor: (token) => awaitInteractionAndAnimation('pitchClass', token) },
    { text: "Nice! <br>Change the <strong>mode</strong> by spinning the <strong>Degree belt.</strong>", highlightTarget: ".degree-belt", waitFor: (token) => awaitInteractionAndAnimation('degree', token) },
    { text: "Wonderful!<br>Now shift the perspective by spinning the <strong>Chromatic belt</strong>.", highlightTarget: ".chromatic-belt", waitFor: (token) => awaitInteractionAndAnimation('chromatic', token) },
    { text: "Almost there!<br> Tap the <strong>result bar</strong> to <strong>hear your scale.</strong>", highlightTarget: "#result-container", waitFor: (token) => awaitPlayback(token) },
    { text: "You did it!<br><strong>Enjoy exploring.</strong>" },
];

/**
 * Initialize the avatar if not already created
 */
function initAvatar(): TalkingAvatarController | null {
    if (avatar) return avatar;

    const mount = document.getElementById('avatar-mount');
    if (!mount) {
        console.error('Avatar mount element not found!');
        return null;
    }

    avatar = createTalkingAvatarController({
        assets: defaultAvatarAssets,
        mount,
    });

    return avatar;
}

/**
 * Clean up and dispose of the avatar
 */
function disposeAvatar(): void {
    if (avatar) {
        avatar.dispose();
        avatar = null;
    }
}

function showSpotlight(targetSelector: string) {
    const target = document.querySelector(targetSelector);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const padding = 10;
    const top = (rect.top - padding) / window.innerHeight * 100;
    const left = (rect.left - padding) / window.innerWidth * 100;
    const right = (rect.right + padding) / window.innerWidth * 100;
    const bottom = (rect.bottom + padding) / window.innerHeight * 100;
    const clipPathValue = `polygon(0% 0%, 0% 100%, ${left}% 100%, ${left}% ${top}%, ${right}% ${top}%, ${right}% ${bottom}%, ${left}% ${bottom}%, ${left}% 100%, 100% 100%, 100% 0%, 0% 0%)`;
    gsap.to("#tutorial-mask", { clipPath: clipPathValue, duration: 0.4, ease: "power2.inOut" });
}


function hideSpotlight() {
    gsap.to("#tutorial-mask", {
        clipPath: "polygon(0% 0%, 0% 100%, 50% 100%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 100%, 100% 100%, 100% 0%, 0% 0%)",
        duration: 0.4,
        ease: "power2.inOut"
    });
}

/**
 * Elevates an element above the mask and applies a glowing highlight.
 */
function addHighlight(targetSelector: string) {
    const target = document.querySelector(targetSelector);
    if (!target) return;
    currentHighlightTarget = targetSelector;
    gsap.to(target, {
        position: 'relative',
        zIndex: 2001,
        boxShadow: "0 0 20px 8px #33c6dc",
        duration: 0.4
    });
}

/**
 * Removes the highlight and returns the element to its original state.
 */
function removeHighlight(targetSelector: string) {
    const target = document.querySelector(targetSelector);
    if (!target) return;
    currentHighlightTarget = null;
    gsap.to(target, {
        boxShadow: "0 0 0px 0px rgba(51,198,220,0)",
        duration: 0.3,
        onComplete: () => {
            gsap.set(target, { clearProps: "all" });
        }
    });
}

/**
 * Clear any active highlight
 */
function clearCurrentHighlight() {
    if (currentHighlightTarget) {
        removeHighlight(currentHighlightTarget);
        hideSpotlight();
    }
}

function isTokenActive(token: number): boolean {
    return token === activeToken;
}

function clearPendingAdvanceTimeout() {
    if (pendingAdvanceTimeout !== null) {
        clearTimeout(pendingAdvanceTimeout);
        pendingAdvanceTimeout = null;
    }
}

/**
 * Waits for a user to start moving a belt, then waits for the drag and snap animation to complete.
 */
function awaitInteractionAndAnimation(ringKey: RingName, token: number) {
    return new Promise<void>(resolve => {
        const initialValue = appState.rings[ringKey];
        let hasMoved = false;
        let reqId = 0;

        const check = () => {
            if (!isTokenActive(token)) {
                cancelAnimationFrame(reqId);
                resolve();
                return;
            }
            if (!hasMoved) {
                if (appState.rings[ringKey] !== initialValue) {
                    hasMoved = true;
                }
            } else {
                if (!appState.drag.active && !appState.animation) {
                    cancelAnimationFrame(reqId);
                    resolve();
                    return;
                }
            }
            reqId = requestAnimationFrame(check);
        };
        reqId = requestAnimationFrame(check);
    });
}

/**
 * Wait for playback to start and then stop
 */
async function awaitPlayback(token: number): Promise<void> {
    await new Promise<void>(resolve => {
        const check = () => {
            if (!isTokenActive(token)) {
                resolve();
                return;
            }
            appState.playback.isPlaying ? resolve() : requestAnimationFrame(check);
        };
        check();
    });
    await new Promise<void>(resolve => {
        const check = () => {
            if (!isTokenActive(token)) {
                resolve();
                return;
            }
            !appState.playback.isPlaying ? resolve() : requestAnimationFrame(check);
        };
        check();
    });
}

/**
 * Update navigation button states
 */
function updateNavButtons() {
    const prevBtn = document.getElementById('tutorial-prev') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('tutorial-next') as HTMLButtonElement | null;

    if (prevBtn) {
        // Only disable on first step, allow navigation during speech
        prevBtn.disabled = currentStepIndex === 0;
    }
    if (nextBtn) {
        // Only disable on last step, allow navigation during speech
        nextBtn.disabled = currentStepIndex >= tutorialSteps.length - 1;
    }
}

/**
 * Execute a single tutorial step
 */
async function executeStep(stepIndex: number, token: number): Promise<boolean> {
    if (stepIndex < 0 || stepIndex >= tutorialSteps.length) return false;
    if (!isTokenActive(token)) return false;

    const config = tutorialSteps[stepIndex];
    isExecutingStep = true;
    updateNavButtons();

    const tutorialTextEl = document.getElementById('tutorial-text');

    if (tutorialTextEl) {
        tutorialTextEl.innerHTML = config.text;
        tutorialTextEl.style.opacity = '1';
        tutorialTextEl.style.visibility = 'visible';
    }

    if (!isTokenActive(token)) return false;

    if (config.highlightTarget) {
        showSpotlight(config.highlightTarget);
        addHighlight(config.highlightTarget);
    }

    const speakPromise = avatar
        ? avatar.speak(config.text, {
            lang: 'en-CA',
            rate: 0.92,
            chunking: 'sentence',
        }).catch(() => undefined)
        : Promise.resolve();

    if (config.waitFor) {
        const waitPromise = config.waitFor(token);
        const first = await Promise.race([
            speakPromise.then(() => 'speak'),
            waitPromise.then(() => 'wait'),
        ]);

        if (!isTokenActive(token)) return false;

        if (first === 'wait') {
            // User completed the action before speech ended: stop speaking and advance.
            avatar?.cancel();
        } else {
            await waitPromise;
            if (!isTokenActive(token)) return false;
        }
    } else {
        await speakPromise;
        if (!isTokenActive(token)) return false;
    }

    // Clear highlight after interaction complete
    if (config.highlightTarget) {
        removeHighlight(config.highlightTarget);
        hideSpotlight();
    }

    if (isTokenActive(token)) {
        isExecutingStep = false;
        updateNavButtons();
    }
    return isTokenActive(token);
}

/**
 * Go to a specific step
 */
async function goToStep(index: number): Promise<void> {
    if (index < 0 || index >= tutorialSteps.length) return;
    const token = ++activeToken;
    clearPendingAdvanceTimeout();
    if (isExecutingStep) {
        // Cancel current speech if navigating
        avatar?.cancel();
        clearCurrentHighlight();
        isExecutingStep = false;
    }

    currentStepIndex = index;
    updateNavButtons();
    const completed = await executeStep(index, token);
    if (!completed || !isTokenActive(token)) {
        return;
    }

    // Auto-advance to next step if not the last step
    if (currentStepIndex < tutorialSteps.length - 1) {
        pendingAdvanceTimeout = window.setTimeout(() => {
            if (!isTokenActive(token)) return;
            void goToStep(currentStepIndex + 1);
        }, 500);
    } else {
        // Last step - end tutorial after delay
        pendingAdvanceTimeout = window.setTimeout(() => {
            if (!isTokenActive(token)) return;
            exitTutorial();
        }, 1000);
    }
}

/**
 * Exit the tutorial
 */
function exitTutorial() {
    activeToken++;
    clearPendingAdvanceTimeout();
    avatar?.cancel();
    clearCurrentHighlight();

    gsap.to(["#tutorial-mask", "#tutorial-bubble"], {
        autoAlpha: 0,
        duration: 0.3,
        onComplete: () => {
            const bubble = document.getElementById('tutorial-bubble');
            if (bubble) {
                bubble.style.display = 'none';
            }
            if (avatar) {
                avatar.setVisible(false);
            }
        }
    });

    if (window.diatonicCompassTutorial) {
        window.diatonicCompassTutorial.kill();
        window.diatonicCompassTutorial = null;
    }

    // Remove event listeners
    document.getElementById('tutorial-prev')?.removeEventListener('click', handlePrevClick);
    document.getElementById('tutorial-next')?.removeEventListener('click', handleNextClick);
    document.getElementById('tutorial-exit')?.removeEventListener('click', handleExitClick);
}

// Event handlers
function handlePrevClick() {
    if (currentStepIndex > 0) {
        avatar?.cancel();
        clearCurrentHighlight();
        isExecutingStep = false;
        currentStepIndex--;
        goToStep(currentStepIndex);
    }
}

function handleNextClick() {
    if (currentStepIndex < tutorialSteps.length - 1) {
        avatar?.cancel();
        clearCurrentHighlight();
        isExecutingStep = false;
        currentStepIndex++;
        goToStep(currentStepIndex);
    }
}

function handleExitClick() {
    exitTutorial();
}

export function startTutorial() {
    ActionController.toggleSidebar(false);

    const tutorialBubble = document.getElementById('tutorial-bubble');
    const tutorialMask = document.getElementById('tutorial-mask');
    const tutorialText = document.getElementById('tutorial-text');

    if (!tutorialBubble || !tutorialMask || !tutorialText) {
      console.error('Tutorial elements missing!', { tutorialBubble: !!tutorialBubble, tutorialMask: !!tutorialMask, tutorialText: !!tutorialText });
      return;
    }

    // Initialize the avatar
    const avatarController = initAvatar();
    if (!avatarController) {
        console.error('Failed to initialize avatar!');
        return;
    }

    // Reset state
    currentStepIndex = 0;
    isExecutingStep = false;
    currentHighlightTarget = null;

    if (window.diatonicCompassTutorial) {
        window.diatonicCompassTutorial.kill();
    }

    // Create a simple timeline just for setup animations
    const tl = gsap.timeline();
    window.diatonicCompassTutorial = tl;

    // Wire up navigation buttons
    document.getElementById('tutorial-prev')?.addEventListener('click', handlePrevClick);
    document.getElementById('tutorial-next')?.addEventListener('click', handleNextClick);
    document.getElementById('tutorial-exit')?.addEventListener('click', handleExitClick);

    // Show tutorial elements
    tl.to("#tutorial-mask", { autoAlpha: 1, duration: 0.3 });
    tl.call(() => {
        tutorialBubble.style.display = 'block';
        tutorialBubble.style.opacity = '1';
        tutorialBubble.style.visibility = 'visible';
        tutorialBubble.setAttribute('aria-hidden', 'false');
        updateNavButtons();
    });

    // Enter the avatar and start first step
    tl.call(() => {
        void (async () => {
            if (avatar) {
                await avatar.enter();
            }
            // Start the tutorial steps
            goToStep(0);
        })();
    });
}
