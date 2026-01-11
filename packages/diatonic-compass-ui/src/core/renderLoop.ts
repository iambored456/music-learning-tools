// (file path: src/core/renderLoop.ts)

// This function's only job is to set up a requestAnimationFrame loop
// and pass the timestamp to the callback function (our main redraw).
export function makeRenderLoop(redraw: (time: number) => void) {
  function frame(time: number) {
    redraw(time); // Pass the timestamp to the app's redraw method
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame); // Start the loop
}
