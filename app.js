const HORIZONTAL_BLOCKS = 12;
const VERTICAL_BLOCKS = 8;

const STANDARD_HORIZONTAL_SCALE = 72.0 / HORIZONTAL_BLOCKS;
const STANDARD_VERTICAL_SCALE = 2.0 / VERTICAL_BLOCKS;

const DEFAULT_AMPLITUDE = 1.0;
const DEFAULT_PHASE = 0.0;

let $verticalScaleSelector = document.getElementById('vertical-scale-selector');
let $horizontalScaleSelector = document.getElementById('horizontal-scale-selector');
let $xNoteSelector = document.getElementById('x-note-selector');
let $yNoteSelector = document.getElementById('y-note-selector');

/** @type {WebGLRenderingContext} */
let gl;
let vScaleLoc, hScaleLoc;
let currentYNote = vec3(C4, 0.0, 0.0), currentXNote = vec3(0.0, 0.0, 0.0), currentHScale = getHorizontalScale(parseFloat($horizontalScaleSelector.options[$horizontalScaleSelector.selectedIndex].value, 10)), currentVScale = STANDARD_VERTICAL_SCALE;
let notesLocY, notesLocX;

let timeLoc;
let time = 0;
let current = 0;

let gridProgram;
let program;

let bufferId;
let gridBufferId;

function getVerticalScale(voltsPerBlock) {
    return STANDARD_VERTICAL_SCALE / voltsPerBlock;
}

function getHorizontalScale(secondsPerBlock) {
    return (STANDARD_HORIZONTAL_SCALE * secondsPerBlock);
}

$verticalScaleSelector.addEventListener("change", e = () => {
    console.log(parseFloat($verticalScaleSelector.value, 10));
    currentVScale = getVerticalScale(parseFloat($verticalScaleSelector.options[$verticalScaleSelector.selectedIndex].value, 10));
});

$horizontalScaleSelector.addEventListener("change", e = () => {
    console.log(parseFloat($horizontalScaleSelector.value, 10));
    currentHScale = getHorizontalScale(parseFloat($horizontalScaleSelector.options[$horizontalScaleSelector.selectedIndex].value, 10));
});

function pickNote(value) {
    switch (value) {
        case "time":
        case "zero":
            return vec3(0.0, 0.0, 0.0);
        case "C4":
            return vec3(C4, 0.0, 0.0);
        case "C4M":
            return vec3(C4, G4, E4);
        case "F4F4#":
            return vec3(F4, FSHARP4, 0.0);
        default:
            break;
    }
}

$xNoteSelector.addEventListener("change", e => {
    value = $xNoteSelector.options[$xNoteSelector.selectedIndex].value;
    console.log($xNoteSelector.options[$xNoteSelector.selectedIndex].value);

    currentXNote = pickNote(value);
});

$yNoteSelector.addEventListener("change", e => {
    value = $yNoteSelector.options[$yNoteSelector.selectedIndex].value;
    console.log($yNoteSelector.options[$yNoteSelector.selectedIndex].value);

    currentYNote = pickNote(value);
});

function genNumbers() {
    let a = [];
    for (let i = 0; i < 10000; i++) {
        a.push(i);
    }
    return a;
}

function genGridPoints(vertical, horizontal) {
    let v = [];
    step = 2 / horizontal;
    for (let i = -1; i < 1; i += step) {
        v.push(vec2(1.0, i));
        v.push(vec2(-1.0, i));
    }
    step = 2 / vertical;
    for (let i = -1; i < 1; i += step) {
        v.push(vec2(i, 1.0));
        v.push(vec2(i, -1.0));
    }
    return v;
}

function toDrawData(program, bufferId, attr, size) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);

    var loc = gl.getAttribLocation(program, attr);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
}

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    let times = genNumbers();

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    // Load the data into the GPU
    bufferId = gl.createBuffer();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(times), gl.STATIC_DRAW);

    let ampLoc = gl.getUniformLocation(program, 'amp');
    gl.uniform1f(ampLoc, DEFAULT_AMPLITUDE);
    let phaseLoc = gl.getUniformLocation(program, 'phase');
    gl.uniform1f(phaseLoc, DEFAULT_PHASE);
    let colorLoc = gl.getUniformLocation(program, "vColor")
    gl.uniform4fv(colorLoc, vec4(0.0, 1.0, 1.0, 1.0));
    vScaleLoc = gl.getUniformLocation(program, "vScale");
    hScaleLoc = gl.getUniformLocation(program, "hScale");

    timeLoc = gl.getUniformLocation(program, 'time');

    notesLocY = gl.getUniformLocation(program, "notesY");
    notesLocX = gl.getUniformLocation(program, "notesX");

    //
    // GRID PROGRAM
    //
    gridProgram = initShaders(gl, "grid-vertex-shader", "fragment-shader");
    gridBufferId = gl.createBuffer();
    let grid = genGridPoints(HORIZONTAL_BLOCKS, VERTICAL_BLOCKS);
    gl.useProgram(gridProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(grid), gl.STATIC_DRAW);

    colorLoc = gl.getUniformLocation(gridProgram, "vColor")
    gl.uniform4fv(colorLoc, vec4(1.0, 0.0, 1.0, 1.0));

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    toDrawData(program, bufferId, "vTimeSample", 1);
    // gl.lineWidth(2.5);

    gl.uniform1f(timeLoc, time);
    gl.uniform1f(vScaleLoc, currentVScale);
    gl.uniform1f(hScaleLoc, currentHScale);
    gl.uniform3fv(notesLocY, currentYNote);
    gl.uniform3fv(notesLocX, currentXNote);
    let timeToRender = HORIZONTAL_BLOCKS * (currentHScale / STANDARD_HORIZONTAL_SCALE);
    let renderTimes = timeToRender / (1 / 60);
    // // time += (1 / 60);
    let step = 10000 / renderTimes;
    current += step;
    if(current > 10000) { current = 10000; }
    gl.drawArrays(gl.LINE_STRIP, 0, current);
    if (current == 10000) {
         time += 1.0;
         console.log(time);
         current = 0;
    }


    toDrawData(gridProgram, gridBufferId, "gPosition", 2);
    gl.drawArrays(gl.LINES, 0, (HORIZONTAL_BLOCKS + VERTICAL_BLOCKS) * 2);

    requestAnimationFrame(render);
}