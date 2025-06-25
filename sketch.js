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
  // Listeners for the new checkbox
  document.getElementById('selectedHideOnComplete').addEventListener('input', updateSelectedItem);
  document.getElementById('selectedHideOnComplete').addEventListener('change', recordState);

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
    fillColor: '#000000', strokeColor: '#ffffff', strokeWeight: 0.5, tension: 0, easing: 'linear',
    // CHANGED: Default hide on complete to true
    hideOnComplete: true, 
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
  recordState();
}

function addStaticShape() {
  const defaultSettings = {
    shapeSizeX: 10, shapeSizeY: 10, shapeType: 'square',
    fillColor: '#000000', strokeColor: '#ffffff', strokeWeight: 0.5,
    // CHANGED: Default hide on complete to true
    startFrame: 0, totalFrames: 80, hideOnComplete: true, isStatic: true
  };
  const xOffset = (staticShapes.length % 5) * 20;
  const yOffset = (staticShapes.length % 5) * 20;
  const newShape = { ...defaultSettings, pos: createVector(width / 2 + xOffset, height / 2 + yOffset) };
  staticShapes.push(newShape);
  selectStaticShape(newShape);
  recordState();
}

/**
 * [CHANGED] Handles deleting selected splines. If multiple items are selected, it
 * will defer to the more general removeSelectedItem() function.
 */
function deleteSelectedSpline() {
  // If multiple items are selected, use the general removal function.
  if (multiSelection.length > 0) {
    removeSelectedItem();
    return;
  }
  
  // Original logic for deleting a single, fully selected spline.
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
      recordState();
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
 * [CHANGED] Updates the sidebar UI to show/hide relevant controls and changes button text for multi-selection.
 */
function updateSelectedItemUI() {
  const controlsContainer = document.getElementById('spline-controls');
  const itemSpecificControls = document.getElementById('item-specific-controls');
  const h3 = controlsContainer.querySelector('h3');
  const deleteSplineBtn = document.getElementById('deleteSpline');
  const removePointBtn = document.getElementById('removePoint');

  if (multiSelection.length > 0) {
    h3.textContent = `(${multiSelection.length} Items Selected)`;
    itemSpecificControls.style.display = 'none';
    deleteSplineBtn.textContent = 'Delete Selected';
    removePointBtn.textContent = 'Delete Selected';
    return;
  }
  
  // Revert button text if not in multi-select mode
  deleteSplineBtn.textContent = 'Delete Spline';
  removePointBtn.textContent = 'Remove Point/Anchor';
  
  const item = selectedSpline || selectedStaticShape;

  if (item) {
    itemSpecificControls.style.display = 'block';

    // Populate shared properties
    document.getElementById('selectedSizeX').value = item.shapeSizeX;
    document.getElementById('selectedSizeY').value = item.shapeSizeY;
    document.getElementById('selectedType').value = item.shapeType;
    document.getElementById('selectedFillColor').value = item.fillColor;
    document.getElementById('selectedStrokeColor').value = item.strokeColor;
    document.getElementById('selectedStrokeWeight').value = item.strokeWeight;
    document.getElementById('selectedStartFrame').value = item.startFrame;
    document.getElementById('selectedTotalFrames').value = item.totalFrames;
    document.getElementById('selectedHideOnComplete').checked = item.hideOnComplete === true;
    
    // Toggle visibility of controls based on item type
    const tensionControl = document.getElementById('selectedTension').parentElement;
    const easingControl = document.getElementById('selectedEasing').parentElement;

    if (selectedSpline) {
      h3.textContent = 'Selected Spline Control';
      tensionControl.style.display = 'flex';
      easingControl.style.display = 'flex';
      document.getElementById('selectedTension').value = item.tension;
      document.getElementById('selectedEasing').value = item.easing;
    } else { // It's a selectedStaticShape
      h3.textContent = 'Selected Anchor Control';
      tensionControl.style.display = 'none';
      easingControl.style.display = 'none';
    }
  } else {
    h3.textContent = 'No Item Selected';
    itemSpecificControls.style.display = 'none';
  }
}


/**
 * Updates the properties of the selected item (spline OR static shape).
 */
function updateSelectedItem() {
  const item = selectedSpline || selectedStaticShape;
  if (!item || multiSelection.length > 0) return;

  // Update shared properties
  item.shapeSizeX = parseInt(document.getElementById('selectedSizeX').value);
  item.shapeSizeY = parseInt(document.getElementById('selectedSizeY').value);
  item.shapeType = document.getElementById('selectedType').value;
  item.fillColor = document.getElementById('selectedFillColor').value;
  item.strokeColor = document.getElementById('selectedStrokeColor').value;
  item.strokeWeight = parseFloat(document.getElementById('selectedStrokeWeight').value);
  
  // Update properties that are now shared between splines and anchors
  item.startFrame = parseInt(document.getElementById('selectedStartFrame').value) || 0;
  item.totalFrames = parseInt(document.getElementById('selectedTotalFrames').value);
  item.hideOnComplete = document.getElementById('selectedHideOnComplete').checked;

  // Update spline-only properties
  if (selectedSpline) {
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

/**
 * [MODIFIED] Draws static shapes (anchors) with reduced opacity in the editor if they are "hidden" based on frame controls.
 */
function drawStaticShapes(c = window) {
  for (const shape of staticShapes) {
    const playbackState = getObjectPlaybackState(shape);
    const isMultiSelected = multiSelection.includes(shape);
    
    c.push(); // Isolate drawing state for each shape

    // If the shape is 'hidden' in the animation timeline, draw it with transparency in the editor
    if (!playbackState.isVisible) {
      let f = color(shape.fillColor);
      let s = color(shape.strokeColor);
      f.setAlpha(60); // Apply transparency
      s.setAlpha(100);
      c.fill(f);
      c.stroke(s);
    } else {
      c.fill(shape.fillColor);
      c.stroke(shape.strokeColor);
    }

    c.strokeWeight(shape.strokeWeight);
    
    // Draw the shape itself
    c.push();
    c.translate(shape.pos.x, shape.pos.y);
    drawShapeOnCanvas(c, shape.shapeType, shape.shapeSizeX, shape.shapeSizeY);
    c.pop();

    // Draw the selection highlight (also transparent if hidden)
    if (shape === selectedStaticShape || isMultiSelected) {
      let highlightColor = color(isMultiSelected ? '#FF8C00' : '#0095E8');
      if (!playbackState.isVisible) {
        highlightColor.setAlpha(150);
      }
      c.noFill();
      c.stroke(highlightColor);
      c.strokeWeight(isMultiSelected ? 2 : 3);
      c.rectMode(CENTER);
      c.rect(shape.pos.x, shape.pos.y, shape.shapeSizeX + 15, shape.shapeSizeY + 15);
    }
    
    c.pop(); // Restore original drawing state
  }
}

function drawSpline(spline, isSelected, c = window) {
  if (spline.points.length < 2) return;
  
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
        fill(isMultiSelected ? '#FF8C00' : '#FF0000');
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
    
    const state = getObjectPlaybackState(spline);
    
    if (!state.isVisible) {
        continue;
    }

    const pos = getPointAtDistance(spline, state.easedProgress * calculateSplineLength(spline))?.point;
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

function drawSelectionBox() {
    if (selectionBox) {
        push();
        fill(0, 100, 255, 50);
        stroke(0, 100, 255, 200);
        strokeWeight(1.5);
        drawingContext.setLineDash([6, 3]);

        const x = selectionBox.w > 0 ? selectionBox.x : selectionBox.x + selectionBox.w;
        const y = selectionBox.h > 0 ? selectionBox.y : selectionBox.y + selectionBox.h;
        const w = abs(selectionBox.w);
        const h = abs(selectionBox.h);
        rect(x, y, w, h);

        drawingContext.setLineDash([]);
        pop();
    }
}

function drawDragIndicator() { /* ... */ }


// ======================================
// SELECTION HELPER FUNCTIONS
// ======================================
function toggleItemInMultiSelection(item) {
    const index = multiSelection.indexOf(item);
    if (index > -1) {
        multiSelection.splice(index, 1);
    } else {
        multiSelection.push(item);
    }
}

function toggleSplineInMultiSelection(spline) {
    const allPointsSelected = spline.points.length > 0 && spline.points.every(p => multiSelection.includes(p));

    if (allPointsSelected) {
        multiSelection = multiSelection.filter(item => !spline.points.includes(item));
    } else {
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

function mousePressed() {
    if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height || isExporting) return;

    if (keyIsDown(CONTROL)) {
        if (selectedStaticShape) {
            if (!multiSelection.includes(selectedStaticShape)) multiSelection.push(selectedStaticShape);
        }
        if (selectedSpline) {
            const targetItems = selectedPoint ? [selectedPoint] : selectedSpline.points;
            targetItems.forEach(p => {
                if (!multiSelection.includes(p)) {
                    multiSelection.push(p);
                }
            });
        }
        
        selectedSpline = null;
        selectedStaticShape = null;
        selectedPoint = null;

        let clickedOnSomething = false;
        
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

        if (!clickedOnSomething) {
            multiSelection = [];
            selectionBox = { x: mouseX, y: mouseY, w: 0, h: 0 };
        }

        updateSelectedItemUI();
        return;
    }

    if (multiSelection.length > 0) {
        let canStartDrag = false;
        for (const item of multiSelection) {
            const itemPos = item.pos || item;
            if (itemPos && dist(mouseX, mouseY, itemPos.x, itemPos.y) < 20) {
                canStartDrag = true;
                break;
            }
        }
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
            return;
        }
    }

    multiSelection = [];
    isDraggingSelection = false;
    
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
  
    selectedSpline = null;
    selectedStaticShape = null;
    selectedPoint = null;
    updateSelectedItemUI();
}

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
    recordState();
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
  let offset = createVector(20, 20);
  let newSelection = [];
  let didClone = false;

  if (multiSelection.length > 0) {
    let minX = Infinity, maxX = -Infinity;
    multiSelection.forEach(item => {
      if (item.isStatic) {
        minX = min(minX, item.pos.x - item.shapeSizeX / 2);
        maxX = max(maxX, item.pos.x + item.shapeSizeX / 2);
      } else {
        minX = min(minX, item.x);
        maxX = max(maxX, item.x);
      }
    });

    if (isFinite(minX)) {
        const bboxWidth = maxX - minX;
        offset = createVector(bboxWidth/8, 9); 
    }

    const splinesToClone = new Set();
    const itemsToClone = [...multiSelection];

    itemsToClone.forEach(item => {
      if (!item.isStatic) {
        for (const spline of splines) {
          if (spline.points.includes(item)) {
            splinesToClone.add(spline);
            break;
          }
        }
      }
    });

    splinesToClone.forEach(originalSpline => {
      const newSpline = {
        ...originalSpline,
        points: originalSpline.points.map(p => p.copy().add(offset)),
        lineColor: splineColors[splineColorIndex]
      };
      splineColorIndex = (splineColorIndex + 1) % splineColors.length;
      splines.push(newSpline);
      newSelection.push(...newSpline.points);
    });

    itemsToClone.forEach(item => {
      if (item.isStatic) {
        const newShape = {
          ...item,
          pos: item.pos.copy().add(offset)
        };
        staticShapes.push(newShape);
        newSelection.push(newShape);
      }
    });

    multiSelection = newSelection;
    selectedSpline = null;
    selectedStaticShape = null;
    selectedPoint = null;
    didClone = true;

  } else if (selectedSpline) {
    const original = selectedSpline;
    const newSpline = {
      ...original,
      points: original.points.map(p => p.copy().add(offset)),
      lineColor: splineColors[splineColorIndex]
    };
    splineColorIndex = (splineColorIndex + 1) % splineColors.length;
    splines.push(newSpline);
    selectSpline(newSpline);
    didClone = true;
  } else if (selectedStaticShape) {
    const original = selectedStaticShape;
    const newShape = {
      ...original,
      pos: original.pos.copy().add(offset)
    };
    staticShapes.push(newShape);
    selectStaticShape(newShape);
    didClone = true;
  }

  if (didClone) {
     updateSelectedItemUI();
     recordState();
  }
}

/**
 * [CHANGED] Removes the selected item(s). This now has robust logic for handling
 * multi-selections of points, anchors, and entire splines.
 */
function removeSelectedItem() {
  let stateChanged = false;

  if (multiSelection.length > 0) {
      const pointsToDelete = new Set(multiSelection.filter(item => !item.isStatic));
      const shapesToDelete = new Set(multiSelection.filter(item => item.isStatic));
      const splinesToRemoveCompletely = new Set();

      // First, remove any selected static shapes (anchors)
      if (shapesToDelete.size > 0) {
          staticShapes = staticShapes.filter(shape => !shapesToDelete.has(shape));
          stateChanged = true;
      }

      // Identify which splines will become invalid (< 2 points) after point deletion
      splines.forEach(spline => {
          const pointsInSplineToDelete = spline.points.filter(p => pointsToDelete.has(p));
          // Check if any points from this spline are selected and if deleting them is critical
          if (pointsInSplineToDelete.length > 0 && (spline.points.length - pointsInSplineToDelete.length < 2)) {
              splinesToRemoveCompletely.add(spline);
          }
      });
      
      // For splines that are not being removed entirely, just filter out the selected points
      splines.forEach(spline => {
          if (!splinesToRemoveCompletely.has(spline)) {
              const initialCount = spline.points.length;
              spline.points = spline.points.filter(p => !pointsToDelete.has(p));
              if (spline.points.length < initialCount) {
                  stateChanged = true;
              }
          }
      });

      // Finally, remove the splines that were marked for complete removal
      if (splinesToRemoveCompletely.size > 0) {
          splines = splines.filter(spline => !splinesToRemoveCompletely.has(spline));
          stateChanged = true;
      }
      
      multiSelection = []; // Clear the selection after processing
  } else if (selectedStaticShape) {
    const index = staticShapes.indexOf(selectedStaticShape);
    if (index > -1) { 
        staticShapes.splice(index, 1);
        stateChanged = true;
    }
    selectedStaticShape = null;
  } else if (selectedPoint && selectedSpline) {
    // If a spline only has 2 points, removing one should delete the whole spline
    if (selectedSpline.points.length > 2) {
      selectedSpline.points.splice(selectedPointIndex, 1);
      selectedPoint = null;
      selectedPointIndex = -1;
      stateChanged = true;
    } else {
      // Instead of alerting, just delete the whole spline for a better user experience
      const splineIndex = splines.indexOf(selectedSpline);
      if (splineIndex > -1) {
          splines.splice(splineIndex, 1);
          stateChanged = true;
      }
    }
  }

  if (stateChanged) {
      // Reset selections and update UI
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

/**
 * Calculates the playback state for any object with frame controls.
 * @param {object} obj - The spline or static shape object.
 * @returns {object} An object containing visibility and progress info.
 */
function getObjectPlaybackState(obj) {
  const elapsedTime = millis() - appStartTime;
  let rawProgress = 0; 
  let isVisible = false;
  const exportFps = parseInt(document.getElementById('exportFPS').value) || 16;
  const totalTimelineFrames = parseInt(document.getElementById('exportTotalFrames').value) || 80;

  let currentTimeMs;
  if (isPlayingOnce) {
    currentTimeMs = elapsedTime;
  } else if (loopingPreview) {
    const mainTimelineDurationMs = (totalTimelineFrames / exportFps) * 1000;
    currentTimeMs = mainTimelineDurationMs > 0 ? elapsedTime % mainTimelineDurationMs : 0;
  } else {
    currentTimeMs = 0;
  }
  
  const startMs = (obj.startFrame / exportFps) * 1000;
  const durationMs = (obj.totalFrames / exportFps) * 1000 || 1;
  const endMs = startMs + durationMs;

  if (currentTimeMs >= startMs && currentTimeMs < endMs) {
    isVisible = true;
    rawProgress = (currentTimeMs - startMs) / durationMs;
  } else if (currentTimeMs >= endMs) {
    rawProgress = 1;
    isVisible = !obj.hideOnComplete;
  } else { // currentTimeMs < startMs
    rawProgress = 0;
    isVisible = false;
  }

  const easingType = obj.easing || 'linear';
  const easedProgress = applyEasing(rawProgress, easingType);

  return { isVisible, rawProgress, easedProgress };
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
  if (!p1 || !p2) return null;
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
// SCENE SAVE/LOAD
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

    recordState();
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

/**
 * [MODIFIED] Draws a single frame for export, respecting visibility for both splines and anchors.
 */
function drawExportFrame(overallProgress) {
  exportCanvas.background(0);
  const exportCurrentFrame = overallProgress * exportTotalFrames;
  
  // Draw Static Shapes (Anchors)
  for (const shape of staticShapes) {
    const endFrame = shape.startFrame + shape.totalFrames;
    const isVisible = exportCurrentFrame >= shape.startFrame && (exportCurrentFrame < endFrame || !shape.hideOnComplete);
    
    if (isVisible) {
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
  }

  // Draw Moving Shapes (from Splines)
  for (const spline of splines) {
    const endFrame = spline.startFrame + spline.totalFrames;
    if (exportCurrentFrame >= spline.startFrame && (exportCurrentFrame < endFrame || !spline.hideOnComplete)) {
      const splineProgress = constrain((exportCurrentFrame - spline.startFrame) / spline.totalFrames, 0, 1);
      const easedProgress = applyEasing(splineProgress, spline.easing);
      const totalLength = calculateSplineLength(spline);
      const targetDistance = easedProgress * totalLength;
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
