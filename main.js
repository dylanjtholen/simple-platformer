const VIRTUAL_WIDTH = 1920;
const VIRTUAL_HEIGHT = 1080;
const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');
c.imageSmoothingEnabled = false;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

const winImg = new Image();
winImg.src = 'win.png';

const winHardmodeImg = new Image();
winHardmodeImg.src = 'win-hard.png';

const startButton = document.getElementById('startButton');
const hardmodeButton = document.getElementById('hardmodeButton');
const menu = document.getElementById('menu');

startButton.onclick = () => {
	menu.style.display = 'none';
	loop();
};

hardmodeButton.onclick = () => {
	menu.style.display = 'none';
	game.hardmode = true;
	loop();
};

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	// Calculate scale and offsets for letterboxing
	const scaleX = canvas.width / VIRTUAL_WIDTH;
	const scaleY = canvas.height / VIRTUAL_HEIGHT;
	scale = Math.min(scaleX, scaleY);
	offsetX = (canvas.width - VIRTUAL_WIDTH * scale) / 2;
	offsetY = (canvas.height - VIRTUAL_HEIGHT * scale) / 2;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const editorMode = false;
let editorPlacing = {
	x: 0,
	y: 0,
	isPlacing: false,
	type: 'platform',
};

const platforms = [];
const levelcount = 2; //number of levels available
let currentLevel = 0;

for (let i = 0; i <= levelcount; i++) {
	const res = await fetch(`l${i}.json`);
	platforms[i] = await res.json();
}

const game = {
	player: {
		velocity: {x: 0, y: 0},
		position: {x: platforms[currentLevel][0].x, y: platforms[currentLevel][0].y},
		width: 50,
		height: 50,
		speed: 3,
		jumpStrength: 15,
		onGround: false,
		coyote: 0,
	},
	hardmode: false,
	platforms: platforms[currentLevel],
	win: false,
};

let lastFrameTime = Date.now();
let deltaTime = 0;

function loop() {
	const currentTime = Date.now();
	deltaTime = (currentTime - lastFrameTime) / (1000 / 60);
	//not actually delta time but stfu
	lastFrameTime = currentTime;

	if (game.win) {
		if (game.hardmode) c.drawImage(winHardmodeImg, 0, 0, canvas.width, canvas.height);
		else c.drawImage(winImg, 0, 0, canvas.width, canvas.height);
		return;
	}
	update();
	draw();
	requestAnimationFrame(loop);
}

function drawPlatform(platform) {
	switch (platform.type) {
		case 'platform':
			c.fillStyle = 'blue';
			break;
		case 'hazard':
			c.fillStyle = 'red';
			break;
		case 'goal':
			c.fillStyle = 'green';
			break;
		case 'bounce':
			c.fillStyle = 'yellow';
			break;
		case 'start':
			return;
		default:
			c.fillStyle = 'blue';
			break;
	}
	c.fillRect(platform.x, platform.y, platform.width, platform.height);
}

function draw() {
	// Fill background (letterbox bars)
	c.fillStyle = 'black';
	c.fillRect(0, 0, canvas.width, canvas.height);

	// Transform to virtual coordinates
	c.save();
	c.translate(offsetX, offsetY);
	c.scale(scale, scale);

	// Draw game world
	const player = game.player;
	for (const platform of game.platforms) {
		drawPlatform(platform);
	}

	if (editorPlacing.isPlacing) {
		let x1 = editorPlacing.x;
		let y1 = editorPlacing.y;
		let x2 = mouse.x;
		let y2 = mouse.y;
		drawPlatform({x: x1, y: y1, width: x2 - x1, height: y2 - y1, type: editorPlacing.type});
	}

	c.fillStyle = 'orange';
	c.fillRect(player.position.x, player.position.y, player.width, player.height);

	c.restore();
}

function update() {
	physics();
}

const keys = {
	left: false,
	right: false,
	jump: false,
	place: false,
};

const keymap = {
	arrowleft: 'left',
	arrowright: 'right',
	' ': 'jump',
	a: 'left',
	d: 'right',
	w: 'jump',
	shift: 'place',
};

const mouse = {
	x: 0,
	y: 0,
};

window.addEventListener('keydown', (e) => {
	const key = keymap[e.key.toLowerCase()];
	if (key) keys[key] = true;
	if (editorMode) {
		switch (e.key.toLowerCase()) {
			case 'p':
				editorPlacing.type = 'platform';
				break;
			case 'o':
				editorPlacing.type = 'hazard';
				break;
			case 'g':
				editorPlacing.type = 'goal';
				break;
			case 'b':
				editorPlacing.type = 'bounce';
				break;
			case 'x':
				navigator.clipboard.writeText(JSON.stringify(platforms));
		}
	}
});

window.addEventListener('keyup', (e) => {
	const key = keymap[e.key.toLowerCase()];
	if (key) keys[key] = false;
});

function toVirtual(x, y) {
	// Convert screen (pixel) coordinates to virtual game coordinates
	return {
		x: (x - offsetX) / scale,
		y: (y - offsetY) / scale,
	};
}

canvas.addEventListener('mousedown', (e) => {
	const v = toVirtual(e.clientX, e.clientY);
	if (editorMode) {
		if (editorPlacing.isPlacing) {
			editorPlacing.isPlacing = false;
			let x1 = Math.min(v.x, editorPlacing.x);
			let x2 = Math.max(v.x, editorPlacing.x);
			let y1 = Math.min(v.y, editorPlacing.y);
			let y2 = Math.max(v.y, editorPlacing.y);
			game.platforms.push({x: x1, y: y1, width: x2 - x1, height: y2 - y1, type: editorPlacing.type});
		} else if (keys['place']) {
			editorPlacing.isPlacing = true;
			editorPlacing.x = v.x;
			editorPlacing.y = v.y;
		}
	}
});

canvas.addEventListener('mousemove', (e) => {
	const v = toVirtual(e.clientX, e.clientY);
	mouse.x = v.x;
	mouse.y = v.y;
});

function physics() {
	const player = game.player;

	collideSpecial();

	if (keys.left) {
		player.velocity.x -= player.speed * deltaTime;
	}
	if (keys.right) {
		player.velocity.x += player.speed * deltaTime;
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
		player.velocity.y += 1 * deltaTime;
	}

	player.coyote -= deltaTime;
	if (keys.jump && (player.onGround || player.coyote > 0)) {
		player.velocity.y = -player.jumpStrength;
		player.onGround = false;
		player.coyote = 0;
	}

	if (collideCeilings()) {
		player.velocity.y = 0;
	}

	player.position.y += player.velocity.y * deltaTime;
}

function collideSpecial() {
	const player = game.player;
	for (const platform of game.platforms.filter((p) => p.type !== 'platform')) {
		if (player.position.x < platform.x + platform.width && player.position.x + player.width > platform.x && player.position.y < platform.y + platform.height && player.position.y + player.height > platform.y) {
			switch (platform.type) {
				case 'hazard':
					if (game.hardmode) {
						currentLevel = 0;
						game.platforms = platforms[currentLevel];
						game.player.position = {x: game.platforms[0].x, y: game.platforms[0].y};
						game.player.velocity = {x: 0, y: 0};
					} else {
						player.position = {x: game.platforms[0].x, y: game.platforms[0].y};
						player.velocity = {x: 0, y: 0};
					}
					break;
				case 'goal':
					currentLevel++;
					if (currentLevel >= platforms.length) {
						game.win = true;
						return;
					}
					game.platforms = platforms[currentLevel];
					game.player.position = {x: game.platforms[0].x, y: game.platforms[0].y};
					game.player.velocity = {x: 0, y: 0};
					break;
				case 'bounce':
					player.velocity.y = -player.jumpStrength * 1.5;
					player.onGround = false;
					player.coyote = 0;
					break;
				case 'start':
					break;
				default:
					console.warn(`u suck at building: ${platform.type}`);
					break;
			}
		}
	}
}

function collideFloor() {
	const player = game.player;
	for (const platform of game.platforms.filter((p) => p.type === 'platform')) {
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
	for (const platform of game.platforms.filter((p) => p.type === 'platform')) {
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
	for (const platform of game.platforms.filter((p) => p.type === 'platform')) {
		if (player.position.x < platform.x + platform.width && player.position.x + player.width > platform.x && player.position.y + Math.min(player.velocity.y, -10) < platform.y + platform.height && player.position.y + Math.min(player.velocity.y, -10) + player.height > platform.y && player.velocity.y < 0) {
			player.position.y = platform.y + platform.height;
			return true;
		}
	}
	return false;
}
