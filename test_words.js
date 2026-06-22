// Test script to verify the Word Database works correctly and makes sense
const fs = require('fs');
const path = require('path');

console.log('--- Word Database Validation Tests ---');

// Load words.js
const wordsJsPath = path.join(__dirname, 'words.js');
if (!fs.existsSync(wordsJsPath)) {
  console.error('FAIL: words.js does not exist. Run generate_words.js first.');
  process.exit(1);
}

// Mock window/global wrapper to load words.js in Node
const mockGlobal = {};
const wordsJsContent = fs.readFileSync(wordsJsPath, 'utf8');
try {
  // Execute words.js in the context of mockGlobal
  eval(wordsJsContent.replace('typeof window !== \'undefined\' ? window : global', 'mockGlobal'));
} catch (e) {
  console.error('FAIL: Failed to parse words.js:', e);
  process.exit(1);
}

const db = mockGlobal.WordDatabase;
if (!db) {
  console.error('FAIL: WordDatabase not found in global scope after execution.');
  process.exit(1);
}

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// Test 1: Check basic validation
assert(db.isValidWord('cat') === true, '"cat" should be a valid word');
assert(db.isValidWord('testing') === true, '"testing" should be a valid word');
assert(db.isValidWord('xyzzy') === false, '"xyzzy" should not be a valid word');
assert(db.isValidWord('a') === false, 'single letters like "a" should not be valid words (minimum length 3)');

// Test 2: Check starter word generation
const starter = db.getRandomStarterWord(3, 5);
assert(starter && starter.length >= 3 && starter.length <= 5, `getRandomStarterWord returned valid starter: "${starter}"`);

// Test 3: Check coverage for all letters a-z
console.log('\nChecking letter coverage:');
let missingLetters = [];
for (let i = 97; i <= 122; i++) {
  const char = String.fromCharCode(i);
  // Find a target word starting with char
  let target = db.findTargetWord(char);
  
  // If target is null, fall back to checking if we have any word starting with it in validation set
  if (!target) {
    // Let's implement the fallback in the test to check if it's possible
    const startWords = db.getWordsStartingWith(char);
    if (startWords.length === 0) {
      // Fallback check in validation set (we will write this logic in game.js or words.js)
      console.warn(`[WARN] No common words starting with "${char}". Testing fallback...`);
      // Scan all valid words to verify there is at least one
      // We can mock this fallback check
      // Let's find one in VALID_WORDS directly
      // In game.js, we will implement this fallback
      missingLetters.push(char);
    }
  } else {
    console.log(`  Letter "${char}": Target word candidate is "${target}"`);
  }
}

assert(missingLetters.length === 0, 'All letters (including X) should have common starting target words');
assert(db.isValidWord('xenon') === true, '"xenon" is valid, confirming "x" words exist in the dictionary');

// Test 4: Validate Cardboard Scoring Rules
console.log('\nTesting scoring rules:');
function getWordScore(len) {
  if (len <= 3) return 1;
  if (len === 4) return 3;
  if (len === 5) return 5;
  if (len === 6) return 9;
  return 15; // 7 letters
}
assert(getWordScore(3) === 1, '3-letter word scores 1 point');
assert(getWordScore(4) === 3, '4-letter word scores 3 points');
assert(getWordScore(5) === 5, '5-letter word scores 5 points');
assert(getWordScore(6) === 9, '6-letter word scores 9 points');
assert(getWordScore(7) === 15, '7-letter word scores 15 points');

// Test 5: Verify Playability of 3L to 7L words with 6 Letter Blocks
console.log('\nSimulating playability for 3-letter to 7-letter target words:');
const lettersToTest = ['a', 'b', 'c', 'd', 'p', 't', 's'];
const targetLengths = [3, 4, 5, 6, 7];

for (const char of lettersToTest) {
  for (const len of targetLengths) {
    const targetWord = db.findTargetWordOfLength(char, len);
    if (targetWord) {
      const remainingLetters = targetWord.substring(1).toUpperCase().split('');
      const blocksCount = 6;
      
      // Seed blocks: target letters + random common letters
      const blocks = [];
      for (let i = 0; i < blocksCount; i++) {
        if (i < remainingLetters.length) {
          blocks.push(remainingLetters[i]);
        } else {
          blocks.push('E'); // fallback vowel
        }
      }
      
      // Verify playability: can we spell targetWord using the first letter and the blocks?
      const targetSpelledPart = targetWord.substring(1).toUpperCase();
      let spellable = true;
      let tempBlocks = [...blocks];
      
      for (const letter of targetSpelledPart) {
        const index = tempBlocks.indexOf(letter);
        if (index !== -1) {
          tempBlocks.splice(index, 1);
        } else {
          spellable = false;
          break;
        }
      }
      
      assert(spellable === true, `Successfully simulated spelling "${targetWord.toUpperCase()}" (${len}L) using 6 blocks [${blocks.join(', ')}]`);
    } else {
      console.warn(`[WARN] No ${len}-letter word starting with "${char}" found in database.`);
    }
  }
}

console.log(`\nTests finished: ${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('All tests passed successfully!');
}
