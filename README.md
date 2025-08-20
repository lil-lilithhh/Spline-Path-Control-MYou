# Spline Path Control MYou v2.4

<img width="1852" height="994" alt="user-interface-skateboard" src="https://github.com/user-attachments/assets/2dbb954a-1cda-4367-b9dc-a554c8534f50" />


## Overview

Spline Path Control MYou is a simple tool inspired by Material You. It's designed to make it easy to create motion controls, which allows you to create and animate shapes that follow splines, and then export the result as a `.webm` video file. Input the motion paths into VACE to control the motion of anything (camera movement, objects, humans etc) all without extra prompting.

▶️ YouTube Video
---
[![Spline Path Control Video](https://img.youtube.com/vi/viJkmzTwPuI/0.jpg)](https://www.youtube.com/watch?v=viJkmzTwPuI)

## ✨ Features

* **Multi-Spline Editing:** Create multiple, independent spline paths
* **Easy To Use Controls:** Quickly edit splines and points
* **Playback scrubber:** Scrub through playback via the timeline and go frame-by-frame with the arrow keys
* **Full Control of Splines and Shapes:**
    * **Start Frame:** Set a delay before a spline's animation begins.
    * **Duration:** Control the speed of the shape along its path.
    * **Easing:** Ease in-and-out spline paths.
    * **Tension:** Make spline path and easing paths bezier.
    * **Shape Customization:** Change the shape (circle, square, triangle), size, fill color, and border.
* **Reference Images:** Drag and drop or upload a background image to trace paths over an existing image.
* **WebM Export:** Export your animation with a black background, perfect for use as a control video in VACE.

## ❓ How to Use With ComfyUI

Simply plug the webm into the control_video or control_images VACE input using any load video node. There are example workflows [here](https://github.com/WhatDreamsCost/Spline-Path-Control/tree/main/example_workflows).

## Credits

* **Author:** [WhatDreamsCost](https://github.com/WhatDreamsCost)
* **Framework:** Built with [p5.js](https://p5js.org/).
