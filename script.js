// --- GAME LOGIC VARIABLES ---
let money = 0;
let moneyPerClick = 1;
const multiplierCost = 10;
let multiplierLevel = 0;

// --- THREE.JS VARIABLES ---
let scene, camera, renderer, clickTarget;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// --- GAME LOGIC FUNCTIONS ---

function updateDisplay() {
    document.getElementById('moneyDisplay').innerText = money.toFixed(0);
    document.getElementById('mPCDisplay').innerText = moneyPerClick.toFixed(0);
    document.getElementById('multiplierLevel').innerText = multiplierLevel;
    
    let currentCost = multiplierCost * (multiplierLevel + 1);
    document.getElementById('multiplierCost').innerText = currentCost.toFixed(0);
}

function gainMoney() {
    money += moneyPerClick;
    updateDisplay();

    // Visual feedback: briefly scale up the 3D target
    if (clickTarget) {
        clickTarget.scale.set(1.1, 1.1, 1.1);
        setTimeout(() => clickTarget.scale.set(1, 1, 1), 50);
    }
}

function buyMultiplier() {
    let currentCost = multiplierCost * (multiplierLevel + 1);
    if (money >= currentCost) {
        money -= currentCost;
        moneyPerClick += 1;
        multiplierLevel += 1;
        updateDisplay();
    } else {
        console.log("Not enough money!");
    }
}

// Listen for 'E' key press
document.addEventListener('keydown', (event) => {
    if (event.key === 'e' || event.key === 'E') {
        gainMoney();
    }
});


// --- THREE.JS SETUP FUNCTIONS ---

function init3D() {
    // 1. Scene, Camera, Renderer Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010); // Dark background
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 2. Create the 3D Click Target (A Sphere)
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0xff44aa, shininess: 100 }); // Pink, shiny material
    clickTarget = new THREE.Mesh(geometry, material);
    scene.add(clickTarget);
    
    // 3. Lighting
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    const ambientLight = new THREE.AmbientLight(0x404040, 2); 
    scene.add(ambientLight);

    // 4. Listeners
    window.addEventListener('click', handle3DClick);
    window.addEventListener('resize', onWindowResize, false);
}

// 5. Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Make the sphere rotate continuously
    clickTarget.rotation.x += 0.005;
    clickTarget.rotation.y += 0.01;

    renderer.render(scene, camera);
}

// 6. Handle Mouse Click (Raycasting)
function handle3DClick(event) {
    // Convert click coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check if the ray intersects the 3D object
    const intersects = raycaster.intersectObjects([clickTarget]);

    if (intersects.length > 0) {
        gainMoney(); // Trigger the money function!
    }
}

// 7. Handle Window Resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


// --- START GAME ---
init3D();
animate();
updateDisplay();
