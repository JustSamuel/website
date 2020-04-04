// TODO add smooth zooming
// TODO Allow for a color picker menu
// TODO Dynamic iterations.

var mandelbrot = function () {
    this.canvas = undefined;
    this.gl = undefined;
    this.shaderProgram = undefined;

    this.oldX =undefined;
    this.oldY =undefined;

    this.storedE = undefined;
    this.zoomSteps = 200;
    this.steps = this.zoomSteps;
    this.doZoom = false;

    this.init = function () {
        console.log("INIT");
        this.canvas = document.getElementById("glCanvas");
        this.canvas.width = innerWidth;
        this.canvas.height = innerHeight;

        // Center the set.
        minViewportX = (((4*innerWidth)/innerHeight)/2 + 0.5) * -1;

        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this), false);
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this), false);
        this.canvas.addEventListener("mousemove", this.onMouseDrag.bind(this), false);
        this.canvas.addEventListener("wheel", this.zoom.bind(this), false);
        window.addEventListener("resize", this.init.bind(this), false);

        this.gl = this.initGl(this.canvas);
        if (!this.gl) {
            alert("Could not initialize WebGL");
            return;
        }

        this.gl.viewport( 0, 0, this.canvas.width, this.canvas.height );

        this.shaderProgram = this.initShaders();
        if (!this.shaderProgram) {
            alert("Could not initialize shaders");
            return;
        }

        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array([
                -1.0, -1.0,
                1.0, -1.0,
                -1.0, 1.0,
                1.0, 1.0,
            ]),
            this.gl.STATIC_DRAW
        );

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        this.position = this.gl.getAttribLocation(this.shaderProgram, "position");
        this.gl.enableVertexAttribArray(this.position);
        this.gl.vertexAttribPointer(this.position, 2, this.gl.FLOAT, false, 0, 0);

        this.zoomLocation = this.gl.getUniformLocation(this.shaderProgram, "zoom");
        this.gl.uniform1f(this.zoomLocation, this.zoom);

        // let minViewportX = -2.135;
        // let minViewportY = -1.475;
        // let viewportWidth = 4;
        // let viewportHeight = 4;
        //
        this.minViewportXLocation = this.gl.getUniformLocation(this.shaderProgram, "minViewportX");
        this.gl.uniform1f(this.minViewportXLocation, minViewportX);

        this.minViewportYLocation = this.gl.getUniformLocation(this.shaderProgram, "minViewportY");
        this.gl.uniform1f(this.minViewportYLocation, minViewportY);

        this.viewportWidthLocation = this.gl.getUniformLocation(this.shaderProgram, "viewportWidth");
        this.gl.uniform1f(this.viewportWidthLocation, viewportWidth);

        this.viewportHeightLocation = this.gl.getUniformLocation(this.shaderProgram, "viewportHeight");
        this.gl.uniform1f(this.viewportHeightLocation, viewportHeight);

        this.widthLocation = this.gl.getUniformLocation(this.shaderProgram, "width");
        this.gl.uniform1f(this.widthLocation, this.canvas.width);

        this.heightLocation = this.gl.getUniformLocation(this.shaderProgram, "height");
        this.gl.uniform1f(this.heightLocation, this.canvas.height);

        this.iterationsLocation = this.gl.getUniformLocation(this.shaderProgram, "ITERS");
        this.gl.uniform1i(this.iterationsLocation, iterations);

        this.animate();
    };

    this.animate = function () {
        window.requestAnimationFrame(this.animate.bind(this));
        if (this.doZoom) this.zoomAnimation();
        this.draw();
    };

    this.draw = function () {
        // window.requestAnimationFrame(this.draw.bind(this));
        this.gl.uniform1f(this.minViewportXLocation, minViewportX);
        this.gl.uniform1f(this.minViewportYLocation, minViewportY);
        this.gl.uniform1f(this.viewportWidthLocation, viewportWidth);
        this.gl.uniform1f(this.viewportHeightLocation, viewportHeight);
        this.gl.uniform1f(this.widthLocation, this.canvas.width);
        this.gl.uniform1f(this.heightLocation, this.canvas.height);
        this.gl.uniform1i(this.iterationsLocation, iterations);

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    };


    this.initGl = function (inCanvas) {
        this.gl = false;

        try {
            this.gl = inCanvas.getContext("webgl") || inCanvas.getContext("experimental-webgl");
        } catch (e) {
        }

        return !this.gl ? false : this.gl;
    };

    this.initShaders = function() {
        this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(this.vertexShader, document.getElementById("VertexShader").innerText);

        this.gl.compileShader(this.vertexShader);
        if (!this.gl.getShaderParameter(this.vertexShader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(this.vertexShader));
            return false;
        }

        this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(this.fragmentShader, document.getElementById("FragmentShader").innerText);

        this.gl.compileShader(this.fragmentShader);
        if (!this.gl.getShaderParameter(this.fragmentShader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(this.fragmentShader));
            return false;
        }

        this.shaderProgram = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgram, this.vertexShader);
        this.gl.attachShader(this.shaderProgram, this.fragmentShader);
        this.gl.linkProgram(this.shaderProgram);

        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) return false;
        this.gl.useProgram(this.shaderProgram);

        return this.shaderProgram;
    };

    this.deltaX = undefined;
    this.deltaY = undefined;

    this.mousedown = false;
    this.onMouseDown = function (e) {
        this.oldX = e.offsetX;
        this.oldY = e.offsetY;
        this.mousedown = true;
    };

    this.onMouseUp = function (e) {
        this.mousedown = false;
    };

    this.onMouseDrag = function (e) {
        if (this.mousedown) {
            if (this.oldX === undefined || 0) {
                this.oldX = e.offsetX;
                this.oldY = e.offsetY;
            }

            let deltaX = e.offsetX - this.oldX;
            let deltaY = e.offsetY - this.oldY;

            this.oldX = e.offsetX;
            this.oldY = e.offsetY;

            console.log("move");
            minViewportX -= (deltaX*2 / this.canvas.width) * viewportWidth;
            minViewportY += (deltaY / this.canvas.height) * viewportHeight;
        }
    };

    this.zoomAnimation = function () {
        let delta = this.storedE.deltaY;
        let mouseX = (minViewportX + (viewportHeight*this.storedE.offsetX)/innerHeight);
        let deltaX;
        let mouseY = minViewportY + ((viewportHeight*-1*(this.storedE.offsetY-innerHeight))/innerHeight);
        let deltaY;

        if (delta > 0) {
            viewportWidth = viewportWidth / (1 + (ZOOM_FACTOR-1)/this.zoomSteps);
            viewportHeight = viewportHeight / (1 + (ZOOM_FACTOR-1)/this.zoomSteps);

            deltaX = (mouseX - minViewportX) * (1-(1/(1 + (ZOOM_FACTOR-1)/this.zoomSteps)));
            deltaY = (mouseY - minViewportY) * (1-(1/(1 + (ZOOM_FACTOR-1)/this.zoomSteps)));
            minViewportY += deltaY;
            minViewportX += deltaX;
        } else {
            viewportWidth = viewportWidth * (1 + (ZOOM_FACTOR-1)/this.zoomSteps);
            viewportHeight = viewportHeight * (1 + (ZOOM_FACTOR-1)/this.zoomSteps);

            deltaX = (mouseX - minViewportX) * (1-(1 + (ZOOM_FACTOR-1)/this.zoomSteps));
            deltaY = (mouseY - minViewportY) * (1-(1 + (ZOOM_FACTOR-1)/this.zoomSteps));
            minViewportY += deltaY;
            minViewportX += deltaX;
        }

        this.steps--;
        if (this.steps < 0) {
            this.doZoom = false;
            this.steps = this.zoomSteps;
        }

    };

    this.zoom = function (e) {
        console.log(this.doZoom);
        console.log("zoom attempt");
        if (this.doZoom) return;
        this.storedE = e;
        this.doZoom = true;
    };
};

let ZOOM_FACTOR = 2;
let zoom = 1;
let DRAG_TRESHHOLD = 5;
let minViewportX = -4.05;
let minViewportY = -2;
let viewportWidth = 4;
let viewportHeight = 4;
let iterations = 2000;

var sketch = new mandelbrot();
sketch.init();