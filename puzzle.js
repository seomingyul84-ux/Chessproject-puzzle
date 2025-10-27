// =========================================================
// 1. 상수 및 초기화
// =========================================================

const chess = new Chess();
let board = null; 

// 🌟🌟🌟 유저 레이팅 관련 상수 (시뮬레이션) 🌟🌟🌟
// 실제 웹 서비스에서는 서버에서 이 값을 받아와야 합니다.
const USER_IS_LOGGED_IN = false; // 현재 비로그인 상태로 시뮬레이션
const GUEST_RATING = 600;
const SIMULATED_USER_RATING = 1500; 
const RATING_TOLERANCE = 200; // 타겟 레이팅 +- 200 범위 내에서 퍼즐 선택

// 🌟🌟🌟 Lichess 퍼즐 데이터 형식 적용 (rating 필드 포함) 🌟🌟🌟
const PUZZLE_DATA = [
    // Puzzle 1: Mate in 2 (고레이팅 퍼즐)
    { 
        fen: 'q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17', 
        full_solution_uci: ['e8d7', 'a2e6', 'd7d8', 'f7f8'], 
        theme: 'Mate in 2',
        rating: 1760 
    },
    // Puzzle 2: Advantage/Very Long (초고레이팅 퍼즐)
    { 
        fen: 'r3r1k1/p4ppp/2p2n2/1p6/3P1qb1/2NQR3/PPB2PP1/R1B3K1 w - - 5 18', 
        full_solution_uci: ['e3g3', 'e8e1', 'g1h2', 'e1c1', 'a1c1', 'f4h6', 'h2g1', 'h6c1'],
        theme: 'Advantage/Very Long',
        rating: 2671
    },
    // Puzzle 3: Advantage/Long (중고레이팅 퍼즐)
    { 
        fen: 'Q1b2r1k/p2np2p/5bp1/q7/5P2/4B3/PPP3PP/2KR1B1R w - - 1 17', 
        full_solution_uci: ['d1d7', 'a5e1', 'd7d1', 'e1e3', 'c1b1', 'e3b6'],
        theme: 'Advantage/Long',
        rating: 2235 
    },
    // Puzzle 4: Endgame (저레이팅 퍼즐 - Guest용)
    {
        fen: '8/8/8/8/4q3/8/5PPP/4k2K w - - 0 1',
        full_solution_uci: ['h1g1', 'e4f3', 'g2f3'],
        theme: 'Endgame Mate (Easy)',
        rating: 650
    },
    // Puzzle 5: Opening Trap (중레이팅 퍼즐 - 로그인 유저 시뮬레이션용)
    {
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 1',
        full_solution_uci: ['e7e5', 'g1f3', 'g8f6', 'f3e5', 'f6e4'],
        theme: 'Opening Trap (Medium)',
        rating: 1400
    },
    // Puzzle 6: Simple Checkmate (최저 레이팅 퍼즐 - Guest용)
    {
        fen: '8/8/8/8/8/3R4/8/1R3K2 w - - 0 1',
        full_solution_uci: ['b1b7', 'e8d8', 'd3d8'],
        theme: 'Rook Mate (Basic)',
        rating: 450
    }
];

let currentPuzzleSolution = []; 
let isPuzzleMode = true; 

// =========================================================
// 2. 헬퍼 함수
// =========================================================

function executeUciMove(uciMove) {
    if (!uciMove || uciMove.length < 4) return null;
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    let promotion = uciMove.length === 5 ? uciMove.substring(4, 5) : undefined;
    try {
        return chess.move({ from: from, to: to, promotion: promotion });
    } catch (e) {
        return null;
    }
}


// =========================================================
// 3. 게임 로직 및 이벤트 핸들러 (퍼즐 로직)
// =========================================================

function onDrop (source, target) {
    if (!isPuzzleMode) return 'snapback'; 
    
    const expectedUciMove = currentPuzzleSolution[0];
    const promotionPiece = expectedUciMove && expectedUciMove.length === 5 ? expectedUciMove.substring(4) : '';
    const playerUciMove = source + target + promotionPiece;
    
    if (playerUciMove !== expectedUciMove) {
        document.getElementById('status').textContent = "오답입니다! 다시 시도해 보세요.";
        return 'snapback'; 
    }

    const move = executeUciMove(playerUciMove);
    if (move === null) return 'snapback'; 

    currentPuzzleSolution.shift(); 
    updateStatus();

    if (currentPuzzleSolution.length === 0) {
        document.getElementById('status').textContent = "🎉 퍼즐 해결 성공! 잠시 후 새 퍼즐이 시작됩니다.";
        setTimeout(() => { startNewGame(); }, 5000);
        return;
    }

    window.setTimeout(puzzleResponse, 500); 
}

function puzzleResponse() {
    if (currentPuzzleSolution.length === 0) return; 

    const aiUciMove = currentPuzzleSolution[0];
    const move = executeUciMove(aiUciMove);

    if (move) {
        if (board) board.position(chess.fen());
        currentPuzzleSolution.shift(); 
        updateStatus();
        
        if (currentPuzzleSolution.length === 0) {
            document.getElementById('status').textContent = "🎉 퍼즐 해결 성공! 잠시 후 새 퍼즐이 시작됩니다.";
             setTimeout(() => { startNewGame(); }, 5000);
        } else {
            document.getElementById('status').textContent = `상대방이 ${move.san} 응수했습니다. 이제 ${chess.turn() === 'w' ? '백' : '흑'} 차례입니다.`;
        }
    } else {
        console.error("Puzzle AI move failed:", aiUciMove);
        document.getElementById('status').textContent = "오류: 퍼즐 응수 수를 둘 수 없습니다.";
    }
}


// =========================================================
// 4. 퍼즐 초기화 로직 (레이팅 필터링 적용)
// =========================================================

function startNewGame() {
    if (!isPuzzleMode) return;
    
    // 1. 타겟 레이팅 결정 (로그인 상태에 따라)
    const targetRating = USER_IS_LOGGED_IN ? SIMULATED_USER_RATING : GUEST_RATING;
    
    // 2. 타겟 레이팅 범위 설정 
    const lowerBound = Math.max(0, targetRating - RATING_TOLERANCE); 
    const upperBound = targetRating + RATING_TOLERANCE;
    
    // 3. 레이팅 범위 내 퍼즐 필터링
    let filteredPuzzles = PUZZLE_DATA.filter(p => p.rating >= lowerBound && p.rating <= upperBound);

    // 필터링된 퍼즐이 없으면 전체 퍼즐 중에서 선택
    if (filteredPuzzles.length === 0) {
        console.warn(`LOG: 레이팅 ${targetRating} 근처의 퍼즐이 없어 전체 퍼즐 중 무작위 선택합니다.`);
        filteredPuzzles = PUZZLE_DATA;
    }
    
    // 4. 무작위 퍼즐 선택
    const currentPuzzleIndex = Math.floor(Math.random() * filteredPuzzles.length);
    const puzzle = filteredPuzzles[currentPuzzleIndex];
    
    // 5. Lichess FEN 로드 및 첫 수 적용
    chess.load(puzzle.fen);
    const opponentInitialMove = executeUciMove(puzzle.full_solution_uci[0]);
    
    if (!opponentInitialMove) {
        console.error("Lichess Initial Move FAILED:", puzzle.full_solution_uci[0]);
        document.getElementById('status').textContent = "⚠️ 퍼즐 초기화 오류: FEN 또는 Moves[0]을 확인하세요.";
        return;
    }
    
    currentPuzzleSolution = puzzle.full_solution_uci.slice(1);
    
    // 6. 보드 방향 설정 및 UI 업데이트
    const puzzleTurn = chess.turn() === 'w' ? 'white' : 'black';
    if (board) board.orientation(puzzleTurn);
    if (board) board.position(chess.fen());
    
    document.getElementById('puzzleRating').textContent = puzzle.rating; 
    document.getElementById('userRating').textContent = targetRating; 
    document.getElementById('controlBoxHeader').textContent = `퍼즐: ${puzzle.theme} (Rating: ${puzzle.rating})`;
    updateStatus();
}

function updateStatus() {
    let status = '';
    const turnColor = chess.turn() === 'w' ? '백' : '흑';
    
    if (currentPuzzleSolution.length === 0) {
        status = '퍼즐 해결 완료!';
    } else {
        status = `${turnColor} 차례입니다. (남은 수: ${Math.ceil(currentPuzzleSolution.length / 2)})`;
    }
    
    document.getElementById('status').textContent = status;
}

// =========================================================
// 5. 초기 실행 (UI 슬라이더 관련 함수 제거)
// =========================================================

const config = {
    draggable: true,
    position: 'start',
    onDrop: onDrop,
    onSnapEnd: function() { 
        if (board) board.position(chess.fen());
    },
    pieceTheme: 'img/{piece}.png' 
};

window.addEventListener('load', function() {
    setTimeout(() => {
        try {
            board = ChessBoard('myBoard', config); 
            startNewGame(); // 퍼즐 시작

        } catch (e) {
            console.error("CRITICAL ERROR: ChessBoard 초기화 실패!", e);
            document.getElementById('status').textContent = "⚠️ 치명적 오류: Chessboard 라이브러리 로드 실패!";
        }
    }, 250);
});
