const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function loop() {
	update();
	draw();
	requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

const game = {
	player: {
		velocity: {x: 0, y: 0},
		position: {x: 100, y: 700},
		width: 50,
		height: 50,
		speed: 3,
		jumpStrength: 15,
		onGround: false,
		coyote: 0,
	},
	platforms: [
		{x: 0, y: 800, width: 2000, height: 20},
		{x: 300, y: 700, width: 100, height: 100},
		{x: 800, y: 600, width: 100, height: 200},
		{x: 400, y: 600, width: 200, height: 20},
	],
};

function draw() {
	c.clearRect(0, 0, canvas.width, canvas.height);
	const player = game.player;
	c.fillStyle = 'blue';
	for (const platform of game.platforms) {
		c.fillRect(platform.x, platform.y, platform.width, platform.height);
	}
	c.fillStyle = 'red';
	c.fillRect(player.position.x, player.position.y, player.width, player.height);
}

function update() {
	const player = game.player;
	physics();
}

const keys = {
	left: false,
	right: false,
	jump: false,
};

const keymap = {
	arrowleft: 'left',
	arrowright: 'right',
	' ': 'jump',
	a: 'left',
	d: 'right',
	w: 'jump',
};

window.addEventListener('keydown', (e) => {
	const key = keymap[e.key.toLowerCase()];
	if (key) keys[key] = true;
});

window.addEventListener('keyup', (e) => {
	const key = keymap[e.key.toLowerCase()];
	if (key) keys[key] = false;
});

function physics() {
	const player = game.player;
	if (keys.left) {
		player.velocity.x -= player.speed;
	}
	if (keys.right) {
		player.velocity.x += player.speed;
	}
	player.velocity.x *= player.onGround ? 0.8 : 0.85;
	if (Math.abs(player.velocity.x) < 0.1) player.velocity.x = 0;

	if (collideWalls()) {
		player.velocity.x = 0;
	}

	if (collideFloor()) {
		player.onGround = true;
		player.velocity.y = 0;
		player.coyote = 10;
	} else {
		player.onGround = false;
		player.velocity.y += 1;
	}

	player.coyote--;
	if (keys.jump && (player.onGround || player.coyote > 0)) {
		player.velocity.y = -player.jumpStrength;
		player.onGround = false;
		player.coyote = 0;
	}

	if (collideCeilings()) {
		player.velocity.y = 0;
	}

	player.position.y += player.velocity.y;
}

function collideFloor() {
	const player = game.player;
	for (const platform of game.platforms) {
		if (player.position.x < platform.x + platform.width && player.position.x + player.width > platform.x && player.position.y + Math.max(player.velocity.y, 10) < platform.y + platform.height && player.position.y + Math.max(player.velocity.y, 10) + player.height > platform.y && player.velocity.y >= 0) {
			player.position.y = platform.y - player.height;
			return true;
		}
	}
	return false;
}

function collideWalls() {
	const player = game.player;
	player.position.x += player.velocity.x;
	for (const platform of game.platforms) {
		if (player.position.y < platform.y + platform.height && player.position.y + player.height > platform.y) {
			if (player.position.x + player.width > platform.x && player.position.x < platform.x) {
				player.position.x = platform.x - player.width;
				return true;
			} else if (player.position.x < platform.x + platform.width && player.position.x + player.width > platform.x + platform.width) {
				player.position.x = platform.x + platform.width;
				return true;
			}
		}
	}
	return false;
}

function collideCeilings() {
	const player = game.player;
	for (const platform of game.platforms) {
		if (player.position.x < platform.x + platform.width && player.position.x + player.width > platform.x && player.position.y + Math.min(player.velocity.y, -10) < platform.y + platform.height && player.position.y + Math.min(player.velocity.y, -10) + player.height > platform.y && player.velocity.y < 0) {
			player.position.y = platform.y + platform.height;
			return true;
		}
	}
	return false;
}
