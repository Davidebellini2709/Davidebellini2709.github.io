# KardunTurtle

Turtle graphics in p5.js. You give a turtle instructions — go forward, turn right, put the pen down — and it draws the path it walks.

## Run it

Right-click `index.html` → **Open with Live Server**. The turtle draws a square and a triangle. Press **R** to run it again.

## Files

| File          | What it is                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `sketch.js`   | **Your file.** Put your instructions in `giveInstructions()`.                                                      |
| `turtle.js`   | The `KardunTurtle` class. You don't need to read it to use it — we come back to how classes are written in Week 4. |
| `index.html`  | Loads p5 and the two scripts, in that order.                                                                       |
| `turtle.jpg`  | The turtle's face. Replace it.                                                                                     |

## Give it instructions

Everything goes inside `giveInstructions()` in `sketch.js`:

```js
turtle.penColor("#4cc9f0");
turtle.forward(180);
turtle.right(90);
turtle.forward(180);
```

Instructions are **queued and played back in order**, one at a time — that's why you watch the turtle draw instead of the picture appearing all at once. Call `turtle.instant()` in `setup()` if you'd rather skip the animation.

### Moving

|                        |                                                       |
| ---------------------- | ----------------------------------------------------- |
| `turtle.forward(100)`  | walk forward, drawing if the pen is down              |
| `turtle.backward(100)` | walk backward                                         |
| `turtle.right(90)`     | turn clockwise, in degrees                            |
| `turtle.left(90)`      | turn counter-clockwise                                |
| `turtle.goTo(x, y)`    | jump to a point                                       |
| `turtle.setHeading(0)` | point in a direction — `0` right, `90` down, `-90` up |
| `turtle.home()`        | back to the starting point, facing up                 |

### Drawing

|                          |                                          |
| ------------------------ | ---------------------------------------- |
| `turtle.penUp()`         | move without drawing                     |
| `turtle.penDown()`       | draw again                               |
| `turtle.penColor("red")` | any p5 color                             |
| `turtle.penWidth(8)`     | line thickness                           |
| `turtle.stamp()`         | press the turtle's face onto the drawing |
| `turtle.erase()`         | wipe the drawing, leave the turtle       |

### Settings

These take effect straight away rather than waiting their turn in the queue:

|                             |                                     |
| --------------------------- | ----------------------------------- |
| `turtle.setSpeed(4)`        | pixels per frame — bigger is faster |
| `turtle.instant()`          | no animation, draw it all at once   |
| `turtle.setSize(80)`        | how big the turtle is drawn         |
| `turtle.hide()` / `.show()` | show or hide the turtle itself      |
| `turtle.reset()`            | clear the drawing and start over    |
| `turtle.repeat(4, fn)`      | run a set of instructions `n` times |

## Change the face

Drop any image into this folder and point at it in `setup()`:

```js
const face = await loadImage("your-picture.jpg");
turtle = new KardunTurtle(200, 420, face);
```

It gets scaled to fill a circle and cropped to it, so anything roughly square works best. A tall photo will be cropped to its middle.
