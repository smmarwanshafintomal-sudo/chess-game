const PIECE_UNICODE = {
  w: { k: '\u2654', q: '\u2655', r: '\u2656', b: '\u2657', n: '\u2658', p: '\u2659' },
  b: { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' }
};

let game = createGame();
let selectedSquare = null;
let legalMoves = [];
let mode = '2p';
let lastMove = null;
let aiThinking = false;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const movesListEl = document.getElementById('moves-list');
const whiteCapturedEl = document.getElementById('white-captured');
const blackCapturedEl = document.getElementById('black-captured');

function init() {
  game = createGame();
  selectedSquare = null;
  legalMoves = [];
  lastMove = null;
  aiThinking = false;
  renderBoard();
  updateStatus();
  updateMoveList();
  updateCaptured();
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.r = r;
      sq.dataset.c = c;

      if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c)
        sq.classList.add('selected');

      if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) ||
          (lastMove.to.r === r && lastMove.to.c === c)))
        sq.classList.add('last-move');

      if (selectedSquare) {
        const isLegal = legalMoves.some(m => m.r === r && m.c === c);
        if (isLegal) {
          if (game.board[r][c]) sq.classList.add('legal-capture');
          else sq.classList.add('legal-move');
        }
      }

      const king = findKing(game.board, game.turn);
      if (king && isInCheck(game, game.turn) && king.r === r && king.c === c)
        sq.classList.add('in-check');

      const piece = game.board[r][c];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece';
        span.textContent = PIECE_UNICODE[piece.color][piece.type];
        sq.appendChild(span);
      }

      sq.addEventListener('click', () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }
}

function onSquareClick(r, c) {
  if (aiThinking) return;
  if (game.status === 'checkmate' || game.status === 'stalemate') return;
  if (mode === 'ai' && game.turn === COLORS.BLACK) return;

  const piece = game.board[r][c];

  if (selectedSquare) {
    const move = legalMoves.find(m => m.r === r && m.c === c);
    if (move) {
      const notation = buildNotation(selectedSquare.r, selectedSquare.c, r, c);
      makeMove(game, selectedSquare.r, selectedSquare.c, r, c);
      lastMove = { from: { r: selectedSquare.r, c: selectedSquare.c }, to: { r, c } };
      selectedSquare = null;
      legalMoves = [];
      renderBoard();
      updateStatus(notation);
      updateMoveList();
      updateCaptured();

      if (mode === 'ai' && game.status !== 'checkmate' && game.status !== 'stalemate') {
        aiThinking = true;
        statusEl.textContent = 'AI thinking...';
        setTimeout(makeAIMove, 100);
      }
      return;
    }

    if (piece && piece.color === game.turn) {
      selectedSquare = { r, c };
      legalMoves = getLegalMoves(game, r, c);
      renderBoard();
      return;
    }

    selectedSquare = null;
    legalMoves = [];
    renderBoard();
    return;
  }

  if (piece && piece.color === game.turn) {
    selectedSquare = { r, c };
    legalMoves = getLegalMoves(game, r, c);
    renderBoard();
  }
}

function buildNotation(fromR, fromC, toR, toC) {
  const piece = game.board[fromR][fromC];
  if (!piece) return '';
  const captured = game.board[toR][toC];
  const move = game.history[game.history.length - 1];
  if (move && move.castle === 'k') return 'O-O';
  if (move && move.castle === 'q') return 'O-O-O';

  const letters = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: '' };
  let n = letters[piece.type];
  if (piece.type === 'p' && (captured || (move && move.enPassant))) n += String.fromCharCode(97 + fromC);
  if (captured || (move && move.enPassant)) n += 'x';
  n += squareName(toR, toC);
  if (game.status === 'checkmate') n += '#';
  else if (game.status === 'check') n += '+';
  return n;
}

function makeAIMove() {
  const move = getBestMove(game, 3);
  if (!move) { aiThinking = false; return; }

  makeMove(game, move.from.r, move.from.c, move.to.r, move.to.c);
  lastMove = { from: { r: move.from.r, c: move.from.c }, to: { r: move.to.r, c: move.to.c } };
  aiThinking = false;
  renderBoard();
  updateStatus();
  updateMoveList();
  updateCaptured();
}

function updateStatus(notation) {
  const turnName = game.turn === COLORS.WHITE ? 'White' : 'Black';
  switch (game.status) {
    case 'checkmate':
      const winner = game.turn === COLORS.WHITE ? 'Black' : 'White';
      statusEl.textContent = `Checkmate! ${winner} wins!`;
      break;
    case 'stalemate':
      statusEl.textContent = 'Stalemate! Draw.';
      break;
    case 'check':
      statusEl.textContent = `${turnName} in check!`;
      break;
    default:
      statusEl.textContent = `${turnName} to move`;
  }
}

function updateMoveList() {
  movesListEl.innerHTML = '';
  const history = game.history;
  for (let i = 0; i < history.length; i += 2) {
    const pair = document.createElement('div');
    pair.className = 'move-pair';

    const num = document.createElement('span');
    num.className = 'move-num';
    num.textContent = (i / 2 + 1) + '.';

    const white = document.createElement('span');
    white.textContent = getMoveNotation(i);

    pair.appendChild(num);
    pair.appendChild(white);

    if (i + 1 < history.length) {
      const black = document.createElement('span');
      black.textContent = getMoveNotation(i + 1);
      pair.appendChild(black);
    }

    movesListEl.appendChild(pair);
  }
  movesListEl.scrollTop = movesListEl.scrollHeight;
}

function getMoveNotation(index) {
  const move = game.history[index];
  if (!move) return '';
  if (move.castle === 'k') return 'O-O';
  if (move.castle === 'q') return 'O-O-O';

  const letters = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: '' };
  let n = letters[move.piece.type];
  if (move.piece.type === 'p' && (move.captured || move.enPassant))
    n += String.fromCharCode(97 + move.from.c);
  if (move.captured || move.enPassant) n += 'x';
  n += squareName(move.to.r, move.to.c);
  return n;
}

function updateCaptured() {
  const whiteCaptured = [];
  const blackCaptured = [];
  for (const move of game.history) {
    if (move.captured) {
      if (move.captured.color === COLORS.WHITE) blackCaptured.push(move.captured);
      else whiteCaptured.push(move.captured);
    }
    if (move.enPassant) {
      const epColor = move.piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      if (epColor === COLORS.WHITE) blackCaptured.push({ type: 'p', color: COLORS.WHITE });
      else whiteCaptured.push({ type: 'p', color: COLORS.BLACK });
    }
  }
  whiteCapturedEl.textContent = whiteCaptured.map(p => PIECE_UNICODE[p.color][p.type]).join('');
  blackCapturedEl.textContent = blackCaptured.map(p => PIECE_UNICODE[p.color][p.type]).join('');
}

document.getElementById('btn-2p').addEventListener('click', () => {
  mode = '2p';
  document.getElementById('btn-2p').classList.add('active');
  document.getElementById('btn-ai').classList.remove('active');
  init();
});

document.getElementById('btn-ai').addEventListener('click', () => {
  mode = 'ai';
  document.getElementById('btn-ai').classList.add('active');
  document.getElementById('btn-2p').classList.remove('active');
  init();
});

document.getElementById('btn-reset').addEventListener('click', init);

init();
