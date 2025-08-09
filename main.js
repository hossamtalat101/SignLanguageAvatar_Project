import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// --- المتغيرات العالمية ---
let scene, camera, renderer, controls, model;
const animationClips = {}; // << جديد: لتخزين كل بيانات الحركات المحملة
let currentPlayingClip = null;
let currentFrame = 0;
let isPlaying = false;
const initialBoneQuaternions = {};

// --- قاموس الربط (لم يتغير) ---
const boneMap = {
    'mixamorigLeftHandThumb1': { start: 0, end: 1 }, 'mixamorigLeftHandThumb2': { start: 1, end: 2 }, 'mixamorigLeftHandThumb3': { start: 2, end: 3 }, 'mixamorigLeftHandThumb4': { start: 3, end: 4 },
    'mixamorigLeftHandIndex1': { start: 0, end: 5 }, 'mixamorigLeftHandIndex2': { start: 5, end: 6 }, 'mixamorigLeftHandIndex3': { start: 6, end: 7 }, 'mixamorigLeftHandIndex4': { start: 7, end: 8 },
    'mixamorigLeftHandMiddle1': { start: 0, end: 9 }, 'mixamorigLeftHandMiddle2': { start: 9, end: 10 }, 'mixamorigLeftHandMiddle3': { start: 10, end: 11 }, 'mixamorigLeftHandMiddle4': { start: 11, end: 12 },
    'mixamorigLeftHandRing1': { start: 0, end: 13 }, 'mixamorigLeftHandRing2': { start: 13, end: 14 }, 'mixamorigLeftHandRing3': { start: 14, end: 15 }, 'mixamorigLeftHandRing4': { start: 15, end: 16 },
    'mixamorigLeftHandPinky1': { start: 0, end: 17 }, 'mixamorigLeftHandPinky2': { start: 17, end: 18 }, 'mixamorigLeftHandPinky3': { start: 18, end: 19 }, 'mixamorigLeftHandPinky4': { start: 19, end: 20 },
};

// --- دالة البداية الرئيسية (Init) ---
function init() {
    // ... (جزء الإعداد لم يتغير) ...
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0e0e0);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 3);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('avatar-container').appendChild(renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    
    loadAvatar();
    
    // --- الجزء الجديد: ربط الأزرار بشكل ديناميكي ---
    document.querySelectorAll('.action-button').forEach(button => {
        button.addEventListener('click', () => {
            const animationName = button.dataset.animation;
            playAnimation(animationName);
        });
    });

    window.addEventListener('resize', onWindowResize);
    animate();
}

// --- دوال التحميل (محدثة) ---
function loadAvatar() {
    const fbxLoader = new FBXLoader();
    fbxLoader.load('models/avatar.fbx', (fbx) => {
        model = fbx;
        model.scale.set(0.01, 0.01, 0.01);
        scene.add(model);
        
        const skeleton = model.children[1].skeleton;
        for (const boneName in boneMap) {
            const bone = skeleton.getBoneByName(boneName);
            if (bone) {
                initialBoneQuaternions[boneName] = bone.quaternion.clone();
            }
        }
        console.log("Avatar loaded.");
        
        // --- الجزء الجديد: تحميل كل الحركات بعد تحميل النموذج ---
        preloadAnimations();
    }, undefined, (error) => console.error(error));
}

function preloadAnimations() {
    const animationsToLoad = ['clear_wave_motion', 'yes_sign']; // قائمة بكل الحركات
    animationsToLoad.forEach(name => {
        fetch(`models/${name}.json`)
            .then(response => response.json())
            .then(data => {
                animationClips[name] = data;
                console.log(`Animation "${name}" loaded.`);
            })
            .catch(error => console.error(`Failed to load animation ${name}:`, error));
    });
}

// --- دوال التحكم والتشغيل (محدثة) ---
function playAnimation(name) {
    if (!animationClips[name]) {
        alert(`Animation "${name}" is not loaded yet.`);
        return;
    }
    currentPlayingClip = animationClips[name];
    currentFrame = 0;
    isPlaying = true;
}

function updateAvatarPose() {
    if (!isPlaying || !model || !currentPlayingClip || currentFrame >= currentPlayingClip.length) {
        isPlaying = false;
        return;
    }

    const frameData = currentPlayingClip[currentFrame];
    const skeleton = model.children[1].skeleton;

    for (const boneName in boneMap) {
        const bone = skeleton.getBoneByName(boneName);
        if (bone && initialBoneQuaternions[boneName]) {
            const mapping = boneMap[boneName];
            const startLandmark = frameData[mapping.start];
            const endLandmark = frameData[mapping.end];

            const startVec = new THREE.Vector3(startLandmark.x, 1 - startLandmark.y, startLandmark.z);
            const endVec = new THREE.Vector3(endLandmark.x, 1 - endLandmark.y, endLandmark.z);
            const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();

            const parentBone = bone.parent;
            const parentInverse = new THREE.Matrix4().invert(parentBone.matrixWorld);
            const localDirection = direction.clone().applyMatrix4(parentInverse);

            const defaultDirection = new THREE.Vector3(0, 1, 0);
            const rotationDelta = new THREE.Quaternion().setFromUnitVectors(defaultDirection, localDirection);

            const finalQuaternion = initialBoneQuaternions[boneName].clone().multiply(rotationDelta);
            bone.quaternion.slerp(finalQuaternion, 0.9);
        }
    }

    currentFrame++;
}

// --- حلقة العرض ودوال الأحداث (محدثة) ---
function animate() {
    requestAnimationFrame(animate);
    if (isPlaying) {
        updateAvatarPose();
    }
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
