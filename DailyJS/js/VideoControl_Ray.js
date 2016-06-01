(function() {
    'use strict';

    var camera, scene, renderer, controls, element, container, videoTexture;
    var videoMesh, raycaster, hoveringObject, selectedModal, selectedPoint;

    var interactableObjects = [],
        points_array = [], 
        modals_array = [];
    
    var Points = new THREE.Object3D(),
        mouse = new THREE.Vector2(),
        onClickPosition = new THREE.Vector2();
        
    var radius = 50, // distance of thumbnails
        numOfPoints = 3;  // number of thumbnails

    var video = $('video'),
        stop = $('close'),
        start =  $('open'),
        imgModal = $('modal-img'),
        videoModal= $('modal-video'),
        textModal =  $('modal-text'),
        loader = $('loader');
    

    loadVideo();  
    
    // check if one of the element selecte, if true, open up a $(div) for each element
    function $( id ) {
        return document.getElementById( id );
    }

    function init() {
        scene = new THREE.Scene();

        renderer = new THREE.WebGLRenderer();
        element = renderer.domElement;
        container = $("container");
        container.appendChild(element);

        modals_array = [imgModal, videoModal, textModal];
        
        //create 360 Sphere container
        var sphere = new THREE.SphereGeometry( 500, 64, 64 );
        sphere.applyMatrix(new THREE.Matrix4().makeScale( -1, 1, 1 ));

        //initualize video stats
        video.pause();

        function bindPlay () {
            video.play();
            start.removeEventListener('touchstart', bindPlay, false);
        }

        function bindStop () {
            video.pause();
            stop.removeEventListener('touchstart', bindStop, false);
        }


        start.addEventListener('touchstart', bindPlay, false);
        start.addEventListener('click', bindPlay, false);

        stop.addEventListener('touchstart', bindStop, false);
        stop.addEventListener('click', bindStop, false);

        //video texture of 360 env map
        var videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;

        var videoMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture
        });

        videoMesh = new THREE.Mesh(sphere, videoMaterial);
        placeLabels();

        //set up camera
        camera = new THREE.PerspectiveCamera(70, 1, 0.001, 700);
        camera.position.set(0,0,0);
        scene.add(camera);

        scene.add(videoMesh);
        
        //orbit control for website
        controls = new THREE.OrbitControls(camera, element);
        controls.target.set(
            camera.position.x + 0.1,
            camera.position.y,
            camera.position.z
        );
        controls.enableZoom = true;
        controls.noPan = true;

        //device orientation control for mobile
        function setOrientationControls(e) {
            if (!e.alpha) {
                return;
            }

            controls = new THREE.DeviceOrientationControls(camera, true);
            controls.connect();
            controls.update();

            window.removeEventListener('deviceorientation', setOrientationControls, true);
            container.removeEventListener( 'mousemove', onMouseMove, false);
            element.addEventListener( 'touchmove', onDocumentTouchMove, false )
            element.addEventListener( 'touchstart', onDocumentTouchStart, false )

        }

        window.addEventListener('deviceorientation', setOrientationControls, true);
        container.addEventListener( 'mousemove', onMouseMove, false);
        window.addEventListener('resize', resize, false);

        animate();
        raycaster = new THREE.Raycaster();

    }

    //quick formula to add mesh
    function easyMesh(src) {
        var map = new THREE.TextureLoader().load( src );
            var material = new THREE.SpriteMaterial( { map: map,  color: 0xffffff, fog: true } );
            var sprite = new THREE.Sprite( material );
        
        return sprite;
    }

    //create sprtie points as thumbnail lables
    function createPoints(id,x,y,z){

        var src = ["img/shark.png", 
                   "img/shark2.png", 
                   "img/shark3.png"];

        var point = easyMesh(src[id]);
            point.scale.set(10,10);
            point.name = 'point'+id;
            point.position.set(x,y,z);

        Points.add(point);
        points_array.push(point);

        interactableObjects.push(point);
    }

    //assign tumbnail labels positions surround the camera
    function placeLabels(){

         for (var i = 0; i < numOfPoints; i++) {

            var vertex = new THREE.Vector3();

            vertex.y = 30;
            vertex.x = radius * Math.cos(30 * i);
            vertex.z = radius * Math.sin(30 * i);

            createPoints(i, vertex.x, vertex.y, vertex.z);
        }

        Points.name = "Points";
        scene.add(Points);
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
    }


    function onDocumentTouchMove( event ) {

        if ( event.touches.length === 1 ) {

            event.preventDefault();

            onClickPosition.x = event.targetTouches[0].pageX;
            onClickPosition.y = event.targetTouches[0].pageY;

            var array = getMousePosition( container, event.targetTouches[0].pageX, event.targetTouches[0].pageY);
            onClickPosition.fromArray( array );

            //shoot raycasting while touching the screen
            raycaster_update();

        } 

    }

    function onDocumentTouchStart( event ) {

        if ( event.touches.length === 1 ) {

            event.preventDefault();
            
            onClickPosition.x = event.targetTouches[0].pageX;
            onClickPosition.y = event.targetTouches[0].pageY;

            var array = getMousePosition( container, event.targetTouches[0].pageX, event.targetTouches[0].pageY);
            onClickPosition.fromArray( array );

            raycaster_update();
            
        }
    }


    function onMouseMove( evt ) {

        evt.preventDefault();

        var array = getMousePosition( container, evt.clientX, evt.clientY );
        onClickPosition.fromArray( array );
        raycaster_update();
    }

    function raycaster_update(){

        //get intersections of raycaster based on mouse/touch position
        var intersects = getIntersects( onClickPosition, interactableObjects );


        if ( intersects.length > 0 && hoveringObject != intersects[0].object) {
           

            hoveringObject = intersects[ 0 ].object;

            console.log("hovering on " + hoveringObject.name);
            
            document.body.style.cursor = 'pointer';

            //when hovering on thumbnails: enable modal interaction
            element.addEventListener('click', onClickShow, false);
            element.addEventListener('touchend', onClickShow, false);
           
        }  else if (intersects.length == 0 && hoveringObject != null) {

            hoveringObject = null;
           
            document.body.style.cursor = 'auto';

            //when hovering off: disable modal interaction
            element.removeEventListener('click', onClickShow, false);
            element.removeEventListener('touchend', onClickShow, false);

        } 
        //update label status(animation) accroding to raycaster result
        update_labels();
    };

    //formula of getting mouse/touch position on the screen
    var getMousePosition = function ( dom, x, y ) {

        var rect = dom.getBoundingClientRect();
        return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

    };

    //formula of getting raycaster intersection
    var getIntersects = function ( point, objects ) {

        mouse.set( ( point.x * 2 ) - 1, - ( point.y * 2 ) + 1 );

        //shot out ray from mouse/touch position to the world following camera
        raycaster.setFromCamera( mouse, camera );

        return raycaster.intersectObjects( objects );

    };


    function update_labels(){

       for( var i =0; i < points_array.length; i++){

            if(hoveringObject != null && hoveringObject == points_array[i]) {
              selectedPoint = points_array[i]
              
              selectedPoint.scale.set(15,15,15); // hovering effect

              selectedModal = modals_array[i]; 
              
             
            } else {

              points_array[i].scale.set(10,10,10);  
         
            }
        }
    }

   //show modal
    function onClickShow(event){
        event.preventDefault();
        selectedModal.classList.toggle("show");

        //when modal is showing: enable hide-modal interaction
        selectedModal.addEventListener('click', onClickHide, false);
        selectedModal.addEventListener('touchend', onClickHide, false);

        return false;

    }

    //hide modal
    function onClickHide(event){
        event.preventDefault();

        selectedPoint.scale.set(10,10,10);
        if (selectedModal.classList.contains("show")){
            selectedModal.classList.remove("show");
            
        }else{
            return;
        }

        selectedModal.removeEventListener('click', onClickHide, false);
        selectedModal.removeEventListener('touchend', onClickHide, false);
            
        return false;
    }


    function loadVideo(){
    //create the progress-meter element
        
        loader.classList.add("loader--show");

        // close loader when video are ready to play entirely 
        // for chrome/Firefox use "canplaythrough", not supported for Safari
        // https://www.sitepoint.com/essential-audio-and-video-events-for-html5/

        video.addEventListener('canplaythrough', function(){
            console.log('done loading');

            loader.classList.remove("loader--show");
            
            init();
        });
        
    }


}());
