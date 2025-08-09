import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// --- المتغيرات العالمية ---
let scene, camera, renderer, controls, model;
let recordedAnimationData = null;
let currentFrame = 0;
let isPlayingRecorded = false;
const initialBoneQuaternions = {}; // << جديد: لتخزين الدوران الأولي للعظام

// --- قاموس الربط (نفسه) ---
const boneMap = {
    'mixamorigLeftHandThumb1': { start: 0, end: 1 }, 'mixamorigLeftHandThumb2': { start: 1, end: 2 }, 'mixamorigLeftHandThumb3': { start: 2, end: 3 }, 'mixamorigLeftHandThumb4': { start: 3, end: 4 },
    'mixamorigLeftHandIndex1': { start: 0, end: 5 }, 'mixamorigLeftHandIndex2': { start: 5, end: 6 }, 'mixamorigLeftHandIndex3': { start: 6, end: 7 }, 'mixamorigLeftHandIndex4': { start: 7, end: 8 },
    'mixamorigLeftHandMiddle1': { start: 0, end: 9 }, 'mixamorigLeftHandMiddle2': { start: 9, end: 10 }, 'mixamorigLeftHandMiddle3': { start: 10, end: 11 }, 'mixamorigLeftHandMiddle4': { start: 11, end: 12 },
    'mixamorigLeftHandRing1': { start: 0, end: 13 }, 'mixamorigLeftHandRing2': { start: 13, end: 14 }, 'mixamorigLeftHandRing3': { start: 14, end: 15 }, 'mixamorigLeftHandRing4': { start: 15, end: 16 },
    'mixamorigLeftHandPinky1': { start: 0, end: 17 }, 'mixamorigLeftHandPinky2': { start: 17, end: 18 }, 'mixamorigLeftHandPinky3': { start: 18, end: 19 }, 'mixamorigLeftHandPinky4': { start: 19, end: 20 },
};

// --- دالة تحميل النموذج (محدثة) ---
function loadAvatar() {
    const fbxLoader = new FBXLoader();
    fbxLoader.load('models/avatar.fbx', (fbx) => {
        model = fbx;
        model.scale.set(0.01, 0.01, 0.01);
        scene.add(model);
        
        // --- الجزء الجديد: حفظ الدوران الأولي لكل عظمة ---
        const skeleton = model.children[1].skeleton;
        for (const boneName in boneMap) {
            const bone = skeleton.getBoneByName(boneName);
            if (bone) {
                initialBoneQuaternions[boneName] = bone.quaternion.clone();
            }
        }
        console.log("Avatar loaded and initial bone rotations captured.");
    }, undefined, (error) => console.error(error));
}

// --- دالة تحديث الشخصية (النسخة النهائية والمحسنة) ---
function updateAvatarFromRecordedData() {
    if (!isPlayingRecorded || !model || !recordedAnimationData || currentFrame >= recordedAnimationData.length) {
        isPlayingRecorded = false;
        return;
    }

    const frameData = recordedAnimationData[currentFrame];
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

            // --- التعديل الأهم ---
            // نطبق الدوران الجديد على الدوران الأولي للعظمة، بدلاً من استبداله بالكامل
            const finalQuaternion = initialBoneQuaternions[boneName].clone().multiply(rotationDelta);

            // تطبيق الدوران النهائي بسلاسة
            bone.quaternion.slerp(finalQuaternion, 0.9); // 0.9 لاستجابة سريعة وطبيعية
        }
    }

    currentFrame++;
}

// --- بقية الكود (لم يتغير) ---
function init() {
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
    controls.update();
    loadAvatar();
    loadRecordedAnimation('models/clear_wave_motion.json'); 
    document.getElementById('playRecordedButton').addEventListener('click', playRecordedAnimation);
    window.addEventListener('resize', onWindowResize);
    animate();
}
function loadRecordedAnimation(url) { fetch(url).then(response => { if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); } return response.json(); }).then(data => { recordedAnimationData = data; console.log(`Recorded animation loaded with ${data.length} frames.`); }).catch(error => console.error('Error loading recorded animation:', error)); }
function playRecordedAnimation() { if (!recordedAnimationData) { alert("لم يتم تحميل بيانات الحركة المسجلة بعد."); return; } isPlayingRecorded = true; currentFrame = 0; }
function animate() { requestAnimationFrame(animate); if (isPlayingRecorded) { updateAvatarFromRecordedData(); } controls.update(); renderer.render(scene, camera); }
function onWindowResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }
init();
