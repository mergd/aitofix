// This file is designed to fail so we can test aitofix
console.log("Running mock test...");
// Simulate a simple logic error or typo that the LLM should catch
const x = 1;
if (x === 2) {
  console.log("Pass");
} else {
  console.error("Fail: x should be 2");
  process.exit(1);
}




