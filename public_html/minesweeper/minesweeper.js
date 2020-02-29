var sketch = function (p) {
    p.livebombs = 0;
    p.mainColor = p.color;
    let minefield = [];
    p.lose = false;
    p.finished = false;
    p.win = false;
    p.firstClick = true;
    let stack = [];
    p.settingsHidden = true;
    p.animation = 0;
    p.normalCellwidth = 20;
    p.cellWidth = 20;
    p.offsetX = 0;
    p.offsetY = 0;
    p.setFlag = false;

    let nilMine = {};

    p.setup = function () {
        nilMine = new Nil();
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.fullscreen();
        p.colorMode(p.HSB, 255, 100, 100);
        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);

        p.mainColor = window.getComputedStyle(p.canvas.parentElement, null).backgroundColor;
        p.background(p.mainColor);
        p.contrastB = p.color(197,10,65);
        p.contrastA = p.color(200,10,30);
        p.main = p.color(200,10,46);

        p.fullscreenGame();
        p.settings();
    };

    p.settings = function () {
        let div = document.getElementById("info");
        document.getElementById("game").appendChild(div);
    };

    p.fullscreenGame = function () {
        let m = p.floor(p.width / p.cellWidth);
        let n = p.floor(p.height / p.cellWidth);
        p.gameGen( m,n, 0.05);
    };

    p.gameGen = function (m,n,b) {
        p.firstClick = true;
        p.lost = false;
        p.win = false;
        p.finished = false;
        minefield = new Array(m);
        for (let i = 0; i < m; i++) {
            minefield[i] = new Array(n);
        }
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < m; i++) {
                if (i === 0 && j === 0) {
                    minefield[0][0] = new Settings(0,0);
                    continue;
                }
                minefield[i][j] = new Cell(i,j);
            }
        }
        let bombcount = p.floor((m * n) * b) + 1;
        livebombs = m*n - 1;
        for (let i = 0; i < bombcount; i++) {
            let mine = minefield[p.floor(p.random(m))][p.floor(p.random(n))];
            if (!mine.isMine()) {
                mine.makeMine();
                let neighbours = mine.getNeighbours();
                for (let j = 0; j < 8; j++) {
                    let neighbour = neighbours[j];
                    neighbour.incrementSurrounded();
                }
            } else {
                i--;
            }
        }
        minefield[0][0].removeMine();
    };

    p.draw = function () {
        p.background(p.mainColor);
        var width = minefield.length;
        var height = minefield[0].length;
        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                minefield[i][j].displayCell();
            }
        }
        if (livebombs === 0) {
            p.win = true;
            p.finished = true;
            p.colorMode(p.HSB, 255, 100, 100);
            p.animation++;
        }
    };

    p.windowResized = function () {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.cellClick = function () {
        let x = (p.mouseX - p.offsetX) / p.cellWidth;
        let y = (p.mouseY - p.offsetY) / p.cellWidth;
        minefield[p.floor(x)][p.floor(y)].click();

    };

    p.flagCell = function () {
        p.setFlag = true;
        let x = (p.mouseX - p.offsetX) / p.cellWidth;
        let y = (p.mouseY - p.offsetY) / p.cellWidth;
        minefield[p.floor(x)][p.floor(y)].flag();
    };

    p.timeoutId = 0;
    p.mousePressed = function () {
        p.setFlag = false;
        if (p.mouseButton === p.LEFT) {
            p.timeoutId = setTimeout(p.flagCell, 150);
        } else if (p.mouseButton === p.RIGHT) {
            p.flagCell();
        }
    };

    p.mouseReleased = function () {
        clearTimeout(p.timeoutId);
        if (!p.setFlag) {
            p.cellClick();
        }
    };

    p.keyTyped = function () {
        if (p.key === 'r') {
            p.fullscreenGame();
        }
    };

    class Cell {
        constructor(x, y) {
            this.x = x;
            this.y = y;

            this.posX = this.x * p.cellWidth + p.offsetX;
            this.posY = this.y * p.cellWidth + p.offsetY;

            this.flagged = false;
            this.hidden = true;
            this.mine = false;
            this.surrounded = 0;

            this.neighbours = [];
            for (let i = 0; i < 8; i++) {
                this.neighbours[i] = nilMine;
            }
            this.initNeighbours();
        }

        discover() {
            livebombs--;
            this.hidden = false;
        }

        isHidden() {
            return this.hidden;
        }

        decrementSurrounded() {
            this.surrounded--;
        }

        incrementSurrounded() {
            this.surrounded++;
        }

        isSurrounded() {
            return this.surrounded !== 0;
        }

        removeMine() {
            if (this.isMine()) {
                this.mine = false;
                for (let i = 0; i < 8; i++) {
                    this.neighbours[i].decrementSurrounded();
                }
            }
        }

        makeMine() {
            this.mine = true;
        }

        isMine() {
            return this.mine;
        }

        initNeighbours() {
            let a,b;
            if (this.x - 1 >= 0) {
                this.handshake(3, minefield[this.x - 1][this.y]);
                a = true;
            }
            if (this.y - 1 >= 0) {
                this.handshake(1, minefield[this.x][this.y - 1]);
                b = true;
            }
            if (this.x  + 1 < minefield.length && b) {
                this.handshake(2, minefield[this.x + 1][this.y - 1]);
            }
            if (a && b) {
                this.handshake(0, minefield[this.x - 1][this.y - 1]);
            }
        }

        //link cells to their 8 neighbours.
        handshake(i,cell){
            this.setNeighbour(i, cell);
            cell.setNeighbour(7 - i, this);
        }

        getNeighbours(){
            return this.neighbours;
        }

        // 0 | 1 | 2
        // 3 | C | 4
        // 5 | 6 | 7
        // nill mine if out of bounds
        setNeighbour(i, cell) {
            this.neighbours[i] = cell;

        }

        flag() {
            if (this.isMine() && !this.flagged) {
                livebombs--;
            } else if (this.isMine()) {
                livebombs++;
            }
            this.flagged = !this.flagged;
        }

        isflagged() {
            return this.flagged();
        }

        displayCell() {
            this.margin = p.cellWidth*0.1;
            p.textSize(p.cellWidth * 0.8);
            p.textAlign(p.CENTER, p.CENTER);
            if (this.hidden) {
                p.fill(p.contrastB);
                p.triangle(this.posX ,this.posY, this.posX + p.cellWidth,this.posY, this.posX,this.posY+p.cellWidth);
                p.fill(p.contrastA);
                p.triangle(this.posX + p.cellWidth,this.posY, this.posX,this.posY + p.cellWidth, this.posX + p.cellWidth,this.posY + p.cellWidth);
                p.fill(p.main);
                p.rect(this.posX+this.margin,this.posY+this.margin, p.cellWidth-2*this.margin, p.cellWidth-2*this.margin);
                if (this.flagged && !p.finished) {
                    p.fill(0, 0, 0);
                    p.text("X", this.posX + p.cellWidth / 2, this.posY + p.cellWidth / 1.75);
                } else if (p.finished && this.isMine()) {
                    if (p.win) {
                        p.colorMode(p.HSB, 255, 100, 100);
                        p.fill((p.animation+(255/(minefield.length))*this.x)%255,100,100);
                    } else {
                        p.fill(255, 0, 0);
                    }
                    p.text("X", this.posX + p.cellWidth / 2, this.posY + p.cellWidth / 1.75);
                }
            }
            if (!this.hidden && this.isSurrounded()) {
                p.colorMode(p.RGB, 255, 255, 255);
                switch (this.surrounded) {
                    case 1:
                        p.fill(0,128,255);
                        break;
                    case 2:
                        p.fill(0, 130, 0);
                        break;
                    case 3:
                        p.fill(255, 0, 0);
                        break;
                    case 4:
                        p.fill(0, 0, 132);
                        break;
                    case 5:
                        p.fill(132, 0, 0);
                        break;
                    case 6:
                        p.fill(0, 130, 132);
                        break;
                    case 7:
                        p.fill(132, 0, 132);
                        break;
                    case 8:
                        p.fill(0, 0, 0);
                        break;
                }
                p.textSize(p.cellWidth * 0.8);
                p.textAlign(p.CENTER, p.CENTER);
                p.text(this.surrounded, this.posX+p.cellWidth/2, this.posY+p.cellWidth/1.75);
            }
        }

        firstclick() {
            this.removeMine();
            for (let i = 0; i < 8; i++) {
                this.neighbours[i].removeMine();
            }
        }

        click() {
            if (!p.settingsHidden || p.finished) {
                return;
            }
            if (p.firstClick) {
                p.firstClick = false;
                this.firstclick();
            }
            if (this.isMine()) {
                p.lose = true;
                p.finished = true;
                p.fill(255, 0, 0);
                return;
            }

            if (this.flagged) {
                this.flag();
                return;
            }

            if (this.hidden) {
                this.discover();
                if (this.surrounded === 0) {
                    stack.push(this);
                    while (stack.length > 0) {
                        let target = stack.pop();
                        let neighbours = target.getNeighbours();
                        for (let i = 0; i <8; i++) {
                            let neighbour = neighbours[i];
                            if (neighbour.isHidden()) {
                                neighbour.discover();
                                if (!neighbour.isSurrounded()) {
                                    stack.push(neighbour);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    class Settings extends Cell {
        constructor(x,y) {
            super(x,y);
            this.hidden = true;
            this.flagged = false;
        }
        isMine() {
            return false;
        }

        discover() {
        }

        flag() {
        }

        displayCell() {
            super.displayCell();
            p.colorMode(p.RGB, 100, 100, 100);
            p.fill(255, 255, 255);
            p.text("⚙", this.posX + p.cellWidth / 2, this.posY + p.cellWidth / 1.75);
        }
        removeMine() {
            if (this.isMine()) {
                this.mine = false;
                for (let i = 0; i < 8; i++) {
                    this.neighbours[i].decrementSurrounded();
                }
            }
        }
        click() {
            p.toggleInfo();
        }
    }

    class Nil extends Cell {
        constructor() {
            super();
            this.hidden = false;
        }
        initNeighbours() {
        }
        discover() {
        }
        flag() {
        }
    }

    p.toggleInfo = function() {
        p.settingsHidden = !p.settingsHidden;
        let state = document.getElementById('info').style.display;
        if (state === 'block') {
            document.getElementById('info').style.display = 'none';
        } else {
            document.getElementById('info').style.display = 'block';
        }
    }
};

var minesweeper = new p5(sketch);

let difficulty = 1.5;
let gamesize = 4;
function settingsInput(e) {
    switch (e) {
        case '0':
            difficulty = 1;
            break;
        case '1':
            difficulty = 1.5;
            break;
        case '2':
            difficulty = 3;
            break;
        case 'a':
            gamesize = 4;
            break;
        case 'b':
            gamesize = 2;
            break;
        case 'c':
            gamesize = 1;
            break;
    }
}

function restart() {
    let m = minesweeper.floor(minesweeper.width / minesweeper.normalCellwidth / gamesize);
    let n = minesweeper.floor(minesweeper.height / minesweeper.normalCellwidth / gamesize);
    minesweeper.cellWidth = minesweeper.normalCellwidth*gamesize;
    minesweeper.gameGen( m,n, 0.05 * (difficulty*difficulty));
    minesweeper.toggleInfo();
}