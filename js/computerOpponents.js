// Base class for a computer-controlled player
class ComputerOpponent {
    /**
     * Constructor to initialize the AI player.
     * @param {Game} game - The game instance.
     * @param {string} player - The player's color.
     * @param {number} playerIndex - The index of the player in the player list.
     */
    constructor(game, player, playerIndex) {
        this.game = game;
        this.player = player;
        this.playerIndex = playerIndex;
    }

    /**
     * Makes a move by rolling the dice and choosing a random possible move.
     */
    makeMove() {
        game.rollDice().then(anyMoves => {
            if (anyMoves) {
                const possibleMoves = this.getPossibleMoves();
                if (possibleMoves.length == 0) return;

                // Choose a random move from the list of possible moves
                const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                game.moveToken(this.player, randomMove);
            }
        });
    }

    /**
     * Retrieves all possible moves based on the current dice roll.
     * @returns {Array<number>} - List of token indices that can be moved.
     */
    getPossibleMoves() {
        const possibleMoves = [];

        for (let i = 0; i < 4; i++) {
            const position = game.tokenPositons[this.player][i];
            const newPosition = position + game.lastRolledValue;

            // Check if the token can move to a valid position
            if (newPosition >= 0 && newPosition < playerPaths[this.player].length) {
                possibleMoves.push(i);
            }
        }

        return possibleMoves;
    }
}

// Advanced AI class using Monte Carlo simulations for decision-making
class MonteCarloOpponent extends ComputerOpponent {
    RANDOM_GAMES_PER_MOVE = 20; // Number of random simulations per move
    MOVES_PER_GAME = 20; // Maximum number of moves in a single simulation

    /**
     * Constructor to initialize the Monte Carlo opponent.
     * @param {Game} game - The game instance.
     * @param {string} player - The player's color.
     * @param {number} playerIndex - The index of the player in the player list.
     */
    constructor(game, player, playerIndex) {
        super(game, player, playerIndex);

        // Copy the initial positions for use in simulations
        this.positions = copyArray(game.tokenPositons);
    }

    /**
     * Makes a move using Monte Carlo simulations to determine the best option.
     */
    makeMove() {
        game.rollDice().then(anyMoves => {
            if (anyMoves) {
                const possibleMoves = this.getPossibleMoves();
                if (possibleMoves.length == 0) return;
                if (possibleMoves.length == 1) {
                    // If only one move is possible, perform it directly
                    game.moveToken(this.player, possibleMoves[0]);
                    return;
                }

                // Use Monte Carlo simulations to find the best move
                const bestMove = this.monteCarlo(possibleMoves);
                game.moveToken(this.player, bestMove);
            }
        });
    }

    /**
     * Simulates random games for each possible move to evaluate their outcomes.
     * @param {Array<number>} possibleMoves - List of possible moves.
     * @returns {number} - Index of the best move based on simulations.
     */
    monteCarlo(possibleMoves) {
        const scores = [];

        for (let move of possibleMoves) {
            let scoreSum = 0;

            // Simulate multiple random games for the current move
            for (let i = 0; i < this.RANDOM_GAMES_PER_MOVE; i++) {
                scoreSum += this.randomGame(
                    this.player,
                    this.playerIndex,
                    copyArray(this.positions),
                    move,
                    this.game.lastRolledValue,
                    0
                );
            }

            scores.push([scoreSum, move]);
        }

        // Sort moves by score in descending order
        scores.sort((a, b) => b[0] - a[0]);
        return scores[0][1];
    }

    /**
     * Simulates a random game starting with a specific move.
     * @param {string} player - The current player.
     * @param {number} playerIndex - The index of the current player.
     * @param {Object} positions - The current token positions.
     * @param {number} move - The index of the token to move.
     * @param {number} rolledValue - The dice roll value.
     * @param {number} depth - The current depth of the simulation.
     * @returns {number} - The score of the simulation for the move.
     */
    randomGame(player, playerIndex, positions, move, rolledValue, depth) {
        if (depth >= this.MOVES_PER_GAME) return 0;

        let score = 0;

        if (move !== undefined) {
            // Update the token's position
            positions[player][move] += rolledValue;
            const newTile = playerPaths[player][positions[player][move]];

            // Check for reaching safe spots or sending opponents home
            if (safeTiles.some(safeTile => arraysEqual(safeTile, newTile))) {
                if (player === this.player) score += 10;
            } else {
                // Check for sending opponent tokens home
                for (let otherPlayer of this.game.players) {
                    if (otherPlayer === player) continue;

                    const otherTokensOnTile = positions[otherPlayer].filter((pos, i) =>
                        arraysEqual(playerPaths[otherPlayer][pos], newTile)
                    );

                    if (otherTokensOnTile.length === 1) {
                        score += player === this.player
                            ? 100 * (this.MOVES_PER_GAME - depth)
                            : -100 * (this.MOVES_PER_GAME - depth);
                    }
                }
            }
        }

        // Determine the next player's move
        const nextPlayerIndex = rolledValue === 6 ? playerIndex : (playerIndex + 1) % this.game.numberOfPlayers;
        const nextPlayer = this.game.players[nextPlayerIndex];
        const nextRolledValue = Math.floor(Math.random() * 6) + 1;

        const nextPossibleMoves = [];
        for (let i = 0; i < 4; i++) {
            const newPosition = positions[nextPlayer][i] + nextRolledValue;
            if (newPosition >= 0 && newPosition < playerPaths[nextPlayer].length) {
                nextPossibleMoves.push(i);
            }
        }

        // Choose a random move for the next player
        const chosenMove = nextPossibleMoves[Math.floor(Math.random() * nextPossibleMoves.length)];

        // Continue the simulation
        return score + this.randomGame(nextPlayer, nextPlayerIndex, positions, chosenMove, nextRolledValue, depth + 1);
    }
}
