// ================
// GLOBAL VARIABLES
// ================
let splines = [];
let staticShapes = [];
let draggedPoint = null;
let draggedStaticShape = null;
let draggedSpline = null; 
let dragStartPos = null; 
let backgroundImg = null;
let selectedSpline = null;
let selectedStaticShape = null;
let selectedPoint = null;
let selectedPointIndex = -1;
let selectedSplineIndex = -1;
let isExporting = false;
let exportProgress = 0;
let exportTotalFrames = 0;
let exportFPS = 0;
let exportDuration = 0;
let exportCanvas;
let mediaRecorder;
let recordedChunks = [];
let exportStream = null;
let originalImageDimensions = { width: 1000, height: 562 }; 
let canvas;
let appStartTime;
let loopingPreview = true; 
let loopPreviewButton; 
let themeToggleButton;
let exportOverlay, progressBarFill, exportPercentage, exportFrameCount;

// Undo/Redo variables
let history = [];
let historyIndex = -1;
let dragOccurred = false;

// Multi-selection variables
let multiSelection = [];
let selectionBox = null;
let isDraggingSelection = false;

// New variables for spline colors
const splineColors = [
  '#4CAF50', // Green
  '#F44336', // Red
  '#FF9800', // Orange
  '#2196F3', // Blue
  '#9C27B0', // Purple
  '#FFEB3B', // Yellow
  '#009688', // Teal
  '#E91E63', // Pink
  '#3F51B5', // Indigo
  '#B71C1C', // Dark Red
  '#E65100', // Dark Orange
  '#0D47A1', // Dark Blue
  '#4A148C', // Dark Purple
  '#F57F17'  // Dark Yellow/Amber
];
let splineColorIndex = 0;


// New variables for playback control
let isPlayingOnce = false;
const METADATA_MARKER = "SPLINEDATA::";

// =========
// SETUP
// =========
function setup() {
  canvas = createCanvas(1000, 562); 
  canvas.parent('canvas-container');
  pixelDensity(1);
  appStartTime = millis();
  canvas.drop(gotFile);
  exportOverlay = document.getElementById('export-overlay');
  progressBarFill = document.getElementById('progress-bar-fill');
  exportPercentage = document.getElementById('export-percentage');
  exportFrameCount = document.getElementById('export-frame-count');
  const savedTheme = localStorage.getItem('splineEditorTheme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
  setupEventListeners();
  addNewSpline(); // This will also create the first history state
}

function setupEventListeners() {
  document.getElementById('deleteSpline').addEventListener('click', deleteSelectedSpline);
  document.getElementById('exportVideo').addEventListener('click', startExport);
  document.getElementById('cancelExport').addEventListener('click', cancelExport);
  document.getElementById('removePoint').addEventListener('click', removeSelectedItem);
  document.getElementById('newSpline').addEventListener('click', addNewSpline);
  document.getElementById('clearAll').addEventListener('click', clearAll);
  document.getElementById('clearBg').addEventListener('click', () => { backgroundImg = null; document.getElementById('bgImage').value = ''; recordState(); });
  document.getElementById('bgImage').addEventListener('change', handleSceneFile);
  document.getElementById('addPoint').addEventListener('click', addPointToSpline);
  document.getElementById('addShape').addEventListener('click', addStaticShape);
  document.getElementById('updateCanvasSize').addEventListener('click', updateCanvasSize);
  document.getElementById('resetCanvasSize').addEventListener('click', resetCanvasSize);
  document.getElementById('cloneItem').addEventListener('click', cloneSelectedItem);
  document.getElementById('playOnce').addEventListener('click', playOnce);
  loopPreviewButton = document.getElementById('loopPreview');
  loopPreviewButton.addEventListener('click', toggleLooping);
  themeToggleButton = document.getElementById('themeToggle');
  themeToggleButton.addEventListener('click', toggleTheme);
  
  // Undo/Redo button listeners
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  
  // New listeners for canvas save/load
  document.getElementById('exportCanvas').addEventListener('click', exportScene);
  document.getElementById('loadCanvasBtn').addEventListener('click', () => document.getElementById('loadCanvas').click());
  document.getElementById('loadCanvas').addEventListener('change', handleSceneFile);

  if (document.body.classList.contains('dark-mode')) {
    themeToggleButton.textContent = 'Switch to Light Mode';
  } else {
    themeToggleButton.textContent = 'Switch to Dark Mode';
  }
  
  // Listen for changes on all control inputs for history
  const controls = ['StartFrame', 'TotalFrames', 'Type', 'FillColor', 'StrokeColor', 'StrokeWeight', 'Tension', 'Easing'];
  controls.forEach(control => {
    const element = document.getElementById(`selected${control}`);
    element.addEventListener('input', updateSelectedItem); // Live update
    element.addEventListener('change', recordState);      // Save history on final change
  });
  document.getElementById('selectedSizeX').addEventListener('input', updateSelectedItem);
  document.getElementById('selectedSizeY').addEventListener('input', updateSelectedItem);
  document.getElementById('selectedSizeX').addEventListener('change', recordState);
  document.getElementById('selectedSizeY').addEventListener('change', recordState);

  // Global setting listeners for history
  document.getElementById('exportFPS').addEventListener('change', recordState);
  document.getElementById('exportTotalFrames').addEventListener('change', recordState);

  const canvasContainer = document.getElementById('canvas-container');
  canvasContainer.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); canvasContainer.classList.add('dragging-over'); });
  canvasContainer.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); canvasContainer.classList.remove('dragging-over'); });
  canvasContainer.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); canvasContainer.classList.remove('dragging-over'); });
}

// =========
// DRAW
// =========
function draw() {
  clear(); 
  
  if (backgroundImg) {
    image(backgroundImg, 0, 0, width, height);
  }

  // Draw a border around the canvas dimensions
  push();
  const borderColor = document.body.classList.contains('dark-mode') ? '#212529' : '#C5C5C5';
  stroke(borderColor);
  strokeWeight(5);
  noFill();
  rect(0, 0, width - 1, height - 1);
  pop();
  
  drawAllSplines();
  drawStaticShapes();
  drawSelectionBox();

  // Check if the "Play Once" sequence has finished
  if (isPlayingOnce) {
    const exportFpsValue = parseInt(document.getElementById('exportFPS').value) || 16;
    const exportTotalFramesValue = parseInt(document.getElementById('exportTotalFrames').value) || 80;
    const playOnceDurationMs = (exportTotalFramesValue / exportFpsValue) * 1000;
    if (millis() - appStartTime >= playOnceDurationMs) {
      isPlayingOnce = false; // Stop the special playback mode
    }
  }

  drawMovingShapes();
  if (draggedPoint) { drawDragIndicator(); }
}

// ======================================
// UNDO / REDO SYSTEM
// ======================================

/**
 * Captures the current state of the application into a serializable object.
 * @returns {object} A snapshot of the current application state.
 */
function captureState() {
    const serializableSplines = splines.map(s => {
        const splineCopy = { ...s };
        splineCopy.points = s.points.map(p => ({ x: p.x, y: p.y }));
        return splineCopy;
    });

    const serializableStaticShapes = staticShapes.map(s => {
        const shapeCopy = { ...s };
        shapeCopy.pos = { x: s.pos.x, y: s.pos.y };
        return shapeCopy;
    });

    return {
        splines: serializableSplines,
        staticShapes: serializableStaticShapes,
        exportFPS: parseInt(document.getElementById('exportFPS').value),
        exportTotalFrames: parseInt(document.getElementById('exportTotalFrames').value),
        splineColorIndex: splineColorIndex,
    };
}

/**
 * Applies a given state object to the application, restoring it.
 * @param {object} state - A state object previously captured by captureState.
 */
function applyState(state) {
    splines = state.splines.map(s => {
        const splineCopy = { ...s };
        splineCopy.points = s.points.map(p => createVector(p.x, p.y));
        return splineCopy;
    });

    staticShapes = state.staticShapes.map(s => {
        const shapeCopy = { ...s };
        shapeCopy.pos = createVector(s.pos.x, s.pos.y);
        return shapeCopy;
    });

    document.getElementById('exportFPS').value = state.exportFPS;
    document.getElementById('exportTotalFrames').value = state.exportTotalFrames;
    splineColorIndex = state.splineColorIndex;

    selectedSpline = null;
    selectedStaticShape = null;
    selectedPoint = null;
    multiSelection = [];
    if (splines.length > 0) {
        selectSpline(splines[splines.length - 1]);
    } else if (staticShapes.length > 0) {
        selectStaticShape(staticShapes[staticShapes.length - 1]);
    } else {
        updateSelectedItemUI();
    }
}

/**
 * Records the current state to the history stack for undo/redo functionality.
 */
function recordState() {
    historyIndex++;
    history[historyIndex] = captureState();
    history.length = historyIndex + 1; // Truncate any "redo" history
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        applyState(history[historyIndex]);
        updateUndoRedoButtons();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        applyState(history[historyIndex]);
        updateUndoRedoButtons();
    }
}

/**
 * Updates the enabled/disabled state of the undo and redo buttons.
 */
function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = historyIndex <= 0;
    document.getElementById('redoBtn').disabled = historyIndex >= history.length - 1;
}

// ======================================
// ITEM CREATION AND SELECTION LOGIC
// ======================================
function addNewSpline() {
  const defaultSettings = {
    startFrame: 0, totalFrames: 80, shapeSizeX: 10, shapeSizeY: 10, shapeType: 'square',
    fillColor: '#ffffff', strokeColor: '#000000', strokeWeight: 0.5, tension: 0, easing: 'linear',
  };
  const yOffset = (splines.length % 10) * 20;
  const newSpline = { 
    ...defaultSettings, 
    points: [createVector(width * 0.25, height / 2 - 50 + yOffset), createVector(width * 0.75, height / 2 - 50 + yOffset)],
    lineColor: splineColors[splineColorIndex]
  };
  splineColorIndex = (splineColorIndex + 1) % splineColors.length;
  splines.push(newSpline);
  selectSpline(newSpline);
  recordState(); // Save new state
}

function addStaticShape() {
  const defaultSettings = {
    shapeSizeX: 10, shapeSizeY: 10, shapeType: 'square',
    fillColor: '#ffffff', strokeColor: '#000000', strokeWeight: 0.5
  };
  const xOffset = (staticShapes.length % 5) * 20;
  const yOffset = (staticShapes.length % 5) * 20;
  const newShape = { ...defaultSettings, pos: createVector(width / 2 + xOffset, height / 2 + yOffset), isStatic: true };
  staticShapes.push(newShape);
  selectStaticShape(newShape);
  recordState(); // Save new state
}

function deleteSelectedSpline() {
  if (selectedSpline) {
    const index = splines.indexOf(selectedSpline);
    if (index > -1) {
      splines.splice(index, 1);
      selectedSpline = null;
      selectedPoint = null;
      if (splines.length > 0) {
        selectSpline(splines[splines.length - 1]);
      } else if (staticShapes.length > 0) {
        selectStaticShape(staticShapes[staticShapes.length - 1]);
      } else {
        updateSelectedItemUI();
      }
      recordState(); // Save new state
    }
  } else {
    alert("No spline selected to delete.");
  }
}

function selectSpline(spline) {
  selectedSpline = spline;
  selectedStaticShape = null;
  multiSelection = [];
  updateSelectedItemUI();
}

function selectStaticShape(shape) {
  selectedStaticShape = shape;
  selectedSpline = null;
  selectedPoint = null;
  multiSelection = [];
  updateSelectedItemUI();
}

/**
 * [FIXED] Updates the sidebar UI based on the current selection.
 * Hides item-specific controls when no items or multiple items are selected.
 */
function updateSelectedItemUI() {
  const controlsContainer = document.getElementById('spline-controls');
  const itemSpecificControls = document.getElementById('item-specific-controls');
  const h3 = controlsContainer.querySelector('h3');

  // Case 1: Multiple items are selected (or a single item via CTRL+click)
  if (multiSelection.length > 0) {
    if (multiSelection.length === 1) {
        h3.textContent = '(1 Item Selected)';
    } else {
        h3.textContent = `(${multiSelection.length} Items Selected)`;
    }
    itemSpecificControls.style.display = 'none'; // Hide specific controls
    return;
  }
  
  // After this point, we know multiSelection is empty. We now check for single selection.
  const item = selectedSpline || selectedStaticShape;

  // Case 2: A single item is selected (via normal click)
  if (item) {
    itemSpecificControls.style.display = 'block'; // Show the controls

    // Populate shared properties
    document.getElementById('selectedSizeX').value = item.shapeSizeX;
    document.getElementById('selectedSizeY').value = item.shapeSizeY;
    document.getElementById('selectedType').value = item.shapeType;
    document.getElementById('selectedFillColor').value = item.fillColor;
    document.getElementById('selectedStrokeColor').value = item.strokeColor;
    document.getElementById('selectedStrokeWeight').value = item.strokeWeight;
    
    // Get the containers for spline-only controls to toggle their visibility
    const splineOnlyControlGroups = [
        document.getElementById('selectedStartFrame').parentElement,
        document.getElementById('selectedTotalFrames').parentElement,
        document.getElementById('selectedTension').parentElement,
        document.getElementById('selectedEasing').parentElement
    ];

    if (selectedSpline) {
      h3.textContent = 'Selected Spline Control';
      splineOnlyControlGroups.forEach(el => el.style.display = 'flex'); // Show spline controls
      // Populate spline-specific properties
      document.getElementById('selectedStartFrame').value = item.startFrame;
      document.getElementById('selectedTotalFrames').value = item.totalFrames;
      document.getElementById('selectedTension').value = item.tension;
      document.getElementById('selectedEasing').value = item.easing;
    } else { // It must be a selectedStaticShape
      h3.textContent = 'Selected Shape Control';
      splineOnlyControlGroups.forEach(el => el.style.display = 'none'); // Hide spline controls
    }
  } else {
    // Case 3: No item is selected at all
    h3.textContent = 'No Item Selected';
    itemSpecificControls.style.display = 'none'; // Hide specific controls
  }
}


function updateSelectedItem() {
  const item = selectedSpline || selectedStaticShape;
  if (!item) return;
  
  if (multiSelection.length > 1) return;

  item.shapeSizeX = parseInt(document.getElementById('selectedSizeX').value);
  item.shapeSizeY = parseInt(document.getElementById('selectedSizeY').value);
  item.shapeType = document.getElementById('selectedType').value;
  item.fillColor = document.getElementById('selectedFillColor').value;
  item.strokeColor = document.getElementById('selectedStrokeColor').value;
  item.strokeWeight = parseFloat(document.getElementById('selectedStrokeWeight').value);
  if (selectedSpline) {
    item.startFrame = parseInt(document.getElementById('selectedStartFrame').value) || 0;
    item.totalFrames = parseInt(document.getElementById('selectedTotalFrames').value);
    item.tension = parseFloat(document.getElementById('selectedTension').value);
    item.easing = document.getElementById('selectedEasing').value;
  }
}

function clearAll() {
  splines = [];
  staticShapes = [];
  selectedSpline = null;
  selectedStaticShape = null;
  selectedPoint = null;
  multiSelection = [];
  appStartTime = millis();
  splineColorIndex = 0;
  recordState(); // Save cleared state
  addNewSpline(); // This creates a new spline and a new state after
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  let theme;
  if (document.body.classList.contains('dark-mode')) {
    theme = 'dark';
    themeToggleButton.textContent = 'Switch to Light Mode';
  } else {
    theme = 'light';
    themeToggleButton.textContent = 'Switch to Dark Mode';
  }
  localStorage.setItem('splineEditorTheme', theme);
}

// ==============
// DRAWING (Helper functions)
// ==============
function drawAllSplines(c = window) {
  for (let spline of splines) {
    drawSpline(spline, spline === selectedSpline, c);
    for (let i = 0; i < spline.points.length; i++) {
      drawDirectionalArrow(spline.points[i], spline, i, c);
    }
  }
}

function drawStaticShapes(c = window) {
  for (const shape of staticShapes) {
    const isMultiSelected = multiSelection.includes(shape);
    c.fill(shape.fillColor);
    c.stroke(shape.strokeColor);
    c.strokeWeight(shape.strokeWeight);
    c.push();
    c.translate(shape.pos.x, shape.pos.y);
    drawShapeOnCanvas(c, shape.shapeType, shape.shapeSizeX, shape.shapeSizeY);
    c.pop();
    if (shape === selectedStaticShape || isMultiSelected) {
      c.push(); 
      c.noFill();
      c.stroke(isMultiSelected ? '#FF8C00' : '#0095E8'); // Orange for multi, blue for single
      c.strokeWeight(isMultiSelected ? 2 : 3);
      c.rectMode(CENTER);
      c.rect(shape.pos.x, shape.pos.y, shape.shapeSizeX + 15, shape.shapeSizeY + 15);
      c.pop();
    }
  }
}

function drawSpline(spline, isSelected, c = window) {
  if (spline.points.length < 2) return;
  
  // A spline is selected if it's the `selectedSpline` or if all its points are multi-selected.
  const allPointsSelected = spline.points.length > 0 && spline.points.every(p => multiSelection.includes(p));

  c.noFill();
  c.stroke(isSelected || allPointsSelected ? '#ff0000' : spline.lineColor);
  c.strokeWeight(isSelected || allPointsSelected ? 3 : 2);
  c.beginShape();
  c.vertex(spline.points[0].x, spline.points[0].y);
  const tension = spline.tension / 6.0;
  for (let i = 0; i < spline.points.length - 1; i++) {
    const p1 = spline.points[i];
    const p2 = spline.points[i + 1];
    const p0 = i > 0 ? spline.points[i - 1] : p1;
    const p3 = i < spline.points.length - 2 ? spline.points[i + 2] : p2;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    c.bezierVertex(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  c.endShape();
}

function drawDirectionalArrow(p, spline, pointIndex, c = window) {
    if (spline.points.length < 2) return;
    let direction;
    const arrowSize = 12;

    if (spline.points.length >= 2) {
        if (pointIndex === 0) {
            if (spline.points.length > 1) direction = p5.Vector.sub(getPointOnSegment(spline, 0, 0.01), p);
        } else if (pointIndex === spline.points.length - 1) {
             if (spline.points.length > 1) direction = p5.Vector.sub(p, getPointOnSegment(spline, pointIndex - 1, 0.99));
        } else {
            const prev = spline.points[pointIndex - 1];
            const next = spline.points[pointIndex + 1];
            direction = createVector(next.x - prev.x, next.y - prev.y);
        }
    }
    if (!direction) direction = createVector(1, 0);

    direction.normalize().mult(arrowSize);
    const isSelected = (selectedPoint === p);
    const isMultiSelected = multiSelection.includes(p);
    c.push();
    c.translate(p.x, p.y);
    c.rotate(direction.heading());
    if (isSelected || isMultiSelected) {
        fill(isMultiSelected ? '#FF8C00' : '#FF0000'); // Orange for multi, red for single
        stroke(isMultiSelected ? '#cc7000' : '#cc0000');
    } else {
        fill(0, 150, 255, 153);
        stroke(0, 100, 255);
    }
    c.strokeWeight(1.5);
    c.beginShape();
    c.vertex(arrowSize, 0);
    c.vertex(-arrowSize * 0.6, arrowSize * 0.5);
    c.vertex(-arrowSize * 0.3, 0);
    c.vertex(-arrowSize * 0.6, -arrowSize * 0.5);
    c.endShape(CLOSE);
    c.pop();
}

function drawMovingShapes(c = window) {
  for (let spline of splines) {
    if (spline.points.length < 2) continue;
    const pos = getCurrentSplinePosition(spline);
    if (!pos) continue;
    c.fill(spline.fillColor);
    c.stroke(spline.strokeColor);
    c.strokeWeight(spline.strokeWeight);
    c.push();
    c.translate(pos.x, pos.y);
    drawShapeOnCanvas(c, spline.shapeType, spline.shapeSizeX, spline.shapeSizeY);
    c.pop();
  }
}

/**
 * [FIXED] Draws a selection box that can be created from any corner.
 */
function drawSelectionBox() {
    if (selectionBox) {
        push();
        fill(0, 100, 255, 50);
        stroke(0, 100, 255, 200);
        strokeWeight(1.5);
        drawingContext.setLineDash([6, 3]); // Dashed line style

        // Normalize rect to always draw from top-left with positive w/h
        const x = selectionBox.w > 0 ? selectionBox.x : selectionBox.x + selectionBox.w;
        const y = selectionBox.h > 0 ? selectionBox.y : selectionBox.y + selectionBox.h;
        const w = abs(selectionBox.w);
        const h = abs(selectionBox.h);
        rect(x, y, w, h);

        drawingContext.setLineDash([]); // Reset to solid line
        pop();
    }
}

function drawDragIndicator() { /* ... */ }


// ======================================
// SELECTION HELPER FUNCTIONS
// ======================================

/**
 * Adds or removes a single item from the multiSelection array.
 * @param {object} item - The point or static shape to toggle.
 */
function toggleItemInMultiSelection(item) {
    const index = multiSelection.indexOf(item);
    if (index > -1) {
        multiSelection.splice(index, 1);
    } else {
        multiSelection.push(item);
    }
}

/**
 * Adds or removes all points of a spline from the multiSelection array.
 * @param {object} spline - The spline to toggle.
 */
function toggleSplineInMultiSelection(spline) {
    const allPointsSelected = spline.points.length > 0 && spline.points.every(p => multiSelection.includes(p));

    if (allPointsSelected) {
        // If all are selected, remove them all
        multiSelection = multiSelection.filter(item => !spline.points.includes(item));
    } else {
        // Otherwise, add any missing points
        spline.points.forEach(p => {
            if (!multiSelection.includes(p)) {
                multiSelection.push(p);
            }
        });
    }
}


// ==============
// INTERACTION
// ==============
function keyPressed() {
    if (keyIsDown(CONTROL)) {
        if (key.toLowerCase() === 'z') {
            undo();
        } else if (key.toLowerCase() === 'y') {
            redo();
        }
    }
}

/**
 * [FIXED] Handles mouse press events for selection, multi-selection, and dragging.
 */
function mousePressed() {
    if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height || isExporting) return;

    if (keyIsDown(CONTROL)) {
        // --- CTRL+CLICK LOGIC ---

        // 1. Persist any previous single selection into the multi-selection array.
        // This makes CTRL+click additive to a previous single click.
        if (selectedStaticShape) {
            if (!multiSelection.includes(selectedStaticShape)) multiSelection.push(selectedStaticShape);
        }
        if (selectedSpline) { // If a spline was the single selection
            // If the selected entity was the spline itself, all its points are the selection targets.
            const targetItems = selectedPoint ? [selectedPoint] : selectedSpline.points;
            targetItems.forEach(p => {
                if (!multiSelection.includes(p)) {
                    multiSelection.push(p);
                }
            });
        }
        
        // After merging, clear the single-selection state to avoid conflicts.
        selectedSpline = null;
        selectedStaticShape = null;
        selectedPoint = null;

        // 2. Find what was just clicked.
        let clickedOnSomething = false;
        
        // Prioritize points and anchors.
        for (let i = staticShapes.length - 1; i >= 0; i--) {
            const shape = staticShapes[i];
            if (mouseX > shape.pos.x - shape.shapeSizeX / 2 && mouseX < shape.pos.x + shape.shapeSizeX / 2 &&
                mouseY > shape.pos.y - shape.shapeSizeY / 2 && mouseY < shape.pos.y + shape.shapeSizeY / 2) {
                toggleItemInMultiSelection(shape);
                clickedOnSomething = true;
                break;
            }
        }

        if (!clickedOnSomething) {
            for (let s = splines.length - 1; s >= 0; s--) {
                const spline = splines[s];
                for (let i = 0; i < spline.points.length; i++) {
                    const p = spline.points[i];
                    if (dist(mouseX, mouseY, p.x, p.y) < 15) {
                        toggleItemInMultiSelection(p);
                        clickedOnSomething = true;
                        break;
                    }
                }
                if (clickedOnSomething) break;
            }
        }

        // If no point/anchor was clicked, check for spline lines.
        if (!clickedOnSomething) {
            for (let i = splines.length - 1; i >= 0; i--) {
                const spline = splines[i];
                if (isMouseOnSpline(spline, 20)) {
                    toggleSplineInMultiSelection(spline);
                    clickedOnSomething = true;
                    break;
                }
            }
        }

        // If click was on empty space, start a new selection box.
        if (!clickedOnSomething) {
            multiSelection = [];
            selectionBox = { x: mouseX, y: mouseY, w: 0, h: 0 };
        }

        updateSelectedItemUI();
        return;
    }

    // --- NORMAL CLICK LOGIC (NO CTRL) ---

    // 1. Check if starting a drag of an existing multi-selection.
    if (multiSelection.length > 0) {
        let canStartDrag = false;
        // Check for click on a selected point/anchor.
        for (const item of multiSelection) {
            const itemPos = item.pos || item;
            if (itemPos && dist(mouseX, mouseY, itemPos.x, itemPos.y) < 20) {
                canStartDrag = true;
                break;
            }
        }
        // If not, check for click on a selected spline's line.
        if (!canStartDrag) {
            for (const spline of splines) {
                const isSplineSelected = spline.points.length > 0 && spline.points.every(p => multiSelection.includes(p));
                if (isSplineSelected && isMouseOnSpline(spline, 20)) {
                    canStartDrag = true;
                    break;
                }
            }
        }
        
        if (canStartDrag) {
            isDraggingSelection = true;
            dragStartPos = createVector(mouseX, mouseY);
            return; // Exit after starting drag.
        }
    }

    // 2. If not dragging a multi-selection, it's a new single selection. Clear previous selections.
    multiSelection = [];
    isDraggingSelection = false;
    
    // 3. Find the single item to select.
    for (let i = staticShapes.length - 1; i >= 0; i--) {
        const shape = staticShapes[i];
        if (mouseX > shape.pos.x - shape.shapeSizeX / 2 && mouseX < shape.pos.x + shape.shapeSizeX / 2 &&
            mouseY > shape.pos.y - shape.shapeSizeY / 2 && mouseY < shape.pos.y + shape.shapeSizeY / 2) {
            draggedStaticShape = shape;
            selectStaticShape(shape);
            return;
        }
    }

    for (let s = splines.length - 1; s >= 0; s--) {
        const spline = splines[s];
        for (let i = 0; i < spline.points.length; i++) {
            const p = spline.points[i];
            if (dist(mouseX, mouseY, p.x, p.y) < 15) {
                draggedPoint = p;
                selectedPoint = p;
                selectedPointIndex = i;
                selectedSplineIndex = s;
                selectSpline(spline);
                return;
            }
        }
    }

    for (let i = splines.length - 1; i >= 0; i--) {
        const spline = splines[i];
        if (isMouseOnSpline(spline, 20)) { 
            draggedSpline = spline;
            selectSpline(spline);
            dragStartPos = createVector(mouseX, mouseY);
            return;
        }
    }
  
    // 4. If nothing was clicked, deselect everything.
    selectedSpline = null;
    selectedStaticShape = null;
    selectedPoint = null;
    updateSelectedItemUI();
}

/**
 * [FIXED] Handles dragging of selected items.
 */
function mouseDragged() {
    if (isExporting) return;
    
    if (selectionBox) {
        selectionBox.w = mouseX - selectionBox.x;
        selectionBox.h = mouseY - selectionBox.y;
    } else if (isDraggingSelection) {
        const currentMousePos = createVector(mouseX, mouseY);
        const delta = p5.Vector.sub(currentMousePos, dragStartPos);
        const itemsToMove = new Set(multiSelection);
        
        itemsToMove.forEach(item => {
            // Add guards to ensure item and its position vector exist before trying to move.
            if (item) {
                 const itemPos = item.pos || item;
                 if (itemPos && typeof itemPos.add === 'function') {
                    itemPos.add(delta);
                 }
            }
        });
       
        dragStartPos = currentMousePos;
        dragOccurred = true;
    } else if (draggedStaticShape) {
        draggedStaticShape.pos.x = constrain(mouseX, 0, width);
        draggedStaticShape.pos.y = constrain(mouseY, 0, height);
        dragOccurred = true;
    } else if (draggedPoint) {
        draggedPoint.x = constrain(mouseX, 0, width);
        draggedPoint.y = constrain(mouseY, 0, height);
        dragOccurred = true;
    } else if (draggedSpline) {
        const currentMousePos = createVector(mouseX, mouseY);
        const delta = p5.Vector.sub(currentMousePos, dragStartPos);
        for (let point of draggedSpline.points) {
            point.add(delta);
        }
        dragStartPos = currentMousePos;
        dragOccurred = true;
    }
}


function mouseReleased() {
  if (selectionBox) {
      selectItemsInBox(selectionBox);
      selectionBox = null;
      updateSelectedItemUI();
  } else if (dragOccurred) {
      recordState();
  }
  
  draggedPoint = null;
  draggedStaticShape = null;
  draggedSpline = null;
  dragStartPos = null;
  isDraggingSelection = false;
  dragOccurred = false;
}

function selectItemsInBox(box) {
    const r = {
        x: box.w < 0 ? box.x + box.w : box.x,
        y: box.h < 0 ? box.y + box.h : box.y,
        w: abs(box.w),
        h: abs(box.h)
    };

    multiSelection = [];
    
    for (const shape of staticShapes) {
        if (shape.pos.x > r.x && shape.pos.x < r.x + r.w && shape.pos.y > r.y && shape.pos.y < r.y + r.h) {
            multiSelection.push(shape);
        }
    }
    for (const spline of splines) {
        for (const point of spline.points) {
            if (point.x > r.x && point.x < r.x + r.w && point.y > r.y && point.y < r.y + r.h) {
                multiSelection.push(point);
            }
        }
    }
}


function doubleClicked() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  if (isExporting) return;
  const mousePos = createVector(mouseX, mouseY);
  let bestMatch = { spline: null, pointData: { distance: Infinity } };

  for (const spline of splines) {
    if (spline.points.length < 2) continue;
    const closestPointData = findClosestPointOnSpline(spline, mousePos);
    if (closestPointData.distance < bestMatch.pointData.distance) {
      bestMatch.spline = spline;
      bestMatch.pointData = closestPointData;
    }
  }

  if (bestMatch.spline && bestMatch.pointData.distance < 20) {
    const targetSpline = bestMatch.spline;
    const newPoint = bestMatch.pointData.point;
    const segmentIndex = bestMatch.pointData.segmentIndex;
    targetSpline.points.splice(segmentIndex + 1, 0, newPoint);
    selectSpline(targetSpline);
    selectedPoint = newPoint;
    selectedPointIndex = segmentIndex + 1;
    recordState(); // Save new state
  }
}

function findClosestPointOnSpline(spline, pos) {
  let closest = { point: null, distance: Infinity, segmentIndex: -1, t: 0 };
  for (let i = 0; i < spline.points.length - 1; i++) {
    for (let t = 0; t <= 1; t += 0.01) {
      const p = getPointOnSegment(spline, i, t);
      if (p) {
        const d = dist(pos.x, pos.y, p.x, p.y);
        if (d < closest.distance) {
          closest.distance = d;
          closest.point = p;
          closest.segmentIndex = i;
          closest.t = t;
        }
      }
    }
  }
  return closest;
}

function isMouseOnSpline(spline, tolerance) {
  if (spline.points.length < 2) return false;
  for (let i = 0; i < spline.points.length - 1; i++) {
    for (let t = 0; t <= 1; t += 0.05) {
      const p = getPointOnSegment(spline, i, t);
      if (p) {
        const d = dist(mouseX, mouseY, p.x, p.y);
        if (d < tolerance) { return true; }
      }
    }
  }
  return false;
}

// ==============================
// POINT & SHAPE MANAGEMENT
// ==============================
function cloneSelectedItem() {
  const offset = createVector(20, 20);
  if (multiSelection.length > 1) {
      multiSelection.forEach(item => {
          const itemPos = item.pos || item;
          itemPos.add(offset);
      });
      recordState();
  } else if (selectedSpline) {
    const original = selectedSpline;
    const newSpline = {
      ...original,
      points: original.points.map(p => {
        let newX = p.x + offset.x;
        let newY = p.y + offset.y;
        if (newX > width) newX -= (width / 4);
        if (newY > height) newY -= (height / 4);
        return createVector(newX, newY);
      }),
      lineColor: splineColors[splineColorIndex]
    };
    splineColorIndex = (splineColorIndex + 1) % splineColors.length;
    splines.push(newSpline);
    selectSpline(newSpline);
    recordState();
  } else if (selectedStaticShape) {
    const original = selectedStaticShape;
    let newX = original.pos.x + offset.x;
    let newY = original.pos.y + offset.y;
    if (newX > width) newX = width - original.shapeSizeX;
    if (newY > height) newY = height - original.shapeSizeY;
    const newShape = {
      ...original,
      pos: createVector(newX, newY)
    };
    staticShapes.push(newShape);
    selectStaticShape(newShape);
    recordState();
  }
}

function removeSelectedItem() {
  let stateChanged = false;
  if (multiSelection.length > 0) {
      multiSelection.forEach(item => {
          if (item.isStatic) {
              const index = staticShapes.indexOf(item);
              if (index > -1) staticShapes.splice(index, 1);
          } else {
              for (const spline of splines) {
                  const index = spline.points.indexOf(item);
                  if (index > -1) {
                      if (spline.points.length > 2) {
                          spline.points.splice(index, 1);
                      } else {
                          // If removing the point would leave less than 2, remove the whole spline
                          const splineIndex = splines.indexOf(spline);
                          if (splineIndex > -1) splines.splice(splineIndex, 1);
                          break; // Move to next spline
                      }
                  }
              }
          }
      });
      multiSelection = [];
      stateChanged = true;
  } else if (selectedStaticShape) {
    const index = staticShapes.indexOf(selectedStaticShape);
    if (index > -1) { 
        staticShapes.splice(index, 1);
        stateChanged = true;
    }
    selectedStaticShape = null;
  } else if (selectedPoint && selectedSpline) {
    if (selectedSpline.points.length > 2) {
      selectedSpline.points.splice(selectedPointIndex, 1);
      selectedPoint = null;
      selectedPointIndex = -1;
      stateChanged = true;
    } else {
      alert("A spline must have at least 2 points.");
    }
  }

  if (stateChanged) {
      selectedPoint = null;
      selectedSpline = null;
      selectedStaticShape = null;
      updateSelectedItemUI();
      recordState();
  }
}

function addPointToSpline() {
  if (!selectedSpline || selectedSpline.points.length < 2) { return; }
  let longestSegment = { index: -1, length: 0 };
  for (let i = 0; i < selectedSpline.points.length - 1; i++) {
    let segmentLength = 0;
    const steps = 20;
    let lastPoint = getPointOnSegment(selectedSpline, i, 0);
    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      const currentPoint = getPointOnSegment(selectedSpline, i, t);
      segmentLength += dist(lastPoint.x, lastPoint.y, currentPoint.x, currentPoint.y);
      lastPoint = currentPoint;
    }
    if (segmentLength > longestSegment.length) {
      longestSegment.length = segmentLength;
      longestSegment.index = i;
    }
  }
  if (longestSegment.index !== -1) {
    const newPoint = getPointOnSegment(selectedSpline, longestSegment.index, 0.5);
    selectedSpline.points.splice(longestSegment.index + 1, 0, newPoint);
    recordState();
  }
}

// ==============================
// PREVIEW CONTROLS
// ==============================
function toggleLooping() {
  loopingPreview = !loopingPreview;
  isPlayingOnce = false;
  if (loopingPreview) {
    loopPreviewButton.textContent = 'Loop Preview: ON';
    loopPreviewButton.style.backgroundColor = 'var(--accent-success)';
    appStartTime = millis();
  } else {
    loopPreviewButton.textContent = 'Loop Preview: OFF';
    loopPreviewButton.style.backgroundColor = 'var(--accent-danger)';
  }
}

function playOnce() {
  if (loopingPreview) toggleLooping();
  isPlayingOnce = true;
  appStartTime = millis();
}

// ==============================
// SPLINE & CANVAS MATH/LOGIC
// ==============================
function applyEasing(t, easingType) {
  switch (easingType) {
    case 'easeIn': return t * t;
    case 'easeOut': return t * (2 - t);
    case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t;
  }
}

function getCurrentSplinePosition(spline) {
  const elapsedTime = millis() - appStartTime;
  let progress = 0; 

  const exportFps = parseInt(document.getElementById('exportFPS').value) || 16;

  if (isPlayingOnce) {
    const startDelayMs = (spline.startFrame / exportFps) * 1000;
    if (elapsedTime > startDelayMs) {
        const splineDurationMs = (spline.totalFrames / exportFps) * 1000;
        const splineLocalTime = elapsedTime - startDelayMs;
        progress = constrain(splineLocalTime / splineDurationMs, 0, 1);
    }
  } else if (loopingPreview) {
    const exportTotalFrames = parseInt(document.getElementById('exportTotalFrames').value) || 80;
    const mainTimelineDurationMs = (exportTotalFrames / exportFps) * 1000;
    if (mainTimelineDurationMs <= 0) return getPointOnSegment(spline, 0, 0);
    
    const currentTimeInLoopMs = elapsedTime % mainTimelineDurationMs;
    const startDelayMs = (spline.startFrame / exportFps) * 1000;
    const splineDurationMs = (spline.totalFrames / exportFps) * 1000;
    const endDelayMs = startDelayMs + splineDurationMs;

    if (currentTimeInLoopMs > startDelayMs) {
      if (currentTimeInLoopMs < endDelayMs) {
        const splineLocalTime = currentTimeInLoopMs - startDelayMs;
        progress = splineLocalTime / splineDurationMs;
      } else {
        progress = 1; 
      }
    } 
  }
  
  progress = applyEasing(progress, spline.easing);
  const targetDistance = progress * calculateSplineLength(spline);
  return getPointAtDistance(spline, targetDistance)?.point;
}

function calculateSplineLength(spline) {
  if (spline.points.length < 2) return 0;
  let totalLength = 0;
  const segments = 100;
  for (let i = 0; i < spline.points.length - 1; i++) {
    let prevPoint = getPointOnSegment(spline, i, 0);
    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const currentPoint = getPointOnSegment(spline, i, t);
      totalLength += dist(prevPoint.x, prevPoint.y, currentPoint.x, currentPoint.y);
      prevPoint = currentPoint;
    }
  }
  return totalLength;
}

function getPointAtDistance(spline, targetDistance) {
  if (spline.points.length < 2) return null;
  let accumulatedDistance = 0;
  const segments = 100;
  if (targetDistance <= 0) return { point: spline.points[0], segmentIndex: 0, t: 0 };
  for (let i = 0; i < spline.points.length - 1; i++) {
    let segmentStart = getPointOnSegment(spline, i, 0);
    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const segmentEnd = getPointOnSegment(spline, i, t);
      const segmentLength = dist(segmentStart.x, segmentStart.y, segmentEnd.x, segmentEnd.y);
      if (accumulatedDistance + segmentLength >= targetDistance) {
        const ratio = (targetDistance - accumulatedDistance) / segmentLength;
        const point = p5.Vector.lerp(segmentStart, segmentEnd, ratio);
        return { point: point, segmentIndex: i, t: (j - 1 + ratio) / segments };
      }
      accumulatedDistance += segmentLength;
      segmentStart = segmentEnd;
    }
  }
  return { point: spline.points[spline.points.length - 1], segmentIndex: spline.points.length - 2, t: 1 };
}

function getPointOnSegment(spline, segmentIndex, t) {
  if (segmentIndex < 0 || segmentIndex >= spline.points.length - 1) return null;
  const p1 = spline.points[segmentIndex];
  const p2 = spline.points[segmentIndex + 1];
  if (!p1 || !p2) return null; // Add check for valid points
  if (spline.points.length < 3) return p5.Vector.lerp(p1, p2, t);
  const p0 = segmentIndex > 0 ? spline.points[segmentIndex - 1] : p1;
  const p3 = segmentIndex < spline.points.length - 2 ? spline.points[segmentIndex + 2] : p2;
  const tension = spline.tension / 6.0;
  const cp1x = p1.x + (p2.x - p0.x) * tension;
  const cp1y = p1.y + (p2.y - p0.y) * tension;
  const cp2x = p2.x - (p3.x - p1.x) * tension;
  const cp2y = p2.y - (p3.y - p1.y) * tension;
  const x = bezierPoint(p1.x, cp1x, cp2x, p2.x, t);
  const y = bezierPoint(p1.y, cp1y, cp2y, p2.y, t);
  return createVector(x, y);
}

function windowResized() { if (backgroundImg) { resizeCanvasToFit(); } }

function resizeCanvasToFit() {
  let sourceWidth = originalImageDimensions.width;
  let sourceHeight = originalImageDimensions.height;
  const sidebarWidth = document.getElementById('spline-controls').offsetWidth;
  const horizontalMargin = sidebarWidth + 100;
  const verticalMargin = 250;
  const maxDisplayWidth = window.innerWidth - horizontalMargin;
  const maxDisplayHeight = window.innerHeight - verticalMargin;
  const ratio = Math.min(maxDisplayWidth / sourceWidth, maxDisplayHeight / sourceHeight);
  const displayWidth = sourceWidth * ratio;
  const displayHeight = sourceHeight * ratio;
  if (Math.round(displayWidth) > 0 && Math.round(displayHeight) > 0) {
    document.getElementById('canvasWidth').value = Math.round(displayWidth);
    document.getElementById('canvasHeight').value = Math.round(displayHeight);
    updateCanvasSize();
  }
}

function updateCanvasSize() {
  const newWidth = parseInt(document.getElementById('canvasWidth').value);
  const newHeight = parseInt(document.getElementById('canvasHeight').value);
  if (newWidth !== width || newHeight !== height) {
    const originalWidth = width;
    const originalHeight = height;
    resizeCanvas(newWidth, newHeight);
    for (let spline of splines) {
      for (let point of spline.points) {
        point.x = (point.x / originalWidth) * newWidth;
        point.y = (point.y / originalHeight) * newHeight;
      }
    }
    for (let shape of staticShapes) {
        shape.pos.x = (shape.pos.x / originalWidth) * newWidth;
        shape.pos.y = (shape.pos.y / originalHeight) * newHeight;
    }
    recordState();
  }
}

function resetCanvasSize() {
  let targetWidth = backgroundImg ? originalImageDimensions.width : 1000;
  let targetHeight = backgroundImg ? originalImageDimensions.height : 562;
  document.getElementById('canvasWidth').value = targetWidth;
  document.getElementById('canvasHeight').value = targetHeight;
  updateCanvasSize();
}

// ======================================
// SCENE SAVE/LOAD (MODIFIED)
// ======================================

function handleSceneFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    loadSceneFromFile(file);
}

function gotFile(file) {
    if (file.type === 'image') {
        loadSceneFromFile(file.file);
    } else {
        console.log('Not an image file!');
    }
}

function loadSceneFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const markerIndex = text.lastIndexOf(METADATA_MARKER);

        if (markerIndex !== -1) {
            const jsonData = text.substring(markerIndex + METADATA_MARKER.length);
            try {
                const sceneData = JSON.parse(jsonData);
                loadScene(sceneData); 
            } catch (err) {
                console.error("Failed to parse scene data, loading as regular image.", err);
                loadAsRegularImage(file);
            }
        } else {
            loadAsRegularImage(file);
        }
    };
    reader.readAsBinaryString(file);
}

function loadAsRegularImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        backgroundImg = loadImage(e.target.result,
            img => {
                originalImageDimensions = { width: img.width, height: img.height };
                resizeCanvasToFit();
                recordState();
            },
            err => console.error('Error loading image:', err)
        );
    };
    reader.readAsDataURL(file);
}

function loadScene(sceneData) {
    const savedCanvasDimensions = sceneData.originalImageDimensions || { width: 1000, height: 562 };
    const currentWidth = width;
    const currentHeight = height;
    const scaleX = currentWidth / savedCanvasDimensions.width;
    const scaleY = currentHeight / savedCanvasDimensions.height;
    const avgScale = (scaleX + scaleY) / 2;

    splines = [];
    staticShapes = [];

    if (sceneData.splines) {
        sceneData.splines.forEach(sData => {
            const newSpline = { ...sData };
            newSpline.points = sData.points.map(p => createVector(p.x * scaleX, p.y * scaleY));
            newSpline.shapeSizeX = (sData.shapeSizeX || 10) * avgScale;
            newSpline.shapeSizeY = (sData.shapeSizeY || 10) * avgScale;
            splines.push(newSpline);
        });
    }

    if (sceneData.staticShapes) {
        sceneData.staticShapes.forEach(sData => {
            const newShape = { ...sData };
            newShape.pos = createVector(sData.pos.x * scaleX, sData.pos.y * scaleY);
            newShape.shapeSizeX = (sData.shapeSizeX || 10) * avgScale;
            newShape.shapeSizeY = (sData.shapeSizeY || 10) * avgScale;
            staticShapes.push(newShape);
        });
    }
    
    splineColorIndex = sceneData.splineColorIndex || 0;
    selectedSpline = null;
    selectedStaticShape = null;
    selectedPoint = null;
    appStartTime = millis();

    if (splines.length > 0) selectSpline(splines[0]);
    else if (staticShapes.length > 0) selectStaticShape(staticShapes[0]);
    else document.getElementById('spline-controls').style.display = 'none';

    recordState(); // Record the loaded scene as a new state
}

function exportScene() {
    const sceneData = {
        splines: splines.map(s => ({ ...s, points: s.points.map(p => ({ x: p.x, y: p.y })) })),
        staticShapes: staticShapes.map(s => ({ ...s, pos: { x: s.pos.x, y: s.pos.y } })),
        originalImageDimensions: { width: width, height: height },
        splineColorIndex: splineColorIndex
    };
    const jsonDataString = JSON.stringify(sceneData);
    const tempCanvas = createGraphics(width, height);
    tempCanvas.background(255);
    drawAllSplines(tempCanvas);
    drawStaticShapes(tempCanvas);
    drawMovingShapes(tempCanvas);
    const imageDataUrl = tempCanvas.elt.toDataURL('image/png');
    
    fetch(imageDataUrl).then(res => res.blob()).then(imageBlob => {
        const metadataBlob = new Blob([METADATA_MARKER + jsonDataString], { type: 'text/plain' });
        const combinedBlob = new Blob([imageBlob, metadataBlob], { type: 'image/png' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(combinedBlob);
        a.download = 'spline-canvas.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });
    tempCanvas.remove();
}

// ==============
// EXPORT
// ==============
function startExport() {
  if (splines.length === 0 && staticShapes.length === 0) { alert("There is nothing to export."); return; }
  const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  let supportedMimeType = null;
  if (window.MediaRecorder) {
    for (const mimeType of mimeTypes) { if (MediaRecorder.isTypeSupported(mimeType)) { supportedMimeType = mimeType; break; } }
  }
  if (!supportedMimeType) { alert("Video export not supported in this browser."); return; }
  if (isExporting) return;
  isExporting = true;
  exportOverlay.style.display = 'flex';
  progressBarFill.style.width = '0%';
  exportPercentage.textContent = '0%';
  exportFPS = parseInt(document.getElementById('exportFPS').value);
  exportTotalFrames = parseInt(document.getElementById('exportTotalFrames').value);
  exportDuration = exportTotalFrames / exportFPS;

  exportFrameCount.textContent = `Frame 0 of ${exportTotalFrames}`;
  exportProgress = 0;
  recordedChunks = [];
  const exportWidth = backgroundImg ? originalImageDimensions.width : width;
  const exportHeight = backgroundImg ? originalImageDimensions.height : height;
  exportCanvas = createGraphics(exportWidth, exportHeight);
  exportCanvas.pixelDensity(1);
  exportCanvas.hide();
  exportStream = exportCanvas.elt.captureStream(exportFPS);
  mediaRecorder = new MediaRecorder(exportStream, { mimeType: supportedMimeType, videoBitsPerSecond: 2500000 });
  mediaRecorder.ondataavailable = e => e.data.size > 0 && recordedChunks.push(e.data);
  mediaRecorder.onstop = handleExportFinish;
  mediaRecorder.start();
  renderNextFrame();
}

function drawExportFrame(overallProgress) {
  exportCanvas.background(255);
  const exportCurrentTimeMs = overallProgress * exportDuration * 1000;
  
  for (const shape of staticShapes) {
      const scaleX = exportCanvas.width / width;
      const scaleY = exportCanvas.height / height;
      exportCanvas.push();
      exportCanvas.fill(shape.fillColor);
      exportCanvas.stroke(shape.strokeColor);
      exportCanvas.strokeWeight(shape.strokeWeight * ((scaleX + scaleY) / 2));
      exportCanvas.translate(shape.pos.x * scaleX, shape.pos.y * scaleY);
      drawShapeOnCanvas(exportCanvas, shape.shapeType, shape.shapeSizeX * scaleX, shape.shapeSizeY * scaleY); 
      exportCanvas.pop();
  }
  for (const spline of splines) {
    const startDelayMs = (spline.startFrame / exportFPS) * 1000;
    if (exportCurrentTimeMs < startDelayMs) continue;
    
    const splineDurationMs = (spline.totalFrames / exportFPS) * 1000;
    const splineLocalTime = exportCurrentTimeMs - startDelayMs;
    
    let splineProgress = constrain(splineLocalTime / splineDurationMs, 0, 1);
    splineProgress = applyEasing(splineProgress, spline.easing);

    const totalLength = calculateSplineLength(spline);
    const targetDistance = splineProgress * totalLength;
    const pos = getPointAtDistance(spline, targetDistance);
    if (pos) {
      const scaleX = exportCanvas.width / width;
      const scaleY = exportCanvas.height / height;
      exportCanvas.push();
      exportCanvas.fill(spline.fillColor);
      exportCanvas.stroke(spline.strokeColor);
      exportCanvas.strokeWeight(spline.strokeWeight * ((scaleX + scaleY) / 2));
      exportCanvas.translate(pos.point.x * scaleX, pos.point.y * scaleY);
      drawShapeOnCanvas(exportCanvas, spline.shapeType, spline.shapeSizeX * scaleX, spline.shapeSizeY * scaleY);
      exportCanvas.pop();
    }
  }

  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.requestData();
  }
}

function renderNextFrame() {
  if (!isExporting) return;
  if (exportProgress < exportTotalFrames) {
    drawExportFrame(exportProgress / exportTotalFrames);
    const progressPercent = (exportProgress / exportTotalFrames) * 100;
    progressBarFill.style.width = `${progressPercent}%`;
    exportPercentage.textContent = `${Math.round(progressPercent)}%`;
    exportFrameCount.textContent = `Frame ${exportProgress} of ${exportTotalFrames}`;
    exportProgress++;

    setTimeout(renderNextFrame, 1000 / exportFPS);
  } else {
    progressBarFill.style.width = '100%';
    exportPercentage.textContent = '100%';
    exportFrameCount.textContent = `Frame ${exportTotalFrames} of ${exportTotalFrames}`;
    finishExport();
  }
}

function drawShapeOnCanvas(canvas, type, sizeX, sizeY) {
  switch (type) {
    case 'circle': canvas.ellipse(0, 0, sizeX, sizeY); break;
    case 'square': canvas.rectMode(canvas.CENTER); canvas.rect(0, 0, sizeX, sizeY); break;
    case 'triangle': canvas.triangle(-sizeX / 2, sizeY / 2, sizeX / 2, sizeY / 2, 0, -sizeY / 2); break;
  }
}

function handleExportFinish() {
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'spline-animation.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
  cleanupExport();
}

function finishExport() {
  if (mediaRecorder?.state !== 'inactive') { mediaRecorder.stop(); }
  else { cleanupExport(); }
}

function cancelExport() {
  if (isExporting) {
    isExporting = false;
    if (mediaRecorder?.state !== 'inactive') { mediaRecorder.stop(); }
  }
}

function cleanupExport() {
  if (exportOverlay) { exportOverlay.style.display = 'none'; }
  exportCanvas?.remove();
  exportStream?.getTracks().forEach(track => track.stop());
  exportCanvas = null;
  exportStream = null;
  mediaRecorder = null;
  isExporting = false;
}