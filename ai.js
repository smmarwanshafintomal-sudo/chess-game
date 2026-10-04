const PIECE_SQUARE_TABLES = {
  p: [
    [0,0,0,0,0,0,0,0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],
    [0,0,0,20,20,0,0,0],
    [5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],
    [0,0,0,0,0,0,0,0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10,5,0,0,0,0,5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [0,0,0,0,0,0,0,0],
    [5,10,10,10,10,10,10,5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [0,0,0,5,5,0,0,0]
  ],
  q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],
    [-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],
    [-10,5,5,5,5,5,0,-10],
    [-10,0,5,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20,20,0,0,0,0,20,20],
    [20,30,10,0,0,10,30,20]
  ]
};

function evaluateBoard(game) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = game.board[r][c];
      if (!p) continue;
      const val = PIECE_VALUES[p.type] * 100;
      const table = PIECE_SQUARE_TABLES[p.type];
      const posVal = p.color === COLORS.WHITE ? table[r][c] : table[7 - r][c];
      if (p.color === COLORS.WHITE) score += val + posVal;
      else score -= val + posVal;
    }
  }
  return score;
}

function minimax(game, depth, alpha, beta) {
  if (depth === 0) return { score: evaluateBoard(game) };

  const moves = getAllLegalMoves(game);

  if (moves.length === 0) {
    if (isInCheck(game, game.turn)) {
      return { score: game.turn === COLORS.WHITE ? -99999 + (3 - depth) * 100 : 99999 - (3 - depth) * 100 };
    }
    return { score: 0 };
  }

  moves.sort((a, b) => {
    const aCapture = game.board[a.to.r][a.to.c] ? PIECE_VALUES[game.board[a.to.r][a.to.c].type] : 0;
    const bCapture = game.board[b.to.r][b.to.c] ? PIECE_VALUES[game.board[b.to.r][b.to.c].type] : 0;
    return bCapture - aCapture;
  });

  let bestMove = null;
  const isMaximizing = game.turn === COLORS.WHITE;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const sim = cloneGame(game);
      makeMove(sim, move.from.r, move.from.c, move.to.r, move.to.c);
      const { score } = minimax(sim, depth - 1, alpha, beta);
      if (score > maxEval) {
        maxEval = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const sim = cloneGame(game);
      makeMove(sim, move.from.r, move.from.c, move.to.r, move.to.c);
      const { score } = minimax(sim, depth - 1, alpha, beta);
      if (score < minEval) {
        minEval = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

function getBestMove(game, depth = 3) {
  const { move } = minimax(game, depth, -Infinity, Infinity);
  return move;
}
