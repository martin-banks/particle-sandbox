// ? Configurable options
let population = 500
let distancing = 0 // (pct of population that does not move)
let timeToCure = 8 * 1000 // (ms)
let mortality = 0.2 // (pct)

const speed = 2
// const timeToKill = 8 * 1000 // (ms)
const simulationLength = 30 * 1000 // (ms)
const sessionTick = 500 // How often does the chart update (ms)

// ? System/session variables
const canvas = { // TODO Set from designated area
  w: Math.min(1000, window.innerWidth) - 60, // 400,
  h: Math.min(1000, window.innerWidth) - 60, // 400,
}
const diameter = Math.round(Math.min(canvas.w, canvas.h) / 100)
let people = []
const totals = {
  normal: population,
  infected: 0,
  cured: 0,
  dead: 0,
}
let running = false
let sessionTime = 0


// ? UI elments
const dump = document.querySelector('pre.dump')
const chartContainer = document.querySelector('div.chart')
const maxDeadLine = document.querySelector('.chartContainer hr.expectedDead')
const startButton = document.querySelector('button#start')
const stopButton = document.querySelector('button#stop')

const inputs = {
  distancing: document.querySelector('#distancing input'),
  population: document.querySelector('#population input'),
  timeToCure: document.querySelector('#timeToCure input'),
  mortality: document.querySelector('#mortality input'),
}


function setDistancing () {
  const { value } = this
  console.log('setting distancing', inputs.distancing.value, value)
  if (value) {
    distancing = parseInt(value, 10) / 100
  } else {
    inputs.distancing.value = distancing * 100
  }
  console.log('distancing set', inputs.distancing.value, value, distancing)
  inputs.distancing.parentElement.querySelector('span').innerText = Math.round(distancing * 100)
}

function setPopulation () {
  const { value } = this
  if (value) {
    population = parseInt(value, 10)
  } else {
    inputs.population.value = population
  }
  inputs.population.parentElement.querySelector('span').innerText = Math.round(population)
}

function setCure () {
  const { value } = this
  if (value) {
    timeToCure = parseInt(value, 10) * 1000
  } else {
    inputs.timeToCure.value = timeToCure
  }
  inputs.timeToCure.parentElement.querySelector('span').innerText = Math.round(timeToCure / 1000)
}

function setMortality () {
  const { value } = this
  if (value) {
    mortality = parseInt(value, 10) / 100
  } else {
    inputs.mortality.value = mortality
  }
  inputs.mortality.parentElement.querySelector('span').innerText = Math.round(mortality * 100)
}

inputs.distancing.addEventListener('change', setDistancing)
inputs.population.addEventListener('change', setPopulation)
inputs.timeToCure.addEventListener('change', setCure)
inputs.mortality.addEventListener('change', setMortality)

setDistancing()
setPopulation()
setCure()
setMortality()


// maxDeadLine.style.top = `${chartContainer.offsetHeight - (chartContainer.offsetHeight * mortality)}px`

let chart = []
function barTemplate () {
  return `<div class="chart__bar"><!--
    --><div class="chart__bar--section cured" style="height: ${totals.cured && totals.cured / population * 100}px" ></div><!--
    --><div class="chart__bar--section healthy" style="height: ${totals.normal && totals.normal / population * 100}px" ></div><!--
    --><div class="chart__bar--section infected" style="height: ${totals.infected && totals.infected / population * 100}px" ></div><!--
    --><div class="chart__bar--section dead" style="height: ${totals.dead && totals.dead / population * 100}px" ></div><!--
  --></div>`
}

function updateChart () {
  if (!running) return
  sessionTime += sessionTick
  if (sessionTime > simulationLength) {
    running = false
    return
  }
  chart.push(barTemplate())
  chartContainer.innerHTML = chart.join('')
  setTimeout(() => {
    window.requestAnimationFrame(updateChart)
  }, sessionTick)
}
// ! only call on simulation start
// window.requestAnimationFrame(updateChart)


class Person {
  constructor ({ x, y, index, diameter, infected, status, moving }) {
    this.infected = infected
    this.status = status
    this.infectedTime = infected ? new Date().getTime() : null
    this.moving = moving
    this.id = index
    this.diameter = diameter
    this.position = { x, y }
    this.velocity = {
      x: random(-1, 1) * speed,
      y: random(-1, 1) * speed,
    }
    this.order = 1
  }

  move () {
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
    if ((this.position.x + (this.diameter / 2)) > width) {
      this.position.x = width - (this.diameter / 2)
      this.velocity.x *= -1
    } else if ((this.position.x - (this.diameter / 2)) < 0) {
      this.position.x = this.diameter / 2
      this.velocity.x *= -1
    }
    if ((this.position.y + (this.diameter / 2)) > height) {
      this.position.y = height - (this.diameter / 2)
      this.velocity.y *= -1
    } else if ((this.position.y - (this.diameter / 2)) < 0) {
      this.position.y = this.diameter / 2
      this.velocity.y *= -1
    }
  }

  intersect () {
    if (this.status === 'dead') return
    for (let i = this.id + 1; i < population; i++) {
      if (this.id === i) return
      if (people[i].status === 'dead') continue

      let distanceX = people[i].position.x - this.position.x
      let distanceY = people[i].position.y - this.position.y
      let distance = sqrt((distanceX * distanceX) + (distanceY * distanceY))
      let minDist = (people[i].diameter / 2) + (this.diameter / 2)

      if (distance < minDist) {
        // Handle update directions
        if (this.velocity.x > 0) {
          if (this.position.x > people[i].position.x) {
            people[i].velocity.x *= -1
          } else {
            this.velocity.x *= -1
          }
        } else {
          if (this.position.x > people[i].position.x) {
            this.velocity.x *= -1
          } else {
            people[i].velocity.x *= -1
          }
        }

        if (this.velocity.y > 0) {
          if (this.position.y > people[i].position.y) {
            people[i].velocity.y *= -1
          } else {
            this.velocity.y *= -1
          }
        } else {
          if (this.position.y > people[i].position.y) {
            this.velocity.y *= -1
          } else {
            people[i].velocity.y *= -1
          }
        }

        // Handle update infected
        if (!this.infected && !people[i].infected) {
          return
        } else if (this.infected && people[i].infected) {
          return

        } else if (this.status === 'normal' && people[i].status === 'infected') {
          this.infected = true
          this.status = 'infected'
          this.order = 3
          this.infectedTime = new Date().getTime()
          totals.normal--
          totals.infected++
          return

        } else if (this.status === 'infected' && people[i].status === 'normal') {
          people[i].infected = true
          people[i].status = 'infected'
          people[i].order = 3
          people[i].infectedTime = new Date().getTime()
          totals.normal--
          totals.infected++
          return
        }
      }
    }
  }

  statusUpdate () {
    if (this.status === 'normal') return
    if (this.status === 'infected') {
      const newStatus = random() < mortality ? 'dead' : 'cured'
      if (this.infectedTime && ((this.infectedTime + timeToCure) <= new Date().getTime())) {
        this.status = newStatus
        this.order = newStatus === 'dead' ? 0
          : newStatus === 'cured' ? 2
            : 1
        this.infected = false
        totals.infected--
        totals[newStatus]++
      }
    }
  }

  display (person) {
    if (this.status === 'infected') {
      fill(255, 0, 0)
    } else if (this.status === 'cured') {
      fill(0, 255, 0)
    } else if (this.status === 'dead') {
      fill(50)
    } else {
      fill(255)
    }
    ellipse(this.position.x, this.position.y, this.diameter, this.diameter)
    noStroke()
  }
}

function createSimulation () {
  clear()
  for (let i = 0; i < population; i++) {
    people.push(new Person({
      x: random(width - (diameter * 2)) + (diameter),
      y: random(height - (diameter * 2)) + (diameter),
      index: i,
      diameter, // : diameter + (10 * i),
      infected: i < 1,
      status: i < 1 ? 'infected' : 'normal',
      moving: distancing > 0 ? (i < population - (population * distancing)) : true,
    }))
  }
}


function setup () {
  createCanvas(canvas.w, canvas.h)
  // createSimulation()
}

function updateDump () {
  dump.innerText = JSON.stringify({
    settings: {
      population,
      distancing,
      timeToCure,
      mortality,
    },
    stats: {
      normal: totals.normal,
      infected: totals.infected,
      cured: totals.cured,
      dead: totals.dead,
    },
    sessionTime,
  }, null, 2)
}

updateDump()



function draw () {
  if (running) {
    background(0)
    people.forEach(function (person, i) {
        if (person.moving && person.status !== 'dead'){
          person.move()
        }
        person.intersect()
        person.statusUpdate()
        person.display(person)
      })
    updateDump()
  } else {
    stop()
  }
}

function stop () {
  running = false
  noLoop()
  startButton.style.display = 'block'
  stopButton.style.display = 'none'
}

function reset () {
  people = []
  chart = []
  sessionTime = 0
  Object.keys(totals).forEach(k => totals[k] = 0)
  totals.normal = population
  background(0)
}

function start () {
  reset()
  createSimulation()
  running = true
  loop()
  window.requestAnimationFrame(updateChart)
  startButton.style.display = 'none'
  stopButton.style.display = 'block'
}

startButton.addEventListener('click', start)
stopButton.addEventListener('click', stop)

