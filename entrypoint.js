// Import required polyfills first
// IMPORTANT: These polyfills must be installed in this order
import "react-native-get-random-values";
import "@ethersproject/shims";
import { Buffer } from "buffer";
global.Buffer = Buffer;

Buffer.prototype.subarray = function subarray(begin, end) {
  const result = Uint8Array.prototype.subarray.apply(this, [begin, end]);
  Object.setPrototypeOf(result, Buffer.prototype);
  return result;
};

// Then import the expo router
import "expo-router/entry";
