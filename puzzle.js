// 전역 변수 설정
let board = null; // chessboard.js 인스턴스 (시각화)
let game = null; // chess.js 인스턴스 (게임 규칙, FEN, 수순 관리)
let puzzles = [];
let currentPuzzle = null;
let currentPuzzleIndex = -1; // -1에서 시작하여 첫 호출 시 0이 되도록
let currentSolutionMoves = [];
let currentMoveIndex = 0;
let isPuzzleActive = false;

// DOM 요소 캐싱
const statusEl = document.getElementById('status');
const puzzleRatingEl = document.getElementById('puzzleRating');
// ***추가된 DOM 요소 (HTML에 ID: nextPuzzleBtn이 있어야 함)***
const nextPuzzleBtn = document.getElementById('nextPuzzleBtn'); 

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

    // 유효하지 않은 수순이거나, 규칙에 맞지 않는 수순이면 되돌리기
    if (move === null) return 'snapback';

    // 유효한 수이므로 정답 확인 로직으로 이동
    checkUserMove(move);

    // 유효한 수이므로 되돌리지 않음
    return; 
}

function initBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        // *** 수정: 이미지 로딩 경로를 img/ 폴더 바로 아래로 변경 ***
        pieceTheme: 'img/{piece}.png' 
    };
    
    // myBoard는 HTML에서 정의된 ID입니다.
    board = Chessboard('myBoard', config);
    // 게임 규칙 엔진 초기화
    game = new Chess();
}

function onSnapEnd () {
    // 수순이 끝난 후 보드를 현재 FEN으로 갱신
    board.position(game.fen());
}

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
        
        // *** 다음 퍼즐 버튼 이벤트 리스너 추가 ***
        if (nextPuzzleBtn) {
            nextPuzzleBtn.addEventListener('click', startNewGame);
        }

        startNewGame(); // 첫 퍼즐 시작
        
    } catch (error) {
        console.error('퍼즐 로드 중 오류 발생:', error);
        statusEl.textContent = '오류: puzzles.json 파일을 찾거나 로드할 수 없습니다. (콘솔 확인)';
    }
}

// ===================================
// 2. 새 퍼즐 시작
// ===================================

function startNewGame() {
    if (puzzles.length === 0) return;

    // 인덱스 증가 및 순환
    currentPuzzleIndex = (currentPuzzleIndex + 1) % puzzles.length;
    currentPuzzle = puzzles[currentPuzzleIndex];
    
    // **핵심: Moves 문자열을 배열로 분할**
    currentSolutionMoves = currentPuzzle.Moves.split(' '); 
    
    currentMoveIndex = 0;
    isPuzzleActive = true;
    
    // chess.js 및 chessboard.js 초기화
    game.load(currentPuzzle.FEN);
    board.position(currentPuzzle.FEN);
    
    // UI 업데이트
    puzzleRatingEl.textContent = currentPuzzle.Rating;
    statusEl.classList.remove('correct', 'incorrect');
    
    const turn = game.turn() === 'w' ? '백' : '흑';
    statusEl.textContent = `${turn}의 차례입니다. 정답 수를 두세요.`;
    
    // Lichess 퍼즐은 FEN 턴이 플레이어 턴을 나타낸다고 가정하므로, 컴퓨터 선수는 없습니다.
}

// ===================================
// 3. 사용자 수순 확인
// ===================================

function checkUserMove(move) {
    if (!isPuzzleActive) return;

    // chess.js move 객체를 UCI로 변환 (promotion 포함)
    const userMoveUci = move.from + move.to + (move.promotion ? move.promotion : '');
    const expectedMoveUci = currentSolutionMoves[currentMoveIndex];
    
    // 정답 확인 (UCI 비교)
    if (userMoveUci === expectedMoveUci) {
        
        currentMoveIndex++;
        
        // 퍼즐 완료 확인 (사용자 수가 마지막 수인 경우)
        if (currentMoveIndex >= currentSolutionMoves.length) {
            handlePuzzleComplete(true);
            return;
        }
        
        // 컴퓨터(상대방)의 반격 수순 진행 (0.7초 딜레이)
        statusEl.textContent = '✅ 정답입니다! 상대방의 수를 기다리세요.';
        statusEl.classList.remove('incorrect');
        statusEl.classList.add('correct');
        setTimeout(makeComputerMove, 700); 
        
    } else {
        // 오답
        statusEl.textContent = '❌ 오답입니다. 다시 시도하세요. (다음 퍼즐 버튼을 누르세요.)';
        statusEl.classList.remove('correct');
        statusEl.classList.add('incorrect');
        isPuzzleActive = false;
        
        // 오답 수순은 게임 상태에 남겨두지 않고, 이전 FEN으로 복구
        game.undo(); 
        board.position(game.fen());
    }
}

// ===================================
// 4. 컴퓨터 (상대) 수순
// ===================================

function makeComputerMove() {
    if (!isPuzzleActive) return;
    
    const computerMoveUci = currentSolutionMoves[currentMoveIndex];
    
    // chess.js로 수를 두고, chessboard.js로 시각적 업데이트
    const move = game.move(computerMoveUci);
    
    if (move) {
        board.position(game.fen()); // 보드 업데이트
        
        currentMoveIndex++;
        
        // 퍼즐 완료 확인 (컴퓨터 수가 마지막 수인 경우)
        if (currentMoveIndex >= currentSolutionMoves.length) {
            handlePuzzleComplete(true); // <--- 컴퓨터 수가 퍼즐 완료 수라면 정답 처리
            return;
        }
        
        // 다음은 다시 플레이어 턴
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
// 5. 퍼즐 완료
// ===================================

function handlePuzzleComplete(isCorrect) {
    isPuzzleActive = false;
    
    if (isCorrect) {
        // saveUserRating(currentPuzzle.Rating, true); // 계정 기능 제외
        statusEl.textContent = '🎉 퍼즐 정답 성공! 다음 퍼즐 버튼을 누르세요.';
        statusEl.classList.remove('incorrect');
        statusEl.classList.add('correct');
    } else {
        // saveUserRating(currentPuzzle.Rating, false); // 계정 기능 제외
        statusEl.textContent = '퍼즐 실패. 다음 퍼즐 버튼을 누르세요.';
        statusEl.classList.remove('correct');
        statusEl.classList.add('incorrect');
    }
}

// ===================================
// 6. 초기화
// ===================================

window.onload = loadPuzzles;
