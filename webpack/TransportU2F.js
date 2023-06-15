
console.log(`TransportU2F LOAD!`);
const TransportU2F = require('@ledgerhq/hw-transport-u2f').default;
console.log(`TransportU2F: ${TransportU2F}`);
global.window.TransportU2F = TransportU2F;
