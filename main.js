import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// --- تهيئة المتغيرات العالمية ---
let scene, camera, renderer, controls, mixer, model;
const animations = {};
const clock = new THREE.Clock();
const fbxLoader = new FBXLoader();

// --- قاموس الترجمة ---
const dictionary = {
    "تلويح": "wave",
    "مرحبا": "wave",
    "تصفيق": "clap",
    "لا": "no"
};

// --- دالة البداية الرئيسية ---
function init() {
    // 1. إعداد المشهد
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0e0e0);

    // 2. إعداد الكاميرا
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 3);

    // 3. إعداد العارض
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('avatar-container').appendChild(renderer.domElement);

    // 4. إعداد الإضاءة
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // 5. إعداد التحكم بالكاميرا
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    // 6. تحميل النموذج والحركات
    loadAvatarAndAnimations();

    // 7. ربط عناصر واجهة المستخدم
    document.getElementById('translateButton').addEventListener('click', translateTextToSign);
    window.addEventListener('resize', onWindowResize);

    // 8. بدء حلقة العرض
    animate();
}

// --- دوال التحميل ---
function loadAvatarAndAnimations() {
    fbxLoader.load('models/avatar.fbx', (fbx) => {
        model = fbx;
        model.scale.set(0.01, 0.01, 0.01);
        scene.add(model);
        mixer = new THREE.AnimationMixer(model);

        // تحميل كل الحركات بعد تحميل النموذج
        loadAnimation('models/waving_animation.fbx', 'wave');
        loadAnimation('models/clapping_animation.fbx', 'clap');
        loadAnimation('models/no_animation.fbx', 'no');

    }, undefined, (error) => console.error(error));
}

function loadAnimation(url, name) {
    fbxLoader.load(url, (fbx) => {
        animations[name] = fbx.animations[0];
        console.log(`Animation "${name}" loaded.`);
    }, undefined, (error) => console.error(error));
}

// --- دوال التحكم والترجمة ---
function playAnimation(name) {
    if (!mixer || !animations[name]) {
        console.warn(`Animation "${name}" is not ready yet.`);
        return;
    }
    mixer.stopAllAction();
    const action = mixer.clipAction(animations[name]);
    action.play();
}

function translateTextToSign() {
    const text = document.getElementById('textInput').value.trim().toLowerCase();
    const animationName = dictionary[text];

    if (animationName) {
        playAnimation(animationName);
    } else {
        console.log(`الكلمة "${text}" غير موجودة في القاموس.`);
    }
}

// --- حلقة العرض ودوال الأحداث ---
function animate() {
    requestAnimationFrame(animate);
    if (mixer) mixer.update(clock.getDelta());
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- نقطة انطلاق البرنامج ---
init();
