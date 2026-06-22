// WordString - Core Game Controller (Sewing Edition)
(function() {
  // --- Game State Variables ---
  let totalScore = 0;
  let highScore = 0;
  let timeLeft = 60; // 1 minute starting timer
  let timerInterval = null;
  let isGameActive = false;
  let isSoundOn = true;

  let starterWord = '';
  let spelledWord = []; // Array of { letter, blockId }
  let targetWord = '';
  let refillQueue = [];
  
  let activeBlocks = []; // Array of { id, letter, originIndex }
  let usedBlockIds = new Set();
  
  let wordHistory = [];
  let nextBlockIdNum = 0;

  // Sound effects synthesiser using Web Audio API (Sewing Needle pops & Yarn plucks)
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playSound(type) {
    if (!isSoundOn) return;
    try {
      initAudio();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;

      if (type === 'tap') {
        // Needle click sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        // Yarn pluck ring (pleasant rising arpeggio)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(554.37, now + 0.07); // C#5
        osc.frequency.setValueAtTime(659.25, now + 0.14); // E5
        osc.frequency.setValueAtTime(880, now + 0.21); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'celebrate') {
        // Extended chime for 6L/7L matches
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'error') {
        // Sewing machine jam buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'gameover') {
        // Slow thread unspooling fall
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.7);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      }
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  }

  // --- Mascot State Controls (Stringly) ---
  const stringly = document.getElementById('stringly-companion');
  const bubble = document.getElementById('stringly-bubble');
  const bubbleText = document.getElementById('stringly-bubble-text');
  let bubbleTimeout = null;

  function setStringlyState(state) {
    if (!stringly) return;
    stringly.className = 'stringly-companion ' + state;
  }

  function showStringlyBubble(text, duration = 2000) {
    if (!bubble || !bubbleText) return;
    bubbleText.textContent = text;
    bubble.classList.remove('hidden');
    bubble.classList.add('boxy-bubble-float');
    
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
      bubble.classList.add('hidden');
      bubble.classList.remove('boxy-bubble-float');
    }, duration);
  }

  // --- UI Elements ---
  const homeScreen = document.getElementById('home-screen');
  const gameOverModal = document.getElementById('game-over-modal');
  const helpModal = document.getElementById('help-modal');
  const resetModal = document.getElementById('reset-modal');
  
  const scoreVal = document.getElementById('total-score');
  const timerVal = document.getElementById('game-timer');
  const highScoreVal = document.getElementById('high-score');
  
  const gridContainer = document.getElementById('word-grid-container');
  const blocksPool = document.getElementById('letter-blocks-pool');

  // Load High Score
  highScore = parseInt(localStorage.getItem('wordstring_high') || '0', 10);
  if (highScoreVal) highScoreVal.textContent = highScore;

  // --- Game Loop Controllers ---
  function startGame() {
    totalScore = 0;
    timeLeft = 60;
    wordHistory = [];
    isGameActive = true;
    
    if (scoreVal) scoreVal.textContent = totalScore;
    if (timerVal) timerVal.textContent = formatTime(timeLeft);
    
    homeScreen.classList.add('hidden');
    gameOverModal.classList.add('hidden');
    
    // Pick a starting word
    const startWord = WordDatabase.getRandomStarterWord(3, 5);
    initRound(startWord);
    
    startTimer();
    setStringlyState('idle');
    showStringlyBubble("Let's stitch some words!");
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endGame();
      } else {
        if (timerVal) timerVal.textContent = formatTime(timeLeft);
        
        // Sad warning state when time is low
        if (timeLeft <= 15) {
          if (stringly && !stringly.classList.contains('sad') && !stringly.classList.contains('dizzy') && !stringly.classList.contains('happy')) {
            setStringlyState('sad');
            showStringlyBubble("Hurry! Low thread!");
          }
          document.getElementById('timer-tag').style.backgroundColor = 'var(--felt-coral)';
        } else {
          document.getElementById('timer-tag').style.backgroundColor = 'var(--canvas-cream)';
        }
      }
    }, 1000);
  }

  function endGame() {
    isGameActive = false;
    clearInterval(timerInterval);
    playSound('gameover');
    
    // Save high score
    if (totalScore > highScore) {
      highScore = totalScore;
      localStorage.setItem('wordstring_high', highScore);
      if (highScoreVal) highScoreVal.textContent = highScore;
    }
    
    // Update GameOver elements
    document.getElementById('final-score').textContent = totalScore;
    document.getElementById('words-made').textContent = wordHistory.length;
    
    let longest = '-';
    if (wordHistory.length > 0) {
      longest = wordHistory.reduce((a, b) => a.length > b.length ? a : b);
      longest = `${longest.toUpperCase()} (${longest.length}L)`;
    }
    document.getElementById('longest-word').textContent = longest;

    setStringlyState('sad');
    gameOverModal.classList.remove('hidden');
  }

  // --- Round setup & Generation ---
  function initRound(newStarterWord) {
    starterWord = newStarterWord.toLowerCase();
    spelledWord = [];
    usedBlockIds.clear();
    
    const lastLetter = starterWord[starterWord.length - 1];
    
    // Pick a random target word length between 3 and 7
    const lengths = [3, 4, 5, 6, 7];
    const targetLength = lengths[Math.floor(Math.random() * lengths.length)];
    
    // Pick target word
    targetWord = WordDatabase.findTargetWordOfLength(lastLetter, targetLength);
    if (!targetWord) {
      // Fallback if no word of exact length is found
      targetWord = WordDatabase.findTargetWord(lastLetter, 7);
      if (!targetWord) {
        targetWord = lastLetter + 'an'; // emergency fallback
      }
    }
    
    // The number of blocks on screen is always 6
    const blocksCount = 6;
    
    // Remaining letters of target word are placed in the blocks
    const remainingLetters = targetWord.substring(1).toUpperCase().split('');
    
    // Refill queue is empty since we put all target letters in the blocks pool.
    // However, when a block is clicked, we refill it in real-time with a random letter!
    refillQueue = [];
    
    // Seed initial active blocks (exactly 6 blocks)
    activeBlocks = [];
    for (let i = 0; i < blocksCount; i++) {
      let letter = '';
      if (i < remainingLetters.length) {
        letter = remainingLetters[i];
      } else {
        letter = getRandomCommonLetter();
      }
      activeBlocks.push({
        id: nextBlockIdNum++,
        letter: letter,
        originIndex: i
      });
    }
    
    // Shuffle initial blocks so they are not in order
    activeBlocks = shuffleArray(activeBlocks);
    
    renderBoard();
    renderBlocks();
  }

  // --- Rendering UI Boards ---
  function renderBoard() {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    
    const Ls = starterWord.length;
    
    // Render vertical starter word tiles
    for (let row = 0; row < Ls; row++) {
      const tile = document.createElement('div');
      tile.className = 'grid-tile vertical-tile';
      if (row === Ls - 1) {
        tile.classList.add('intersect-tile');
      }
      tile.textContent = starterWord[row];
      tile.style.setProperty('--col', 0);
      tile.style.setProperty('--row', row);
      tile.id = `starter-tile-${row}`;
      gridContainer.appendChild(tile);
    }
    
    // Render current spelled word (horizontal tiles starting at row Ls - 1, col 1, 2, ...)
    for (let col = 1; col <= spelledWord.length; col++) {
      const tile = document.createElement('div');
      tile.className = 'grid-tile horizontal-tile';
      tile.textContent = spelledWord[col - 1].letter;
      tile.style.setProperty('--col', col);
      tile.style.setProperty('--row', Ls - 1);
      
      // Tap a horizontal letter in the spelled word to undo from that point
      tile.addEventListener('click', () => {
        playSound('tap');
        undoSpellingFrom(col - 1);
      });
      
      gridContainer.appendChild(tile);
    }
  }

  function renderBlocks() {
    if (!blocksPool) return;
    blocksPool.innerHTML = '';
    
    activeBlocks.forEach((block, index) => {
      const blockEl = document.createElement('div');
      blockEl.className = 'letter-block';
      blockEl.textContent = block.letter;
      blockEl.id = `block-${block.id}`;
      
      if (usedBlockIds.has(block.id)) {
        blockEl.classList.add('selected');
      }
      
      // Touch/click event
      blockEl.addEventListener('click', () => {
        if (!isGameActive || usedBlockIds.has(block.id)) return;
        selectBlock(block, index);
      });
      
      blocksPool.appendChild(blockEl);
    });
  }

  // --- Interaction Logic ---
  function selectBlock(block, index) {
    playSound('tap');
    
    // Add to spelled word
    spelledWord.push({
      letter: block.letter,
      blockId: block.id,
      originIndex: index
    });
    
    // Mark as used
    usedBlockIds.add(block.id);
    
    // Stringly Quick Reaction
    if (stringly && !stringly.classList.contains('sad') && !stringly.classList.contains('dizzy')) {
      stringly.style.transform = 'scale(1.08)';
      setTimeout(() => stringly.style.transform = 'scale(1)', 100);
    }
    
    renderBoard();
    renderBlocks();
  }

  function undoSpellingFrom(index) {
    // Remove letters from index to end
    const removed = spelledWord.splice(index);
    removed.forEach(item => {
      usedBlockIds.delete(item.blockId);
    });
    renderBoard();
    renderBlocks();
  }

  function clearSpelling() {
    spelledWord = [];
    usedBlockIds.clear();
    renderBoard();
    renderBlocks();
  }

  function shuffleBlocks() {
    playSound('tap');
    // Shuffling shuffles the visual position of activeBlocks that are NOT currently selected
    activeBlocks = shuffleArray(activeBlocks);
    renderBlocks();
  }

  function submitWord() {
    if (!isGameActive) return;
    
    // Form the full word: last letter of starter word + spelled letters
    const lastLetterOfStarter = starterWord[starterWord.length - 1];
    const userSpelledPart = spelledWord.map(x => x.letter).join('').toLowerCase();
    const fullWord = (lastLetterOfStarter + userSpelledPart).toLowerCase();
    
    // Rule: Must use two or more of the blocks
    if (spelledWord.length < 2) {
      playSound('error');
      setStringlyState('dizzy');
      showStringlyBubble("Must use 2+ spools!");
      setTimeout(() => { if (isGameActive) setStringlyState(timeLeft <= 15 ? 'sad' : 'idle'); }, 1200);
      return;
    }
    
    // Rule: Validate against word database
    if (WordDatabase.isValidWord(fullWord)) {
      handleCorrectWord(fullWord);
    } else {
      playSound('error');
      setStringlyState('dizzy');
      showStringlyBubble(`"${fullWord.toUpperCase()}" is not a word!`);
      setTimeout(() => { if (isGameActive) setStringlyState(timeLeft <= 15 ? 'sad' : 'idle'); }, 1200);
    }
  }

  function handleCorrectWord(word) {
    isGameActive = false; // Freeze inputs during animation
    clearInterval(timerInterval);
    
    wordHistory.push(word);
    
    // Calculate Score
    const pts = getWordScore(word);
    totalScore += pts;
    if (scoreVal) scoreVal.textContent = totalScore;
    
    // Add time bonus: +30 seconds
    timeLeft += 30;
    if (timerVal) timerVal.textContent = formatTime(timeLeft);
    
    // Check if we should trigger guest celebrations
    if (word.length === 6) {
      playSound('celebrate');
      triggerCelebration6L(word);
    } else if (word.length === 7) {
      playSound('celebrate');
      triggerCelebration7L(word);
    } else {
      playSound('success');
      // Standard success
      setStringlyState('happy');
      const cheers = ["Great Stitch!", "Spun!", "Linked!", "Felt Perfect!", "Yarn Craft!"];
      showStringlyBubble(cheers[Math.floor(Math.random() * cheers.length)], 1500);
      
      // Visual Shift Animation (Diagonal Slide)
      animateTransition(word);
    }
  }

  // --- Dynamic Celebrations (crossovers) ---
  function triggerCelebration6L(word) {
    const overlay = document.getElementById('celebration-6L');
    if (!overlay) {
      animateTransition(word);
      return;
    }
    
    overlay.classList.remove('hidden');
    setStringlyState('happy');
    
    setTimeout(() => {
      overlay.classList.add('hidden');
      animateTransition(word);
    }, 2500);
  }

  function triggerCelebration7L(word) {
    const overlay = document.getElementById('celebration-7L');
    if (!overlay) {
      animateTransition(word);
      return;
    }
    
    overlay.classList.remove('hidden');
    setStringlyState('happy');
    startConfetti();
    
    setTimeout(() => {
      stopConfetti();
      overlay.classList.add('hidden');
      animateTransition(word);
    }, 3000);
  }

  // --- Shifting/Rotation Transition Animation ---
  function animateTransition(newWord) {
    const Ls = starterWord.length;
    const wordTiles = gridContainer.querySelectorAll('.grid-tile');
    
    // 1. Fade out the old starter word tiles (excluding the intersection tile)
    wordTiles.forEach(tile => {
      if (tile.classList.contains('vertical-tile') && !tile.classList.contains('intersect-tile')) {
        tile.classList.add('fade-out');
      }
    });
    
    // 2. Perform diagonal shift on horizontal tiles to align them vertically
    const dummy = document.createElement('div');
    dummy.className = 'grid-tile';
    dummy.style.visibility = 'hidden';
    gridContainer.appendChild(dummy);
    const tileWidth = dummy.offsetWidth;
    const tileGap = 5; // match style.css var
    gridContainer.removeChild(dummy);
    
    const spacing = tileWidth + tileGap;
    
    // Horizontal tiles are gridContainer children starting from index Ls
    const horizontalTiles = Array.from(gridContainer.querySelectorAll('.grid-tile.horizontal-tile'));
    const intersectTile = gridContainer.querySelector('.grid-tile.intersect-tile');
    
    // Combined list: [intersection tile, horizontal 1, horizontal 2, ...]
    const listToAnimate = [intersectTile, ...horizontalTiles];
    
    listToAnimate.forEach((tile, i) => {
      if (tile) {
        tile.style.transform = `translate(${-i * spacing}px, ${i * spacing}px) rotate(360deg)`;
      }
    });
    
    // 3. Once animation completes, load the next round
    setTimeout(() => {
      isGameActive = true;
      initRound(newWord);
      startTimer();
      setStringlyState(timeLeft <= 15 ? 'sad' : 'idle');
    }, 850);
  }

  // --- Confetti particle system ---
  let confettiAnimFrame = null;
  function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    
    const colors = ['#ff7f50', '#20b2aa', '#ba55d3', '#fde047', '#f8a594', '#bae6fd'];
    const particles = [];
    
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -100,
        r: Math.random() * 5 + 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.08 + 0.02,
        tiltAngle: 0,
        vy: Math.random() * 2.5 + 2,
        vx: Math.random() * 2 - 1
      });
    }
    
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;
      
      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.tiltAngle) * 0.5;
        p.tilt = Math.sin(p.tiltAngle - p.r/2) * 8;
        
        if (p.y < canvas.height) {
          active = true;
        }
        
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });
      
      if (active) {
        confettiAnimFrame = requestAnimationFrame(draw);
      }
    }
    
    draw();
  }

  function stopConfetti() {
    if (confettiAnimFrame) cancelAnimationFrame(confettiAnimFrame);
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // --- Helper Helpers ---
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function getWordScore(w) {
    const len = w.length;
    if (len <= 3) return 1;
    if (len === 4) return 3;
    if (len === 5) return 5;
    if (len === 6) return 9;
    return 15; // 7 letter word
  }

  function getRandomCommonLetter() {
    const pool = 'EEEEEAAAAAOOOOOIIIIITTTTTNNNNNRRRRRSSSSSLLLLDDCGGHHUPWY';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function shuffleArray(arr) {
    const res = [...arr];
    for (let i = res.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [res[i], res[j]] = [res[j], res[i]];
    }
    return res;
  }

  // --- Event Listeners Bindings ---
  document.getElementById('btn-start').addEventListener('click', () => {
    startGame();
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    startGame();
  });

  document.getElementById('btn-help').addEventListener('click', () => {
    playSound('tap');
    helpModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-help').addEventListener('click', () => {
    playSound('tap');
    helpModal.classList.add('hidden');
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    playSound('tap');
    if (!isGameActive) return;
    clearInterval(timerInterval);
    resetModal.classList.remove('hidden');
  });
  document.getElementById('btn-cancel-reset').addEventListener('click', () => {
    playSound('tap');
    resetModal.classList.add('hidden');
    if (isGameActive) startTimer();
  });
  document.getElementById('btn-confirm-reset').addEventListener('click', () => {
    playSound('tap');
    resetModal.classList.add('hidden');
    startGame();
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    playSound('tap');
    clearSpelling();
  });
  document.getElementById('btn-shuffle').addEventListener('click', () => {
    shuffleBlocks();
  });
  document.getElementById('btn-submit').addEventListener('click', () => {
    submitWord();
  });

  const soundBtn = document.getElementById('btn-sound');
  soundBtn.addEventListener('click', () => {
    isSoundOn = !isSoundOn;
    soundBtn.textContent = isSoundOn ? '🔊' : '🔇';
    playSound('tap');
  });

  window.addEventListener('keydown', (e) => {
    if (!isGameActive) return;
    const key = e.key.toUpperCase();
    
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (spelledWord.length > 0) {
        const last = spelledWord.pop();
        usedBlockIds.delete(last.blockId);
        renderBoard();
        renderBlocks();
      }
      return;
    }
    
    if (e.key === 'Enter') {
      submitWord();
      return;
    }
    
    if (/^[A-Z]$/.test(key)) {
      const index = activeBlocks.findIndex((b, idx) => b.letter === key && !usedBlockIds.has(b.id));
      if (index !== -1) {
        selectBlock(activeBlocks[index], index);
      }
    }
  });

  document.addEventListener('touchstart', function(event) {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // --- Service Worker and PWA Install Promotion ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered successfully!', reg.scope))
        .catch(err => console.warn('Service Worker registration failed:', err));
    });
  }

  let deferredPrompt;
  const pwaBanner = document.getElementById('pwa-banner');
  const installBtn = document.getElementById('btn-pwa-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaBanner) pwaBanner.classList.remove('hidden');
  });

  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (!deferredPrompt) return;
      playSound('tap');
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install');
        }
        deferredPrompt = null;
        if (pwaBanner) pwaBanner.classList.add('hidden');
      });
    });
  }

})();
