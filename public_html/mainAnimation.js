/**
 * Animation that creates 'cells' that can split and share their genes.
 * Their genes include their color and their fertility where fertility is how likely they are to split.
 */
let CelAnimation = function (p) {

    // General animation speed.
    let SPEED_FACTOR = 0.3;

    // Range in which the colors spawn.
    let COLOR_RANGE;

    // Default MAX_CELLS.
    let MAX_CELLS = 400;

    // Basic fertility.
    let DEFAULT_FERTILITY = 0.001;

    /**
     * Main p5.js setup
     */
    p.setup = function () {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.HSB, 100, 100, 100);

        //use parent element background color as main color
        p.mainColor = window.getComputedStyle(p.canvas.parentElement, null).backgroundColor;
        p.noStroke();

        // General container for all the cells.
        p.handler = new cellHandler();

        // Range in which the cell colors are spawn.
        COLOR_RANGE = p.random(100);

        // Base maximum amount of cells on the size of the screen.
        MAX_CELLS = (p.windowWidth * p.windowHeight) / 2000;
    };

    /**
     * Main animation request.
     */
    p.draw = function () {
        // If there are few to no cells we create a new one with random genes.
        if (p.handler.cells.length === 0 || (p.random(1) < (0.002*p.handler.cells.length)) && p.handler.cells.length < MAX_CELLS*0.1) {
            p.handler.newCell(p.createVector(p.random(p.width),p.random(p.height)),p5.Vector.random2D(), p.random(100),DEFAULT_FERTILITY)
        }

        // 0.01 chance to spawn a new cell if there is room.
        if (p.random(1) < 0.01 && p.handler.cells.length < MAX_CELLS) {
            p.handler.newCell(p.createVector(p.random(p.width),p.random(p.height)),p5.Vector.random2D(), p.random(100),DEFAULT_FERTILITY)
        }

        // Clear and draw the cells.
        p.background(p.mainColor);
        p.handler.updateCells();
    };

    /**
     * Function to remove element from array
     */
    Array.prototype.remove = function(x){
        return this.filter(function(v){
            return v !== x;
        });
    };

    /**
     * Main handler object for all the cells
     */
    class cellHandler {
        constructor(){
            this.cells = [];
        }

        // update all cells under the handler
        updateCells(){
            for (let i = 0; i < this.cells.length; i++) {
                this.cells[i].update();
            }
        }

        // Color deviation.
        deviation = 20;

        newCell(location, speed, hue, fertility){
            this.cells.push(new cell(location, speed, COLOR_RANGE + this.deviation - p.random(2*this.deviation) , fertility))
        }
    }

    /**
     * Main class for a single 'cell'
     */
    class cell {

        CELL_SIZE = 10;         // Size of a single cell.
        DRAG_FACTOR = 0.03;     // How viscous the water is.
        MIN_SPEED = 0.05;       // Slowest a cell can move.
        SPLIT_CHANCE = 0.0005;  // Chance every update that the cell will split.
        AGING_SPEED = 0.003;    // How fast the cell dies of.
        MAX_FERTILITY = 5*DEFAULT_FERTILITY;  // Max fertility of a cell.
        MAX_DIST = 100;         // Distance before friends brake up.
        MAX_FRIENDS = 10;

        constructor(location, speed, hue, fertility) {
            // variables to describe the motion of the cell
            this.location = location.copy();
            this.speed = speed.copy();

            // the cell 'genes'
            this.hue = hue;
            this.fertility = fertility;
            this.age = 1;
            this.fertile = true;

            this.maxFriends = this.MAX_FRIENDS;
            this.agingSpeed = this.AGING_SPEED;

            this.maxDist = 10;

            // Cells friends.
            this.friends = [];
            this.friendCount = 0;
            this.splitCount = 0;
        }

        update(){
            // age = age - aging speed * (1+fertility)^2 * (split count + 1).
            if (!this.fertile) {
                this.agingSpeed *= 1.1;
            }
            this.age -= (this.agingSpeed * (1 + this.fertility))/(this.friends.length+1);

            // If age < 0.1 the cell dies of old age.
            if (this.age <= 0.1) {
                this.kill();
                return;
            }

            // Main functions
            this.move();
            this.draw();
            this.split();
            this.drawFriends();
        }

        /**
         * Draws the line between a cell and its friends / children.
         */
        drawFriends() {
            // If the cell is dead, but not yet out of the array.
            if (this.age === 0) {
                return;
            }
            // Concurrent modification error.
            let friendsClone = this.friends;
            for (let i = 0; i < friendsClone.length; i++) {
                let friend = friendsClone[i];
                if (friend.age !== 0) {
                    // Draw a friend relation ship line.
                    if (!this.fertile) {
                        p.stroke(this.hue, Math.min(this.age, friend.age), Math.min(this.age, friend.age),
                            Math.min(this.age, friend.age));
                    } else {
                        p.stroke(this.hue, 100, 100, Math.min(this.age,friend.age));
                    }
                    if (p.dist(this.location.x, this.location.y, friend.location.x, friend.location.y) > this.MAX_DIST) {
                        this.friends = this.friends.remove(friend);
                        friend.friends = friend.friends.remove(this);
                    }
                    p.line(this.location.x, this.location.y, friend.location.x, friend.location.y);

                }
            }
        }

        /**
         * Kills the cell and removes it from the handler.
         */
        kill() {
            this.age = 0;
            p.handler.cells = p.handler.cells.remove(this);
            for (let i = 0; i < this.friends.length; i++) {
                // Also remove it from its friends list.
                this.friends[i].friends = this.friends[i].friends.remove(this);
            }
        }

        /**
         * Function to move the cell and make it bounce of the walls.
         */
        move() {
            this.location.add(this.speed);

            // create drag proportional to its speed
            let drag = this.speed.copy();
            drag.mult(drag.mag() * this.DRAG_FACTOR);

            // creates a minimum float speed
            if (p5.Vector.sub(this.speed,drag).mag() > this.MIN_SPEED) {
                this.speed.sub(drag);
            }

            if (this.location.x < 0 || this.location.x > p.width) this.speed.x = -this.speed.x;
            if (this.location.y < 0 || this.location.y > p. height) this.speed.y = -this.speed.y;
        }

        /**
         * Color the cell based on its hue and age.
         * TODO incorporate fertility.
         */
        draw(){
            if (!this.fertile) {
                p.fill(this.hue, this.age, this.age,  this.age);
            } else {
                p.fill(this.hue,100,100, this.age);
            }
            p.noStroke();
            p.circle(this.location.x, this.location.y, this.CELL_SIZE);
        }

        /**
         * Spread infertility around using BFS
         */
        spread() {
            let q = [];
            q.push(this);
            while (q.length > 0) {
                let target = q.pop();
                for (let i = 0; i < target.friends.length; i++) {
                    if (target.friends[i].fertile) q.push(target.friends[i]);
                }
                target.fertile = false;
            }
        }

        /**
         * Handles the splitting of a cell.
         */
        split(){
            // Don't split if we have to many cells or this cell is infertile.
            if (p.handler.cells.length > MAX_CELLS || !this.fertile) {
                return;
            }

            // Random infertility chance.
            if (p.random(1) < (this.fertility / (this.splitCount + 1))*0.1) {
                this.spread();
            }

            // we split if random < splitChance + fertility
            if (p.random(1) < this.SPLIT_CHANCE + this.fertility && this.splitCount < this.maxFriends) {
                this.splitCount += 1;
                // this.AGING_SPEED *= 2;

                // We make the cells split away from each other.
                let seperationSpeed = this.speed.copy();
                let rotation = ((p.PI)/2) - (p.random(p.PI));
                seperationSpeed.rotate(rotation);

                // Gives the split a boost speed.
                if (seperationSpeed.mag() < 1) {
                    seperationSpeed.normalize(1);
                } else {
                    seperationSpeed.mult(1.5);
                }

                this.speed.sub(seperationSpeed);

                // Create a new cell based on this cells genes.
                let fert = this.fertility;

                // Create new genes based on the current ones.
                fert += fert*(p.random()-0.5)*0.1;
                fert = p.max(0, fert);
                fert = p.min(fert, this.MAX_FERTILITY);

                // console.log(agingSpeed + "," + this.agingSpeed);
                let friend = new cell(this.location, seperationSpeed, this.hue + 5 - p.random(10),
                    fert);

                friend.fertile = this.fertile;

                // Connect te cells.
                this.friends.push(friend);
                friend.friends.push(this);

                // Add to the  handler
                p.handler.cells.push(friend);
            }
        }
    }

    // Spawn a cell on mouse location.
    p.mousePressed = function () {
        if (p.mouseButton === p.LEFT) {
            let init_speed = p5.Vector.random2D().mult(SPEED_FACTOR);
            p.handler.newCell(p.createVector(p.mouseX, p.mouseY), init_speed, p.random(100), 0.002);
        }
    };

    // Common canvas resize.
    p.windowResized = function() {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    }
};

let celAnimation = new p5(CelAnimation);