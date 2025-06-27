/**
 * Animation Curve Editor - p5.js Instance
 *
 * This script creates a self-contained p5.js sketch to manage
 * the animation curve editor in the sidebar. It runs in "instance mode"
 * to avoid conflicts with the main sketch.js canvas and logic.
 */
let animCurveEditor;

// Wait for the DOM to be fully loaded before initializing the p5 sketch
document.addEventListener('DOMContentLoaded', () => {

    const curveEditorSketch = function(p) {
        let activeCurve = null; // The array of points for the active curve
        let draggedPoint = null; // The point object currently being dragged
        let pointRadius = 5; // Visual size of the points on the curve
        // Define padding to create space for labels and prevent cropping
        const padding = { top: 10, right: 15, bottom: 20, left: 25 };
        const maxScaleFactor = 4.0; // The maximum y-value in the graph's internal logic
        const minScaleFactor = -4.0; // The minimum y-value in the graph's internal logic
        let canvas;
    
        // Callback function to notify the main sketch of changes
        p.onCurveChanged = null;
    
        p.setup = function() {
            const container = document.getElementById('curve-editor-container');
            // Create the canvas and parent it to the container div
            canvas = p.createCanvas(container.offsetWidth, container.offsetHeight);
            canvas.parent('curve-editor-container');
    
            // Disable the default right-click context menu on the canvas
            canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());
            
            p.noLoop(); // The editor only needs to redraw when something changes

             // Set up the callback for the main sketch
            if (typeof recordState === 'function') {
                p.onCurveChanged = () => recordState();
            }
        };
        
        // This function is called by the main sketch to load a curve
        p.setActiveCurve = function(curve) {
            activeCurve = curve;
            p.redraw(); // Redraw the editor with the new curve
        };
    
        p.draw = function() {
            // Define drawing area dimensions based on padding
            const graphWidth = p.width - padding.left - padding.right;
            const graphHeight = p.height - padding.top - padding.bottom;

            // Determine colors based on the current theme
            const isDarkMode = document.body.classList.contains('dark-mode');
            const bgColor = isDarkMode ? p.color(33, 37, 41) : p.color(222, 226, 230);
            const gridColor = isDarkMode ? p.color(73, 80, 87, 150) : p.color(255, 255, 255, 150);
            const lineColor = isDarkMode ? p.color(88, 166, 255) : p.color(0, 123, 255);
            const pointColor = isDarkMode ? p.color('#00f5a0') : p.color(220, 53, 69);
            const textColor = isDarkMode ? p.color(200) : p.color(100);
    
            p.background(bgColor);
            p.push();
            p.translate(padding.left, padding.top); // Apply padding offset to the entire drawing
            
            drawGrid(gridColor, graphWidth, graphHeight);
    
            if (!activeCurve || activeCurve.length < 2) {
                // Display a message if no curve is active
                p.fill(textColor);
                p.noStroke();
                p.textAlign(p.CENTER, p.CENTER);
                p.text('Select an item to edit its scale curve.', graphWidth / 2, graphHeight / 2);
                p.pop(); // Restore drawing state
                return;
            };
    
            // Sort points by time (x-axis) to ensure the curve is valid
            activeCurve.sort((a, b) => a.x - b.x);
    
            // Draw the linear line using vertex
            p.stroke(lineColor);
            p.strokeWeight(2);
            p.noFill();
            p.beginShape();
            // Maps a y-factor from [-4, 4] to a pixel position
            const yToPx = (y) => p.map(y, minScaleFactor, maxScaleFactor, graphHeight, 0);

            activeCurve.forEach(pt => {
                p.vertex(pt.x * graphWidth, yToPx(pt.y));
            });
            p.endShape();
    
            // Draw the control points on top of the curve
            activeCurve.forEach(pt => {
                p.fill(pointColor);
                p.noStroke();
                p.ellipse(pt.x * graphWidth, yToPx(pt.y), pointRadius * 2);
            });

            p.pop(); // Restore drawing state after applying padding
            
            // Draw scale labels in the left padding area
            p.fill(textColor);
            p.noStroke();
            p.textSize(10);
            p.textAlign(p.RIGHT, p.CENTER);
            const verticalLabels = [-4, -2, 0, 2, 4];
            verticalLabels.forEach(factor => {
                 const yPos = p.map(factor, minScaleFactor, maxScaleFactor, p.height - padding.bottom, padding.top);
                 const scaleValue = Math.pow(2, factor / 2); // Calculate the exponential scale
                 let labelText;
                 if (scaleValue === 0.5) {
                    labelText = ".5";
                 } else if (scaleValue === 0.25) {
                    labelText = ".25";
                 } else {
                    labelText = scaleValue.toFixed(0);
                 }
                 p.text(labelText, padding.left - 8, yPos);
            });

            // Draw time labels below the graph
            p.textAlign(p.CENTER, p.TOP);
            const timeLabelY = p.height - padding.bottom + 4;
            p.text("0.5", padding.left + graphWidth * 0.5, timeLabelY);
            p.text("1", padding.left + graphWidth, timeLabelY);
        };
        
        // Resize the canvas if the window is resized
        p.windowResized = function() {
            const container = document.getElementById('curve-editor-container');
            if (container) {
                p.resizeCanvas(container.offsetWidth, container.offsetHeight);
                p.redraw();
            }
        };
    
        // Handle double-clicking to add a new point
        p.doubleClicked = function() {
            const graphWidth = p.width - padding.left - padding.right;
            const graphHeight = p.height - padding.top - padding.bottom;
            const mouseXInGraph = p.mouseX - padding.left;
            const mouseYInGraph = p.mouseY - padding.top;

            if (!activeCurve || mouseXInGraph < 0 || mouseXInGraph > graphWidth || mouseYInGraph < 0 || mouseYInGraph > graphHeight) return;
            
            const pxToY = (mouseY) => p.map(mouseY, 0, graphHeight, maxScaleFactor, minScaleFactor);
            
            const newPoint = {
                x: p.constrain(mouseXInGraph / graphWidth, 0, 1),
                y: p.constrain(pxToY(mouseYInGraph), minScaleFactor, maxScaleFactor)
            };
            activeCurve.push(newPoint);
            
            if (p.onCurveChanged) p.onCurveChanged(true); // Final change
            p.redraw();
        };
    
        p.mousePressed = function() {
            if (!activeCurve || p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
        
            const graphWidth = p.width - padding.left - padding.right;
            const graphHeight = p.height - padding.top - padding.bottom;
            const mouseXInGraph = p.mouseX - padding.left;
            const mouseYInGraph = p.mouseY - padding.top;
            const yToPx = (y) => p.map(y, minScaleFactor, maxScaleFactor, graphHeight, 0);
        
            for (let i = activeCurve.length - 1; i >= 0; i--) {
                const pt = activeCurve[i];
                const pointX = pt.x * graphWidth;
                const pointY = yToPx(pt.y);
        
                const d = p.dist(mouseXInGraph, mouseYInGraph, pointX, pointY);
        
                if (d < pointRadius * 2) {
                    if (p.mouseButton === p.RIGHT) {
                        if (activeCurve.length > 2) {
                            activeCurve.splice(i, 1);
                            if (p.onCurveChanged) p.onCurveChanged(true); // Final change
                        }
                    } else if (p.mouseButton === p.LEFT) {
                        draggedPoint = pt;
                    }
                    p.redraw();
                    return;
                }
            }
        };
    
        p.mouseDragged = function() {
            if (draggedPoint) {
                const graphWidth = p.width - padding.left - padding.right;
                const graphHeight = p.height - padding.top - padding.bottom;
                const mouseXInGraph = p.mouseX - padding.left;
                const mouseYInGraph = p.mouseY - padding.top;

                const isFirstPoint = (draggedPoint === activeCurve[0]);
                const isLastPoint = (draggedPoint === activeCurve[activeCurve.length - 1]);
                
                const pxToY = (mouseY) => p.map(mouseY, 0, graphHeight, maxScaleFactor, minScaleFactor);
    
                if (!isFirstPoint && !isLastPoint) {
                    draggedPoint.x = p.constrain(mouseXInGraph / graphWidth, 0, 1);
                }
                
                draggedPoint.y = p.constrain(pxToY(mouseYInGraph), minScaleFactor, maxScaleFactor);
                
                p.redraw();
                if (p.onCurveChanged) p.onCurveChanged(false); // Live update
            }
        };
    
        p.mouseReleased = function() {
            if (draggedPoint) {
                draggedPoint = null;
                if (p.onCurveChanged) p.onCurveChanged(true); // Final change
            }
        };
        
        function drawGrid(gridColor, w, h) {
            p.stroke(gridColor);
            p.strokeWeight(0.5);
    
            // Draw horizontal lines for each integer scale value
            for (let i = minScaleFactor; i <= maxScaleFactor; i+=2) {
                const y = p.map(i, minScaleFactor, maxScaleFactor, h, 0);
                p.line(0, y, w, y);
            }
            // Draw vertical lines
            for (let i = 0; i <= 1; i += 0.25) {
                const x = i * w;
                p.line(x, 0, x, h);
            }
        }
        
        p.getScaleAtTime = function(curve, time) {
            if (!curve || curve.length < 2) return 1;
        
            // Find the two points that the current time falls between
            let p1 = curve[0];
            let p2 = curve[curve.length - 1];
        
            for (let i = 0; i < curve.length - 1; i++) {
                if (time >= curve[i].x && time <= curve[i+1].x) {
                    p1 = curve[i];
                    p2 = curve[i+1];
                    break;
                }
            }
        
            // Linearly interpolate between the two points' y-values
            const t = p.map(time, p1.x, p2.x, 0, 1);
            
            let y_factor;
        
            // If t is not a number (e.g., if p1.x and p2.x are the same), use the y-value of the first point
            if (isNaN(t) || !isFinite(t)) {
                y_factor = p1.y;
            } else {
                y_factor = p.lerp(p1.y, p2.y, t);
            }
        
            // Convert the y_factor [-4, 4] to an exponential scale multiplier
            // 2^(y_factor / 2) -> This maps the factor to the desired scale:
            // -4 -> 2^-2 = 0.25
            // -2 -> 2^-1 = 0.5
            //  0 -> 2^0  = 1
            //  2 -> 2^1  = 2
            //  4 -> 2^2  = 4
            const scaleMultiplier = Math.pow(2, y_factor / 2);
            
            return scaleMultiplier;
        };
    };
    
    animCurveEditor = new p5(curveEditorSketch);
});
