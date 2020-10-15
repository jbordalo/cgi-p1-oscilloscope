const MAX_SAMPLES = 10000;

const HORIZONTAL_BLOCKS = 12;
const VERTICAL_BLOCKS = 8;

const DEFAULT_AMPLITUDE = 1.0;
const DEFAULT_PHASE = 1.0;

const VERTICAL_VALUES = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0, 200.0, 500.0];
const HORIZONTAL_VALUES = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, .1, .2, .5, 1, 2, 5];

let $verticalScaleSlider = document.getElementById('vertical-scale-slider');
let $horizontalScaleSlider = document.getElementById('horizontal-scale-slider');
let $xNoteSelector = document.getElementById('x-note-selector');
let $wave1yNoteSelector = document.getElementById('wave1-y-note-selector');
let $wave2yNoteSelector = document.getElementById('wave2-y-note-selector');
let $yPositionSlider = document.getElementById('y-position-slider');
let $xPositionSlider = document.getElementById('x-position-slider');

/** @type {WebGLRenderingContext} */
let gl;

let currentYNoteWave1 = vec3(1.0, 0.0, 0.0), 
    currentYNoteWave2 = vec3(0.0, 0.0, 0.0, 0.0),
    currentXNote = vec3(0.0, 0.0, 0.0),
    secondsPerBlock = HORIZONTAL_VALUES[parseFloat($horizontalScaleSlider.value, 10)],
    voltsPerBlock = VERTICAL_VALUES[parseFloat($verticalScaleSlider.value, 10)];

let voltsLoc, secondsLoc;
let notesLocY, notesLocX;
let timeLoc, colorLoc;
let offsetY = parseFloat($yPositionSlider.value, 10), offsetX = parseFloat($xPositionSlider.value, 10);
let offsetYLoc, offsetXLoc;

let time = 0;
let current = 0;

let program;
let gridProgram;

let bufferId;
let gridBufferId;

function getVerticalScale(voltsPerBlock) {
    return voltsPerBlock;
}

function getHorizontalScale(secondsPerBlock) {
    return secondsPerBlock;
}

$verticalScaleSlider.addEventListener("input", e = () => {
    const scale = VERTICAL_VALUES[parseFloat($verticalScaleSlider.value, 10)];
    console.log(scale);
    document.getElementById('vertical-scale-label').innerHTML = scale + " V";
    voltsPerBlock = scale;
});

$horizontalScaleSlider.addEventListener("input", e = () => {
    const scale = HORIZONTAL_VALUES[parseFloat($horizontalScaleSlider.value, 10)];
    console.log(scale);
    document.getElementById('horizontal-scale-label').innerHTML = scale + " s";
    secondsPerBlock = scale;
});

$yPositionSlider.addEventListener("input", e = () => {
    const offset = parseFloat($yPositionSlider.value, 10);
    console.log(offset);
    offsetY = offset;
});

$xPositionSlider.addEventListener("input", e = () => {
    const offset = parseFloat($xPositionSlider.value, 10);
    console.log(offset);
    offsetX= offset;
});

//Returns a vec3 with the notes regarding the note or chord given in value
function pickNote(value) {
    switch (value) {
        case "time":
        case "zero":
            return vec3(0.0, 0.0, 0.0);
        case "C4":
            return vec3(C4, 0.0, 0.0);
        case "G4":
            return vec3(G4, 0.0, 0.0);
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

$wave1yNoteSelector.addEventListener("change", e => {
    value = $wave1yNoteSelector.options[$wave1yNoteSelector.selectedIndex].value;
    console.log($wave1yNoteSelector.options[$wave1yNoteSelector.selectedIndex].value);

    currentYNoteWave1 = pickNote(value);
});


$wave2yNoteSelector.addEventListener("change", e => {
    value = $wave2yNoteSelector.options[$wave2yNoteSelector.selectedIndex].value;
    console.log($wave2yNoteSelector.options[$wave2yNoteSelector.selectedIndex].value);

    currentYNoteWave2 = pickNote(value);
});

//Generates the sequence of numbers from 0 to MAX_SAMPLES
function genNumbers() {
    let a = [];
    for (let i = 0; i < MAX_SAMPLES; i++) {
        a.push(i);
    }
    return a;
}

//Generates points to draw the grid
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

//Switches the program, binds the buffer,
//preparing to draw the data using a different program.
function toDrawData(program, bufferId, attr, size) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);

    var loc = gl.getAttribLocation(program, attr);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
}

//Draws one Wave or Two if the currentYNoteWave2 isn't 'empty' 
//with current being the number of vertexes to draw.
function drawWaves(current) {
    gl.drawArrays(gl.LINE_STRIP, 0, current);
    if (currentYNoteWave2[0] != 0.0) {
        gl.uniform4fv(colorLoc, vec4(0.0, 0.0, 1.0, 1.0));
        gl.uniform3fv(notesLocY, currentYNoteWave2);
        gl.drawArrays(gl.LINE_STRIP, 0, current);
    }
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

    offsetXLoc = gl.getUniformLocation(program, 'offsetX');
    offsetYLoc = gl.getUniformLocation(program, 'offsetY');
    
    colorLoc = gl.getUniformLocation(program, "vColor");

    voltsLoc = gl.getUniformLocation(program, "voltsPerBlock");
    secondsLoc = gl.getUniformLocation(program, "secondsPerBlock");

    timeLoc = gl.getUniformLocation(program, 'time');

    notesLocY = gl.getUniformLocation(program, "notesY");
    notesLocX = gl.getUniformLocation(program, "notesX");

    //
    // GRID PROGRAM
    //
    // Load shaders and initialize attribute buffers
    gridProgram = initShaders(gl, "grid-vertex-shader", "fragment-shader");
    gridBufferId = gl.createBuffer();

    //Generate grid points
    let grid = genGridPoints(HORIZONTAL_BLOCKS, VERTICAL_BLOCKS);

     // Load the data into the GPU
    gl.useProgram(gridProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(grid), gl.STATIC_DRAW);
    
    let gridColorLoc = gl.getUniformLocation(gridProgram, "vColor")
    gl.uniform4fv(gridColorLoc, vec4(1.0, 0.0, 1.0, 1.0));

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    //Switch to program that draws the wave(s)
    toDrawData(program, bufferId, "vTimeSample", 1);
    //Set the uniforms
    gl.uniform1f(timeLoc, time);
    gl.uniform4fv(colorLoc, vec4(0.0, 1.0, 1.0, 1.0));
    gl.uniform1f(voltsLoc, voltsPerBlock);
    gl.uniform1f(secondsLoc, secondsPerBlock);
    gl.uniform3fv(notesLocY, currentYNoteWave1);
    gl.uniform3fv(notesLocX, currentXNote);
    gl.uniform1f(offsetXLoc, offsetX);
    gl.uniform1f(offsetYLoc, offsetY);
    //Defining the time it should take to render the frame,
    //considering the value per square  
    let timeToRender = HORIZONTAL_BLOCKS * (secondsPerBlock);

    //time it takes to render a frame multiplied by 60
    //60 being the default frames rendered per second 
    let renderTimes = timeToRender * 60;

    if (timeToRender < 1 / 60) {
        drawWaves(MAX_SAMPLES);
        time += 1 / 60;
    } else {
        let step = MAX_SAMPLES / renderTimes;
        current += step;
        if (current > MAX_SAMPLES) { current = MAX_SAMPLES; }
        drawWaves(current);
        if (current == MAX_SAMPLES) {
            time += timeToRender;
            current = 0;
        }
    }
    //Switches program to draw the grid
    toDrawData(gridProgram, gridBufferId, "gPosition", 2);
    gl.drawArrays(gl.LINES, 0, (HORIZONTAL_BLOCKS + VERTICAL_BLOCKS) * 2);

    requestAnimationFrame(render);
}