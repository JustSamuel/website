let game = document.getElementById('game2')
let gameContext = game.getContext('2d')

/**
 * Engine for the minesweeper, containing all the logic.
 */
function GameEngine () {

  gameContext.imageSmoothingEnabled = false

  this.click = function (e) {
    if (e.offsetX < 0 || e.offsetY < 0) return
    let x = Math.floor(e.offsetX / this.cellWidth)
    let y = Math.floor(e.offsetY / this.cellWidth)

    if (e.button === 0) {
      this.minefield[x][y].flip()
    } else if (e.button === 2) {
      this.minefield[x][y].flag()
    }

    this.draw()
    // this.checkWin();
  }

  game.addEventListener('click', this.click.bind(this), false)
  game.addEventListener('contextmenu', this.click.bind(this), false)
  document.body.addEventListener('keypress', (e) => {
    if (e.key === 'r') {
      this.restart()
    }
  })

  /**
   * Assigns default values.
   */
  this.default = function () {
    if (this.settingsVisible) this.minefield[0][0].flip()
    this.livebombs = 0
    this.minefield = []
    this.settingsVisible = false;
    this.firstClick = true
    this.cellcount = 0
    this.win = false
    this.lost = false
    game.width = document.body.clientWidth - 10
    game.height = document.body.clientHeight - 10
  }

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
    this.settings = settings
    this.cellWidth = settings.cellWidth
    let c = Math.floor(game.width / this.cellWidth)
    let r = Math.floor(game.height / this.cellWidth)

    // Shrinks the canvas to the board size
    game.width = game.width - (game.width - c * this.cellWidth)
    game.height = game.height - (game.height - r * this.cellWidth)

    // Create 2D array
    for (let i = 0; i < c; i++) {
      this.minefield[i] = new Array(r)
    }

    for (let j = 0; j < r; j++) {
      for (let i = 0; i < c; i++) {
        this.minefield[i][j] = new Cell(i, j, this.cellWidth, this)
      }
    }

    this.minefield[0][0] = new SettingCell(0, 0, this.cellWidth, this)
    this.cellcount = c * r - 1
    let bombCount = Math.floor(c * r * this.difficultyLookup(settings.difficulty))
    this.livebombs = bombCount
    while (bombCount > 0) {
      let rC = Math.round(Math.random() * (c - 1))
      let rR = Math.round(Math.random() * (r - 1))
      let cell = this.minefield[rC][rR]
      if (!cell.mine) {
        cell.setMine()
        bombCount--
      }
    }

    this.draw()
  }

  this.restart = function () {
    load(this.settings)
  }

  /**
   * Draws the current minefield situation to the canvas.
   */
  this.draw = function () {
    gameContext.fillStyle = 'white'
    gameContext.fillRect(0, 0, game.width, game.height)

    for (let i = 0; i < this.minefield.length; i++) {
      for (let j = 0; j < this.minefield[0].length; j++) {
        this.minefield[i][j].draw()
      }
    }

  }

  this.checkWin = function () {
    if (this.livebombs === 0 && this.cellcount === 0) {
      this.win = true
      this.gameAnimation()
    }
  }

  this.gameAnimation = function () {
    if (!this.win) return
    requestAnimationFrame(this.gameAnimation.bind(this))
    this.minefield.forEach((array) => {
      array.forEach((cell) => {
        if (cell.surrounded !== 0) {
          if (Math.random() > cell.surrounded / 10) cell.surrounded = ++cell.surrounded % 9
          cell.surrounded = Math.max(1, cell.surrounded)
        }
      })
    })
    this.draw()
  }

  /**
   *
   * @param x
   * @param y
   * @param cellWidth
   * @constructor
   */
  function Cell (x, y, cellWidth, gameEngine) {
    // Place in grid
    this.x = x
    this.y = y

    this.gameEngine = gameEngine

    // Place on canvas
    this.posX = this.x * cellWidth
    this.posY = this.y * cellWidth
    this.cellWidth = cellWidth

    // Initial values
    this.flagged = false
    this.hidden = true
    this.mine = false
    this.surrounded = 0

    // Adjacency list
    this.neighbours = []

    this.hiddenCellImage = {
      'srcX': 0,
      'srcY': 51,
      'srcW': 16,
      'srcH': 16
    }

    this.flippedCellImage = {
      'srcX': 17,
      'srcY': 51,
      'srcW': 16,
      'srcH': 16
    }

    this.flagCellImage = {
      'srcX': 34,
      'srcY': 51,
      'srcW': 16,
      'srcH': 16
    }

    this.surroundedCellImage = {
      'srcX': 0,
      'srcY': 68,
      'srcW': 16,
      'srcH': 16
    }

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

  Cell.prototype.initNeighbours = function () {
    let a, b
    if (this.x - 1 >= 0) {
      this.handshake(gameEngine.minefield[this.x - 1][this.y])
      a = true
    }
    if (this.y - 1 >= 0) {
      this.handshake(gameEngine.minefield[this.x][this.y - 1])
      b = true
    }
    if (this.x + 1 < gameEngine.minefield.length && b) {
      this.handshake(gameEngine.minefield[this.x + 1][this.y - 1])
    }
    if (a && b) {
      this.handshake(gameEngine.minefield[this.x - 1][this.y - 1])
    }
  }

  Cell.prototype.handshake = function (cell) {
    if (cell.x === 0 && cell.y === 0) return
    this.neighbours.push(cell)
    cell.neighbours.push(this)
  }

  Cell.prototype.setMine = function () {
    this.mine = true
    this.neighbours.forEach((cell) => cell.surrounded++)
  }

  Cell.prototype.draw = function () {
    if (gameEngine.lost || gameEngine.win) {
      if (this.mine) {
        this.drawImage(this.mineImage)
        return
      }
    }

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

  Cell.prototype.flip = function () {
    if (!this.precondition()) return

    if (this.flagged) {
      this.flag()
      return
    }

    if (this.mine) {
      gameEngine.lost = true
      this.mineImage.srcX = 102
      return
    }

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
    this.discover()
    gameEngine.checkWin()
  }

  Cell.prototype.discover = function () {
    this.hidden = false
    gameEngine.cellcount--
  }
  Cell.prototype.flag = function () {
    if (!this.precondition()) return
    this.flagged = !this.flagged
    gameEngine.livebombs += (this.mine ? -1 : 1) * (this.flagged ? 1 : -1)
    gameEngine.cellcount += (this.mine ? -1 : 1) * (this.flagged ? 1 : -1)
    gameEngine.checkWin()
  }

  Cell.prototype.precondition = function () {
    return !(!this.hidden || this.gameEngine.finished || this.gameEngine.win || this.gameEngine.lost)
  }

  Cell.prototype.drawImage = function (image) {
    gameContext.drawImage(sprites, image.srcX, image.srcY,
      image.srcW, image.srcH, this.posX, this.posY, this.cellWidth, this.cellWidth)
  }

  function SettingCell () {
    Cell.apply(this, arguments)

    this.settingsImage = {
      'srcX': 51,
      'srcY': 51,
      'srcW': 16,
      'srcH': 16
    }
    this.mine = true

    this.draw = function () {
      this.drawImage(this.settingsImage)
    }

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

  SettingCell.prototype = Object.create(Cell.prototype)
  SettingCell.prototype.constructor = SettingCell
}

const sprites = new Image()
sprites.src = 'minesweeper-sprites.png'

let defaultSettings = {
  'difficulty': 'easy',
  'cellWidth': 16
}

let gameEngine = new GameEngine()

function load (args) {
  if (arguments.length === 0) {
    gameEngine.setup(defaultSettings)
  } else {
    gameEngine.setup(args)
  }
}