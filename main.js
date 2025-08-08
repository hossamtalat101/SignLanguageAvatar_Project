import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// --- تهيئة المتغيرات العالمية ---
let scene, camera, renderer, controls, model;
let recordedAnimationData = null; // لتخزين بيانات الحركة المسجلة
let currentFrame = 0;
let isPlayingRecorded = false;
const clock = new THREE.Clock();

// --- قاموس الربط بين نقاط MediaPipe وعظام Mixamo ---
// هذا هو الجزء السحري. قد تحتاج لتعديله حسب نموذجك.
const boneMap = {
    // المعصم
    0: 'mixamorigHips', // سنستخدم الورك كنقطة مرجعية رئيسية للحركة

    // الإبهام
    1: 'mixamorigLeftHandThumb1',
    2: 'mixamorigLeftHandThumb2',
    3: 'mixamorigLeftHandThumb3',
    4: 'mixamorigLeftHandThumb4',

    // السبابة
    5: 'mixamorigLeftHandIndex1',
    6: 'mixamorigLeftHandIndex2',
    7: 'mixamorigLeftHandIndex3',
    8: 'mixamorigLeftHandIndex4',

    // الوسطى
    9: 'mixamorigLeftHandMiddle1',
    10: 'mixamorigLeftHandMiddle2',
    11: 'mixamorigLeftHandMiddle3',
    12: 'mixamorigLeftHandMiddle4',

    // البنصر
    13: 'mixamorigLeftHandRing1',
    14: 'mixamorigLeftHandRing2',
    15: 'mixamorigLeftHandRing3',
    16: 'mixamorigLeftHandRing4',

    // الخنصر
    17: 'mixamorigLeftHandPinky1',
    18: 'mixamorigLeftHandPinky2',
    19: 'mixamorigLeftHandPinky3',
    20: 'mixamorigLeftHandPinky4',
};


// --- دالة البداية الرئيسية ---
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
    loadRecordedAnimation('models/wave_hand_data.json'); // تأكد من أن الاسم يطابق اسم ملفك

    document.getElementById('playRecordedButton').addEventListener('click', playRecordedAnimation);
    window.addEventListener('resize', onWindowResize);

    animate();
}

// --- دوال التحميل ---
function loadAvatar() {
    const fbxLoader = new FBXLoader();
    fbxLoader.load('models/avatar.fbx', (fbx) => {
        model = fbx;
        model.scale.set(0.01, 0.01, 0.01);
        scene.add(model);
        console.log("Avatar loaded. Bones:", model.children[1].skeleton.bones.map(b => b.name));
    }, undefined, (error) => console.error(error));
}

function loadRecordedAnimation(url) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            recordedAnimationData = data;
            console.log(`Recorded animation loaded with ${data.length} frames.`);
        })
        .catch(error => console.error('Error loading recorded animation:', error));
}

// --- دوال التحكم بالحركة المسجلة ---
function playRecordedAnimation() {
    if (!recordedAnimationData) {
        alert("لم يتم تحميل بيانات الحركة المسجلة بعد.");
        return;
    }
    isPlayingRecorded = true;
    currentFrame = 0;
}

function updateAvatarFromRecordedData() {
    if (!isPlayingRecorded || !model || !recordedAnimationData || currentFrame >= recordedAnimationData.length) {
        isPlayingRecorded = false;
        return;
    }

    const frameData = recordedAnimationData[currentFrame];
    const bones = model.children[1].skeleton.bones;

    // الحصول على موضع المعصم المرجعي من البيانات
    const wristReference = new THREE.Vector3(frameData[0].x, 1 - frameData[0].y, frameData[0].z);

    // تحديث دوران العظام
    for (let i = 1; i < frameData.length; i++) {
        const boneName = boneMap[i];
        if (boneName) {
            const bone = bones.find(b => b.name === boneName);
            if (bone) {
                const landmark = frameData[i];
                const targetPosition = new THREE.Vector3(landmark.x, 1 - landmark.y, landmark.z);
                
                // حساب الاتجاه من المعصم إلى نقطة المفصل
                const direction = new THREE.Vector3().subVectors(targetPosition, wristReference).normalize();
                
                // حساب الدوران لتوجيه العظمة
                const quaternion = new THREE.Quaternion();
                const defaultDirection = new THREE.Vector3(0, 1, 0); // الاتجاه الافتراضي للعظمة
                quaternion.setFromUnitVectors(defaultDirection, direction);
                
                // تطبيق الدوران على العظمة
                // bone.quaternion.slerp(quaternion, 0.1); // استخدام slerp لحركة أنعم
                 bone.quaternion.copy(quaternion);
            }
        }
    }

    currentFrame++;
}


// --- حلقة العرض ودوال الأحداث ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (isPlayingRecorded) {
        updateAvatarFromRecordedData();
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- نقطة انطلاق البرنامج ---
init();
