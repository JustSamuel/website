// TODO Allow for a color picker menu
// TODO Dynamic iterations.

/**
 * General container for the mandelbrot set.
 */
var mandelbrot = function () {
    // Canvas on which to draw.
    this.canvas = undefined;

    // webGl object.
    this.gl = undefined;

    // Shader Program containing the mandelbrot set.
    this.shaderProgram = undefined;

    // All uniform variables used in the mandelbrot.
    this.data = {
        minViewportX: (function () {
            return minViewportX;
        }),
        minViewportY: (function () {
            return minViewportY;
        }),
        viewportWidth: (function () {
            return viewportWidth;
        }),
        viewportHeight: (function () {
            return viewportHeight;
        }),
    };

    // Uniform locations of the variables.
    this.locations = {};

    // Mouse information used for the zooming information.
    this.storedE = undefined;

    // Amount of steps.
    this.zoomSteps = 50;
    this.initialZoomSteps = this.zoomSteps;

    // Used to keep track of animation data between refreshes.
    this.steps = 0;
    this.doZoom = false;

    // Shader initializer.
    this.init = function () {
        // Get Canvas information.
        this.canvas = document.getElementById("glCanvas");
        this.canvas.width = innerWidth;
        this.canvas.height = innerHeight;

        // Add canvas to data set.
        this.data.height = (function () {
            return this.canvas.height;
        }).bind(this);

        // Clear locations in case it is a new program.
        this.locations = {};

        // Initial draw.
        if (minViewportX === INITIAL_VIEWPORT_X) {
            // Center the set.
            minViewportX = (((4 * innerWidth) / innerHeight) / 2 + 0.5) * -1;
        }

        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this), false);
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this), false);
        this.canvas.addEventListener("mousemove", this.onMouseDrag.bind(this), false);
        this.canvas.addEventListener("wheel", this.zoom.bind(this), false);
        this.canvas.addEventListener("dblclick", this.zoom.bind(this), false);
        window.addEventListener("resize", this.init.bind(this), false);

        // Initialize GL.
        this.gl = this.initGl(this.canvas);
        if (!this.gl) {
            alert("Could not initialize WebGL");
            return;
        }

        // Set viewport according to canvas size
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        // Create the shader program.
        this.shaderProgram = this.initShaders();
        if (!this.shaderProgram) {
            alert("Could not initialize shaders");
            return;
        }

        // General buffer creation.
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

        // Bind Vertex.
        this.position = this.gl.getAttribLocation(this.shaderProgram, "position");
        this.gl.enableVertexAttribArray(this.position);
        this.gl.vertexAttribPointer(this.position, 2, this.gl.FLOAT, false, 0, 0);

        // Bind the data to the uniform locations in the shader.
        for (const key in this.data) {
            this.setUniformValue(key, this.data[key]);
        }

        this.animate();
    };

    /**
     * Creates and stores Uniform Locations for the shader
     * @param name how to store the location in locations
     * @param value initial value
     */
    this.setUniformValue = function (name, value) {
        if (this.locations[name] === undefined) {
            this.location = this.gl.getUniformLocation(this.shaderProgram, name);
            this.locations[name] = this.location;
        } else {
            this.location = this.locations[name];
        }
        this.gl.uniform1f(this.location, value);
    };

    /**
     * General window animation frame.
     */
    this.animate = function () {
        window.requestAnimationFrame(this.animate.bind(this));
        if (this.doZoom) this.zoomAnimation();
        this.updateValues();
    };

    /**
     * Updates all the values in the data set.
     */
    this.updateValues = function () {
        for (const key in this.data) {
            this.gl.uniform1f(this.locations[key], this.data[key]());
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    };

    /**
     * Initializes the GL, returns shader on success and false on failure.
     * @param inCanvas the Canvas on which to draw
     * @returns {boolean|gl} if creation was a success.
     */
    this.initGl = function (inCanvas) {
        this.gl = false;

        try {
            this.gl = inCanvas.getContext("webgl") || inCanvas.getContext("experimental-webgl");
        } catch (e) {
        }

        return !this.gl ? false : this.gl;
    };

    /**
     * Initializes the shader from the data in the mandelbrot.html
     * @returns {boolean|*} returns shader on success and false on failure.
     */
    this.initShaders = function () {
        // Get vertex shader from the html.
        this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(this.vertexShader, document.getElementById("VertexShader").innerText);

        // Compile and check.
        this.gl.compileShader(this.vertexShader);
        if (!this.gl.getShaderParameter(this.vertexShader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(this.vertexShader));
            return false;
        }

        // Get fragment shader from the html.
        this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(this.fragmentShader, document.getElementById("FragmentShader").innerText);

        // Compile and check.
        this.gl.compileShader(this.fragmentShader);
        if (!this.gl.getShaderParameter(this.fragmentShader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(this.fragmentShader));
            return false;
        }

        // Bind them both to the shader program.
        this.shaderProgram = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgram, this.vertexShader);
        this.gl.attachShader(this.shaderProgram, this.fragmentShader);
        this.gl.linkProgram(this.shaderProgram);

        // Compile and check.
        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) return false;
        this.gl.useProgram(this.shaderProgram);

        return this.shaderProgram;
    };

    // Used for dragging the mandelbrot.
    this.deltaX = undefined;
    this.deltaY = undefined;
    this.oldX = undefined;
    this.oldY = undefined;
    this.mousedown = false;

    // Update mouse values on click and enable dragging.
    this.onMouseDown = function (e) {
        this.oldX = e.offsetX;
        this.oldY = e.offsetY;
        this.mousedown = true;
    };

    // Disable dragging.
    this.onMouseUp = function (e) {
        this.mousedown = false;
    };

    // Drag the mandelbrot set.
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

            // Update the uniform values.
            minViewportX -= (deltaX * 2 / this.canvas.width) * viewportWidth;
            minViewportY += (deltaY / this.canvas.height) * viewportHeight;
        }
    };

    /**
     * Do one step of zooming to create an animation effect.
     *
     * We do this since the canvas is only updated after all the code is finished.
     * This means that we cannot have a loop inside this code, since it will never get updated.
     *
     * We used the stored variables to see how far along the animation we are.
     */
    this.zoomAnimation = function () {
        // Get stored mouse info from when the zooming started.
        let scroll = this.storedE.deltaY;

        // Calculate the mouse x end y coordinates w.r.t the mandelbrot set.
        let mouse = {
            x: (minViewportX + (viewportHeight * this.storedE.offsetX) / innerHeight),
            y: minViewportY + ((viewportHeight * -1 * (this.storedE.offsetY - innerHeight)) / innerHeight),
        };

        // Translation needed to zoom in on the mouse.
        let deltaX;
        let deltaY;

        // Zoom factor based on gaussian function.
        let zoom = 1 + gaussianFunction(this.steps, 0.05, this.zoomSteps / 2, this.zoomSteps / 6);

        if (scroll > 0 || scroll === undefined) {
            // Zooming in.
            viewportWidth = viewportWidth / zoom;
            viewportHeight = viewportHeight / zoom;

            deltaX = (mouse.x - minViewportX) * (1 - (1 / zoom));
            deltaY = (mouse.y - minViewportY) * (1 - (1 / zoom));
        } else {
            // Zooming out
            viewportWidth = viewportWidth * zoom;
            viewportHeight = viewportHeight * zoom;

            deltaX = (mouse.x - minViewportX) * (1 - zoom);
            deltaY = (mouse.y - minViewportY) * (1 - zoom);
        }

        // Apply translation
        minViewportY += deltaY;
        minViewportX += deltaX;

        // Animation control
        this.steps++;
        if (this.steps > this.zoomSteps) {
            this.doZoom = false;
            this.steps = 0;
            this.zoomSteps = this.initialZoomSteps;
        }

    };

    // Scroll handler
    this.zoom = function (e) {
        // Stop zooming if user scrolls in opposite direction.
        if (this.doZoom && ((this.storedE.deltaY > 0 && e.deltaY < 0)||(this.storedE.deltaY < 0 && e.deltaY > 0))) {
            this.doZoom = false;
            this.steps = 0;
            this.zoomSteps = this.initialZoomSteps;
            return;
        } else if (this.doZoom) {
            // Extra zooming increases zoom.
            if (this.zoomSteps < this.initialZoomSteps * 3) {
                this.zoomSteps += this.initialZoomSteps / 10;
            }
            return;
        }

        this.storedE = e;
        this.doZoom = true;
    };

};

/**
 * Gaussian function used for zoom smoothing.
 * @link https://en.wikipedia.org/wiki/Gaussian_function
 */
function gaussianFunction(x, a, b, c) {
    return (a * Math.pow(Math.E, -1 * (Math.pow(x - b, 2) / (2 * Math.pow(c, 2)))));
}

// Used to determine if it is a fresh initialization.
const INITIAL_VIEWPORT_X = -4.05;

// Factor to zoom in with.
let ZOOM_FACTOR = 2;

// Mandelbrot location
let minViewportX = INITIAL_VIEWPORT_X;
let minViewportY = -2;

// Mandelbrot size
let viewportWidth = 4;
let viewportHeight = 4;

// TODO implement variable iterations.
let iterations = 2000;


var sketch = new mandelbrot();
sketch.init();