# Spline Path Control v2.1

![ss2](https://github.com/user-attachments/assets/7519f457-967d-4012-a4bd-9ff972ffd6ee)

## Overview

Spline Path Control is a simple tool designed to make it easy to create motion controls. It allows you to create and animate shapes that follow splines, and then export the result as a `.webm` video file.

This project was created to simplify the process of generating control videos for tools like VACE. Use it to control the motion of anything (camera movement, objects, humans etc) all without extra prompting.

Use it here for free: https://whatdreamscost.github.io/Spline-Path-Control/

▶️ YouTube Video
---
[![Spline Path Control Video](https://img.youtube.com/vi/viJkmzTwPuI/0.jpg)](https://www.youtube.com/watch?v=viJkmzTwPuI)

## ✨ Features

* **Multi-Spline Editing:** Create multiple, independent spline paths
* **Easy To Use Controls:** Quickly edit splines and points
* **Full Control of Splines and Shapes:**
    * **Start Frame:** Set a delay before a spline's animation begins.
    * **Duration:** Control the speed of the shape along its path.
    * **Easing:** Apply `Linear`, `Ease-in`, `Ease-out`, and `Ease-in-out` functions for smooth acceleration and deceleration.
    * **Tension:** Adjust the "curviness" of the spline path.
    * **Shape Customization:** Change the shape (circle, square, triangle), size, fill color, and border.
* **Reference Images:** Drag and drop or upload a background image to trace paths over an existing image.
* **WebM Export:** Export your animation with a white background, perfect for use as a control video in VACE.

## 🔄 Recent Updates

* **6/23/25 V2.1 Update:**
    * Changed the default output from black shapes on a white background to white shapes on a black background. This pretty much solves the 'residual' issue and greatly improves the output's motion. 

* **6/21/25 V2 Update:**
    * Added Dark Mode!
    * Overhauled preview display. Now the preview accurately displays the timing and animation of the splines, allowing for much greater control.
    * Added the ability to save and import canvases. You can now create, save, import, and share your spline layouts. When you click Export Canvas it will create a .png with metadata that you can import back into the editor. This also allows you to create presets that can be applied to any image.
    * Added the ability to multiselect any object. You can now CTRL+Click to multiselect any object. You can also CTRL+Click+Drag to create a selection box and multiselect objects. This makes moving around things much easier and intuitive.
    * Added Undo and Redo function. Accidently move something? Well now you can undo and redo any action. Either use the buttons or CTRL+Z to undo and CTRL+Y to redo.
    * Added a bunch more improvements that i'm too tired to type out right now 😂

* **6/18/25:**
    * Added 'Clone' Button, you can now clone any object copying it's properties and shape
    * Added 'Play Once' and a 'Loop Preview' toggle. You can now set the preview to either play once or to loop continuously.
    * Added ability to drag and move entire splines. You can now click and drag entire splines to easily move them.
    * Added extra control to the size. You can now set the X and Y size of any shape.
    * Made it easier to move anchors. (You can now click anywhere on an anchor to move it instead of just then center)
    * Changed Default Canvas Size
    * Fixed Reset Canvas Size Button
    * Added offset to newly created anchors to prevent overlapping.

![Update 6-18 Image](https://github.com/user-attachments/assets/df05931d-3681-44a4-a3d4-0899a92c0f37)

**If anyone has features they want added let me know!**

* **6/17/25:**
    * Fixed splines looping in exported video. Now the animation will only play once in the exported video.
    * Made the export UI prettier 😎

* **6/17/25:**
    * Added **Start Frame** control to delay the beginning of a spline's animation.
    * Added **Easing Functions** (Linear, Ease-in, Ease-out, Ease-in-out) for smoother animations.
    * Fixed a CSS alignment issue in the control panel for a cleaner UI.

## 🎥 Examples

Here are just a few examples of what you can do with a simple control path:

https://github.com/user-attachments/assets/fb026d9d-df72-4784-a99f-ee3b423339ec

*Example: Controlling the camera to rotate around a scene*

https://github.com/user-attachments/assets/5ae81d1c-1dd3-47ba-bed2-cfd65318bcaf

*Example: Controlling the pose of a character*

https://github.com/user-attachments/assets/f8623321-0521-4a8f-844e-68d4f26c4ca9

*Example: Using paths to control the movement of the dragon and person*

https://github.com/user-attachments/assets/92034c81-12e1-434c-a811-1f46ab69d3a8

*Example: Controlling the camera to push in*

## ❓ How to Use With ComfyUI

Simply plug the webm into the control_video or control_images VACE input using any load video node. There are example workflows below.

## 💡 Example Workflows
**Download Workflows Here:** https://github.com/WhatDreamsCost/Spline-Path-Control/tree/main/example_workflows

**Simple I2V VACE Control Workflow** 
![i2v_vace_control_example](https://github.com/user-attachments/assets/a2d19416-b595-4631-a2e2-2f202391dd95)

**The Workflow I use (Has optimizations, can resize images/videos automatically, and easier to change settings** 
![workflow_advanced_screenshot](https://github.com/user-attachments/assets/5ed31e84-f59f-4e32-a1d4-13564f4c9974)

## 💡 Tips
(Coming Soon)


## Credits

* **Author:** [WhatDreamsCost](https://github.com/WhatDreamsCost)
* **Framework:** Built with [p5.js](https://p5js.org/).
* **Additional Info:** I used DeepSeek and Google Gemini to make both this project and even this README file.
