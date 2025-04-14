import Phaser from "phaser";

export class AirplaneShooterGame extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spacebar!: Phaser.Input.Keyboard.Key;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private cloudsFar!: Phaser.GameObjects.Group;
  private cloudsMid!: Phaser.GameObjects.Group;
  private cloudsNear!: Phaser.GameObjects.Group;
  private laser!: Phaser.Physics.Arcade.Sprite;
  private scoreText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private boostBar!: Phaser.GameObjects.Rectangle;
  private boostBarBg!: Phaser.GameObjects.Rectangle;
  private gameOverText!: Phaser.GameObjects.Text;
  private retryButton!: Phaser.GameObjects.Text;

  private lastFired: number = 0;
  private score: number = 0;
  private lives: number = 5;
  private maxLives: number = 5;
  private boost: number = 100;
  private maxBoost: number = 100;
  private boostActive: boolean = false;
  private boostTimer: number = 0;
  private laserActive: boolean = false;
  private laserTimer: number = 0;
  private rocketCount: number = 0;
  private spreadActive: boolean = false;
  private spreadTimer: number = 0;

  constructor() {
    super({ key: "AirplaneShooterGame" });
  }

  preload() {
    console.log("Preloading assets...");
    try {
      // Load images from the public directory
      this.load.image("player", "/images/plane.png");
      this.load.image("enemy", "/images/drone.png");
      this.load.image("cloud", "/images/cloud.png");
      this.load.image("powerup_laser", "/images/powerup_laser.jpeg");
      this.load.image("powerup_rocket", "/images/powerup_rocket.jpeg");
      this.load.image("powerup_spread", "/images/powerup_spread.png");
      this.load.spritesheet("explosion", "/images/explosion.png", {
        frameWidth: 64,
        frameHeight: 64,
      });

      this.load.on("filecomplete", () => {
        console.log("Asset loaded successfully");
      });

      this.load.on("loaderror", (file: any) => {
        console.error("Failed to load asset:", file.key);
      });
    } catch (e) {
      console.error("Preload error:", e);
    }
  }

  create() {
    console.log("Creating scene...");
    try {
      // Create bullet and laser textures
      this.createBulletTexture();
      this.createLaserTexture();

      // Background
      this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

      // Clouds for parallax
      this.cloudsFar = this.add.group({ maxSize: 4 });
      this.cloudsMid = this.add.group({ maxSize: 3 });
      this.cloudsNear = this.add.group({ maxSize: 2 });

      // Initial cloud spawn
      this.spawnClouds();

      // Spawn clouds periodically
      this.time.addEvent({
        delay: 2000,
        callback: this.spawnClouds,
        callbackScope: this,
        loop: true,
      });

      // Bullets
      this.bullets = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Sprite,
        maxSize: 30,
        runChildUpdate: true,
      });

      // Laser
      this.laser = this.physics.add.sprite(400, 500, "laser");
      this.laser.setDepth(5);
      this.laser.setOrigin(0.5, 1);
      this.laser.setActive(false);
      this.laser.setVisible(false);

      // Player
      this.player = this.physics.add.sprite(400, 500, "player");
      this.player.setDepth(10);
      this.player.setCollideWorldBounds(true);
      this.player.setOrigin(0.5, 0.5);
      this.player.setRotation(0);
      this.player.setScale(0.1);
      this.player.setSize(20, 20);
      this.player.setOffset(0, 0);
      this.player.setDamping(true);
      this.player.setDrag(0.95);

      // Enemies
      this.enemies = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Sprite,
        defaultKey: "enemy",
      });

      // Powerups
      this.powerups = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Sprite,
        defaultKey: "powerup_laser",
      });

      // Explosion animation
      if (this.textures.exists("explosion")) {
        this.anims.create({
          key: "explode",
          frames: this.anims.generateFrameNumbers("explosion", {
            start: 0,
            end: 15,
          }),
          frameRate: 30,
          repeat: 0,
          hideOnComplete: true,
        });
        console.log("Explosion animation created");
      } else {
        console.error("Explosion texture not found, animation not created");
      }

      // Input
      this.cursors = this.input.keyboard!.createCursorKeys();
      this.spacebar = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE
      );

      // Collisions
      this.physics.add.overlap(
        this.bullets,
        this.enemies,
        this.hitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
      this.physics.add.overlap(
        this.bullets,
        this.powerups,
        this.hitPowerup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
      this.physics.add.overlap(
        this.laser,
        this.enemies,
        this
          .hitEnemyWithLaser as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );

      // Score
      this.scoreText = this.add.text(16, 16, "Score: 0", {
        fontSize: "24px",
        color: "#000",
      });
      this.scoreText.setDepth(20);

      // Health bar
      this.healthBarBg = this.add
        .rectangle(16, 50, 100, 10, 0x666666)
        .setOrigin(0, 0)
        .setDepth(20);
      this.healthBar = this.add
        .rectangle(16, 50, 100, 10, 0x00ff00)
        .setOrigin(0, 0)
        .setDepth(20);

      // Boost bar
      this.boostBarBg = this.add
        .rectangle(16, 70, 100, 10, 0x666666)
        .setOrigin(0, 0)
        .setDepth(20);
      this.boostBar = this.add
        .rectangle(16, 70, 100, 10, 0x0000ff)
        .setOrigin(0, 0)
        .setDepth(20);

      // Game over elements
      this.gameOverText = this.add.text(300, 300, "Game Over", {
        fontSize: "48px",
        color: "#000",
      });
      this.gameOverText.setDepth(20);
      this.gameOverText.setVisible(false);

      this.retryButton = this.add.text(350, 360, "Retry", {
        fontSize: "24px",
        color: "#000",
        backgroundColor: "#fff",
        padding: { x: 10, y: 5 },
      });
      this.retryButton.setDepth(20);
      this.retryButton.setVisible(false);
      this.retryButton.setInteractive();
      this.retryButton.on("pointerdown", this.resetGame, this);

      // Spawn enemies
      this.time.addEvent({
        delay: 1000,
        callback: this.spawnEnemy,
        callbackScope: this,
        loop: true,
      });

      // Spawn powerups
      this.time.addEvent({
        delay: 30000,
        callback: this.spawnPowerup,
        callbackScope: this,
        loop: true,
      });
    } catch (e) {
      console.error("Create error:", e);
    }
  }

  update(time: number, delta: number) {
    try {
      if (this.lives <= 0) return;

      // Update clouds
      this.updateClouds();

      // Update laser
      if (this.laserActive) {
        this.laser.setActive(true);
        this.laser.setVisible(true);
        this.laser.setPosition(this.player.x, this.player.y - 10);
        this.laser.setSize(10, 600);
        this.laserTimer -= delta;
        if (this.laserTimer <= 0) {
          this.laserActive = false;
          this.laser.setActive(false);
          this.laser.setVisible(false);
        }
      }

      // Update spread shot
      if (this.spreadActive) {
        this.spreadTimer -= delta;
        if (this.spreadTimer <= 0) {
          this.spreadActive = false;
        }
      }

      // Player movement
      let velocityX = 0;
      let velocityY = 0;
      let speed = 300;

      // Handle boost
      if (!this.boostActive && this.spacebar.isDown && this.boost >= 100) {
        this.boostActive = true;
        this.boostTimer = 2000;
        this.boost = 0;
        this.updateBoostBar();
      }

      if (this.boostActive) {
        speed = 600;
        this.boostTimer -= delta;
        if (this.boostTimer <= 0) {
          this.boostActive = false;
        }
      } else {
        this.boost += delta / 1000;
        if (this.boost > this.maxBoost) this.boost = this.maxBoost;
        this.updateBoostBar();
      }

      if (this.cursors.left.isDown) {
        velocityX = -speed;
      } else if (this.cursors.right.isDown) {
        velocityX = speed;
      }

      if (this.cursors.up.isDown) {
        velocityY = -speed;
      } else if (this.cursors.down.isDown) {
        velocityY = speed;
      }

      // Normalize diagonal movement
      if (velocityX !== 0 && velocityY !== 0) {
        const factor =
          speed / Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        velocityX *= factor;
        velocityY *= factor;
      }

      this.player.setVelocity(velocityX, velocityY);

      // Auto-fire
      if (!this.laserActive && time > this.lastFired + 200) {
        if (this.rocketCount > 0) {
          this.fireRocket();
          this.rocketCount--;
          this.lastFired = time;
        } else if (this.spreadActive) {
          this.fireSpreadShot();
          this.lastFired = time;
        } else {
          this.fireBullet();
          this.lastFired = time;
        }
      }

      // Update bullets
      this.bullets.getChildren().forEach((bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        if (b.active && b.y < 0) {
          b.setActive(false);
          b.setVisible(false);
        }
      });

      // Update enemies
      this.enemies.getChildren().forEach((enemy) => {
        const e = enemy as Phaser.Physics.Arcade.Sprite;
        if (e.active && e.y > 600) {
          e.setActive(false);
          e.setVisible(false);
          this.lives -= 1;
          this.updateHealthBar();
          if (this.lives <= 0) {
            this.triggerGameOver();
          }
        }
      });

      // Update powerups
      this.powerups.getChildren().forEach((powerup) => {
        const p = powerup as Phaser.Physics.Arcade.Sprite;
        if (p.active && p.y > 600) {
          p.setActive(false);
          p.setVisible(false);
        }
      });
    } catch (e) {
      console.error("Update error:", e);
    }
  }

  private fireBullet() {
    const bullet = this.bullets.get(this.player.x, this.player.y - 10);
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setTexture("bullet");
      bullet.setVelocityY(-600);
      bullet.setRotation(-Math.PI / 2);
      bullet.setDepth(5);
      bullet.body.enable = true;
    }
  }

  private fireRocket() {
    const bullet = this.bullets.get(this.player.x, this.player.y - 10);
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setTexture("bullet");
      bullet.setVelocityY(-600);
      bullet.setRotation(-Math.PI / 2);
      bullet.setDepth(5);
      bullet.body.enable = true;
      (bullet as any).isRocket = true;
    }
  }

  private fireSpreadShot() {
    // Center bullet
    const bullet1 = this.bullets.get(this.player.x, this.player.y - 10);
    if (bullet1) {
      bullet1.setActive(true);
      bullet1.setVisible(true);
      bullet1.setTexture("bullet");
      bullet1.setVelocityY(-600);
      bullet1.setRotation(-Math.PI / 2);
      bullet1.setDepth(5);
      bullet1.body.enable = true;
    }

    // Left bullet (15 degrees left)
    const bullet2 = this.bullets.get(this.player.x, this.player.y - 10);
    if (bullet2) {
      bullet2.setActive(true);
      bullet2.setVisible(true);
      bullet2.setTexture("bullet");
      const angle = -Math.PI / 12;
      bullet2.setVelocity(-600 * Math.sin(angle), -600 * Math.cos(angle));
      bullet2.setRotation(-Math.PI / 2 - Math.PI / 12);
      bullet2.setDepth(5);
      bullet2.body.enable = true;
    }

    // Right bullet (15 degrees right)
    const bullet3 = this.bullets.get(this.player.x, this.player.y - 10);
    if (bullet3) {
      bullet3.setActive(true);
      bullet3.setVisible(true);
      bullet3.setTexture("bullet");
      const angle = Math.PI / 12;
      bullet3.setVelocity(600 * Math.sin(angle), -600 * Math.cos(angle));
      bullet3.setRotation(-Math.PI / 2 + Math.PI / 12);
      bullet3.setDepth(5);
      bullet3.body.enable = true;
    }
  }

  private spawnEnemy() {
    const x = Phaser.Math.Between(50, 750);
    const enemy = this.enemies.create(x, 0, "enemy");
    if (enemy.body) {
      enemy.setVelocityY(150);
      enemy.setRotation(Math.PI);
      enemy.setDepth(5);
      enemy.setScale(0.1);
      enemy.setSize(24, 24);
    }
  }

  private spawnPowerup() {
    const x = Phaser.Math.Between(50, 750);
    const powerupTypes = ["powerup_laser", "powerup_rocket", "powerup_spread"];
    const type = powerupTypes[Phaser.Math.Between(0, 2)];
    const powerup = this.powerups.create(x, 0, type);
    if (powerup.body) {
      powerup.setVelocityY(100);
      powerup.setDepth(5);
      powerup.setScale(0.5);
      powerup.setSize(32, 32);
      (powerup as any).powerupType = type;
    }
  }

  private hitEnemy(
    bullet: Phaser.Physics.Arcade.Sprite,
    enemy: Phaser.Physics.Arcade.Sprite
  ) {
    bullet.setActive(false);
    bullet.setVisible(false);
    enemy.setActive(false);
    enemy.setVisible(false);

    if ((bullet as any).isRocket) {
      this.createRocketExplosion(enemy.x, enemy.y);
    } else {
      this.createExplosion(enemy.x, enemy.y);
    }

    this.score += 10;
    this.scoreText.setText("Score: " + this.score);
    this.boost += 20;
    if (this.boost > this.maxBoost) this.boost = this.maxBoost;
    this.updateBoostBar();
  }

  private hitEnemyWithLaser(
    laser: Phaser.Physics.Arcade.Sprite,
    enemy: Phaser.Physics.Arcade.Sprite
  ) {
    enemy.setActive(false);
    enemy.setVisible(false);
    this.createExplosion(enemy.x, enemy.y);
    this.score += 10;
    this.scoreText.setText("Score: " + this.score);
    this.boost += 20;
    if (this.boost > this.maxBoost) this.boost = this.maxBoost;
    this.updateBoostBar();
  }

  private hitPowerup(
    bullet: Phaser.Physics.Arcade.Sprite,
    powerup: Phaser.Physics.Arcade.Sprite
  ) {
    bullet.setActive(false);
    bullet.setVisible(false);
    powerup.setActive(false);
    powerup.setVisible(false);

    const powerupType = (powerup as any).powerupType;
    if (powerupType === "powerup_laser") {
      this.laserActive = true;
      this.laserTimer = 10000;
    } else if (powerupType === "powerup_rocket") {
      this.rocketCount = 3;
    } else if (powerupType === "powerup_spread") {
      this.spreadActive = true;
      this.spreadTimer = 10000;
    }
  }

  private createExplosion(x: number, y: number) {
    try {
      if (this.anims.exists("explode")) {
        const explosion = this.add.sprite(x, y, "explosion");
        explosion.setDepth(3);
        explosion.setTint(0xff4500);
        explosion.play("explode");
      } else {
        // Simple particle effect as fallback
        const particles = this.add.particles(x, y, "bullet", {
          speed: { min: 50, max: 200 },
          angle: { min: 0, max: 360 },
          scale: { start: 1, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: 500,
          quantity: 10,
          tint: 0xff4500,
          blendMode: "ADD",
        });

        // Auto-destroy after 1 second
        this.time.delayedCall(1000, () => {
          particles.destroy();
        });
      }
    } catch (e) {
      console.error("Explosion error:", e);
    }
  }

  private createRocketExplosion(x: number, y: number) {
    try {
      if (this.anims.exists("explode")) {
        const explosion = this.add.sprite(x, y, "explosion");
        explosion.setDepth(3);
        explosion.setScale(2);
        explosion.setTint(0xff4500);
        explosion.play("explode");
      }

      // Particle effect
      const particles = this.add.particles(x, y, "bullet", {
        speed: { min: 100, max: 300 },
        angle: { min: 0, max: 360 },
        scale: { start: 2, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 1000,
        quantity: 50,
        tint: 0xff4500,
        blendMode: "ADD",
      });

      // Auto-destroy after 2 seconds
      this.time.delayedCall(2000, () => {
        particles.destroy();
      });

      const blastRadius = 200;
      this.enemies.getChildren().forEach((enemy) => {
        const e = enemy as Phaser.Physics.Arcade.Sprite;
        if (e.active) {
          const distance = Phaser.Math.Distance.Between(x, y, e.x, e.y);
          if (distance < blastRadius) {
            e.setActive(false);
            e.setVisible(false);
            this.createExplosion(e.x, e.y);
            this.score += 10;
            this.scoreText.setText("Score: " + this.score);
            this.boost += 20;
            if (this.boost > this.maxBoost) this.boost = this.maxBoost;
            this.updateBoostBar();
          }
        }
      });
    } catch (e) {
      console.error("Rocket explosion error:", e);
    }
  }

  private updateHealthBar() {
    const width = 100 * (this.lives / this.maxLives);
    this.healthBar.setSize(width, 10);
    this.healthBar.setFillStyle(
      this.lives > 2 ? 0x00ff00 : this.lives > 1 ? 0xffff00 : 0xff0000
    );
  }

  private updateBoostBar() {
    const width = 100 * (this.boost / this.maxBoost);
    this.boostBar.setSize(width, 10);
  }

  private triggerGameOver() {
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.gameOverText.setVisible(true);
    this.retryButton.setVisible(true);
    this.laser.setActive(false);
    this.laser.setVisible(false);
  }

  private resetGame() {
    this.lives = this.maxLives;
    this.score = 0;
    this.boost = this.maxBoost;
    this.boostActive = false;
    this.boostTimer = 0;
    this.laserActive = false;
    this.laserTimer = 0;
    this.rocketCount = 0;
    this.spreadActive = false;
    this.spreadTimer = 0;
    this.lastFired = 0;
    this.scoreText.setText("Score: " + this.score);
    this.updateHealthBar();
    this.updateBoostBar();
    this.player.clearTint();
    this.player.setPosition(400, 500);
    this.player.setActive(true);
    this.player.setVisible(true);
    this.gameOverText.setVisible(false);
    this.retryButton.setVisible(false);
    this.bullets.clear(true, true);
    this.enemies.clear(true, true);
    this.powerups.clear(true, true);
    this.cloudsFar.clear(true, true);
    this.cloudsMid.clear(true, true);
    this.cloudsNear.clear(true, true);
    this.laser.setActive(false);
    this.laser.setVisible(false);
    this.spawnClouds();
    this.physics.resume();
  }

  private createBulletTexture() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffd700, 1);
    graphics.fillRect(0, 0, 8, 8);
    graphics.generateTexture("bullet", 8, 8);
    graphics.destroy();
  }

  private createLaserTexture() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffff00, 1);
    graphics.fillRect(0, 0, 10, 600);
    graphics.fillStyle(0xff4500, 0.5);
    graphics.fillRect(-5, 0, 20, 600);
    graphics.fillStyle(0xff0000, 0.3);
    graphics.fillRect(-10, 0, 30, 600);
    graphics.generateTexture("laser", 30, 600);
    graphics.destroy();
  }

  private spawnClouds() {
    if (this.cloudsFar.countActive() < (this.cloudsFar as any).maxSize) {
      const x = Phaser.Math.Between(0, 800);
      const y = Phaser.Math.Between(-100, 0);
      const cloud = this.cloudsFar.create(x, y, "cloud");
      if (cloud) {
        cloud.setDepth(0);
        cloud.setScale(0.5);
        cloud.setAlpha(0.5);
        (cloud as any).speed = 20;
        cloud.setActive(true);
        cloud.setVisible(true);
      }
    }

    if (this.cloudsMid.countActive() < (this.cloudsMid as any).maxSize) {
      const x = Phaser.Math.Between(0, 800);
      const y = Phaser.Math.Between(-100, 0);
      const cloud = this.cloudsMid.create(x, y, "cloud");
      if (cloud) {
        cloud.setDepth(1);
        cloud.setScale(0.75);
        cloud.setAlpha(0.7);
        (cloud as any).speed = 40;
        cloud.setActive(true);
        cloud.setVisible(true);
      }
    }

    if (this.cloudsNear.countActive() < (this.cloudsNear as any).maxSize) {
      const x = Phaser.Math.Between(0, 800);
      const y = Phaser.Math.Between(-100, 0);
      const cloud = this.cloudsNear.create(x, y, "cloud");
      if (cloud) {
        cloud.setDepth(2);
        cloud.setScale(1);
        cloud.setAlpha(0.9);
        (cloud as any).speed = 60;
        cloud.setActive(true);
        cloud.setVisible(true);
      }
    }
  }

  private updateClouds() {
    this.cloudsFar
      .getChildren()
      .forEach((cloud: Phaser.GameObjects.GameObject) => {
        if (cloud.active) {
          (cloud as any).y += (cloud as any).speed / 60;
          if ((cloud as any).y > 700) {
            cloud.setActive(false);
            (cloud as any).setVisible(false);
          }
        }
      });

    this.cloudsMid
      .getChildren()
      .forEach((cloud: Phaser.GameObjects.GameObject) => {
        if (cloud.active) {
          (cloud as any).y += (cloud as any).speed / 60;
          if ((cloud as any).y > 700) {
            cloud.setActive(false);
            (cloud as any).setVisible(false);
          }
        }
      });

    this.cloudsNear
      .getChildren()
      .forEach((cloud: Phaser.GameObjects.GameObject) => {
        if (cloud.active) {
          (cloud as any).y += (cloud as any).speed / 60;
          if ((cloud as any).y > 700) {
            cloud.setActive(false);
            (cloud as any).setVisible(false);
          }
        }
      });
  }
}
