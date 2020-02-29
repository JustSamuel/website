/**
 * Namespacing for the main background animation
 * @param p - the name space
 */
let CelAnimation = function (p) {

    let SPEED_FACTOR = 0.7;
    let COLOR_RANGE;
    let MAX_CELLS = 400;
    /**
     * Main p5.js setup
     */
    p.setup = function () {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.HSB, 100, 100, 100);

        //use parent element background color as main color
        p.mainColor = window.getComputedStyle(p.canvas.parentElement, null).backgroundColor;
        p.noStroke();
        p.handler = new cellHandler();
        COLOR_RANGE = p.random(100);
        MAX_CELLS = (p.windowWidth * p.windowHeight) / 2000;
    };

    p.draw = function () {
        if (p.handler.cells.length === 0 || (p.random(1) < (0.002*p.handler.cells.length)) && p.handler.cells.length < MAX_CELLS*0.1) {
            p.handler.newCell(p.createVector(p.random(p.width),p.random(p.height)),p5.Vector.random2D(), p.random(100),0.002)
        }

        if (p.random(1) < 0.01 && p.handler.cells.length < MAX_CELLS) {
            p.handler.newCell(p.createVector(p.random(p.width),p.random(p.height)),p5.Vector.random2D(), p.random(100),0.002)
        }

        p.background(p.mainColor);
        p.handler.updateCells();
    };

    /**
     * Function to remove element from array
     * @param x
     * @returns {*[]}
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

        deviation = 20;

        newCell(location, speed, hue, fertility){
            this.cells.push(new cell(location, speed, COLOR_RANGE + this.deviation - p.random(2*this.deviation) , fertility))
        }
    }

    /**
     * Main class for a single 'cell'
     */
    class cell {

        CELL_SIZE = 10; //size of a single cell
        DRAG_FACTOR = 0.05;
        MIN_SPEED = 0.05;
        SPLIT_CHANCE = 0.0001;
        AGING_SPEED = 0.001;
        SPLIT_COUNT = 0;

        constructor(location, speed, hue, fertility) {
            // variables to describe the motion of the cell
            this.location = location.copy();
            this.speed = speed.copy();

            // the cell 'genes'
            this.hue = hue;
            this.fertility = fertility;
            this.age = 1;
            this.friends = [];
            this.friendCount = 0;
        }

        update(){
            this.age -= this.AGING_SPEED * (1 + this.fertility);

            if (this.age <= 0.1) {
                this.kill();
            }

            this.move();
            this.draw();
            this.split();
            this.drawFriends();
        }

        drawFriends() {
            if (this.age === 0) {
                return;
            }
            for (let i = 0; i < this.friends.length; i++) {
                let friend = this.friends[i];
                if (friend.age !== 0) {
                    p.stroke(this.hue, 100, 100, this.age);
                    p.line(this.location.x, this.location.y, friend.location.x, friend.location.y);

                }
            }
        }

        kill() {
            this.age = 0;
            p.handler.cells = p.handler.cells.remove(this);
            for (let i = 0; i < this.friends.length; i++) {
                this.friends[i].friends = this.friends[i].friends.remove(this);
            }
        }

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

        draw(){
            p.fill(this.hue,100,100, this.age);
            p.noStroke();
            p.circle(this.location.x, this.location.y, this.CELL_SIZE);
        }

        split(){
            // cells split randomly
            if (p.handler.cells.length > MAX_CELLS) {
                return;
            }

            if (p.random(1) < this.SPLIT_CHANCE + this.fertility && this.SPLIT_COUNT < 4) {
                this.SPLIT_COUNT += 1;
                this.AGING_SPEED *= 2;
                this.age += 0.2;
                let seperationSpeed = this.speed.copy();
                let rotation = ((p.PI)/2) - (p.random(p.PI));
                seperationSpeed.rotate(rotation);
                if (seperationSpeed.mag() < 1) {
                    seperationSpeed.normalize(1);
                } else {
                    seperationSpeed.mult(1.5);
                }

                this.speed.sub(seperationSpeed);

                let fert = this.fertility;
                let friend = new cell(this.location, seperationSpeed, this.hue + 5 - p.random(10),
                    fert);
                this.friends.push(friend);
                friend.friends.push(this);
                p.handler.cells.push(friend);
            }
        }
    }

    p.mousePressed = function () {
        if (p.mouseButton === p.LEFT) {
            let init_speed = p5.Vector.random2D().mult(SPEED_FACTOR);
            p.handler.newCell(p.createVector(p.mouseX, p.mouseY), init_speed, p.random(100), 0.002);
        }
    }

    p.windowResized = function() {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    }
};

let celAnimation = new p5(CelAnimation);