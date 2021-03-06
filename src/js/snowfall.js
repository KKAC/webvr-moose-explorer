import * as THREE from 'three'

const PARTICLE_SIZE = 0.006

export default class Snowfall {
  constructor (numParticles = 1000, height = 10, width = 10, depth = 10) {
    this.numParticles = numParticles

    this.height = height
    this.width = width
    this.depth = depth

    var textureLoader = new THREE.TextureLoader()
    textureLoader.load('assets/textures/snowflake.png', (texture) => {
      this.texture = texture
      this.system.material.uniforms.texture.value = texture
    })
    this._size = -1
    this.setParticleSize()
    window.addEventListener('resize', x => this.setParticleSize())
    this.init()
  }

  setParticleSize () {
    this._size = window.innerHeight * PARTICLE_SIZE * window.devicePixelRatio
  }

  // depends on viewport size
  getParticleSize () {
    return this._size
  }

  init () {
    const systemGeometry = new THREE.BufferGeometry()
    const systemMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { type: 'c', value: new THREE.Color(0xFFFFFF) },
        height: { type: 'f', value: this.height },
        speedV: { type: 'f', value: 0.4 },
        speedH: { type: 'f', value: 2.0 },
        elapsedTime: { type: 'f', value: 0.0 },
        radius: { type: 'f', value: 0.02 },
        scale: { type: 'f', value: 2.0 },
        size: { type: 'f', value: this._size },
        opacity: { type: 'f', value: 0.1 },
        texture: { type: 't', value: null }
      },
      vertexShader: `
        uniform float height;
        uniform float elapsedTime;
        uniform float speedV;
        uniform float speedH;
        uniform float radius;
        uniform float scale;
        uniform float size;
        attribute float uniqueness;
        void main() {
          vec3 pos = position;
          pos.x += cos((elapsedTime - position.z - uniqueness) * speedH) * radius;
          pos.y = mod(position.y - elapsedTime * speedV, height);
          pos.z += sin((elapsedTime - position.x - uniqueness) * speedH) * radius;
          vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
          gl_PointSize = size * ( scale / length( mvPosition.xyz ) );
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        uniform sampler2D texture;
        void main() {
          vec4 texColor = texture2D( texture, gl_PointCoord );
          gl_FragColor = texColor * vec4( color, opacity );
        }
      `,
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending
    })

    const positions = new Float32Array(this.numParticles * 3)
    const uniqueness = new Float32Array(this.numParticles)
    for (let i = 0; i < positions.length; i += 3) {
      // x
      positions[i] = this.randCenter(this.width)
      // y
      positions[i + 1] = Math.random() * this.height
      // z
      positions[i + 2] = this.randCenter(this.depth)
    }

    // push some uniqueness - because snowflakes...
    for (let i = 0; i < this.numParticles; i++) {
      uniqueness[i] = Math.random()
    }

    // Set attributes for shaders to access
    systemGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
    systemGeometry.addAttribute('uniqueness', new THREE.BufferAttribute(uniqueness, 1))

    // must compute bounding box for bufferGeomtry
    systemGeometry.computeBoundingSphere()

    // create particle system
    this.system = new THREE.Points(systemGeometry, systemMaterial)

    // help THREE place snow on top of transparent objects
    this.system.renderOrder = 1
    this.system.sortParticles = true
  }

  update (delta, elapsed) {
    this.system.material.uniforms.elapsedTime.value = elapsed
    this.system.material.uniforms.size.value = this.getParticleSize()
  }

  randCenter (v) {
    return (v * (Math.random() - 0.5))
  }
}
