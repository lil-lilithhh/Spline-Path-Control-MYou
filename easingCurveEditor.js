/**
 * Easing Curve Editor - p5.js Instance
 *
 * This script creates a self-contained p5.js sketch to manage
 * the path easing curve editor in the sidebar.
 */
let easingCurveEditor;

document.addEventListener('DOMContentLoaded', () => {

    const easingSketch = function(p) {
        let activeSpline = null; // Changed from activeCurve
        let activeCurve = null; // This will be a reference to activeSpline.easingCurve
        let draggedPoint = null;
        let pointRadius = 5;
        const padding = { top: 10, right: 15, bottom: 20, left: 25 };
        let canvas;
    
        p.onCurveChanged = null;
    
        p.setup = function() {
            const container = document.getElementById('easing-curve-editor-container');
            if (!container) return;
            canvas = p.createCanvas(container.offsetWidth, container.offsetHeight);
            canvas.parent('easing-curve-editor-container');
            canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());
            p.noLoop();

            // Set up the callback for the main sketch
            if (typeof recordState === 'function') {
                p.onCurveChanged = () => recordState();
            }
        };
        
        p.setActiveCurve = function(spline) { // Changed signature
            activeSpline = spline;
            activeCurve = spline ? spline.easingCurve : null;
            p.redraw();
        };
    
        p.draw = function() {
            const graphWidth = p.width - padding.left - padding.right;
            const graphHeight = p.height - padding.top - padding.bottom;

            const isDarkMode = document.body.classList.contains('dark-mode');
            const bgColor = isDarkMode ? p.color(33, 37, 41) : p.color(222, 226, 230);
            const gridColor = isDarkMode ? p.color(73, 80, 87, 150) : p.color(255, 255, 255, 150);
            const lineColor = isDarkMode ? p.color('#643807') : p.color(0, 123, 255);
            const pointColor = isDarkMode ? p.color('#fab981') : p.color(220, 53, 69);
            const textColor = isDarkMode ? p.color(200) : p.color(100);
    
            p.background(bgColor);
            p.push();
            p.translate(padding.left, padding.top);
            
            drawGrid(gridColor, graphWidth, graphHeight);
    
            if (!activeCurve || activeCurve.length < 2) {
                p.fill(textColor);
                p.noStroke();
                p.textAlign(p.CENTER, p.CENTER);
                p.text('Select a spline to edit its path easing.', graphWidth / 2, graphHeight / 2);
                p.pop();
                return;
            };
    
            activeCurve.sort((a, b) => a.x - b.x);
    
            p.stroke(lineColor);
            p.strokeWeight(2);
            p.noFill();
            p.beginShape();
            const yToPx = (y) => p.map(y, 0, 1, graphHeight, 0);

            // --- SMOOTH CURVE DRAWING LOGIC ---
            const tension = (activeSpline.easingTension || 0) / 6.0;
            
            p.vertex(activeCurve[0].x * graphWidth, yToPx(activeCurve[0].y));

            if (tension === 0) {
                // Linear drawing if no tension
                activeCurve.forEach(pt => {
                    p.vertex(pt.x * graphWidth, yToPx(pt.y));
                });
            } else {
                // Bezier drawing for smooth curve
                for (let i = 0; i < activeCurve.length - 1; i++) {
                    const p1 = activeCurve[i];
                    const p2 = activeCurve[i + 1];
            
                    const p0 = i > 0 ? activeCurve[i - 1] : p1;
                    const p3 = i < activeCurve.length - 2 ? activeCurve[i + 2] : p2;
            
                    const cp1x_norm = p1.x + (p2.x - p0.x) * tension;
                    const cp1y = p1.y + (p2.y - p0.y) * tension;
                    const cp2x_norm = p2.x - (p3.x - p1.x) * tension;
                    const cp2y = p2.y - (p3.y - p1.y) * tension;
            
                    p.bezierVertex(
                        cp1x_norm * graphWidth, yToPx(cp1y),
                        cp2x_norm * graphWidth, yToPx(cp2y),
                        p2.x * graphWidth, yToPx(p2.y)
                    );
                }
            }
            p.endShape();
            // --- END OF CURVE DRAWING LOGIC ---

            activeCurve.forEach(pt => {
                p.fill(pointColor);
                p.noStroke();
                p.ellipse(pt.x * graphWidth, yToPx(pt.y), pointRadius * 2);
            });

            p.pop(); 
            
            // Draw vertical (progress) labels
            p.fill(textColor);
            p.noStroke();
            p.textSize(10);
            p.textAlign(p.RIGHT, p.CENTER);
            const verticalLabels = [0, 0.5, 1];
            verticalLabels.forEach(val => {
                 const yPos = p.map(val, 0, 1, p.height - padding.bottom, padding.top);
                 p.text(val.toFixed(1), padding.left - 8, yPos);
            });

            // Draw horizontal (time) labels
            p.textAlign(p.CENTER, p.TOP);
            const timeLabelY = p.height - padding.bottom + 4;
            p.text("0.5", padding.left + graphWidth * 0.5, timeLabelY);
            p.text("1", padding.left + graphWidth, timeLabelY);
        };
        
        p.windowResized = function() {
            const container = document.getElementById('easing-curve-editor-container');
            if (container) {
                p.resizeCanvas(container.offsetWidth, container.offsetHeight);
                p.redraw();
            }
        };
    
        p.doubleClicked = function() {
            const graphWidth = p.width - padding.left - padding.right;
            const graphHeight = p.height - padding.top - padding.bottom;
            const mouseXInGraph = p.mouseX - padding.left;
            const mouseYInGraph = p.mouseY - padding.top;

            if (!activeCurve || mouseXInGraph < 0 || mouseXInGraph > graphWidth || mouseYInGraph < 0 || mouseYInGraph > graphHeight) return;
            
            const pxToY = (mouseY) => p.map(mouseY, 0, graphHeight, 1, 0);
            
            const newPoint = {
                x: p.constrain(mouseXInGraph / graphWidth, 0, 1),
                y: p.constrain(pxToY(mouseYInGraph), 0, 1)
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
            const yToPx = (y) => p.map(y, 0, 1, graphHeight, 0);
        
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
                
                const pxToY = (mouseY) => p.map(mouseY, 0, graphHeight, 1, 0);
    
                if (!isFirstPoint && !isLastPoint) {
                    draggedPoint.x = p.constrain(mouseXInGraph / graphWidth, 0, 1);
                }
                
                draggedPoint.y = p.constrain(pxToY(mouseYInGraph), 0, 1);
                
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
    
            for (let i = 0; i <= 1; i += 0.5) {
                const y = p.map(i, 0, 1, h, 0);
                p.line(0, y, w, y);
            }
            for (let i = 0; i <= 1; i += 0.25) {
                const x = i * w;
                p.line(x, 0, x, h);
            }
        }
        
        p.getEasingAtTime = function(spline, time) {
            const curve = spline.easingCurve;
            const tension = spline.easingTension || 0;
        
            if (!curve || curve.length < 2) return time;
        
            let p1_index = 0;
            // Find the segment where the time falls
            for (let i = 0; i < curve.length - 1; i++) {
                if (time >= curve[i].x && time <= curve[i+1].x) {
                    p1_index = i;
                    break;
                }
            }
            // If time is past the last point, clamp to the end
            if (time > curve[curve.length-1].x) {
                p1_index = curve.length - 2;
            }

            const p2_index = p1_index + 1;
        
            const p1 = curve[p1_index];
            const p2 = curve[p2_index];
        
            const t = p.map(time, p1.x, p2.x, 0, 1);
            
            if (isNaN(t) || !isFinite(t)) {
                return p1.y;
            }
        
            if (tension === 0) {
                 const easedY = p.lerp(p1.y, p2.y, t);
                 return p.constrain(easedY, 0, 1);
            }

            const p0 = p1_index > 0 ? curve[p1_index - 1] : p1;
            const p3 = p2_index < curve.length - 1 ? curve[p2_index + 1] : p2;
            const tensionFactor = tension / 6.0;

            const cp1y = p1.y + (p2.y - p0.y) * tensionFactor;
            const cp2y = p2.y - (p3.y - p1.y) * tensionFactor;

            const easedY = p.bezierPoint(p1.y, cp1y, cp2y, p2.y, t);

            return p.constrain(easedY, 0, 1);
        };
    };
    
    easingCurveEditor = new p5(easingSketch);
});
