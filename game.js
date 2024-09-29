// Add audio files
const hitSound = new Audio("./sounds/hit.mp3"); // Sound when a projectile hits an enemy
const loseSound = new Audio("./sounds/lose.mp3"); // Sound when the player loses the game
const topScoreS = new Audio("./sounds/topscore.mp3"); // Sound when the player beats the top score

// Initialize canvas
const canvas = document.querySelector("canvas");
canvas.width = innerWidth; // Set canvas width to the window width
canvas.height = innerHeight; // Set canvas height to the window height

// DOM elements for updating score and UI
const scoreValue = document.querySelector("#score-value"); // Element displaying the current score
const startGame = document.querySelector("#startGame"); // Button to start the game
const modelEl = document.querySelector("#modelEl"); // Element to show game over screen
const mainScoreEl = document.querySelector("#mainScoreEl"); // Main score display on game over screen
const topScoreEl = document.querySelector("#top-score-value"); // Element displaying the top score
const context = canvas.getContext("2d"); // Get 2D context for drawing on canvas

// Game variables
let projectTiles = []; // Array to store projectiles
let enemies = []; // Array to store enemies
let particles = []; // Array to store explosion particles
let score = 0; // Current score of the player
let topScore = localStorage.getItem("topScore") || 0; // Retrieve top score from localStorage, default to 0
topScoreEl.innerHTML = topScore; // Display the top score

// GameObject base class for the player, enemies, projectiles, and particles
class GameObject {
  constructor(x, y, radius, color) {
    this.x = x; // X position
    this.y = y; // Y position
    this.radius = radius; // Radius for the object
    this.color = color; // Color of the object
  }

  draw() {
    context.fillStyle = this.color; // Set the fill color
    context.beginPath(); // Begin drawing path
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false); // Draw a circle (arc)
    context.fill(); // Fill the circle with the set color
  }
}

// Player class inherits from GameObject
class Player extends GameObject {
  constructor(x, y, radius, color) {
    super(x, y, radius, color); // Call the parent constructor
  }
}

// Projectile class for projectiles shot by the player
class ProjectTile extends GameObject {
  constructor(x, y, radius, color, velocity) {
    super(x, y, radius, color); // Call the parent constructor
    this.velocity = velocity; // Velocity determines projectile movement direction and speed
  }

  update() {
    this.draw(); // Draw the projectile
    this.x += this.velocity.x; // Update X position based on velocity
    this.y += this.velocity.y; // Update Y position based on velocity
  }
}

// Enemy class for enemies appearing on the screen
class Enemy extends GameObject {
  constructor(x, y, radius, color, velocity) {
    super(x, y, radius, color); // Call the parent constructor
    this.velocity = velocity; // Velocity determines enemy movement direction and speed
  }

  update() {
    this.draw(); // Draw the enemy
    this.x += this.velocity.x; // Update X position based on velocity
    this.y += this.velocity.y; // Update Y position based on velocity
  }
}

// Particle class for creating explosion effects when enemies are hit
class Particle extends GameObject {
  constructor(x, y, radius, color, velocity) {
    super(x, y, radius, color); // Call the parent constructor
    this.velocity = velocity; // Velocity determines particle movement
    this.alpha = 1; // Alpha (transparency) of the particle, used for fading out
  }

  draw() {
    context.save(); // Save the current canvas state
    context.globalAlpha = this.alpha; // Apply transparency
    super.draw(); // Call the parent draw method
    context.restore(); // Restore the canvas state
  }

  update() {
    this.draw(); // Draw the particle
    this.velocity.x *= 0.99; // Slow down X velocity (friction)
    this.velocity.y *= 0.99; // Slow down Y velocity (friction)
    this.x += this.velocity.x; // Update X position based on velocity
    this.y += this.velocity.y; // Update Y position based on velocity
    this.alpha -= 0.01; // Gradually fade out the particle
  }
}

// Initialize player at the center of the canvas
const x = canvas.width / 2;
const y = canvas.height / 2;
let player = new Player(x, y, 10, "white"); // Player is represented by a small white circle

// Function to spawn enemies at random intervals and locations
let enemyInterval;
const enemySpawnTime = 1400; // 2 seconds

function spawnEnemies() {
  enemyInterval = setInterval(() => {
    const radius = Math.random() * (30 - 5) + 5; // Random radius for enemies between 5 and 30
    let x;
    let y;
    if (Math.random() < 0.5) {
      // Spawn from left or right edge
      x = Math.random() < 0.5 ? -radius : canvas.width + radius;
      y = Math.random() * canvas.height; // Anywhere along the Y axis
    } else {
      // Spawn from top or bottom edge
      x = Math.random() * canvas.width; // Anywhere along the X axis
      y = Math.random() < 0.5 ? -radius : canvas.height + radius;
    }
    const color = `hsl(${Math.random() * 360}, 50%, 50%)`; // Random enemy color
    const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x); // Angle toward the player
    const velocity = {
      x: Math.cos(angle), // X velocity toward player
      y: Math.sin(angle), // Y velocity toward player
    };
    enemies.push(new Enemy(x, y, radius, color, velocity)); // Add new enemy to the array
  }, enemySpawnTime); // Spawn enemies every 1.4 seconds
}

function stopEnemySpawn() {
  clearInterval(enemyInterval);
}

// Listen for visibility change
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Stop spawning enemies when the tab is not active
    stopEnemySpawn();
  } else {
    // Restart spawning enemies when the tab becomes active
    spawnEnemies();
  }
});

let animationId; // For storing the animation frame request ID

// Main animation loop
const animate = () => {
  animationId = requestAnimationFrame(animate); // Call the animate function recursively
  context.fillStyle = "rgba(0, 0, 0, 0.08)"; // Set a slightly transparent black background for trailing effect
  context.fillRect(0, 0, x * 2, y * 2); // Fill the entire canvas

  player.draw(); // Draw the player

  particles.forEach((particle, i, arr) => {
    if (particle.alpha <= 0) {
      arr.splice(i, 1); // Remove particles when fully faded out
    } else {
      particle.update(); // Update particle positions
    }
  });

  projectTiles.forEach((projectTile, index) => {
    projectTile.update(); // Update projectile positions

    // Check if projectile is off screen
    const isOffScreen = (projectile) => {
      return (
        projectile.x + projectile.radius < 0 ||
        projectile.x - projectile.radius > canvas.width ||
        projectile.y + projectile.radius < 0 ||
        projectile.y - projectile.radius > canvas.height
      );
    };

    // Remove projectile if it goes off screen
    if (isOffScreen(projectTile)) {
      projectTiles.splice(index, 1);
    }
  });

  enemies.forEach((enemy, i) => {
    enemy.update(); // Update enemy positions

    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y); // Calculate distance between player and enemy
    // End the game if an enemy collides with the player
    if (dist - enemy.radius - player.radius < 1) {
      loseSound.play(); // Play game over sound
      cancelAnimationFrame(animationId); // Stop the animation

      // Check if current score beats top score
      if (score > topScore) {
        topScore = score; // Set new top score
        topScoreS.play(); // Play top score sound
        localStorage.setItem("topScore", topScore); // Save new top score to localStorage
        topScoreEl.innerHTML = topScore; // Update top score display

        // Add animation class to top score display
        topScoreEl.classList.add("top-score-animation");
        mainScoreEl.classList.add("top-score-animation");

        // Remove animation class after 2 seconds
        setTimeout(() => {
          topScoreEl.classList.remove("top-score-animation");
          mainScoreEl.classList.remove("top-score-animation");
        }, 2000);
      }

      modelEl.style.display = "flex"; // Show the game over screen
      mainScoreEl.innerHTML = score; // Display the final score
    }

    projectTiles.forEach((projectTile, index) => {
      const dist = Math.hypot(projectTile.x - enemy.x, projectTile.y - enemy.y); // Calculate distance between projectile and enemy

      // When projectile hits an enemy
      if (dist - enemy.radius < 1) {
        hitSound.play(); // Play hit sound effect
        // Create explosion effect by adding multiple particles
        for (let i = 0; i < enemy.radius * 2; i++) {
          speedFactor = 5; // Speed of particles
          particles.push(
            new Particle(
              projectTile.x,
              projectTile.y,
              Math.random() * 3, // Random particle size
              enemy.color, // Same color as the enemy
              {
                x: (Math.random() - 0.5) * speedFactor, // Random particle velocity
                y: (Math.random() - 0.5) * speedFactor,
              }
            )
          );
        }

        if (enemy.radius - 10 > 10) {
          // If enemy size is still large enough, reduce its size
          score += 100; // Add 100 points to score
          scoreValue.innerHTML = score; // Update score display
          gsap.to(enemy, {
            radius: enemy.radius - 10, // Reduce enemy size
          });
          setTimeout(() => {
            projectTiles.splice(index, 1); // Remove the projectile
          }, 0);
        } else {
          // If the enemy is small, remove it completely
          score += 250; // Add 250 points to score
          scoreValue.innerHTML = score; // Update score display
          setTimeout(() => {
            enemies.splice(i, 1); // Remove the enemy
            projectTiles.splice(index, 1); // Remove the projectile
          }, 0);
        }
      }
    });
  });
};

// Event listener for mouse click to shoot projectiles
addEventListener("click", function (e) {
  const angle = Math.atan2(e.clientY - y, e.clientX - x); // Calculate angle toward mouse position
  const velocity = {
    x: Math.cos(angle) * 5, // Set projectile velocity based on angle
    y: Math.sin(angle) * 5,
  };
  projectTiles.push(new ProjectTile(x, y, 5, "white", velocity)); // Add new projectile to the array
});

// Initialize game state before starting
const init = () => {
  modelEl.style.display = "none"; // Hide the game over screen
  player = new Player(x, y, 10, "white"); // Reset player
  projectTiles = []; // Clear projectiles
  enemies = []; // Clear enemies
  particles = []; // Clear particles
  score = 0; // Reset score
  scoreValue.innerHTML = score; // Update score display
};

// Event listener to start the game
startGame.addEventListener("click", () => {
  init(); // Initialize game
  animate(); // Start animation loop
  spawnEnemies(); // Start spawning enemies
});
