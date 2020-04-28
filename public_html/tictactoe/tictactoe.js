/**
 * Class containing all the information of the board.
 * Used in the Alpha Beta search.
 */
class Board {
    states = new Array(9).fill('empty');

    xToMove = true;

    humanIsX = true;

    finished = false;

    bestMove = undefined;

    winner = undefined;

    spacesLeft = 9;

    constructor(xToMove, humanIsX, states) {
        this.humanIsX = humanIsX;
        this.xToMove = xToMove;
        if (Array.isArray(states)) {
            states.forEach(state => {if (state !== 'empty') this.spacesLeft--});
            this.states = states;
            this.finished = this.spacesLeft === 0;
            let winner = this.getWinner();
            if (winner !== undefined) {
                this.finished = true;
                this.winner = winner;
            }
        }
    }

    getWinner() {
        for (let i = 0; i < 3; i++) {
            if (this.states[i * 3] === this.states[i * 3 + 1] && this.states[i * 3 + 1] === this.states[i * 3 + 2] && this.states[i*3] !== 'empty') return this.states[i*3];
            if (this.states[i] === this.states[i + 3] && this.states[i + 3] === this.states[i + 6] && this.states[i] !== 'empty') return this.states[i];
        }
        if (this.states[0] === this.states[4] && this.states[4] === this.states[8] && this.states[0] !== 'empty') return this.states[0];
        if (this.states[6] === this.states[4] && this.states[4] === this.states[2] && this.states[6] !== 'empty') return this.states[6];
        return undefined;
    }

    getChildren(){
        let children = new Array(this.spacesLeft);
        let c = 0;
        for (let i = 0; i < 9; i++) {
            if (this.states[i] === 'empty') {
                let stateCopy = this.states.slice();
                stateCopy[i] = this.xToMove ? "x":"o";
                children[c++] = new Board(!this.xToMove, this.humanIsX, stateCopy);
            }
        }
        return children;
    }
}

// Alpha beta searches the game to find the best move.
alphabeta = function (board, alpha, beta) {
    if (board.finished) return eval(board);
    let value;
    if (board.xToMove) {
        value = -2;
        let children = board.getChildren();
        for (let i = 0; i < children.length; i++) {
            let newvalue = alphabeta(children[i], alpha, beta);
            if (newvalue > value) {
                value = newvalue;
                board.bestMove = children[i];
            }
            alpha = Math.max(alpha, value);
            if (alpha >= beta) {
                break;
            }
        }
        return value;
    } else {
        value = 2;
        let children = board.getChildren();
        for (let i = 0; i < children.length; i++) {
            let newvalue = alphabeta(children[i], alpha, beta);
            if (newvalue < value) {
                value = newvalue;
                board.bestMove = children[i];
            }
            beta = Math.min(beta, value);
            if (alpha >= beta) {
                break;
            }
        }
        return value;
    }
};

// Evaluate the board.
eval = function (board) {
    // Without the depth bonus the AI would quit when he was about to lose.
    let depthBonus = ((9 - board.spacesLeft) / 9);
    // Tie is in favor of the computer.
    if (board.winner === undefined) return board.humanIsX ? -1.5 : 1.5;
    // Else check who won where the player winning is in favor of the computer.
    if (board.winner === "x") {
        return -1;
    } else {
        return 1;
    }
};

let board = new Board(true, true);
let game = document.getElementById("game");
let waiting = false;

// Function that handles user input.
doMove = function (i) {
    let state = board.states[i];
    if (board.finished) {
        restart();
        return;
    }
    if (state !== 'empty') return;

    state = board.xToMove ? "x" : "o";
    let newBoard = board.states.slice();
    newBoard[i] = state;
    board = new Board(!board.xToMove, board.humanIsX, newBoard);
    game.children[i].classList.add(state);

    if (board.finished) {
        setTimeout(function () {
            winAnimation();
        }, 10);
        return;
    }

    setTimeout(function () {
        alphabeta(board, -2, 2);
        for (let j = 0; j < board.bestMove.states.length; j++) {
            if (board.states[j] !== board.bestMove.states[j]) {
                game.children[j].classList.add(board.bestMove.states[j]);
            }
        }
        board = board.bestMove;
        if (board.finished) {
            winAnimation();
        }
    }, 10);
};

winAnimation = function () {
    if (board.getWinner() === undefined) {
        console.log("tie game");
        Array.from(game.children).forEach(child =>{
            child.classList.add("tie");
        })
    }
    for (let i = 0; i < 3; i++) {
        if (board.states[0 + i * 3] === board.states[1 + i * 3] && board.states[1 + i * 3] === board.states[2 + i * 3]) {
            [0 + i * 3, 1 + i * 3, 2 + i*3].forEach(i=>{game.children[i].classList.add("lost")});
        }
        if (board.states[i] === board.states[i + 3] && board.states[i + 3] === board.states[i + 6]) {
            [i, i + 3, i + 6].forEach(i=>{game.children[i].classList.add("lost")});
        }
    }
    if (board.states[0] === board.states[4] && board.states[4] === board.states[8])[0,4,8].forEach(i=>{game.children[i].classList.add("lost")});
    if (board.states[2] === board.states[4] && board.states[4] === board.states[6])[2,4,6].forEach(i=>{game.children[i].classList.add("lost")});
    console.log("over");
};

restart = function () {
    let human = !board.humanIsX;
    board = new Board(true, human);
    for (let i = 0; i < game.children.length; i++) {
        game.children[i].classList.remove("x", "o", "lost", "tie");
    }
    if (!board.humanIsX) {
        setTimeout(function () {
            alphabeta(board, -2, 2);
            for (let j = 0; j < board.bestMove.states.length; j++) {
                if (board.states[j] !== board.bestMove.states[j]) {
                    game.children[j].classList.add(board.bestMove.states[j]);
                }
            }
            board = board.bestMove;
        },10)
    }
};

window.onload = function () {
    game = document.getElementById("game");

    let min = Math.floor(Math.min(window.outerHeight, window.outerWidth) * 0.8);
    min = Math.max(100, min);
    game.setAttribute("style", "width:" + min + "px;height:" + min + "px");
    let c = 0;

    // Create a div for each cell
    ["top", "mid", "bottom"].forEach(row => {
        ["left", "", "right"].forEach(column => {
            let div = document.createElement("div");
            div.id = "cell";
            div.classList.add(row);
            div.name = c;
            alert(row + ", " + column);
            if (column !== "") div.classList.add(column);
            div.onclick = function () {
                doMove(this.name);
            };
            game.appendChild(div);
            c++;
        });
    });
};
