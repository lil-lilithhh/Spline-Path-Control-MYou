# Spline Path Control MYou v2.8

<img width="1852" height="994" alt="user-interface-skateboard" src="https://github.com/user-attachments/assets/a5feec81-c61e-461a-aa4c-57199eef187d" />

## Overview

Spline Path Control MYou is a simple tool inspired by Material You. It's designed to make it easy to create motion paths, which allows you to create and animate shapes that follow splines, and then export the result as a `.webm` video file. Input the motion paths into VACE to control the motion of anything (camera movement, objects, humans etc) all without extra prompting.

### Update v2.8:
* Added the ability to loop a spline's entire motion across the duration of an animation! This will make certain actions such as walk cycles, a character waving their hand, or even a ball bouncing in a rhythmic motion much more viable and easier to do with just splines alone.
* Added the ability to "hold" the start frame of a spline. This is similar to how we can "hold" the end frame of a spline, where the spline's motion path doesn't disappear at the end of its duration.
* Added the ability for a spline's start/end frame (duration) to "scale" based on the fps of the animation. Increasing or decreasing the fps with 'Scale with FPS' checked on will adjust the start/end frame of the spline to keep the same overall duration of the spline's animation. Useful if you want to experiment with different framerates while keeping the same duration of your splines.
* Added a new animation duration label below the canvas. This small label will tell you the amount of time in seconds the overall animation is. It will automatically update as you change the playback framerate or the amount of frames, which make it super handy to tell how long the animation is. You no longer have to calculate these yourself manually! :)
* Added more tooltips to help the overall UX.


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
