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
      points.map(([x, y]) => new THREE.Vector2(x, y)),
      segments,
      phiStart,
      phiLength
    );
    geometry.computeVertexNormals();
    return geometry;
  }

  static brilliantProfile(crownAngle, pavilionAngle) {
    /**
     * Creates a 2D profile for a brilliant cut gem
     * Angles in degrees, 0-90
     */
    const crownRad = (crownAngle * Math.PI) / 180;
    const pavilionRad = (pavilionAngle * Math.PI) / 180;

    const table = 0.15;
    const crownHeight = Math.cos(crownRad) * 0.5;
    const girdleRadius = 1;
    const pavilionHeight = -Math.cos(pavilionRad) * 0.65;

    return [
      [0, pavilionHeight], // Culet (bottom point)
      [girdleRadius * 0.7, pavilionHeight * 0.5], // Pavilion facet
      [girdleRadius, 0], // Girdle
      [girdleRadius * 0.8, crownHeight * 0.6], // Crown facet
      [table, crownHeight],
      [0, crownHeight + 0.1], // Table (flat top)
    ];
  }

  static ovalProfile(lengthRatio = 1.3) {
    /**
     * Creates an oval/elliptical profile
     */
    const points = [];
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI;
      const y = Math.cos(angle) * 0.4;
      const radius = Math.sin(angle) * (1 + (lengthRatio - 1) * Math.sin(angle * 0.5));
      points.push([radius, y]);
    }
    return points;
  }

  static marquiseProfile() {
    /**
     * Creates a marquise (boat-shaped) profile
     */
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const angle = t * Math.PI;
      const y = Math.cos(angle) * 0.4;
      const r = Math.sin(angle) * (1.5 * Math.sin(angle * 0.5));
      points.push([Math.max(0, r), y]);
    }
    return points;
  }

  static pearProfile() {
    /**
     * Creates a pear-shaped profile
     */
    const points = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const angle = t * Math.PI;
      const y = Math.cos(angle) * 0.4;
      const baseRadius = Math.sin(angle);
      const pear = 1 + 0.4 * Math.sin(angle * 0.5);
      const r = baseRadius * pear;
      points.push([Math.max(0, r), y]);
    }
    return points;
  }

  static stepCutGeometry(facetsPerSide = 3, width = 0.8, length = 1.2) {
    /**
     * Creates a step-cut gem (Emerald, Asscher, Cushion)
     * Uses rectangular layers with connecting facets
     */
    const vertices = [];
    const indices = [];
    const crownHeight = 0.35;
    const pavilionHeight = -0.45;

    // Helper: create rectangular layer
    const addLayer = (y, sx, sz) => {
      const startIdx = vertices.length / 3;
      vertices.push(-sx, y, -sz, sx, y, -sz, sx, y, sz, -sx, y, sz);
      return { startIdx, count: 4 };
    };

    // Build layers
    const layers = [];
    layers.push(addLayer(crownHeight, width * 0.2, length * 0.2)); // Table
    for (let i = 1; i <= facetsPerSide; i++) {
      const t = i / (facetsPerSide + 1);
      layers.push(addLayer(crownHeight - t * (crownHeight - 0.01), width * (0.2 + 0.3 * t), length * (0.2 + 0.3 * t)));
    }
    layers.push(addLayer(0, width, length)); // Girdle
    for (let i = 1; i <= facetsPerSide; i++) {
      const t = i / (facetsPerSide + 1);
      layers.push(addLayer(-t * pavilionHeight, width * (1 - 0.4 * t), length * (1 - 0.4 * t)));
    }
    layers.push(addLayer(pavilionHeight, width * 0.1, length * 0.1)); // Culet

    // Connect layers with quads
    for (let l = 0; l < layers.length - 1; l++) {
      const curr = layers[l];
      const next = layers[l + 1];
      for (let i = 0; i < 4; i++) {
        const a = curr.startIdx + i;
        const b = curr.startIdx + (i + 1) % 4;
        const c = next.startIdx + (i + 1) % 4;
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
        generate: (params) => GeometryGenerator.stepCutGeometry(params.facetsPerSide || 3, 0.8, 1.2),
      },
      cushion: {
        name: 'Cushion',
        generate: (params) => GeometryGenerator.stepCutGeometry(params.facetsPerSide || 3, 1.0, 1.0),
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
        generate: (params) => GeometryGenerator.stepCutGeometry(params.facetRings || 3, 0.9, 0.9),
      },
      asscher: {
        name: 'Asscher',
        generate: (params) => GeometryGenerator.stepCutGeometry(params.facetsPerSide || 4, 0.7, 0.7),
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
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2826);

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 4);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

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

    this.setupControls();
    this.generateGem(this.currentCut, {});
    this.animate();
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
    if (!cut) return;

    try {
      const geometry = cut.generate(params);
      const materialData = GEM_MATERIALS[this.currentMaterial] || GEM_MATERIALS.diamond;

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

      if (document.querySelector('#show-wireframe')?.checked) {
        this.updateWireframe();
      }
    } catch (error) {
      console.error(`Error generating ${cutName}:`, error);
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

  updateBrightness() {
    const slider = document.querySelector('#brightness-slider');
    if (!slider) return;
    const factor = parseFloat(slider.value);
    for (const [light, original] of this.originalLightIntensities) {
      light.intensity = original * factor;
    }
  }

  updateParameterControls() {
    const container = document.querySelector('#parameter-controls');
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
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };
}

// ==================== Event Listeners ====================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('#gem-canvas');
  if (!canvas) return;

  const visualizer = new GemVisualizer(canvas);

  // Cut selection
  document.querySelector('#cut-select')?.addEventListener('change', (e) => {
    visualizer.currentCut = e.target.value;
    visualizer.generateGem(visualizer.currentCut, {});
    visualizer.updateParameterControls();
  });

  // Material/gem selection
  document.querySelector('#gem-select')?.addEventListener('change', (e) => {
    visualizer.currentMaterial = e.target.value;
    visualizer.generateGem(visualizer.currentCut, visualizer.currentParams);
  });

  // Wireframe toggle
  document.querySelector('#show-wireframe')?.addEventListener('change', () => {
    visualizer.updateWireframe();
  });

  // Brightness slider
  document.querySelector('#brightness-slider')?.addEventListener('input', () => {
    visualizer.updateBrightness();
  });

  // Auto-rotate
  document.querySelector('#auto-rotate')?.addEventListener('change', (e) => {
    visualizer.autoRotate = e.target.checked;
  });

  document.querySelector('#rotation-speed')?.addEventListener('input', (e) => {
    visualizer.rotationSpeed = parseFloat(e.target.value);
  });

  // Reset view
  document.querySelector('#reset-view')?.addEventListener('click', () => {
    visualizer.camera.position.set(0, 0, 4);
    if (visualizer.gem) {
      visualizer.gem.rotation.set(0, 0, 0);
    }
  });

  // Download specs
  document.querySelector('#download-data')?.addEventListener('click', () => {
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

  // File upload
  document.querySelector('#gemcad-file')?.addEventListener('change', (e) => {
    alert('GemCAD file import coming soon!');
  });

  document.querySelector('#show-light-rays')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      console.log('Light rays visualization: Feature in development');
    }
  });

  visualizer.updateParameterControls();
});
