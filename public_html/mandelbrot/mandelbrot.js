// TODO Allow for a color picker menu

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
        hue: (function () {
            return hue;
        }),
        modvar: (function () {
            return mod;
        }),
        iterScale: (function () {
            return scale;
        }),
        huemod: (function () {
            return huemod;
        }),
        wave: (function () {
            return wave;
        })
    };

    // Uniform locations of the variables.
    this.locations = {};

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

        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this), false);
        this.canvas.addEventListener("touchstart", this.onMouseDown.bind(this), false);
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this), false);
        this.canvas.addEventListener("touchend", this.onMouseUp.bind(this), false);
        this.canvas.addEventListener("mousemove", this.onMouseDrag.bind(this), false);
        this.canvas.addEventListener("touchmove", this.onMouseDrag.bind(this), false);
        this.canvas.addEventListener("wheel", this.zoom.bind(this), false);
        this.canvas.addEventListener("dblclick", this.zoom.bind(this), false);
        // window.onscroll = this.zoom.bind(this);
        window.addEventListener("resize", function (){this.canvas.height = innerHeight; this.canvas.width = innerWidth; this.build()}.bind(this), false);

        this.build();

        this.animate();
    };

    /**
     * Build shader program.
     */
    this.build = function () {
        // Clear locations in case it is a new program.
        this.locations = {};

        // Initial draw.
        if (minViewportX === INITIAL_VIEWPORT_X) {
            // Center the set.
            minViewportX = (((4 * innerWidth) / innerHeight) / 2 + 0.5) * -1;
        }

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
    this.mouseInfo = {
        old : {
            x: undefined,
            y: undefined,
            e: undefined,
        },
        mousedown: false,
        latesttap: undefined,
        doubletap: false,
        event: undefined,
        drag: false,
    };

    let doubleTapTimeout = undefined;

    // Double tap to zoom in, tripple tap to zoom out.
    this.onTouchDown = function (e) {
        // We use a timer to check if we should count it as double tap or not
        let now = new Date().getTime();
        let timesince = now - this.mouseInfo.latesttap;
        if((timesince < 600) && (timesince > 0) && !this.mouseInfo.drag){
            // Create custom event to send to zoom handler.
            this.mouseInfo.event = {
                deltaY : 1,
                offsetX : e.changedTouches[0].pageX,
                offsetY : e.changedTouches[0].pageY,
            };

            // If we have double tapped, we do tripple tap zoomout.
            if (this.mouseInfo.doubletap) {
                clearTimeout(doubleTapTimeout);
                this.mouseInfo.event.deltaY = -1;
                this.zoom(this.mouseInfo.event);
                this.mouseInfo.doubletap = false;
            } else {
                this.mouseInfo.doubletap = true;
                // Set a timeout to check if user actually wants to zoom out instead.
                doubleTapTimeout = setTimeout(async () => {
                    if (this.mouseInfo.doubletap) {
                        this.zoom(this.mouseInfo.event);
                    }
                },300);
            }
        }else{
            this.mouseInfo.doubletap = false;
        }

        this.mouseInfo.latesttap = new Date().getTime();

    };

    // Update mouse values on click and enable dragging.
    this.onMouseDown = function (e) {
        if (e.type === "touchstart") {
            this.mouseInfo.old.x = e.changedTouches[0].pageX;
            this.mouseInfo.old.y = e.changedTouches[0].pageY;
            this.onTouchDown(e);
        } else {
            this.mouseInfo.old.x = e.clientX;
            this.mouseInfo.old.y = e.clientY;
        }
        this.mouseInfo.mousedown = true;
    };

    // Disable dragging.
    this.onMouseUp = function (e) {
        e.preventDefault();
        // Grace period after dragging that still counts as dragging.
        setTimeout(async () => {
            this.mouseInfo.drag = false;
        }, 500);
        this.mouseInfo.mousedown = false;
    };

    // Drag the mandelbrot set.
    this.onMouseDrag = function (e) {
        e.preventDefault();
        if (this.mouseInfo.mousedown) {
            this.mouseInfo.drag = true;
            let client = {};
            // Distinction between mobile and desktop.
            if (e.type === "touchmove") {
                client.x = e.changedTouches[0].pageX;
                client.y = e.changedTouches[0].pageY;
            } else {
                client.x = e.clientX;
                client.y = e.clientY;
            }

            if (this.mouseInfo.old.x === undefined || this.mouseInfo.old.y === undefined) {
                this.mouseInfo.old.x = client.x;
                this.mouseInfo.old.y = client.y;
            } else {
                let deltaX = client.x - this.mouseInfo.old.x;
                let deltaY = client.y - this.mouseInfo.old.y;

                this.mouseInfo.old.x = client.x;
                this.mouseInfo.old.y = client.y;

                // Update the uniform values.
                minViewportX -= (deltaX / this.canvas.height) * viewportHeight;
                minViewportY += (deltaY / this.canvas.height) * viewportHeight;
            }
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
        let scroll = this.mouseInfo.old.e.deltaY;

        // Calculate the mouse x end y coordinates w.r.t the mandelbrot set.
        let mouse = {
            x: (minViewportX + (viewportHeight * this.mouseInfo.old.e.offsetX) / innerHeight),
            y: minViewportY + ((viewportHeight * -1 * (this.mouseInfo.old.e.offsetY - innerHeight)) / innerHeight),
        };

        // Translation needed to zoom in on the mouse.
        let deltaX;
        let deltaY;

        // Zoom factor based on gaussian function.
        let zoom = 1 + gaussianFunction(this.steps, ZOOM_FACTOR, this.zoomSteps / 2, this.zoomSteps / 6);
        if (!(viewportWidth > 12 && this.mouseInfo.old.e.deltaY < 0)) {
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
        }

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
        if (this.doZoom && ((this.mouseInfo.old.e.deltaY > 0 && e.deltaY < 0) || (this.mouseInfo.old.e.deltaY < 0 && e.deltaY > 0))) {
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

        this.mouseInfo.old.e = e;
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

function changeMaxIterations(iterations) {
    document.getElementById("FragmentShader").innerHTML =
        document.getElementById("FragmentShader").innerHTML.replace(/#define MAX_ITERATIONS (\d)*/,
        "#define MAX_ITERATIONS " + iterations);
    sketch.build();
}

// Make the DIV element draggable:
dragElement(document.getElementById("settings"));
let pressEvent = undefined;

document.getElementById("settingsHeader").onmousedown = function (e) {
    pressEvent = e;
};

// Settings animation
document.getElementById("settingsHeader").onclick = function(e) {
    if (e.pageX !== pressEvent.pageX || e.pageY !== pressEvent.pageY) return;
    if (document.getElementById("settingsArrow").classList.contains("active")) {
        document.getElementById("settingsArrow").classList.remove("active");
        document.getElementById("settingPanel").classList.remove("active");
    } else {
        document.getElementById("settingsArrow").classList.add("active");
        document.getElementById("settingPanel").classList.add("active");
    }
};

document.getElementById("color").oninput = function () {
    hue = document.getElementById("color").value / 100;
};

document.getElementById("modvar").oninput = function () {
    mod = document.getElementById("modvar").value / 100;
};

document.getElementById("huemod").oninput = function () {
    huemod = document.getElementById("huemod").value / 100;
};

document.getElementById("wave").oninput = function () {
    wave = document.getElementById("wave").value / 100;
};

document.getElementById("scale").oninput = function () {
    let value = document.getElementById("scale").value;
    if (value == 0) {
        scale = 1.0;
    } else if (value == 2) {
        scale = iterations-1;
    } else {
        scale = (document.getElementById("scale").value / 3) * (iterations - 1);
    }
    console.log(document.getElementById("scale").value);
};

let preventDrag = false;

disableMenuDrag(document.getElementById("color"));
disableMenuDrag(document.getElementById("wave"));
disableMenuDrag(document.getElementById("modvar"));
disableMenuDrag(document.getElementById("scale"));
disableMenuDrag(document.getElementById("huemod"));

/**
 * Prevents sliders from interfering with the settings drag
 */
function disableMenuDrag(element) {
    element.onmousedown = function () {
        preventDrag = true
    };
    element.ontouchstart = function () {
        preventDrag = true;
    };
    element.onmouseup = function () {
        preventDrag = false;
    };
    element.ontouchend = function () {
        preventDrag = false
    }
}

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
        document.getElementById(elmnt.id + "header").ontouchstart = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
        elmnt.ontouchstart = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.type === "touchstart") {
            pos3 = e.changedTouches[0].clientX;
            pos4 = e.changedTouches[0].clientY;
        } else {
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
        }
        document.onmouseup = closeDragElement;
        document.ontouchend = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
        document.ontouchmove = elementDrag;
    }

    function elementDrag(e) {
        if (preventDrag) return;
        document.getElementById(elmnt.id).focus();
        if (e.type === "touchmove") {
            pos1 = pos3 - e.changedTouches[0].clientX;
            pos2 = pos4 - e.changedTouches[0].clientY;
            pos3 = e.changedTouches[0].clientX;
            pos4 = e.changedTouches[0].clientY;
        } else {
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
        }
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchmove = null;
        document.ontouchcancel = null;
    }
}

// Used to determine if it is a fresh initialization.
const INITIAL_VIEWPORT_X = -4.05;

// Factor to zoom in with.
let ZOOM_FACTOR = 0.05;

// Mandelbrot location
let minViewportX = INITIAL_VIEWPORT_X;
let minViewportY = -2;

// Mandelbrot size
let viewportWidth = 4;
let viewportHeight = 4;

// Color sliders
let hue = 0.5;
let mod = 1;
let scale = 1.0;
let huemod = 0;
let wave = 0;

let iterations = 2000;


var sketch = new mandelbrot();
sketch.init();