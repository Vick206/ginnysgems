// Ginnysgems GemCAD Visualizer - Refactored with Proper Geometry
// Using parametric generation and optical properties

// Optical properties for different gemstones
// IOR: Refractive Index, Dispersion: Chromatic aberration
const GEM_MATERIALS = {
  diamond: {
    label: 'Diamond',
    color: 0xffffff,
    ior: 2.417,
    dispersion: 0.044,
    absorption: 0,
  },
  sapphire: {
    label: 'Blue Sapphire',
    color: 0x5987f2,
    ior: 1.766,
    dispersion: 0.018,
    absorption: 0.08,
  },
  ruby: {
    label: 'Ruby',
    color: 0xff599e,
    ior: 1.766,
    dispersion: 0.018,
    absorption: 0.08,
  },
  emerald: {
    label: 'Emerald',
    color: 0x50c878,
    ior: 1.576,
    dispersion: 0.014,
    absorption: 0.12,
  },
  quartz: {
    label: 'Crystal Quartz',
    color: 0xf0f8ff,
    ior: 1.544,
    dispersion: 0.013,
    absorption: 0,
  },
  citrine: {
    label: 'Citrine',
    color: 0xffe07a,
    ior: 1.544,
    dispersion: 0.013,
    absorption: 0.06,
  },
  amethyst: {
    label: 'Amethyst',
    color: 0xc994e6,
    ior: 1.544,
    dispersion: 0.013,
    absorption: 0.06,
  },
  tourmaline: {
    label: 'Tourmaline',
    color: 0x354e3f,
    ior: 1.62,
    dispersion: 0.017,
    absorption: 0.15,
  },
};

// ==================== Geometry Generators ====================

class GeometryGenerator {
  static latheProfile(points, segments = 64, phiStart = 0, phiLength = Math.PI * 2) {
    /**
     * Creates a 3D geometry by rotating a 2D profile around the Y axis.
     * Points: array of [radius, height] pairs
     * Used for: Brilliant, Oval, Marquise, Pear cuts
     */
    const geometry = new THREE.LatheGeometry(
      points.map(([x, y]) => new THREE.Vector2(Math.max(0, x), y)),
      segments,
      phiStart,
      phiLength
    );
    geometry.computeVertexNormals();
    return geometry;
  }

  static brilliantProfile(crownAngle, pavilionAngle) {
    /**
     * Brilliant cut profile: table -> crown facets -> girdle -> pavilion facets -> culet
     * More realistic proportions based on gemstone industry standards
     */
    const crownRad = (crownAngle * Math.PI) / 180;
    const pavilionRad = (pavilionAngle * Math.PI) / 180;

    const crownHeight = Math.cos(crownRad) * 0.35;
    const pavilionHeight = -Math.cos(pavilionRad) * 0.5;
    const tableRadius = 0.2;
    const girdleRadius = 1.0;

    // Build smooth profile curve
    return [
      [0, pavilionHeight + 0.05], // Culet (tiny point)
      [girdleRadius * 0.6, pavilionHeight * 0.7], // Lower pavilion
      [girdleRadius * 0.9, pavilionHeight * 0.2], // Upper pavilion
      [girdleRadius, 0], // Girdle (widest)
      [girdleRadius * 0.75, crownHeight * 0.4], // Lower crown
      [tableRadius * 1.2, crownHeight * 0.8], // Upper crown
      [tableRadius, crownHeight + 0.05], // Table (flat top)
      [0, crownHeight + 0.08], // Table center peak
    ];
  }

  static ovalProfile(lengthRatio = 1.3) {
    /**
     * Oval/elliptical profile with smooth curves
     */
    const points = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const angle = t * Math.PI;
      const y = Math.cos(angle) * 0.5 - 0.25;
      const sineT = Math.sin(angle);
      // Create elliptical radius with lengthen toward poles
      const radius = sineT * (1 + 0.3 * lengthRatio * sineT * sineT);
      points.push([Math.max(0, radius), y]);
    }
    return points;
  }

  static marquiseProfile() {
    /**
     * Marquise: boat-shaped, pointed at both ends
     */
    const points = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const angle = t * Math.PI;
      const y = Math.cos(angle) * 0.5 - 0.25;
      const sin = Math.sin(angle);
      // Pointed ends, wider middle
      const radius = sin * Math.sin(angle * 0.5) * 1.2;
      points.push([Math.max(0, radius), y]);
    }
    return points;
  }

  static pearProfile() {
    /**
     * Pear: teardrop shape, rounded at top, pointed at bottom
     */
    const points = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const angle = t * Math.PI;
      const y = Math.cos(angle) * 0.5 - 0.25;
      const sin = Math.sin(angle);
      // Wider at top, pointed at bottom
      const bulge = 1 + 0.5 * Math.sin(angle * 0.5);
      const radius = sin * bulge * 0.9;
      points.push([Math.max(0, radius), y]);
    }
    return points;
  }

  static cushionCutGeometry(facetsPerSide = 3) {
    /**
     * Cushion cut: rounded square with stepped facets
     * Simpler and cleaner than nested boxes
     */
    const vertices = [];
    const indices = [];

    const crownH = 0.3;
    const pavilionH = -0.35;
    const edgeRound = 0.15; // Rounded corner radius

    // Helper: add rounded rectangle at height y with size scale
    const addRoundedSquare = (y, scale) => {
      const startIdx = vertices.length / 3;
      const s = scale;
      const r = edgeRound * scale;

      // Create 8 points for rounded square
      const points = [
        [-s + r, y, -s + r], // Corners with curve
        [s - r, y, -s + r],
        [s, y, -s], // Straight edges outside corners
        [s, y, s],
        [s - r, y, s - r],
        [-s + r, y, s - r],
        [-s, y, s],
        [-s, y, -s],
      ];

      points.forEach(p => vertices.push(...p));
      return { startIdx, count: 8 };
    };

    // Build layers from table to culet
    const layers = [];
    layers.push(addRoundedSquare(crownH, 0.15)); // Table
    layers.push(addRoundedSquare(crownH * 0.5, 0.35)); // Crown
    layers.push(addRoundedSquare(0, 0.75)); // Girdle
    layers.push(addRoundedSquare(pavilionH * 0.5, 0.55)); // Pavilion
    layers.push(addRoundedSquare(pavilionH, 0.1)); // Culet

    // Connect layers with triangles
    for (let l = 0; l < layers.length - 1; l++) {
      const curr = layers[l];
      const next = layers[l + 1];
      for (let i = 0; i < 8; i++) {
        const a = curr.startIdx + i;
        const b = curr.startIdx + (i + 1) % 8;
        const c = next.startIdx + (i + 1) % 8;
        const d = next.startIdx + i;
        indices.push(a, b, c, a, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeVertexNormals();
    return geometry;
  }

  static stepCutGeometry(facetsPerSide = 3, isSquare = false) {
    /**
     * Emerald/Asscher: rectangular step cuts
     */
    const w = isSquare ? 0.8 : 0.7;
    const l = isSquare ? 0.8 : 1.1;
    const crownH = 0.3;
    const pavilionH = -0.35;

    const vertices = [];
    const indices = [];

    // Build with proper faceting
    const addLayer = (y, wScale, lScale) => {
      const startIdx = vertices.length / 3;
      const hw = w * wScale / 2;
      const hl = l * lScale / 2;
      vertices.push(
        -hw, y, -hl, hw, y, -hl, hw, y, hl, -hw, y, hl
      );
      return { startIdx, count: 4 };
    };

    const layers = [];
    layers.push(addLayer(crownH, 0.4, 0.4)); // Table
    for (let i = 1; i <= facetsPerSide; i++) {
      const t = i / (facetsPerSide + 1);
      layers.push(addLayer(crownH - t * (crownH - 0.02), 0.4 + 0.6 * t, 0.4 + 0.6 * t));
    }
    layers.push(addLayer(0, 1, 1)); // Girdle
    for (let i = 1; i <= facetsPerSide; i++) {
      const t = i / (facetsPerSide + 1);
      layers.push(addLayer(-t * Math.abs(pavilionH), 1 - 0.4 * t, 1 - 0.4 * t));
    }
    layers.push(addLayer(pavilionH, 0.15, 0.15)); // Culet

    for (let l = 0; l < layers.length - 1; l++) {
      const c = layers[l];
      const n = layers[l + 1];
      for (let i = 0; i < 4; i++) {
        const a = c.startIdx + i;
        const b = c.startIdx + (i + 1) % 4;
        const d = n.startIdx + i;
        const e = n.startIdx + (i + 1) % 4;
        indices.push(a, b, e, a, e, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeVertexNormals();
    return geometry;
  }
}

// ==================== GemVisualizer ====================

class GemVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.gem = null;
    this.autoRotate = false;
    this.rotationSpeed = 0;
    this.currentCut = 'brilliant';
    this.currentMaterial = 'diamond';
    this.currentParams = {};
    this.wireframeGroup = null;
    this.originalLightIntensities = new Map();

    this.cuts = {
      brilliant: {
        name: 'Brilliant',
        generate: (params) => GeometryGenerator.latheProfile(
          GeometryGenerator.brilliantProfile(params.crownAngle || 34, params.pavilionAngle || 40.8),
          params.facets || 64
        ),
      },
      emerald: {
        name: 'Emerald',
        generate: (params) => GeometryGenerator.stepCutGeometry(params.facetsPerSide || 3, false),
      },
      cushion: {
        name: 'Cushion',
        generate: (params) => GeometryGenerator.cushionCutGeometry(params.facetsPerSide || 3),
      },
      oval: {
        name: 'Oval',
        generate: (params) => GeometryGenerator.latheProfile(
          GeometryGenerator.ovalProfile(params.lengthRatio || 1.3),
          params.segments || 64
        ),
      },
      radiant: {
        name: 'Radiant',
        generate: (params) => GeometryGenerator.stepCutGeometry(params.facetRings || 3, true),
      },
      asscher: {
        name: 'Asscher',
        generate: (params) => GeometryGenerator.stepCutGeometry(params.facetsPerSide || 4, true),
      },
      marquise: {
        name: 'Marquise',
        generate: (params) => GeometryGenerator.latheProfile(
          GeometryGenerator.marquiseProfile(),
          params.segments || 64
        ),
      },
      pear: {
        name: 'Pear',
        generate: (params) => GeometryGenerator.latheProfile(
          GeometryGenerator.pearProfile(),
          params.segments || 64
        ),
      },
    };

    this.paramDefinitions = {
      brilliant: [
        { name: 'crownAngle', label: 'Crown Angle', min: 25, max: 45, step: 1, default: 34, unit: '°' },
        { name: 'pavilionAngle', label: 'Pavilion Angle', min: 35, max: 50, step: 1, default: 40.8, unit: '°' },
        { name: 'facets', label: 'Facet Count', min: 8, max: 96, step: 4, default: 64 },
      ],
      emerald: [
        { name: 'facetsPerSide', label: 'Steps per Side', min: 2, max: 6, step: 1, default: 3 },
      ],
      cushion: [
        { name: 'facetsPerSide', label: 'Facets per Side', min: 3, max: 8, step: 1, default: 3 },
      ],
      oval: [
        { name: 'segments', label: 'Segments', min: 16, max: 96, step: 4, default: 64 },
        { name: 'lengthRatio', label: 'Length Ratio', min: 1.1, max: 2.0, step: 0.1, default: 1.3 },
      ],
      radiant: [
        { name: 'facetRings', label: 'Facet Rings', min: 2, max: 6, step: 1, default: 3 },
      ],
      asscher: [
        { name: 'facetsPerSide', label: 'Steps per Side', min: 2, max: 5, step: 1, default: 4 },
      ],
      marquise: [
        { name: 'segments', label: 'Segments', min: 16, max: 96, step: 4, default: 64 },
      ],
      pear: [
        { name: 'segments', label: 'Segments', min: 16, max: 96, step: 4, default: 64 },
      ],
    };

    this.initScene();
  }

  initScene() {
    console.log('[initScene] Starting scene initialization');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2826);

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 4);
    console.log(`[initScene] Camera created: ${width}x${height}`);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    console.log(`[initScene] Renderer created and configured`);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight1.position.set(5, 5, 5);
    this.scene.add(directionalLight1);
    this.originalLightIntensities.set(directionalLight1, 0.9);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-3, -3, -3);
    this.scene.add(directionalLight2);
    this.originalLightIntensities.set(directionalLight2, 0.4);
    console.log(`[initScene] Lights added`);

    this.setupControls();
    console.log(`[initScene] Controls set up`);
    
    this.generateGem(this.currentCut, {});
    console.log(`[initScene] Initial gem generated`);
    
    this.animate();
    console.log(`[initScene] Animation started`);
  }

  setupControls() {
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

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.position.z += e.deltaY * 0.005;
      this.camera.position.z = Math.max(1.5, Math.min(12, this.camera.position.z));
    });
  }

  generateGem(cutName, params) {
    if (this.gem) {
      this.scene.remove(this.gem);
    }

    const cut = this.cuts[cutName];
    if (!cut) {
      console.error(`Cut not found: ${cutName}`);
      return;
    }

    try {
      console.log(`[generateGem] Creating ${cutName} with params:`, params);
      const geometry = cut.generate(params);
      
      // Log geometry stats
      const positionAttr = geometry.getAttribute('position');
      const indexAttr = geometry.getIndex();
      console.log(`[generateGem] ${cutName} geometry:`, {
        vertices: positionAttr.count,
        faces: indexAttr ? indexAttr.count / 3 : 'unknown',
        hasNormals: geometry.hasAttribute('normal'),
      });
      
      // Check bounds
      geometry.computeBoundingBox();
      console.log(`[generateGem] Bounding box:`, {
        min: geometry.boundingBox.min,
        max: geometry.boundingBox.max,
        size: geometry.boundingBox.getSize(new THREE.Vector3()),
      });
      
      const materialData = GEM_MATERIALS[this.currentMaterial] || GEM_MATERIALS.diamond;
      console.log(`[generateGem] Material: ${this.currentMaterial}`, materialData);

      const material = new THREE.MeshStandardMaterial({
        color: materialData.color,
        metalness: 0.05,
        roughness: 0.3,
        flatShading: true,
        side: THREE.DoubleSide,
      });

      this.gem = new THREE.Mesh(geometry, material);
      this.scene.add(this.gem);
      this.currentParams = params;
      console.log(`[generateGem] Gem added to scene`);

      if (document.querySelector('#show-wireframe')?.checked) {
        this.updateWireframe();
      }
    } catch (error) {
      console.error(`[generateGem] Error generating ${cutName}:`, error);
      console.error(error.stack);
    }
  }

  updateWireframe() {
    if (this.wireframeGroup && this.gem) {
      this.gem.remove(this.wireframeGroup);
      this.wireframeGroup = null;
    }

    if (document.querySelector('#show-wireframe')?.checked && this.gem) {
      const wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(this.gem.geometry),
        new THREE.LineBasicMaterial({ color: 0xdfb96b, linewidth: 1 })
      );
      this.gem.add(wireframe);
      this.wireframeGroup = wireframe;
    }
  }

  updateParameterControls() {
    const container = document.querySelector('#params-container');
    const paramDefs = this.paramDefinitions[this.currentCut] || [];
    if (!container || !paramDefs.length) return;

    container.innerHTML = paramDefs.map((def) => `
      <div class="control-group">
        <label>${def.label}</label>
        <input type="range" class="param-slider" data-param="${def.name}"
               min="${def.min}" max="${def.max}" step="${def.step}" value="${def.default}">
        <span class="param-value">${def.default}${def.unit || ''}</span>
      </div>
    `).join('');

    container.querySelectorAll('.param-slider').forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const paramName = e.target.dataset.param;
        const value = parseFloat(e.target.value);
        const unit = paramDefs.find((p) => p.name === paramName)?.unit || '';
        e.target.nextElementSibling.textContent = `${value}${unit}`;
        this.currentParams[paramName] = value;
        this.generateGem(this.currentCut, this.currentParams);
      });
    });
  }

  animate = () => {
    if (this.autoRotate && this.gem) {
      this.gem.rotation.z += this.rotationSpeed * 0.01;
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    } else {
      console.error('[animate] Missing renderer, scene, or camera');
    }
    requestAnimationFrame(this.animate);
  };
}

// ==================== Event Listeners ====================

// Wait for THREE.js to load before initializing
function initVisualizer() {
  console.log('[GemVisualizer] Checking THREE...');
  if (typeof THREE === 'undefined') {
    // THREE not loaded yet, try again
    console.log('[GemVisualizer] THREE not ready, retrying...');
    setTimeout(initVisualizer, 50);
    return;
  }

  console.log('[GemVisualizer] THREE loaded, finding canvas...');
  const canvas = document.querySelector('#gem-canvas');
  if (!canvas) {
    console.error('[GemVisualizer] Canvas not found');
    return;
  }

  console.log('[GemVisualizer] Canvas found, creating visualizer...');
  try {
    const visualizer = new GemVisualizer(canvas);
    console.log('[GemVisualizer] Visualizer created successfully');
  } catch (e) {
    console.error('[GemVisualizer] Error creating visualizer:', e);
    return;
  }
  
  // Hide loading message
  console.log('[GemVisualizer] Hiding loading message...');
  const loading = document.querySelector('#loading');
  if (loading) loading.style.display = 'none';

  // Cut selection
  const cutSelect = document.querySelector('#cut-select');
  if (cutSelect) {
    cutSelect.addEventListener('change', (e) => {
      visualizer.currentCut = e.target.value;
      visualizer.generateGem(visualizer.currentCut, {});
      visualizer.updateParameterControls();
    });
  }

  // Material/gem selection
  const gemSelect = document.querySelector('#gem-select');
  if (gemSelect) {
    gemSelect.addEventListener('change', (e) => {
      const materialMap = {
        'emerald-001': 'emerald',
        'sapphire-001': 'sapphire',
        'diamond-001': 'diamond',
        'ruby-001': 'ruby',
        'topaz-001': 'quartz',
        'aquamarine-001': 'sapphire',
      };
      visualizer.currentMaterial = materialMap[e.target.value] || 'diamond';
      visualizer.generateGem(visualizer.currentCut, visualizer.currentParams);
    });
  }

  // Wireframe toggle
  const wireframeCheckbox = document.querySelector('#show-wireframe');
  if (wireframeCheckbox) {
    wireframeCheckbox.addEventListener('change', () => {
      visualizer.updateWireframe();
    });
  }

  // Brightness slider
  const brightnessSlider = document.querySelector('#brightness');
  if (brightnessSlider) {
    brightnessSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      const brightnessValue = document.querySelector('#brightness-value');
      if (brightnessValue) brightnessValue.textContent = value;
      
      // Update light intensity
      const factor = value / 100;
      for (const [light, original] of visualizer.originalLightIntensities) {
        light.intensity = original * factor;
      }
    });
  }

  // Auto-rotate
  const rotationSpeedSlider = document.querySelector('#rotation-speed');
  if (rotationSpeedSlider) {
    rotationSpeedSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      visualizer.autoRotate = value > 0;
      visualizer.rotationSpeed = value;
    });
  }

  // Reset view
  const resetButton = document.querySelector('#reset-view');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      visualizer.camera.position.set(0, 0, 4);
      if (visualizer.gem) {
        visualizer.gem.rotation.set(0, 0, 0);
      }
    });
  }

  // Download specs
  const downloadButton = document.querySelector('#download-data');
  if (downloadButton) {
    downloadButton.addEventListener('click', () => {
      const data = {
        cut: visualizer.currentCut,
        material: visualizer.currentMaterial,
        materialData: GEM_MATERIALS[visualizer.currentMaterial],
        parameters: visualizer.currentParams,
        timestamp: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gem-${visualizer.currentCut}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // File upload
  const fileUpload = document.querySelector('#file-upload');
  if (fileUpload) {
    fileUpload.addEventListener('change', (e) => {
      alert('GemCAD file import coming soon!');
    });
  }

  // Light rays
  const lightRaysCheckbox = document.querySelector('#show-light-rays');
  if (lightRaysCheckbox) {
    lightRaysCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        console.log('Light rays visualization: Feature in development');
      }
    });
  }

  visualizer.updateParameterControls();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisualizer);
} else {
  // DOM is already loaded
  initVisualizer();
}
