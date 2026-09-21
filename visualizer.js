// GemCAD Visualizer - Three.js based 3D gem visualization
class GemVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.gem = null;
    this.autoRotate = false;
    this.rotationSpeed = 0;

    this.initScene();
    this.setupEventListeners();
  }

  initScene() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2826);
    this.scene.fog = new THREE.Fog(0x1a2826, 100, 1000);

    // Camera setup
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas, 
      antialias: true, 
      alpha: true 
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 5, 5);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, -5, -5);
    this.scene.add(directionalLight2);

    // Mouse controls - basic orbit
    this.setupControls();

    // Animation loop
    this.animate();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupControls() {
    // Simple mouse controls for rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isDragging && this.gem) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        this.gem.rotation.y += deltaX * 0.01;
        this.gem.rotation.x += deltaY * 0.01;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Mouse wheel for zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.position.z += e.deltaY * 0.005;
      this.camera.position.z = Math.max(2, Math.min(15, this.camera.position.z));
    });
  }

  createSampleGem() {
    // Create a simple emerald-cut gem as placeholder
    if (this.gem) {
      this.scene.remove(this.gem);
    }

    const geometry = new THREE.BufferGeometry();

    // Simple gem vertices (emerald cut approximation)
    const vertices = new Float32Array([
      // Top facets
      0, 1, 0,      // 0: apex
      0.5, 0.8, -0.2,
      0.5, 0.8, 0.2,
      -0.5, 0.8, -0.2,
      -0.5, 0.8, 0.2,
      
      // Upper facets
      0.8, 0.5, -0.3,
      0.8, 0.5, 0.3,
      -0.8, 0.5, -0.3,
      -0.8, 0.5, 0.3,

      // Middle girdle
      1, 0, -0.4,
      1, 0, 0.4,
      -1, 0, -0.4,
      -1, 0, 0.4,

      // Lower facets
      0.8, -0.5, -0.3,
      0.8, -0.5, 0.3,
      -0.8, -0.5, -0.3,
      -0.8, -0.5, 0.3,

      // Culet
      0, -1, 0,
    ]);

    const indices = new Uint32Array([
      0, 1, 2,
      0, 3, 4,
      0, 2, 4,
      0, 1, 3,
      // Upper facets
      1, 5, 6,
      1, 2, 6,
      3, 7, 8,
      3, 4, 8,
      // Girdle
      5, 9, 10,
      6, 10, 11,
      7, 11, 12,
      8, 12, 13,
      // Lower facets
      9, 13, 14,
      10, 14, 15,
      11, 15, 16,
      12, 16, 17,
      // Culet
      13, 17, 14,
      14, 17, 15,
      15, 17, 16,
      16, 17, 13,
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x82c7a3,
      metalness: 0.2,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });

    this.gem = new THREE.Mesh(geometry, material);
    this.scene.add(this.gem);

    // Add wireframe for reference
    const wireframe = new THREE.Mesh(geometry, new THREE.LineBasicMaterial({ color: 0xdfb96b, wireframe: true }));
    this.gem.add(wireframe);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.gem && this.autoRotate) {
      this.gem.rotation.y += (this.rotationSpeed / 100) * 0.02;
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  loadGemCADFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        this.parseGemCAD(content);
      } catch (error) {
        console.error('Error loading GemCAD file:', error);
        alert('Error loading file. Please ensure it is a valid GemCAD format.');
      }
    };
    reader.readAsText(file);
  }

  parseGemCAD(content) {
    // Basic GemCAD parser
    // GemCAD format typically includes:
    // - Gem name/description
    // - Reference sphere diameter
    // - Facet definitions with angles and crown/pavilion info
    
    console.log('Parsing GemCAD file...');
    
    // Update stone info panel
    const stoneInfo = document.querySelector('#stone-info');
    stoneInfo.innerHTML = `
      <div class="spec-row">
        <strong>Status:</strong>
        <span>GemCAD file loaded</span>
      </div>
      <p class="placeholder">Full facet parsing coming soon. Three.js renderer ready for implementation.</p>
    `;

    this.createSampleGem();
  }

  loadCatalogStone(stoneId) {
    const stoneSpecs = {
      'emerald-001': { name: 'Columbian Emerald', weight: '12.4ct', cut: 'Radiant', color: 0x82c7a3 },
      'sapphire-001': { name: 'Ceylon Sapphire', weight: '8.7ct', cut: 'Cushion', color: 0x67bbca },
      'diamond-001': { name: 'Champagne Diamond', weight: '5.2ct', cut: 'Oval', color: 0xfff1c7 },
      'ruby-001': { name: 'Burmese Ruby', weight: '3.5ct', cut: 'Oval', color: 0xe74c3c },
      'topaz-001': { name: 'Imperial Topaz', weight: '9.1ct', cut: 'Fantasy', color: 0xf5b041 },
      'aquamarine-001': { name: 'Aquamarine', weight: '15.3ct', cut: 'Step', color: 0x6dd5ed },
    };

    const spec = stoneSpecs[stoneId];
    if (spec) {
      this.createGemWithColor(spec.color);
      
      const stoneInfo = document.querySelector('#stone-info');
      stoneInfo.innerHTML = `
        <div class="spec-row">
          <strong>Name:</strong>
          <span>${spec.name}</span>
        </div>
        <div class="spec-row">
          <strong>Weight:</strong>
          <span>${spec.weight}</span>
        </div>
        <div class="spec-row">
          <strong>Cut:</strong>
          <span>${spec.cut}</span>
        </div>
        <p style="margin-top: 1rem; font-size: 0.8rem; color: #a9b3ac;">
          Rotate with mouse • Zoom with scroll wheel • Load GemCAD for facet data
        </p>
      `;
    }
  }

  createGemWithColor(color) {
    if (this.gem) {
      this.scene.remove(this.gem);
    }

    const geometry = new THREE.IcosahedronGeometry(1, 4);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.2,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });

    this.gem = new THREE.Mesh(geometry, material);
    this.scene.add(this.gem);
  }

  resetView() {
    if (this.gem) {
      this.gem.rotation.set(0, 0, 0);
    }
    this.camera.position.set(0, 0, 5);
    this.autoRotate = false;
  }

  setBrightness(value) {
    const intensity = value / 100;
    this.scene.children.forEach(child => {
      if (child.isLight) {
        child.intensity *= intensity / 0.6;
      }
    });
  }
}

// Initialize visualizer when page loads
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('#gem-canvas');
  const loading = document.querySelector('#loading');
  
  const visualizer = new GemVisualizer(canvas);
  
  loading.style.display = 'none';

  // File upload handler
  document.querySelector('#file-upload').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      visualizer.loadGemCADFile(e.target.files[0]);
    }
  });

  // Catalog selection handler
  document.querySelector('#gem-select').addEventListener('change', (e) => {
    if (e.target.value) {
      visualizer.loadCatalogStone(e.target.value);
    }
  });

  // Display options
  document.querySelector('#show-facets').addEventListener('change', (e) => {
    console.log('Show facets:', e.target.checked);
  });

  document.querySelector('#show-edges').addEventListener('change', (e) => {
    console.log('Show edges:', e.target.checked);
  });

  document.querySelector('#show-measurements').addEventListener('change', (e) => {
    console.log('Show measurements:', e.target.checked);
  });

  document.querySelector('#show-angles').addEventListener('change', (e) => {
    console.log('Show angles:', e.target.checked);
  });

  // Brightness control
  document.querySelector('#brightness').addEventListener('input', (e) => {
    document.querySelector('#brightness-value').textContent = e.target.value;
    visualizer.setBrightness(e.target.value);
  });

  // Rotation speed
  document.querySelector('#rotation-speed').addEventListener('input', (e) => {
    visualizer.rotationSpeed = parseInt(e.target.value);
    visualizer.autoRotate = parseInt(e.target.value) > 0;
  });

  // Reset button
  document.querySelector('#reset-view').addEventListener('click', () => {
    visualizer.resetView();
  });

  // Download specs button
  document.querySelector('#download-data').addEventListener('click', () => {
    alert('Download functionality coming soon');
  });

  // Load initial sample gem
  visualizer.createSampleGem();
});
