import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// --- الإعداد الأساسي للمشهد ---

// 1. المشهد (Scene )
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe0e0e0); // خلفية رمادية فاتحة

// 2. الكاميرا (Camera)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 3); // ضبط موضع الكاميرا

// 3. العارض (Renderer)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('avatar-container').appendChild(renderer.domElement);

// --- الإضاءة ---

// إضاءة محيطية خفيفة
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// إضاءة موجهة (مثل الشمس)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// --- التحكم بالكاميرا ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0); // اجعل الكاميرا تنظر إلى وسط الشخصية
controls.update();

// --- تحميل الشخصية الافتراضية (Avatar) ---

let mixer; // متغير لتشغيل الحركات
let model; // متغير لحفظ النموذج
const clock = new THREE.Clock();

const loader = new FBXLoader();
loader.load('models/waving.fbx', (fbx) => {
    model = fbx;
    model.scale.set(0.01, 0.01, 0.01); // تصغير النموذج لحجم مناسب
    scene.add(model);

    // إعداد مشغل الحركات
    mixer = new THREE.AnimationMixer(model);
    
    // تشغيل الحركة المدمجة في الملف
    const action = mixer.clipAction(fbx.animations[0]);
    
    // ربط الزر بتشغيل الحركة
    document.getElementById('playButton').addEventListener('click', () => {
        action.reset().play(); // أعد تشغيل الحركة من البداية
    });

}, undefined, (error) => {
    console.error(error);
});

// --- حلقة العرض (Animation Loop) ---

function animate() {
    requestAnimationFrame(animate);

    // تحديث مشغل الحركات في كل إطار
    if (mixer) {
        mixer.update(clock.getDelta());
    }

    renderer.render(scene, camera);
}

animate();

// --- التعامل مع تغيير حجم النافذة ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
