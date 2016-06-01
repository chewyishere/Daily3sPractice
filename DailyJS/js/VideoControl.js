(function() {
    'use strict';

    var camera, scene, renderer;
    var controls, stats;
    var element, container, videoTexture;
    var videoMesh;

    init();

    function init() {
        console.log('init');
        renderer = new THREE.WebGLRenderer();
        element = renderer.domElement;
        container = document.getElementById('container');
        container.appendChild(element);

        scene = new THREE.Scene();

        // stats = new Stats();
        // stats.domElement.style.position = 'absolute';
        // stats.domElement.style.top = '0px';
        // container.appendChild( stats.domElement );

        var sphere = new THREE.SphereGeometry( 500, 64, 64 );
        sphere.applyMatrix(new THREE.Matrix4().makeScale( -1, 1, 1 ));

        var video = document.getElementById('video');

        function bindPlay () {
            video.play();
            console.log("play");
            element.removeEventListener('touchstart', bindPlay, false);
        }


        element.addEventListener('touchstart', bindPlay, false);

        var videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;

        var videoMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture
        });

        videoMesh = new THREE.Mesh(sphere, videoMaterial);


        camera = new THREE.PerspectiveCamera(95, 1, 0.001, 700);
        camera.position.set(100, 100, 100);
        scene.add(camera);

        scene.add(videoMesh);

        controls = new THREE.OrbitControls(camera, element);
        controls.target.set(
            camera.position.x + 0.1,
            camera.position.y,
            camera.position.z
        );
        controls.enableZoom = true;
        controls.noPan = true;

        function setOrientationControls(e) {
            if (!e.alpha) {
                return;
            }

            controls = new THREE.DeviceOrientationControls(camera, true);
            controls.connect();
            controls.update();

            window.removeEventListener('deviceorientation', setOrientationControls, true);
        }

        var fullscreen_btn = document.getElementById('fullscreen');
        fullscreen_btn.addEventListener('click',fullscreen, false);

        window.addEventListener('deviceorientation', setOrientationControls, true);

        window.addEventListener('resize', resize, false);
        animate();
    }

    function resize() {
        var width = container.offsetWidth;
        var height = container.offsetHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    }

    function update() {
        resize();
        controls.update();
    }

    function render() {
        renderer.render(scene, camera);
    }

    function animate() {
        requestAnimationFrame(animate);
        update();
        render();
        //stats.update();
    }

    function fullscreen() {
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
            container.mozRequestFullScreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        }
    }
}());
