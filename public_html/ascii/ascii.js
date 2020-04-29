let canvas;
let ctx;
let source;
let asciiTV;
let CHARS2 = [" ", ".", "'", "`", "^", "\"", ",", ":", ";", "I", "l", "!", "i", ">", "<", "~", "+", "_", "-", "?", "]", "[", "}", "{", "1", ")", "(", "|", "\\", "/",
    "t", "f", "j", "x", "n", "u", "v", "c", "z", "X", "Y", "U", "J", "C", "L", "Q", "0", "O", "Z", "m", "w", "q", "p", "d", "b", "k", "h", "a", "o", "*", "#", "M", "W", "&", "8",
    "%", "B", "@", "$"];

function AsciiTV(source, target) {
    this.source = source;
    this.buffer = new OffscreenCanvas(source.videoWidth, source.videoHeight);
    this.target = target;
    this.textSize = 6;
    this.target.fillStyle = "black";
    this.timer;
}

AsciiTV.prototype.greyscale = function () {
    // Turn an image into greyscale
    let ctx = this.buffer.getContext('2d');
    ctx.drawImage(source, 0, 0);

    let targetContext = this.target.getContext('2d');
    targetContext.font = this.textSize + "px Verdana";
    targetContext.clearRect(0, 0, this.target.width, this.target.height);

    let imageData = ctx.getImageData(0, 0, this.buffer.width, this.buffer.height);
    let data = imageData.data;

    for (let y = 0; y < imageData.height; y += this.textSize -1) {
        for (let x = 0; x < imageData.width; x += this.textSize - 1) {
            let i = (y * 4) * imageData.width + (x * 4);
            let brightness = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            targetContext.fillText(CHARS2[(CHARS2.length - 1 - ((brightness/255)*CHARS2.length))|0], x, y);
        }
    }

    this.timer = setTimeout(() => this.greyscale(), 50);
};

window.onload = function () {
    canvas = document.getElementById("tv");
    ctx = canvas.getContext('2d');
    source = document.getElementById("source");
    canvas.width = source.clientWidth;
    canvas.height = source.clientHeight;
    asciiTV = new AsciiTV(source, canvas);
    asciiTV.greyscale();
};
