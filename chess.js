const PIECES = {
  KING: 'k', QUEEN: 'q', ROOK: 'r', BISHOP: 'b', KNIGHT: 'n', PAWN: 'p'
};

const COLORS = { WHITE: 'w', BLACK: 'b' };

const PIECE_VALUES = { k: 0, q: 9, r: 5, b: 3, n: 3, p: 1 };

function createGame() {
  const board = initBoard();
  return {
    board,
    turn: COLORS.WHITE,
    castling: { wk: true, wq: true, bk: true, bq: true },
    enPassant: null,
    halfMoves: 0,
    fullMoves: 1,
    history: [],
    status: 'playing'
  };
}

function initBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRank[c], color: COLORS.BLACK };
    board[1][c] = { type: 'p', color: COLORS.BLACK };
    board[6][c] = { type: 'p', color: COLORS.WHITE };
    board[7][c] = { type: backRank[c], color: COLORS.WHITE };
  }
  return board;
}

function cloneGame(game) {
  return {
    board: game.board.map(row => row.map(cell => cell ? { ...cell } : null)),
    turn: game.turn,
    castling: { ...game.castling },
    enPassant: game.enPassant ? { ...game.enPassant } : null,
    halfMoves: game.halfMoves,
    fullMoves: game.fullMoves,
    history: [],
    status: game.status
  };
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && board[r][c].type === 'k' && board[r][c].color === color)
        return { r, c };
  return null;
}

function isSquareAttacked(board, r, c, byColor) {
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (!p || p.color !== byColor) continue;
      const moves = rawMoves(board, row, col, p, null, true);
      if (moves.some(m => m.r === r && m.c === c)) return true;
    }
  return false;
}

function isInCheck(game, color) {
  const king = findKing(game.board, color);
  if (!king) return false;
  const enemy = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
  return isSquareAttacked(game.board, king.r, king.c, enemy);
}

function rawMoves(board, r, c, piece, enPassant, attackOnly) {
  const moves = [];
  const dir = piece.color === COLORS.WHITE ? -1 : 1;

  switch (piece.type) {
    case 'p': {
      if (!attackOnly) {
        if (inBounds(r + dir, c) && !board[r + dir][c]) {
          moves.push({ r: r + dir, c });
          const startRow = piece.color === COLORS.WHITE ? 6 : 1;
          if (r === startRow && !board[r + 2 * dir][c])
            moves.push({ r: r + 2 * dir, c });
        }
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir, nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (board[nr][nc] && board[nr][nc].color !== piece.color)
          moves.push({ r: nr, c: nc });
        else if (attackOnly && !board[nr][nc])
          moves.push({ r: nr, c: nc });
        if (enPassant && enPassant.r === nr && enPassant.c === nc)
          moves.push({ r: nr, c: nc, enPassant: true });
      }
      break;
    }
    case 'n':
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color !== piece.color))
          moves.push({ r: nr, c: nc });
      }
      break;
    case 'b':
      slideMoves(board, r, c, piece, [[-1,-1],[-1,1],[1,-1],[1,1]], moves);
      break;
    case 'r':
      slideMoves(board, r, c, piece, [[-1,0],[1,0],[0,-1],[0,1]], moves);
      break;
    case 'q':
      slideMoves(board, r, c, piece, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], moves);
      break;
    case 'k':
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color !== piece.color))
          moves.push({ r: nr, c: nc });
      }
      break;
  }
  return moves;
}

function slideMoves(board, r, c, piece, directions, moves) {
  for (const [dr, dc] of directions) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (!board[nr][nc]) { moves.push({ r: nr, c: nc }); }
      else {
        if (board[nr][nc].color !== piece.color) moves.push({ r: nr, c: nc });
        break;
      }
      nr += dr; nc += dc;
    }
  }
}

function getLegalMoves(game, r, c) {
  const piece = game.board[r][c];
  if (!piece || piece.color !== game.turn) return [];

  const raw = rawMoves(game.board, r, c, piece, game.enPassant, false);
  const legal = [];

  for (const move of raw) {
    const sim = cloneGame(game);
    applyMove(sim, r, c, move);
    if (!isInCheck(sim, piece.color)) {
      legal.push(move);
    }
  }

  if (piece.type === 'k') {
    const row = piece.color === COLORS.WHITE ? 7 : 0;
    const enemy = piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    if (r === row && c === 4) {
      const ks = piece.color === COLORS.WHITE ? 'wk' : 'bk';
      if (game.castling[ks] && !game.board[row][5] && !game.board[row][6]
        && game.board[row][7] && game.board[row][7].type === 'r'
        && !isSquareAttacked(game.board, row, 4, enemy)
        && !isSquareAttacked(game.board, row, 5, enemy)
        && !isSquareAttacked(game.board, row, 6, enemy)) {
        legal.push({ r: row, c: 6, castle: 'k' });
      }
      const qs = piece.color === COLORS.WHITE ? 'wq' : 'bq';
      if (game.castling[qs] && !game.board[row][3] && !game.board[row][2] && !game.board[row][1]
        && game.board[row][0] && game.board[row][0].type === 'r'
        && !isSquareAttacked(game.board, row, 4, enemy)
        && !isSquareAttacked(game.board, row, 3, enemy)
        && !isSquareAttacked(game.board, row, 2, enemy)) {
        legal.push({ r: row, c: 2, castle: 'q' });
      }
    }
  }

  return legal;
}

function getAllLegalMoves(game) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (game.board[r][c] && game.board[r][c].color === game.turn)
        for (const m of getLegalMoves(game, r, c))
          moves.push({ from: { r, c }, to: m });
  return moves;
}

function applyMove(game, fromR, fromC, move) {
  const piece = game.board[fromR][fromC];

  if (move.enPassant) {
    game.board[fromR][move.c] = null;
  }

  if (move.castle) {
    const row = fromR;
    if (move.castle === 'k') {
      game.board[row][6] = piece;
      game.board[row][4] = null;
      game.board[row][5] = game.board[row][7];
      game.board[row][7] = null;
    } else {
      game.board[row][2] = piece;
      game.board[row][4] = null;
      game.board[row][3] = game.board[row][0];
      game.board[row][0] = null;
    }
    return;
  }

  game.board[move.r][move.c] = piece;
  game.board[fromR][fromC] = null;

  if (piece.type === 'p' && Math.abs(move.r - fromR) === 2) {
    game.enPassant = { r: (fromR + move.r) / 2, c: fromC };
  } else {
    game.enPassant = null;
  }

  if (piece.type === 'p' && (move.r === 0 || move.r === 7)) {
    game.board[move.r][move.c] = { type: 'q', color: piece.color };
  }

  if (piece.type === 'k') {
    if (piece.color === COLORS.WHITE) { game.castling.wk = false; game.castling.wq = false; }
    else { game.castling.bk = false; game.castling.bq = false; }
  }
  if (piece.type === 'r') {
    if (fromR === 7 && fromC === 0) game.castling.wq = false;
    if (fromR === 7 && fromC === 7) game.castling.wk = false;
    if (fromR === 0 && fromC === 0) game.castling.bq = false;
    if (fromR === 0 && fromC === 7) game.castling.bk = false;
  }
}

function makeMove(game, fromR, fromC, toR, toC) {
  const moves = getLegalMoves(game, fromR, fromC);
  const move = moves.find(m => m.r === toR && m.c === toC);
  if (!move) return false;

  const captured = game.board[toR][toC];
  const piece = game.board[fromR][fromC];

  game.history.push({
    from: { r: fromR, c: fromC },
    to: { r: toR, c: toC },
    piece: { ...piece },
    captured: captured ? { ...captured } : null,
    enPassant: move.enPassant || false,
    castle: move.castle || null
  });

  applyMove(game, fromR, fromC, move);

  if (piece.type !== 'p' && !captured) game.halfMoves++;
  else game.halfMoves = 0;
  if (game.turn === COLORS.BLACK) game.fullMoves++;
  game.turn = game.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

  const allMoves = getAllLegalMoves(game);
  if (allMoves.length === 0) {
    game.status = isInCheck(game, game.turn) ? 'checkmate' : 'stalemate';
  } else if (isInCheck(game, game.turn)) {
    game.status = 'check';
  } else {
    game.status = 'playing';
  }

  return true;
}

function squareName(r, c) {
  return String.fromCharCode(97 + c) + (8 - r);
}

function moveToNotation(game, fromR, fromC, toR, toC) {
  const piece = game.board[fromR][fromC];
  if (!piece) return '';
  const move = game.history[game.history.length - 1];
  if (move && move.castle === 'k') return 'O-O';
  if (move && move.castle === 'q') return 'O-O-O';

  const pieceLetters = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: '' };
  let notation = pieceLetters[piece.type];
  const captured = move && move.captured;
  if (piece.type === 'p' && captured) notation += String.fromCharCode(97 + fromC);
  if (captured) notation += 'x';
  notation += squareName(toR, toC);

  if (game.status === 'checkmate') notation += '#';
  else if (game.status === 'check') notation += '+';

  return notation;
}
