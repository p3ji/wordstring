const fs = require('fs');
const path = require('path');

// Source paths from n-1game
const enable1Path = 'c:/Users/pushp/Documents/Projects/n-1game/enable1.txt';
const wordsDataPath = 'c:/Users/pushp/Documents/Projects/n-1game/words_data.js';

// Output path
const outputPath = path.join(__dirname, 'words.js');

console.log('Reading enable1.txt...');
if (!fs.existsSync(enable1Path)) {
  console.error('enable1.txt not found at ' + enable1Path);
  process.exit(1);
}
const enableContent = fs.readFileSync(enable1Path, 'utf8');
const enableLines = enableContent.split(/\r?\n/);
const validWords = [];

for (const line of enableLines) {
  const w = line.trim().toLowerCase();
  if (/^[a-z]{3,7}$/.test(w)) {
    validWords.push(w);
  }
}
console.log(`Loaded ${validWords.length} valid words (length 3-7) from ENABLE1.`);

console.log('Reading words_data.js...');
if (!fs.existsSync(wordsDataPath)) {
  console.error('words_data.js not found at ' + wordsDataPath);
  process.exit(1);
}

// Parse common words by reading words_data.js
const commonWordsSet = new Set();
const wordsDataContent = fs.readFileSync(wordsDataPath, 'utf8');

// Use a regex/parse approach to find all words in words_data.js
// It has "word": "xyz" and "subwords": ["abc", ...]
const wordRegex = /"word":\s*"([a-z]+)"/g;
let match;
while ((match = wordRegex.exec(wordsDataContent)) !== null) {
  commonWordsSet.add(match[1].toLowerCase());
}
const subwordRegex = /"([^"]+)"/g;
// We can find all array entries by scanning subword blocks, but let's do eval for 100% correctness
let WORDS_DATA;
try {
  eval(wordsDataContent.replace('const WORDS_DATA =', 'WORDS_DATA ='));
  for (const k in WORDS_DATA) {
    for (const entry of WORDS_DATA[k]) {
      commonWordsSet.add(entry.word.toLowerCase());
      for (const sw of entry.subwords) {
        commonWordsSet.add(sw.toLowerCase());
      }
    }
  }
} catch (e) {
  console.log('Failed to eval words_data.js, falling back to regex: ' + e);
}

const commonWords = Array.from(commonWordsSet).filter(w => /^[a-z]{3,7}$/.test(w));
// Ensure we have 'x' words
const xFallbacks = ['xenon', 'xerox', 'xeric', 'xenia'].filter(w => validWords.includes(w));
for (const xw of xFallbacks) {
  if (!commonWords.includes(xw)) {
    commonWords.push(xw);
  }
}
console.log(`Loaded ${commonWords.length} unique common words.`);

// Build starting letter map for common words
const wordsByStartLetter = {};
for (let i = 97; i <= 122; i++) {
  wordsByStartLetter[String.fromCharCode(i)] = [];
}

for (const w of commonWords) {
  const start = w[0];
  if (wordsByStartLetter[start]) {
    wordsByStartLetter[start].push(w);
  }
}

// Check connectivity of starting/ending letters
console.log('Verifying connection coverage...');
let disconnectedLetters = [];
for (let i = 97; i <= 122; i++) {
  const char = String.fromCharCode(i);
  const words = wordsByStartLetter[char];
  if (!words || words.length === 0) {
    disconnectedLetters.push(char);
  }
}
if (disconnectedLetters.length > 0) {
  console.warn('Warning: No common words start with these letters:', disconnectedLetters.join(', '));
} else {
  console.log('All letters a-z have starting words!');
}

// Generate the output JavaScript file content
// To keep file size compact and load times instant in browser, we can join words with spaces
// and split them on client load.
const validWordsString = validWords.join(' ');
const commonWordsString = commonWords.join(' ');

const outputContent = `// Curated and compressed word database for WordString
// Generated on ${new Date().toISOString()}

(function(global) {
  const VALID_WORDS_RAW = "${validWordsString}";
  const COMMON_WORDS_RAW = "${commonWordsString}";

  // Initialize Sets on load
  const validSet = new Set(VALID_WORDS_RAW.split(' '));
  const commonArray = COMMON_WORDS_RAW.split(' ');

  // Group common words by start letter for fast selection
  const byStartLetter = {};
  for (let i = 97; i <= 122; i++) {
    byStartLetter[String.fromCharCode(i)] = [];
  }
  for (const w of commonArray) {
    const start = w[0];
    if (byStartLetter[start]) {
      byStartLetter[start].push(w);
    }
  }

  global.WordDatabase = {
    isValidWord: function(word) {
      return validSet.has(word.toLowerCase());
    },
    isCommonWord: function(word) {
      return validSet.has(word.toLowerCase()); // or commonArray check
    },
    getRandomStarterWord: function(minLen = 3, maxLen = 5) {
      const filtered = commonArray.filter(w => w.length >= minLen && w.length <= maxLen);
      return filtered[Math.floor(Math.random() * filtered.length)];
    },
    getWordsStartingWith: function(letter) {
      return byStartLetter[letter.toLowerCase()] || [];
    },
    // Finds a target word that starts with letter, and whose subsequent letters can be made from
    // the available block letters (if any) or are generally common.
    findTargetWord: function(startLetter, maxLength = 7) {
      const candidates = byStartLetter[startLetter.toLowerCase()] || [];
      const filtered = candidates.filter(w => w.length >= 3 && w.length <= maxLength);
      if (filtered.length === 0) return null;
      return filtered[Math.floor(Math.random() * filtered.length)];
    },
    findTargetWordOfLength: function(startLetter, targetLen) {
      const candidates = byStartLetter[startLetter.toLowerCase()] || [];
      const filtered = candidates.filter(w => w.length === targetLen);
      if (filtered.length === 0) return null;
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
  };
})(typeof window !== 'undefined' ? window : global);
`;

fs.writeFileSync(outputPath, outputContent, 'utf8');
console.log(`Success! Created ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB)`);
