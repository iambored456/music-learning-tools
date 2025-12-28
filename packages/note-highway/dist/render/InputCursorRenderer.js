/**
 * Input Cursor Renderer
 *
 * Renders the current pitch input at the judgment line.
 * Shows:
 * - Current pitch position (circle)
 * - Deviation indicator (optional)
 * - Color based on accuracy state
 */
import { DEFAULT_INPUT_CURSOR_CONFIG } from '../constants.js';
/**
 * Create an input cursor renderer.
 */
export function createInputCursorRenderer() {
    /**
     * Render the input cursor.
     */
    function render(ctx, state, judgmentLineX, coordinateMapper, config = {}) {
        const fullConfig = {
            ...DEFAULT_INPUT_CURSOR_CONFIG,
            ...config,
        };
        // Don't render if not voiced or no pitch
        if (!state.isVoiced || state.currentMidi === null) {
            // Optionally render a muted cursor
            drawMutedCursor(ctx, judgmentLineX, coordinateMapper, fullConfig);
            return;
        }
        // Calculate Y position from MIDI pitch
        const y = coordinateMapper.viewport.midiToY(state.currentMidi);
        // Determine color based on tolerance state
        const color = state.isInTolerance
            ? fullConfig.colorInTolerance
            : fullConfig.colorOutOfTolerance;
        // Draw the cursor
        drawCursor(ctx, judgmentLineX, y, fullConfig.radius, color, state.clarity);
        // Draw deviation indicator if enabled
        if (fullConfig.showDeviationIndicator && !state.isInTolerance) {
            drawDeviationIndicator(ctx, judgmentLineX, y, state.deviationCents, fullConfig);
        }
    }
    /**
     * Draw the main cursor circle.
     */
    function drawCursor(ctx, x, y, radius, color, clarity) {
        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.7, `${color}88`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Main circle
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7 + clarity * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    /**
     * Draw a muted cursor when not singing.
     */
    function drawMutedCursor(ctx, x, coordinateMapper, config) {
        // Draw a small indicator at the center
        const viewport = coordinateMapper.viewport.getConfig();
        const centerY = viewport.height / 2;
        ctx.fillStyle = config.colorUnvoiced;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(x, centerY, config.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    /**
     * Draw an indicator showing pitch deviation direction.
     */
    function drawDeviationIndicator(ctx, x, y, deviationCents, config) {
        // Clamp deviation for display
        const clampedDeviation = Math.max(-config.maxDeviationCents, Math.min(config.maxDeviationCents, deviationCents));
        // Arrow direction: positive (sharp) = up, negative (flat) = down
        const arrowDirection = deviationCents > 0 ? -1 : 1;
        const arrowSize = 8;
        const arrowOffset = config.radius + 5;
        ctx.fillStyle = config.colorOutOfTolerance;
        ctx.beginPath();
        if (arrowDirection < 0) {
            // Pointing up (sharp)
            ctx.moveTo(x, y - arrowOffset - arrowSize);
            ctx.lineTo(x - arrowSize / 2, y - arrowOffset);
            ctx.lineTo(x + arrowSize / 2, y - arrowOffset);
        }
        else {
            // Pointing down (flat)
            ctx.moveTo(x, y + arrowOffset + arrowSize);
            ctx.lineTo(x - arrowSize / 2, y + arrowOffset);
            ctx.lineTo(x + arrowSize / 2, y + arrowOffset);
        }
        ctx.closePath();
        ctx.fill();
    }
    return { render };
}
