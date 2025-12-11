// --- GAME VARIABLES ---
const TRACK_WIDTH = 10;
const INITIAL_SPEED = 0.5;
let score = 0;
let coins = 0;
let isGameOver = false;

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
    initialY: 0.5 // Resting Y position for the sled
};

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, sled;
let pathGroup = new THREE.Group();
let keys = {}; 

// --- CORE FUNCTIONS ---

function init3D() {
    // 1. Scene Setup: Clear, bright sky
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue

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
    
    // Initial segment of the track
    createPathSegment(0, 50);

    // 6. Event Listeners (Add Spacebar for Jump)
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize, false);
}

function createSled() {
    // Simple block/capsule shape to represent the sled/rider
    const sledGeometry = new THREE.BoxGeometry(2, 0.5, 3); 
    const sledMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Brown sled
    sled = new THREE.Mesh(sledGeometry, sledMaterial);
    sled.position.set(0, player.initialY, 0);
    scene.add(sled);
}

function createPathSegment(zStart, length, isGap = false) {
    if (isGap) {
        // A gap is just empty space, no geometry needed
        return; 
    }
    
    const geometry = new THREE.PlaneGeometry(TRACK_WIDTH, length);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White Snow
    const segment = new THREE.Mesh(geometry, material);
    segment.rotation.x = -Math.PI / 2;
    segment.position.set(0, 0, zStart - length / 2);
    pathGroup.add(segment);
    
    // Add fence/boundary visualization (simplistic)
    const fenceMat = new THREE.MeshBasicMaterial({ color: 0x909090 });
    const fenceGeo = new THREE.BoxGeometry(0.2, 1, length);
    
    const fenceLeft = new THREE.Mesh(fenceGeo, fenceMat);
    fenceLeft.position.set(-TRACK_WIDTH / 2, 0.5, zStart - length / 2);
    pathGroup.add(fenceLeft);
    
    const fenceRight = new THREE.Mesh(fenceGeo, fenceMat);
    fenceRight.position.set(TRACK_WIDTH / 2, 0.5, zStart - length / 2);
    pathGroup.add(fenceRight);

    // Optional: Add some random obstacles to this segment
    if (Math.random() > 0.6) {
        createObstaclesOnSegment(zStart, length);
    }
}

function createObstaclesOnSegment(zStart, length) {
    const numObstacles = THREE.MathUtils.randInt(1, 3);
    for (let i = 0; i < numObstacles; i++) {
        const x = THREE.MathUtils.randFloat(-TRACK_WIDTH / 2 + 1, TRACK_WIDTH / 2 - 1);
        const z = THREE.MathUtils.randFloat(zStart - length, zStart);
        
        // Simple obstacle: Small box
        const obsGeo = new THREE.BoxGeometry(1, 1, 1);
        const obsMat = new THREE.MeshPhongMaterial({ color: 0x808080 });
        const obstacle = new THREE.Mesh(obsGeo, obsMat);
        obstacle.position.set(x, 0.5, z);
        pathGroup.add(obstacle);
    }
}


// --- GAME LOOP & UPDATES ---

let lastPathZ = 50; // Z coordinate of the end of the last path segment

function spawnPath() {
    // Continually generate new path segments ahead of the player
    while (lastPathZ < sled.position.z + 100) {
        const segmentLength = THREE.MathUtils.randFloat(20, 40);
        
        // Randomly decide if the segment is a gap or a solid track
        const isGap = Math.random() < 0.2; 
        
        createPathSegment(lastPathZ, segmentLength, isGap);
        lastPathZ += segmentLength;
    }
}

function updateMovement() {
    if (isGameOver) return;

    // Apply horizontal steering input
    if (keys['KeyA'] || keys['ArrowLeft']) {
        player.lateralVelocity -= player.steeringPower;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        player.lateralVelocity += player.steeringPower;
    }

    // Apply lateral friction and clamp velocity
    player.lateralVelocity *= player.lateralFriction;
    player.lateralVelocity = THREE.MathUtils.clamp(player.lateralVelocity, -player.maxLateralSpeed, player.maxLateralSpeed);

    // Horizontal position update
    sled.position.x += player.lateralVelocity;
    sled.position.x = THREE.MathUtils.clamp(sled.position.x, -TRACK_WIDTH / 2, TRACK_WIDTH / 2);
    
    // Jump/Gravity mechanics
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
    
    // Forward movement (Player is static, the world moves towards the player)
    pathGroup.position.z += player.speed;
    
    // Update score based on time/distance survived
    score += player.speed * 0.1;
}

function checkCollisions() {
    if (isGameOver) return;

    // AABB (Axis-Aligned Bounding Box) for collision checking
    const sledBox = new THREE.Box3().setFromObject(sled);
    const sledWorldPosition = new THREE.Vector3();
    sled.getWorldPosition(sledWorldPosition);

    let onTrack = false;

    // Check against path segments and obstacles
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
        }
    });
    
    // Check if player is falling in a gap and is not currently jumping high enough
    if (!onTrack && sled.position.y <= player.initialY) {
        isGameOver = true;
        document.getElementById('status').innerText = "Fell into a gap!";
        document.getElementById('status').style.color = "red";
        // Simple visual for falling
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
    // You'd also update a coin display here
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
animate();
