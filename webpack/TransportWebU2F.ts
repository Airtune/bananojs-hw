// TODO: Do I need these polyfills?
import 'zone.js'; // Included with Angular CLI.

/***************************************************************************************************
 * APPLICATION IMPORTS
 */
// Add global to window, assigning the value of window itself.
// (window as any).global = window;
//@ts-ignore
window.Buffer = require('buffer').Buffer;
(window as any).global = window;

// load u2f
console.log(`TransportWebU2F LOAD!`);
import TransportU2F from '@ledgerhq/hw-transport-u2f';
console.log(`TransportWebU2F: ${TransportU2F}`);
(global.window as any).TransportWebU2F = TransportU2F;
