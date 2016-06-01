

THREE.Marine = function ( geometry, material, useVertexTexture ) {

  THREE.SkinnedMesh.call( this, geometry, material );

  this.States = {
    UPRIGHT: 0,
    UPRIGHT_FIRING: 1,
    KNEELING: 2,
    KNEELING_FIRING: 3,
    NONE: 4
  };

  this.currentState = this.States.UPRIGHT;
  this.nextState = this.States.NONE;

  this.enableMovement = true;

  // Axes control the +/- percentage of maximum movement
  this.rotationInputAxis = 0;
  this.forwardInputAxis = 0;

  this.forwardAxisUnitsPerSecond = 1 / 2.5;
  this.runUnitsPerSecond = 350;
  this.rotationUnitsPerSecond = 1;

  for (var i = 0; i < geometry.animations.length; ++i) {
    THREE.AnimationHandler.add( geometry.animations[i] );
  }

  this.idleAnim = new THREE.Animation( this, "idle" );
  this.walkAnim = new THREE.Animation( this, "walk_with_gun" );
  this.runAnim = new THREE.Animation( this, "run_with_gun" );
  this.kneelAnim = new THREE.Animation( this, "kneel_idle" );
  this.kneelFiringAnim = new THREE.Animation( this, "kneel_firing" );
  this.idleFiringAnim = new THREE.Animation( this, "idle_with_gun_firing" );

  // Start off with the upright blend anims playing
  this.idleAnim.play(true, 0, 1);
  this.walkAnim.play(true, 0, 0);
  this.runAnim.play(true, 0, 0);

  var forwardPressed = false;
  var isFiring = false;
  var self = this;

  //----------------------------------------------------------------------------
  this.update = function( delta ) {

    updateInputAxes( delta );
    updateMovement( delta );
    updateAnimation();

  };

  //----------------------------------------------------------------------------
  var updateInputAxes = function( delta ) {

    var axisDelta = delta * self.forwardAxisUnitsPerSecond;

    if ( forwardPressed && self.currentState === self.States.UPRIGHT ) {
      self.forwardInputAxis += axisDelta;
    } else {
      // decay linearly
      self.forwardInputAxis -= axisDelta;
    }

    self.forwardInputAxis = Math.max( self.forwardInputAxis, 0 );
    self.forwardInputAxis = Math.min( self.forwardInputAxis, 1 );

  };

  //----------------------------------------------------------------------------
  var updateMovement = function( delta ) {

    if ( self.enableMovement ) {

      if ( self.currentState === self.States.UPRIGHT ) {

        self.rotation.y += self.rotationInputAxis * delta;
        self.updateMatrix();

      }

      var forward = self.getForward().clone();
      var movement = self.forwardInputAxis * self.runUnitsPerSecond * delta;

      forward.multiplyScalar( movement );
      self.position.add( forward );

    }

  };

  //----------------------------------------------------------------------------
  var updateAnimation = function() {

    if ( self.nextState !== self.States.NONE ) {

      updateAnimationTransitions();

    } else {

      // Apply current state logic
      if ( self.currentState === self.States.UPRIGHT ) {

        // map values from [0,1] --> [idle, walk, run] --> [0, 0.5, 1]
        if ( self.forwardInputAxis > 0.5 ) {

          var alpha = Math.abs( ( self.forwardInputAxis - 0.5 ) / 0.5 );
          self.idleAnim.weight = 0;
          self.walkAnim.weight = 1 - alpha;
          self.runAnim.weight = alpha;

        } else {

          var alpha = Math.abs( self.forwardInputAxis / 0.5 );
          self.idleAnim.weight = 1 - alpha;
          self.walkAnim.weight = alpha;
          self.runAnim.weight = 0;

        }

      }
    }

  };

  //----------------------------------------------------------------------------
  var updateAnimationTransitions = function() {

    // Apply transitions
    switch ( self.currentState ) {

      case self.States.UPRIGHT: {

        if ( self.nextState === self.States.KNEELING ) {

          self.forwardInputAxis = 0;

          self.idleAnim.stop( 0.3 );
          self.walkAnim.stop( 0.3 );
          self.runAnim.stop( 0.3 );

          self.kneelAnim.play(true, 0, 1, 0.3);

          self.currentState = self.nextState;

        } else if ( self.nextState === self.States.UPRIGHT_FIRING ) {

          self.forwardInputAxis = 0;

          self.idleAnim.stop( 0.1 );
          self.walkAnim.stop( 0.1 );
          self.runAnim.stop( 0.1 );

          self.idleFiringAnim.play(false, 0, 1, 0.1);

          var stopFiringBeginTime = (self.idleFiringAnim.data.length - 0.3) * 1000;

          setTimeout( function() {
            if ( self.nextState === self.States.NONE ) {
              self.nextState = self.States.UPRIGHT;
            }

          }, stopFiringBeginTime );

          self.currentState = self.nextState;

        }

        break;
      }
      case self.States.UPRIGHT_FIRING: {

        if ( self.nextState === self.States.UPRIGHT ) {

          self.idleFiringAnim.stop( 0.3 );
          self.idleAnim.play(true, 0, 1, 0.3 );
          self.walkAnim.play(true, 0, 0 );
          self.runAnim.play(true, 0, 0 );

          self.currentState = self.nextState;

        }

        break;
      }
      case self.States.KNEELING: {

        if ( self.nextState === self.States.UPRIGHT ) {
          self.kneelAnim.stop( 0.3 );

          self.idleAnim.play(true, 0, 0, 0.3);
          self.walkAnim.play(true, 0, 0, 0.3);
          self.runAnim.play(true, 0, 0, 0.3);

          self.currentState = self.nextState;

        } else if ( self.nextState === self.States.KNEELING_FIRING ) {

          self.kneelAnim.stop( 0.2 );

          // hack in case firing is still fading out, force it off so it will play
          self.kneelFiringAnim.stop(0);

          self.kneelFiringAnim.play( false, 0, 1, 0.2 );
          self.currentState = self.nextState;

          var stopFiringBeginTime = (self.kneelFiringAnim.data.length - 0.3) * 1000;

          setTimeout( function() {
            if ( self.nextState === self.States.NONE ) {
              self.nextState = self.States.KNEELING;
            }

          }, stopFiringBeginTime );

        }
        break;
      }
      case self.States.KNEELING_FIRING: {

        if ( self.nextState === self.States.KNEELING ) {

          self.kneelFiringAnim.stop( 0.2 );
          self.kneelAnim.play( true, 0, 1, 0.2 );
          self.currentState = self.nextState;

        }
        break;
      }

    }

    self.nextState = self.States.NONE;

  };

  //----------------------------------------------------------------------------
  var onKeyDown = function( e ) {

    if ( e.keyCode === 87 || e.keyIdentifier === 'Up' )
      forwardPressed = true;
    else if ( e.keyCode === 68 || e.keyIdentifier === 'Right' ) {
      this.rotationInputAxis = -1;
    }
    else if ( e.keyCode === 65 || e.keyIdentifier === 'Left' )
      this.rotationInputAxis = 1;
    else if ( e.keyCode === 67 || e.keyCode === 16 ) {

      if ( this.currentState === this.States.UPRIGHT )
        this.nextState = this.States.KNEELING;
      else if ( this.currentState === this.States.KNEELING )
        this.nextState = this.States.UPRIGHT;
    } else if ( e.keyCode === 32 ) {

      if ( self.currentState === self.States.KNEELING ) {
        self.nextState = self.States.KNEELING_FIRING;
      } else if ( self.currentState === self.States.UPRIGHT ) {
        self.nextState = self.States.UPRIGHT_FIRING;
      }
    }

  }

  //----------------------------------------------------------------------------
  var onKeyUp = function( e ) {

    if ( e.keyCode === 87 || e.keyIdentifier === 'Up' )
      forwardPressed = false;
    else if ( e.keyCode === 68  || e.keyIdentifier === 'Right' )
      this.rotationInputAxis = 0;
    else if ( e.keyCode === 65 || e.keyIdentifier === 'Left' )
      this.rotationInputAxis = 0;

  }

  //----------------------------------------------------------------------------
  var onMouseDown = function( e ) {


  }

  //----------------------------------------------------------------------------
  var bind = function( scope, func ) {
    return function() {
      func.apply( scope, arguments );
    }
  }

  window.addEventListener( 'keydown', bind( this, onKeyDown ), false );
  window.addEventListener( 'keyup', bind( this, onKeyUp ), false );
  window.addEventListener( 'mousedown', bind( this, onMouseDown ), false );

};

//------------------------------------------------------------------------------
THREE.Marine.prototype = Object.create( THREE.SkinnedMesh.prototype );

THREE.Marine.prototype.getForward = function() {

  var forward = new THREE.Vector3();

  return function() {

    // pull the character's forward basis vector out of the matrix
    forward.set(
      -this.matrix.elements[ 8 ],
      -this.matrix.elements[ 9 ],
      -this.matrix.elements[ 10 ]
    );

    return forward;
  }

}();

