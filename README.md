# Spline Path Control MYou v2.7

<img width="1852" height="994" alt="user-interface-skateboard" src="https://github.com/user-attachments/assets/a5feec81-c61e-461a-aa4c-57199eef187d" />

## Overview

Spline Path Control MYou is a simple tool inspired by Material You. It's designed to make it easy to create motion controls, which allows you to create and animate shapes that follow splines, and then export the result as a `.webm` video file. Input the motion paths into VACE to control the motion of anything (camera movement, objects, humans etc) all without extra prompting.

### Update v2.7:
* Removed the `Length (in frames)` input at the top and replaced its functionality with an input that sits left to the timeline scrubber. Now there's no duplication of the length of the animation; just adjust the length in one spot, much more intuitive!


### Update v2.6:
* Changed the logic of "Start Frame" and "Total Frames" to just "Start Frame" and "End Frame". Makes it so much easier to change the duration of a spline.
* Added new keybinds: I & O. Pressing `I` will set the start frame for the selected spline(s) to the current frame in the timeline. Pressing `O` will set the end frame for the selected spline(s) to the current frame in the timeline (similar concept to "in-and-out points" found in video editors).  

### Update v2.5:

Added the following:
* You can now add two images into the canvas to reference; an input image and an "overlay" image. You can change the transparency of the overlay image (blend).
   * This will make morphing animations much easier to create, since you can adjust the blend of the overlay image on the fly.
   * Bringing the slider to the left means you see the underlying layer, and bringing the slider to the right means you see the overlayed layer.
* Added a new keybinds: Q & W. Pressing `Q` will set the blend of the overlay image to 0%. Pressing `W` will set the blend of the overlayed image to 100%.
   * This will make the morphing workflow much faster.
* Added a swap button for the overlay. This button swaps the inital input image and the overlay image, which changes their order in the "layer stack". This can change the way opacity (blend) slider functions.
* Fixed some buttons that had a hover effect constantly applied.


▶️ YouTube Video
---
[![Spline Path Control Video](https://img.youtube.com/vi/viJkmzTwPuI/0.jpg)](https://www.youtube.com/watch?v=viJkmzTwPuI)

## Features

* **Multi-Spline Editing:** Create multiple, independent spline paths
* **Intuitive Controls:** Quickly edit splines and points
* **Playback scrubber:** Scrub through playback via the timeline and go frame-by-frame with the arrow keys
* **Full Control of Splines and Shapes:**
    * **Start Frame:** Set a delay before a spline's animation begins.
    * **Duration:** Control the speed of the shape along its path.
    * **Easing:** Ease in-and-out spline paths.
    * **Tension:** Make spline path and easing paths bezier.
    * **Shape Customization:** Change the shape (circle, square, triangle), size, fill color, and border.
* **Reference Images:** Drag and drop or upload a background image to trace paths over an existing image.
* **WebM Export:** Export your animation with a black background, perfect for use as a control video in VACE.

## How to Use with VACE

Using ComfyUI, simply plug the webm into the control_video or control_images VACE input using any load video node. There are example workflows for comfy [here](https://github.com/lil-lilithhh/Spline-Path-Control-MYou/tree/main/example_workflows). Or if you prefer, use [Wan2GP](https://github.com/deepbeepmeep/Wan2GP) and plug in the video into the "Control Video" input in VACE.

## Credits

* **Author:**  lil-lilithhh (they/them) & [WhatDreamsCost](https://github.com/WhatDreamsCost)
* **Framework:** Built with [p5.js](https://p5js.org/).
