// 전역 변수 설정
let board = null; 
let game = null; 
let puzzles = [];
let currentPuzzle = null;
let currentPuzzleIndex = -1; 
let currentSolutionMoves = [];
let currentMoveIndex = 0;
let isPuzzleActive = false;

// ⭐ 초보자 모드 관련 변수 추가 ⭐
let isBeginnerMode = false; 
const BEGINNER_MAX_RATING = 500; 

// DOM 요소 캐싱
const statusEl = document.getElementById('status');
const puzzleRatingEl = document.getElementById('puzzleRating');
const nextPuzzleBtn = document.getElementById('nextPuzzleBtn'); 
const beginnerModeBtn = document.getElementById('beginnerModeBtn'); // ⭐ 추가 ⭐

// ===================================
// 1. 초기화 및 보드 설정
// ===================================

function onDrop (source, target) {
    if (!isPuzzleActive) return 'snapback';
    
    // UCI 형식으로 수순 시도 (promotion은 퀸으로 가정)
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' 
    });

    if (move === null) return 'snapback';

    checkUserMove(move);
    return; 
}

function initBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        // ⭐ 수정: 이미지 경로를 img/ 폴더 바로 아래로 변경 ⭐
        pieceTheme: 'img/{piece}.png' 
    };
    
    board = Chessboard('myBoard', config);
    game = new Chess();
}

function onSnapEnd () {
    board.position(game.fen());
}

// ===================================
// 2. 퍼즐 로드 및 UI 설정
// ===================================

async function loadPuzzles() {
    try {
        const response = await fetch('puzzles.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        puzzles = await response.json(); 
        
        if (!Array.isArray(puzzles) || puzzles.length === 0) {
            statusEl.textContent = '오류: 퍼즐 데이터가 올바르지 않거나 비어 있습니다.';
            return;
        }

        statusEl.textContent = `퍼즐 데이터 로드 완료! (총 ${puzzles.length}개)`;
        initBoard();
        
        // 버튼 이벤트 리스너 연결
        if (nextPuzzleBtn) {
            nextPuzzleBtn.addEventListener('click', startNewGame);
        }
        if (beginnerModeBtn) {
            beginnerModeBtn.addEventListener('click', toggleBeginnerMode);
            updateBeginnerButtonUI(); // 버튼 초기 UI 설정
        }

        startNewGame(); // 첫 퍼즐 시작
        
    } catch (error) {
        console.error('퍼즐 로드 중 오류 발생:', error);
        statusEl.textContent = '오류: puzzles.json 파일을 찾거나 로드할 수 없습니다. (콘솔 확인)';
    }
}

// ⭐ 초보자 모드 토글 함수 ⭐
function toggleBeginnerMode() {
    isBeginnerMode = !isBeginnerMode;
    updateBeginnerButtonUI();
    
    // 모드가 변경되면 다음 퍼즐을 찾기 시작
    currentPuzzleIndex = -1; 
    startNewGame();
}

function updateBeginnerButtonUI() {
    if (isBeginnerMode) {
        beginnerModeBtn.textContent = `✅ 초보자 모드 (Rating ≤ ${BEGINNER_MAX_RATING})`;
        beginnerModeBtn.classList.add('active'); 
    } else {
        beginnerModeBtn.textContent = '초보자 모드 끄기 (전체 Rating)';
        beginnerModeBtn.classList.remove('active');
    }
}

// ===================================
// 3. 새 퍼즐 시작 (필터링 로직 추가)
// ===================================

function startNewGame() {
    if (puzzles.length === 0) return;

    let nextIndex = currentPuzzleIndex;
    let foundPuzzle = null;
    let attempts = 0; 
    
    // ⭐ 필터링 로직: 조건에 맞는 다음 퍼즐을 찾을 때까지 배열 순회 ⭐
    do {
        nextIndex = (nextIndex + 1) % puzzles.length;
        const puzzle = puzzles[nextIndex];
        
        attempts++;
        
        // 필터링 조건
        const isRatingLowEnough = isBeginnerMode ? (puzzle.Rating <= BEGINNER_MAX_RATING) : true;
        
        if (isRatingLowEnough) {
            foundPuzzle = puzzle;
            currentPuzzleIndex = nextIndex;
            break;
        }
        
        // 배열 전체를 순회했지만 적합한 퍼즐을 찾지 못했다면 중단
        if (attempts >= puzzles.length) {
            statusEl.textContent = `⚠️ 초보자 모드에 맞는 퍼즐 (${BEGINNER_MAX_RATING} 이하)이 더 이상 없습니다. 모드를 꺼보세요.`;
            isPuzzleActive = false;
            return;
        }
        
    } while (attempts <= puzzles.length); // 배열 전체 순환 보장

    if (!foundPuzzle) {
        statusEl.textContent = '⚠️ 퍼즐을 찾을 수 없습니다.';
        return;
    }

    currentPuzzle = foundPuzzle;
    
    currentSolutionMoves = currentPuzzle.Moves.split(' '); 
    currentMoveIndex = 0;
    isPuzzleActive = true;
    
    game.load(currentPuzzle.FEN);
    board.position(currentPuzzle.FEN);
    
    puzzleRatingEl.textContent = currentPuzzle.Rating;
    statusEl.classList.remove('correct', 'incorrect');
    
    const turn = game.turn() === 'w' ? '백' : '흑';
    statusEl.textContent = `${turn}의 차례입니다. 정답 수를 두세요.`;
}

// ===================================
// 4. 사용자 수순 확인 (기존 로직 유지)
// ===================================

function checkUserMove(move) {
    if (!isPuzzleActive) return;

    const userMoveUci = move.from + move.to + (move.promotion ? move.promotion : '');
    const expectedMoveUci = currentSolutionMoves[currentMoveIndex];
    
    if (userMoveUci === expectedMoveUci) {
        
        currentMoveIndex++;
        
        if (currentMoveIndex >= currentSolutionMoves.length) {
            handlePuzzleComplete(true);
            return;
        }
        
        statusEl.textContent = '✅ 정답입니다! 상대방의 수를 기다리세요.';
        statusEl.classList.remove('incorrect');
        statusEl.classList.add('correct');
        setTimeout(makeComputerMove, 700); 
        
    } else {
        statusEl.textContent = '❌ 오답입니다. 다시 시도하세요. (다음 퍼즐 버튼을 누르세요.)';
        statusEl.classList.remove('correct');
        statusEl.classList.add('incorrect');
        isPuzzleActive = false;
        
        game.undo(); 
        board.position(game.fen());
    }
}

// ===================================
// 5. 컴퓨터 (상대) 수순 (기존 로직 유지)
// ===================================

function makeComputerMove() {
    if (!isPuzzleActive) return;
    
    const computerMoveUci = currentSolutionMoves[currentMoveIndex];
    const move = game.move(computerMoveUci);
    
    if (move) {
        board.position(game.fen()); 
        currentMoveIndex++;
        
        if (currentMoveIndex >= currentSolutionMoves.length) {
            handlePuzzleComplete(true); 
            return;
        }
        
        const turn = game.turn() === 'w' ? '백' : '흑';
        statusEl.textContent = `상대방의 수: ${move.san}. 이제 ${turn}의 차례입니다. 정답 수를 두세요.`;
        statusEl.classList.remove('incorrect');
        statusEl.classList.add('correct');
        
    } else {
        console.error('컴퓨터 수순이 유효하지 않습니다:', computerMoveUci);
        statusEl.textContent = '오류: 퍼즐 데이터에 문제가 있습니다. 다음 퍼즐로 넘어가세요.';
        isPuzzleActive = false;
    }
}


// ===================================
// 6. 퍼즐 완료 (기존 로직 유지)
// ===================================

function handlePuzzleComplete(isCorrect) {
    isPuzzleActive = false;
    
    if (isCorrect) {
        statusEl.textContent = '🎉 퍼즐 정답 성공! 다음 퍼즐 버튼을 누르세요.';
        statusEl.classList.remove('incorrect');
        statusEl.classList.add('correct');
    } else {
        statusEl.textContent = '퍼즐 실패. 다음 퍼즐 버튼을 누르세요.';
        statusEl.classList.remove('correct');
        statusEl.classList.add('incorrect');
    }
}

// ===================================
// 7. 초기화
// ===================================

window.onload = loadPuzzles;
