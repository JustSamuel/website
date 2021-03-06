let game = document.getElementById('game2')
let gameContext = game.getContext('2d')

/**
 * Engine for the minesweeper, containing all the logic.
 */
function GameEngine () {

  gameContext.imageSmoothingEnabled = false

  /**
   * Handles all the clicks of the canvas.
   * @param e - mouse click event.
   */
  this.click = function (e) {
    // This is the case if you click on the border.
    if (e.offsetX < 0 || e.offsetY < 0) return

    // Get coords of the cell.
    let x = Math.floor(e.offsetX / this.cellWidth)
    let y = Math.floor(e.offsetY / this.cellWidth)

    // Left vs Right click.
    if (e.button === 0) {
      this.minefield[x][y].flip()
    } else if (e.button === 2) {
      this.minefield[x][y].flag()
    }

    // Redraw game state.
    this.draw()
  }

  // Mouse click event listeners.
  game.addEventListener('click', this.click.bind(this), false)
  game.addEventListener('contextmenu', this.click.bind(this), false)

  // Use R to restart the game.
  document.body.addEventListener('keypress', (e) => {
    if (e.key === 'r') {
      this.restart()
    }
  })

  /**
   * Assigns default values.
   */
  this.default = function () {
    // Hides the menu if it is visible
    if (this.settingsVisible) this.minefield[0][0].flip()

    this.livebombs = 0            // Amount of "undefused" bombs in the game.
    this.minefield = []           // 2D arrays containing the cells.
    this.settingsVisible = false // If the settings div is visible.
    this.firstClick = true        // Prevents the first click from being a mine.
    this.cellcount = 0            // Together with livebombs forms the 'score' to determine when a game is done.
    this.win = false              // Boolean if the user has won.
    this.lost = false             // Boolean if the user has lost.
    this.ai = true

    // Size game to document window.
    game.width = document.body.clientWidth - 10
    game.height = document.body.clientHeight - 10
  }

  /**
   * Translates difficulty to a percentage of bombs.
   * @param diff - Difficulty of the game
   * @returns {number} - Percentage of cells that is a bomb.
   */
  this.difficultyLookup = function (diff) {
    switch (diff) {
      case 'easy':
        return 0.01
      case 'medium':
        return 0.1
      case 'hard':
        return 0.25
    }
  }

  /**
   * Creates a game using a settings JSON.
   * @param {{}} settings
   */
  this.setup = function (settings) {
    // Reset variables
    this.default()

    // Read settings
    this.settings = settings
    this.cellWidth = settings.cellWidth

    // Calculate amount of rows and columns.
    let c = Math.floor(game.width / this.cellWidth)
    let r = Math.floor(game.height / this.cellWidth)

    // Shrinks the canvas to the board size.
    game.width = game.width - (game.width - c * this.cellWidth)
    game.height = game.height - (game.height - r * this.cellWidth)

    // Create 2D array.
    for (let i = 0; i < c; i++) {
      this.minefield[i] = new Array(r)
    }

    // Fill the minefield with cells.
    for (let j = 0; j < r; j++) {
      for (let i = 0; i < c; i++) {
        this.minefield[i][j] = new Cell(i, j, this.cellWidth, this)
      }
    }

    // Turns the top left cell into a SettingsCell
    this.minefield[0][0] = new SettingCell(0, 0, this.cellWidth, this)

    // Amount of cells in the game
    this.cellcount = c * r - 1

    // Amount of bombs in the game
    let bombCount = Math.floor(c * r * this.difficultyLookup(settings.difficulty))
    this.livebombs = bombCount

    // Random placement of the bombs.
    while (bombCount > 0) {
      let rC = Math.round(Math.random() * (c - 1))
      let rR = Math.round(Math.random() * (r - 1))
      let cell = this.minefield[rC][rR]
      if (!cell.mine) {
        cell.setMine()
        bombCount--
      }
    }

    // Draw the game.
    this.draw()
  }

  /**
   * Restarts the game using the current settings.
   */
  this.restart = function () {
    load(this.settings)
  }

  /**
   * Used to animate the moving pointer for the solver.
   */
  this.mouse = {
    x : document.body.offsetWidth / 2,
    y : document.body.offsetHeight / 2,
    stepCount : 5,
    dx : 0,
    dy : 0
  }

  /**
   * Objects containing all the cells to be flagged and flipped by the pointer.
   */
  this.toFlag = {}
  this.toFlip = {}

  /**
   * Returns the amount of keys in an object.
   * @returns {number}
   */
  Object.prototype.size = function () {
    return Object.keys(this).length;
  }

  /**
   * Removes a cell from objects.
   * @param cell
   */
  Object.prototype.remove = function (cell) {
    this[cell.x + ',' + cell.y] = undefined
  }

  /**
   * Grab a random key from the object.
   */
  Object.prototype.randomProperty = function () {
    const keys = Object.keys(this);
    return this[keys[keys.length * Math.random() | 0]];
  }

  /**
   * Moves the pointer by the delta values.
   */
  this.moveMouse = function () {
    this.mouse.x += this.mouse.dx
    this.mouse.y += this.mouse.dy
  }

  /**
   * Scales the dx and dy based on the position of the pointer and the target cell location.
   */
  this.setMouseTarget = function () {
    this.mouse.dx = (this.target.cell.posX - this.mouse.x)
    this.mouse.dy = (this.target.cell.posY - this.mouse.y)
    let length = Math.sqrt(Math.pow(this.mouse.dx,2) + Math.pow(this.mouse.dy, 2)) / 100
    this.mouse.dx = this.mouse.dx / length
    this.mouse.dy = this.mouse.dy / length
  }

  /**
   * Draws the pointer on top of the game.
   */
  this.drawMouse = function () {
    gameContext.drawImage(pointer, 0, 0,
      1602, 2400, this.mouse.x, this.mouse.y, this.cellWidth, (2400/1602)*this.cellWidth)
  }

  /**
   * The next cell the pointer will interact  with.
   */
  this.target = {
    cell : null,
    flag : false
  }

  /**
   * Main animation frame for the solver.
   */
  this.solverLoop = function () {
    // Stop of the game is over.
    if (this.win || this.lost) return

    // Else use the animation timer
    requestAnimationFrame(this.solverLoop.bind(this))

    // If there is nothing to flip we rescan the board.
    if (this.toFlip.size() === 0) {
      this.findSuitable();
    }

    // Grab a new target if the current is finished.
    if (this.target.cell === null) {

      // We prioritize flagging over flipping
      if (this.toFlag.size() !== 0) {

        // Grab a random cell from the object
        let cell = this.toFlag.randomProperty();

        // Make it a target
        this.target.cell = cell
        this.target.flag = true

        // Remove it from the list
        delete this.toFlag[cell.x + ', ' + cell.y];

      } else if (this.toFlip.size() !== 0) {
        // Idem dito
        let cell = this.toFlip.randomProperty();

        this.target.cell = cell
        this.target.flag = false

        delete this.toFlip[cell.x + ', ' + cell.y];
      }
      // If we have a new target we update the poitner.
      if (this.target.cell !== null) this.setMouseTarget()
    } else {
      // If pointer is on cell, do action, else move pointer.
      if ((this.mouse.x - 5 * this.cellWidth < this.target.cell.posX &&
        this.target.cell.posX < this.mouse.x + 5 * this.cellWidth &&
        this.mouse.y - 5 * this.cellWidth < this.target.cell.posY &&
        this.target.cell.posY < this.mouse.y + 5 * this.cellWidth)) {

        // Check if we should flip or flag.
        if (this.target.flag) {
          this.target.cell.flag()
        } else {
          this.target.cell.flip()
        }

        // Target has been processed.
        this.target.cell = null

      } else {
        this.moveMouse()
      }
    }

    this.draw()
    this.drawMouse()
  }

  /**
   * Function that fills the toFlip and toFlag arrays.
   * TODO Fix getting stuck on 50/50 chances.
   */
  this.findSuitable = function () {
    let deadlock
    if (this.toFlip.size() === 0 && this.toFlag.size() === 0) deadlock = true

    // Find flayable targets
    this.minefield.forEach((array) => {
      array.forEach((originCell) => {
        // Go over each cell

        // Basic flagging logic, keep an internal state for the found cells.
        if (!originCell.hidden && originCell.internalState !== 0) {
          if (!originCell.hidden && originCell.internalState !== 0) {
            let a = 0
            originCell.neighbours.forEach((cell) => {
              if (cell.hidden && !cell.flagged && this.toFlag[cell.x + ", " + cell.y] === undefined) a++
            })
            if (a === originCell.internalState) {
              originCell.neighbours.forEach((cell) => {
                if (cell.hidden && !cell.flagged && this.toFlag[cell.x + ", " + cell.y] === undefined) {
                  this.toFlag[cell.x + ", " + cell.y] = cell;
                  cell.neighbours.forEach((cellInternal) => {
                    if (cellInternal.internalState !== 0) {
                      cellInternal.internalState--
                    }
                  })
                }
              })
            }
          }
        }
      })

      // Check if the internal state is 0 meaning that it is a dull.
      this.minefield.forEach((array) => {
        array.forEach((cell) => {
          if (cell.hidden && !cell.flagged && this.toFlag[cell.x + ", " +cell.y] === undefined) {
            cell.neighbours.forEach((neighbour) => {
              if ((neighbour.hidden && neighbour.flagged) || !neighbour.hidden) {
                if (neighbour.internalState === 0 && this.toFlip[cell.x + ", " + cell.y] === undefined) {
                  this.toFlip[cell.x + ", " + cell.y] = cell;
                }
              }
            })
          }
        })
      })
    })
    if (this.toFlip.size() === 0 && this.toFlag.size() === 0 && deadlock) this.getRandomHiddenCell()
  }

  /**
   * Random cell to be used in deadlock situations.
   */
  this.getRandomHiddenCell = function () {
    this.candidates = []
    this.minefield.forEach((array) => {
      array.forEach((cell) => {
        if (cell.hidden && !cell.flagged) this.candidates.push(cell)
      })
    })
    let target = this.candidates[[this.candidates.length * Math.random() | 0]]
    console.log(this.target)
    this.toFlip[target.x + ", " + target.y] = target
  }

  /**
   * Draws the current minefield situation to the canvas.
   */
  this.draw = function () {
    // Refresh canvas.
    gameContext.fillStyle = 'white'
    gameContext.fillRect(0, 0, game.width, game.height)

    // Draw each cell.
    for (let i = 0; i < this.minefield.length; i++) {
      for (let j = 0; j < this.minefield[0].length; j++) {
        this.minefield[i][j].draw()
      }
    }

  }

  /**
   * Checks if the game is over.
   */
  this.checkWin = function () {
    if (this.livebombs === 0 && this.cellcount === 0) {
      this.win = true
      this.gameAnimation()
    }
  }

  /**
   * Animation that is played when the game is won.
   */
  this.gameAnimation = function () {
    if (!this.win) return // Also used to check if the game is reset.

    requestAnimationFrame(this.gameAnimation.bind(this))

    // Animation, random for extra effect.
    this.minefield.forEach((array) => {
      array.forEach((cell) => {
        if (cell.surrounded !== 0) {
          if (Math.random() > cell.surrounded / 10) cell.surrounded = ++cell.surrounded % 9
          cell.surrounded = Math.max(1, cell.surrounded)
        }
      })
    })

    // Manual draw call.
    this.draw()
  }

  /**
   * A single cell in the 2D Array.
   * @param x x coordinate in the 2D Array
   * @param y y coordinate in the 2D Array
   * @param cellWidth size of this cell. TODO REMOVE
   * @constructor
   */
  function Cell (x, y, cellWidth, gameEngine) {
    // Place in grid
    this.x = x
    this.y = y

    // Link to engine
    this.gameEngine = gameEngine

    // Place on canvas
    this.posX = this.x * cellWidth
    this.posY = this.y * cellWidth
    this.cellWidth = cellWidth

    this.internalState = 0

    // Initial values
    this.flagged = false
    this.hidden = true
    this.mine = false
    this.surrounded = 0

    // Adjacency list
    this.neighbours = []

    // All images are found in the spritesheet.

    // Image when the cell is not flipped.
    this.hiddenCellImage = {
      'srcX': 0,
      'srcY': 51,
      'srcW': 16,
      'srcH': 16
    }

    // Image when the cell is flipped.
    this.flippedCellImage = {
      'srcX': 17,
      'srcY': 51,
      'srcW': 16,
      'srcH': 16
    }

    // Image when the cell is flagged.
    this.flagCellImage = {
      'srcX': 34,
      'srcY': 51,
      'srcW': 16,
      'srcH': 16
    }

    // Image when the cell is surrounded
    this.surroundedCellImage = {
      'srcX': 0,
      'srcY': 68,
      'srcW': 16,
      'srcH': 16
    }

    // Image when the cell is a mine.
    this.mineImage = {
      'srcX': 85,
      'srcY': 51,
      'srcW': 16,
      'srcH': 16
    }

    if (!(this.x === 0 && this.y === 0)) {
      this.initNeighbours()
    }
  }

  /**
   * Links cell to neighbours.
   */
  Cell.prototype.initNeighbours = function () {
    let a, b
    if (this.x - 1 >= 0) { // Not on the left edge.
      this.handshake(gameEngine.minefield[this.x - 1][this.y])
      a = true
    }
    if (this.y - 1 >= 0) { // Not on the top edge.
      this.handshake(gameEngine.minefield[this.x][this.y - 1])
      b = true
    }
    if (this.x + 1 < gameEngine.minefield.length && b) { // Not on the right edge
      this.handshake(gameEngine.minefield[this.x + 1][this.y - 1])
    }
    if (a && b) {
      this.handshake(gameEngine.minefield[this.x - 1][this.y - 1])
    }
  }

  /**
   * Links this cell to a cell and the cell to this cell.
   * @param cell The Cell to handshake with.
   */
  Cell.prototype.handshake = function (cell) {
    if (cell.x === 0 && cell.y === 0) return
    this.neighbours.push(cell)
    cell.neighbours.push(this)
  }

  /**
   * Turns this cell into a mine.
   */
  Cell.prototype.setMine = function () {
    this.mine = true
    this.neighbours.forEach((cell) => {
      cell.surrounded++
      cell.internalState++
    })
  }

  /**
   * Handles the drawing of the cell.
   */
  Cell.prototype.draw = function () {
    // If the game is won or over we show the mines.
    if (gameEngine.lost || gameEngine.win) {
      if (this.mine) {
        this.drawImage(this.mineImage)
        return
      }
    }

    // Priority goes from flagged -> hidden -> not surrounded -> surrounded -> mine
    if (this.flagged) {
      this.drawImage(this.flagCellImage)
    } else if (this.hidden) {
      this.drawImage(this.hiddenCellImage)
    } else if (this.surrounded === 0) {
      this.drawImage(this.flippedCellImage)
    } else if (!this.mine) {
      this.surroundedCellImage.srcX = (this.surrounded - 1) * 17
      this.drawImage(this.surroundedCellImage)
    } else {
      this.drawImage(this.mineImage)
    }
  }

  /**
   * Flips the current cell over.
   */
  Cell.prototype.flip = function () {
    if (!this.precondition()) return

    // First click can never be a mine.
    if (gameEngine.firstClick) {
      gameEngine.firstClick = false
      if (this.mine) {
        this.mine = false
        gameEngine.livebombs--
        this.neighbours.forEach((cell) => {
          cell.surrounded--
        })
      }
    }

    // Unflag on click
    if (this.flagged) {
      this.flag()
      return
    }

    // Lose if you hit a mine.
    if (this.mine) {
      gameEngine.lost = true
      this.mineImage.srcX = 102
      return
    }

    // Start DFS if the cell is empty.
    if (this.surrounded === 0) {
      let stack = []
      this.discover()
      stack.push(this)
      while (stack.length > 0) {
        let target = stack.pop()
        let neighbours = target.neighbours
        neighbours.forEach((cell) => {
          if (cell.hidden) {
            cell.discover()
            if (cell.surrounded === 0) {
              stack.push(cell)
            }
          }
        })
      }
      return
    }

    // Else show the number and chick if its a win.
    this.discover()
    gameEngine.checkWin()
  }

  /**
   * Discover the current cell
   */
  Cell.prototype.discover = function () {
    this.hidden = false
    // Update the winning condition
    gameEngine.cellcount--
  }

  /**
   * Flags the current cell
   */
  Cell.prototype.flag = function () {
    if (!this.precondition()) return

    // Update win conditions.
    this.flagged = !this.flagged
    gameEngine.livebombs += (this.mine ? -1 : 1) * (this.flagged ? 1 : -1)

    // Flagging everything should not be a win.
    gameEngine.cellcount += (this.mine ? -1 : 1) * (this.flagged ? 1 : -1)

    // Check if the user won.
    gameEngine.checkWin()
  }

  /**
   * Checks if cell can be interacted with.
   * @returns {boolean} If cell can be interacted with.
   */
  Cell.prototype.precondition = function () {
    return !(!this.hidden || this.gameEngine.finished || this.gameEngine.win || this.gameEngine.lost)
  }

  /**
   * Draws the sprite image to the cell location.
   * @param {{srcX : number, srcY: number, srcW : number, srcH : number}} image Sprite location of the image.
   */
  Cell.prototype.drawImage = function (image) {
    gameContext.drawImage(sprites, image.srcX, image.srcY,
      image.srcW, image.srcH, this.posX, this.posY, this.cellWidth, this.cellWidth)
  }

  /**
   * Special cell that does not count in the game but is used to toggle the settings.
   * @constructor
   */
  function SettingCell () {
    Cell.apply(this, arguments)

    // Special image for the cell.
    this.settingsImage = {
      'srcX': 51,
      'srcY': 51,
      'srcW': 16,
      'srcH': 16
    }
    this.mine = true

    // Different draw condition
    this.draw = function () {
      this.drawImage(this.settingsImage)
    }

    // Toggle settings div when clicked.
    this.flip = function () {
      if (gameEngine.settingsVisible) {
        gameEngine.settingsVisible = false
        document.getElementById('settingsContainer').style.opacity = '0'
        document.getElementById('settingsContainer').style.zIndex = '-1'
      } else {
        gameEngine.settingsVisible = true
        document.getElementById('settingsContainer').style.opacity = '1'
        document.getElementById('settingsContainer').style.zIndex = '1'
      }
    }
  }

  // Inheritance
  SettingCell.prototype = Object.create(Cell.prototype)
  SettingCell.prototype.constructor = SettingCell
}

// Load sprites
const sprites = new Image()
sprites.src = 'minesweeper-sprites.png'
const pointer = new Image()
pointer.src = 'mouse.png'

// Start on medium
let defaultSettings = {
  'difficulty': 'medium',
  'cellWidth': 16 // Not really used.
}

// Create engine object.
let gameEngine = new GameEngine()

// Used to start the game.
function load (args) {
  if (arguments.length === 0) {
    gameEngine.setup(defaultSettings)
  } else {
    gameEngine.setup(args)
  }
}