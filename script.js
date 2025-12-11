// --- GAME VARIABLES ---
const TRACK_WIDTH = 10;
const INITIAL_SPEED = 0.5;
let score = 0;
let coins = 0;
let isGameOver = true; // IMPORTANT: Set to true initially to prevent collision check before initialization

// Player state
const player = {
    speed: INITIAL_SPEED,
    lateralVelocity: 0,
    maxLateralSpeed: 0.1,
    steeringPower: 0.015,
    lateralFriction: 0.9,
    jumpVelocity: 0,
    isJumping: false,
    gravity: -0.05,
    initialY: 0.5 
};

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, sled;
let pathGroup = new THREE.Group();
let keys = {}; 

// --- CORE FUNCTIONS ---

function init3D() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); 

    // 2. Camera: Fixed perspective looking down the path
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 15); 
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 4. Lighting
    const light = new THREE.DirectionalLight(0xffffff, 5);
    light.position.set(10, 20, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040, 2));

    // 5. Create Game Elements
    createSled();
    scene.add(pathGroup);
    
    // 6. Event Listeners 
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize, false);
    
    // Start game for the first time
    resetGame();
    animate();
}

function createSled() {
    const sledGeometry = new THREE.BoxGeometry(2, 0.5, 3); 
    const sledMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); 
    sled = new THREE.Mesh(sledGeometry, sledMaterial);
    sled.position.set(0, player.initialY, 0);
    scene.add(sled);
}

// All segment and obstacle creation functions remain the same (omitted for brevity)
function createPathSegment(zStart, length, isGap = false) { 
    // ... (Code from previous response) ...
    if (isGap) {
        return; 
    }
    
    const geometry = new THREE.PlaneGeometry(TRACK_WIDTH, length);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White Snow
    const segment = new THREE.Mesh(geometry, material);
    segment.rotation.x = -Math.PI / 2;
    segment.position.set(0, 0, zStart - length / 2);
    pathGroup.add(segment);
    
    // Fence/boundary visualization (simplistic)
    const fenceMat = new THREE.MeshBasicMaterial({ color: 0x909090 });
    const fenceGeo = new THREE.BoxGeometry(0.2, 1, length);
    
    const fenceLeft = new THREE.Mesh(fenceGeo, fenceMat);
    fenceLeft.position.set(-TRACK_WIDTH / 2, 0.5, zStart - length / 2);
    pathGroup.add(fenceLeft);
    
    const fenceRight = new THREE.Mesh(fenceGeo, fenceMat);
    fenceRight.position.set(TRACK_WIDTH / 2, 0.5, zStart - length / 2);
    pathGroup.add(fenceRight);

    if (Math.random() > 0.6) {
        createObstaclesOnSegment(zStart, length);
    }
}

function createObstaclesOnSegment(zStart, length) {
    const numObstacles = THREE.MathUtils.randInt(1, 3);
    for (let i = 0; i < numObstacles; i++) {
        const x = THREE.MathUtils.randFloat(-TRACK_WIDTH / 2 + 1, TRACK_WIDTH / 2 - 1);
        const z = THREE.MathUtils.randFloat(zStart - length, zStart);
        
        const obsGeo = new THREE.BoxGeometry(1, 1, 1);
        const obsMat = new THREE.MeshPhongMaterial({ color: 0x808080 });
        const obstacle = new THREE.Mesh(obsGeo, obsMat);
        obstacle.position.set(x, 0.5, z);
        pathGroup.add(obstacle);
    }
}


// --- GAME MANAGEMENT FUNCTIONS ---

let lastPathZ = 50; 

/**
 * Resets all game state variables and UI elements.
 */
function resetGame() {
    // Reset core variables
    score = 0;
    coins = 0;
    isGameOver = false;
    lastPathZ = 50; 

    // Reset player state
    sled.position.set(0, player.initialY, 0);
    sled.material.color.setHex(0x8B4513); // Reset sled color
    player.lateralVelocity = 0;
    player.jumpVelocity = 0;
    player.isJumping = false;

    // Reset UI
    document.getElementById('status').innerText = "Status: Go!";
    document.getElementById('status').style.color = "yellow";
    document.getElementById('restartButton').style.display = "none";
    
    updateScoreDisplay();

    // Clear and rebuild the path
    while(pathGroup.children.length > 0){
        pathGroup.remove(pathGroup.children[0]);
    }
    createPathSegment(0, 50); // Create a safe starting segment
}

/**
 * Called when the player clicks the restart button.
 */
function restartGame() {
    // The animate loop is still running, so we just reset the state
    resetGame();
}


function spawnPath() {
    while (lastPathZ < sled.position.z + 100) {
        const segmentLength = THREE.MathUtils.randFloat(20, 40);
        const isGap = Math.random() < 0.2; 
        
        createPathSegment(lastPathZ, segmentLength, isGap);
        lastPathZ += segmentLength;
    }
}

function updateMovement() {
    if (isGameOver) return;

    // ... (Movement logic from previous response) ...
    if (keys['KeyA'] || keys['ArrowLeft']) {
        player.lateralVelocity -= player.steeringPower;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        player.lateralVelocity += player.steeringPower;
    }

    player.lateralVelocity *= player.lateralFriction;
    player.lateralVelocity = THREE.MathUtils.clamp(player.lateralVelocity, -player.maxLateralSpeed, player.maxLateralSpeed);

    sled.position.x += player.lateralVelocity;
    sled.position.x = THREE.MathUtils.clamp(sled.position.x, -TRACK_WIDTH / 2, TRACK_WIDTH / 2);
    
    if (keys['Space'] && !player.isJumping) {
        player.jumpVelocity = 0.8; 
        player.isJumping = true;
    }

    if (player.isJumping) {
        sled.position.y += player.jumpVelocity;
        player.jumpVelocity += player.gravity;

        if (sled.position.y <= player.initialY) {
            sled.position.y = player.initialY;
            player.isJumping = false;
            player.jumpVelocity = 0;
        }
    }
    
    pathGroup.position.z += player.speed;
    score += player.speed * 0.1;
}

function checkCollisions() {
    // CRITICAL FIX: Don't run collision check until the path has been built
    if (isGameOver || pathGroup.children.length === 0) return; 

    const sledBox = new THREE.Box3().setFromObject(sled);
    const sledWorldPosition = new THREE.Vector3();
    sled.getWorldPosition(sledWorldPosition);

    let onTrack = false;

    pathGroup.children.forEach(obj => {
        const objBox = new THREE.Box3().setFromObject(obj);
        
        // Check if the sled is over a solid piece of track (not a gap)
        if (obj.geometry instanceof THREE.PlaneGeometry && sledWorldPosition.y <= player.initialY + 0.1) {
             if (sledBox.intersectsBox(objBox)) {
                onTrack = true;
             }
        }
        
        // Check collision with small obstacles (boxes)
        if (obj.geometry instanceof THREE.BoxGeometry && sledBox.intersectsBox(objBox)) {
            // Collision with obstacle
            isGameOver = true;
            document.getElementById('status').innerText = "Crashed into an obstacle!";
            document.getElementById('status').style.color = "red";
            document.getElementById('restartButton').style.display = "block"; // Show restart button
        }
    });
    
    // Check if player is falling in a gap
    if (!onTrack && sled.position.y <= player.initialY && !player.isJumping) {
        isGameOver = true;
        document.getElementById('status').innerText = "Fell into a gap!";
        document.getElementById('status').style.color = "red";
        document.getElementById('restartButton').style.display = "block"; // Show restart button
        sled.material.color.setHex(0xff0000); 
    }

    // Cleanup segments that are far behind the camera
    pathGroup.children = pathGroup.children.filter(obj => {
        return obj.position.z + pathGroup.position.z < 50; 
    });
}


function updateScoreDisplay() {
    document.getElementById('scoreDisplay').innerText = score.toFixed(0);
    document.getElementById('speedDisplay').innerText = (player.speed * 10).toFixed(1);
}

// --- ANIMATION LOOP ---

function animate() {
    requestAnimationFrame(animate);

    if (!isGameOver) {
        updateMovement();
        spawnPath();
        checkCollisions();
        updateScoreDisplay();
    }

    renderer.render(scene, camera);
}

// --- EVENT HANDLERS ---
function onKeyDown(event) {
    keys[event.code] = true;
}

function onKeyUp(event) {
    keys[event.code] = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- START GAME ---
init3D();
