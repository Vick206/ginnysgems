// GemCAD Visualizer - Interactive Gem Cut Builder with Three.js
class GemCut {
  constructor(name, baseParams) {
    this.name = name;
    this.baseParams = baseParams;
  }

  generateGeometry(params) {
    return new THREE.BufferGeometry();
  }
}

class BrilliantCut extends GemCut {
  generateGeometry(params) {
    const crownAngle = params.crownAngle || 34;
    const pavilionAngle = params.pavilionAngle || 40.8;
    const crownFacets = params.crownFacets || 8;
    const pavilionFacets = params.pavilionFacets || 8;
    
    const vertices = [];
    const indices = [];

    vertices.push(0, 1, 0);
    const tableIndex = 0;

    const crownRadius = Math.sin((crownAngle * Math.PI) / 180);
    const crownHeight = Math.cos((crownAngle * Math.PI) / 180) * 0.6;
    
    for (let i = 0; i < crownFacets; i++) {
      const angle = (i / crownFacets) * Math.PI * 2;
      vertices.push(
        Math.cos(angle) * crownRadius * 0.8,
        crownHeight,
        Math.sin(angle) * crownRadius * 0.8
      );
    }

    const girdleRadius = 1;
    for (let i = 0; i < crownFacets; i++) {
      const angle = (i / crownFacets) * Math.PI * 2;
      vertices.push(
        Math.cos(angle) * girdleRadius,
        0,
        Math.sin(angle) * girdleRadius
      );
    }

    const pavilionHeight = -Math.cos((pavilionAngle * Math.PI) / 180) * 0.8;
    for (let i = 0; i < pavilionFacets; i++) {
      const angle = (i / pavilionFacets) * Math.PI * 2;
      vertices.push(
        Math.cos(angle) * girdleRadius * 0.9,
        pavilionHeight,
        Math.sin(angle) * girdleRadius * 0.9
      );
    }

    vertices.push(0, pavilionHeight - 0.4, 0);
    const culetIndex = vertices.length / 3 - 1;

    const crownStart = 1;
    const girdleStart = crownStart + crownFacets;
    const pavilionStart = girdleStart + crownFacets;

    for (let i = 0; i < crownFacets; i++) {
      const next = (i + 1) % crownFacets;
      indices.push(tableIndex, crownStart + i, crownStart + next);
      indices.push(crownStart + i, girdleStart + i, crownStart + next);
      indices.push(crownStart + next, girdleStart + i, girdleStart + next);
    }

    for (let i = 0; i < pavilionFacets; i++) {
      const next = (i + 1) % pavilionFacets;
      indices.push(girdleStart + i, pavilionStart + i, girdleStart + next);
      indices.push(girdleStart + next, pavilionStart + i, pavilionStart + next);
      indices.push(pavilionStart + i, culetIndex, pavilionStart + next);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeVertexNormals();

    return geometry;
  }
}

class EmeraldCut extends GemCut {
  generateGeometry(params) {
    const stepsPerSide = params.facetsPerSide || 3;
    const length = 1.2;
    const width = 0.8;
    const depth = 0.6;

    const vertices = [];
    const indices = [];

    for (let step = 0; step <= stepsPerSide; step++) {
      const t = step / stepsPerSide;
      const x = (width / 2) * (1 - t * 0.3);
      const y = depth * 0.6 * (1 - t);
      
      vertices.push(-x, y, -length / 2);
      vertices.push(x, y, -length / 2);
      vertices.push(x, y, length / 2);
      vertices.push(-x, y, length / 2);
    }

    for (let step = 0; step <= stepsPerSide; step++) {
      const t = step / stepsPerSide;
      const x = (width / 2) * (1 - (1 - t) * 0.3);
      const y = -depth * 0.8 * t;
      
      vertices.push(-x, y, -length / 2);
      vertices.push(x, y, -length / 2);
      vertices.push(x, y, length / 2);
      vertices.push(-x, y, length / 2);
    }

    const vertsPerStep = 4;
    const totalSteps = stepsPerSide + 1 + stepsPerSide + 1;

    for (let step = 0; step < totalSteps - 1; step++) {
      const current = step * vertsPerStep;
      const next = (step + 1) * vertsPerStep;

      for (let i = 0; i < 4; i++) {
        const v1 = current + i;
        const v2 = current + (i + 1) % 4;
        const v3 = next + (i + 1) % 4;
        const v4 = next + i;

        indices.push(v1, v2, v3);
        indices.push(v1, v3, v4);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeVertexNormals();

    return geometry;
  }
}

class CushionCut extends GemCut {
  generateGeometry(params) {
    const segments = params.facetsPerSide || 4;
    const vertices = [];
    const indices = [];

    const radius = 1;
    const depth = 0.7;

    for (let layer = 0; layer <= segments * 2; layer++) {
      const t = layer / (segments * 2);
      const y = depth * (0.5 - t);
      const scale = Math.sin(t * Math.PI) * 0.7 + 0.3;

      for (let i = 0; i <= segments * 4; i++) {
        const angle = (i / (segments * 4)) * Math.PI * 2;
        const x = Math.cos(angle) * radius * scale;
        const z = Math.sin(angle) * radius * scale;
        vertices.push(x, y, z);
      }
    }

    const vertsPerLayer = segments * 4 + 1;
    for (let layer = 0; layer < segments * 2; layer++) {
      for (let i = 0; i < vertsPerLayer - 1; i++) {
        const v1 = layer * vertsPerLayer + i;
        const v2 = layer * vertsPerLayer + (i + 1) % (vertsPerLayer - 1);
        const v3 = (layer + 1) * vertsPerLayer + (i + 1) % (vertsPerLayer - 1);
        const v4 = (layer + 1) * vertsPerLayer + i;

        indices.push(v1, v2, v3);
        indices.push(v1, v3, v4);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeVertexNormals();

    return geometry;
  }
}

class OvalCut extends GemCut {
  generateGeometry(params) {
    const segments = params.segments || 32;
    const lengthRatio = 1.3;
    const depth = 0.7;

    const vertices = [];
    const indices = [];

    const lat = 8;
    const lon = segments;

    for (let i = 0; i <= lat; i++) {
      const phi = (i / lat) * Math.PI;
      const y = depth * Math.cos(phi) * 0.5;
      const radius = Math.sin(phi);

      for (let j = 0; j <= lon; j++) {
        const theta = (j / lon) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius * lengthRatio;

        vertices.push(x, y, z);
      }
    }

    const vertsPerLat = lon + 1;
    for (let i = 0; i < lat; i++) {
      for (let j = 0; j < lon; j++) {
        const a = i * vertsPerLat + j;
        const b = i * vertsPerLat + (j + 1);
        const c = (i + 1) * vertsPerLat + (j + 1);
        const d = (i + 1) * vertsPerLat + j;

        indices.push(a, b, c);
        indices.push(a, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeVertexNormals();

    return geometry;
  }
}

class RadiantCut extends GemCut {
  generateGeometry(params) {
    const facets = params.facetRings || 4;
    const vertices = [];
    vertices.push(0, 1, 0);

    for (let ring = 1; ring <= facets; ring++) {
      const t = ring / facets;
      const radius = Math.sin(t * Math.PI * 0.5);
      const height = Math.cos(t * Math.PI * 0.5) * 0.6;
      const facetsInRing = 8 + ring * 2;

      for (let i = 0; i < facetsInRing; i++) {
        const angle = (i / facetsInRing) * Math.PI * 2;
        vertices.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      }
    }

    for (let ring = 1; ring <= facets; ring++) {
      const t = ring / facets;
      const radius = Math.sin(t * Math.PI * 0.5);
      const height = -Math.cos(t * Math.PI * 0.5) * 0.8;
      const facetsInRing = 8 + ring * 2;

      for (let i = 0; i < facetsInRing; i++) {
        const angle = (i / facetsInRing) * Math.PI * 2;
        vertices.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      }
    }

    vertices.push(0, -1.2, 0);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.computeVertexNormals();

    return geometry;
  }
}

// Main Visualizer Class
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
    this.currentParams = {};
    this.gemColor = 0x82c7a3;
    this.wireframeGroup = null;

    this.cuts = {
      brilliant: new BrilliantCut('Brilliant', {}),
      emerald: new EmeraldCut('Emerald', {}),
      cushion: new CushionCut('Cushion', {}),
      oval: new OvalCut('Oval', {}),
      radiant: new RadiantCut('Radiant', {}),
      asscher: new EmeraldCut('Asscher', {}),
      marquise: new OvalCut('Marquise', {}),
      pear: new OvalCut('Pear', {}),
    };

    this.paramDefinitions = {
      brilliant: [
        { name: 'crownAngle', label: 'Crown Angle', min: 25, max: 45, step: 1, default: 34, unit: '°' },
        { name: 'pavilionAngle', label: 'Pavilion Angle', min: 35, max: 50, step: 1, default: 40.8, unit: '°' },
        { name: 'crownFacets', label: 'Crown Facets', min: 4, max: 16, step: 1, default: 8 },
        { name: 'pavilionFacets', label: 'Pavilion Facets', min: 4, max: 16, step: 1, default: 8 },
      ],
      emerald: [
        { name: 'facetsPerSide', label: 'Steps per Side', min: 2, max: 6, step: 1, default: 3 },
      ],
      cushion: [
        { name: 'facetsPerSide', label: 'Facets per Side', min: 3, max: 8, step: 1, default: 4 },
      ],
      oval: [
        { name: 'segments', label: 'Segments', min: 16, max: 64, step: 4, default: 32 },
      ],
      radiant: [
        { name: 'facetRings', label: 'Facet Rings', min: 2, max: 6, step: 1, default: 4 },
      ],
      asscher: [
        { name: 'facetsPerSide', label: 'Steps per Side', min: 2, max: 5, step: 1, default: 3 },
      ],
      marquise: [
        { name: 'segments', label: 'Segments', min: 16, max: 64, step: 4, default: 32 },
      ],
      pear: [
        { name: 'segments', label: 'Segments', min: 16, max: 64, step: 4, default: 32 },
      ],
    };

    this.initScene();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2826);
    this.scene.fog = new THREE.Fog(0x1a2826, 100, 1000);

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 4);

    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas, 
      antialias: true, 
      alpha: true 
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight1.position.set(5, 5, 5);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-3, -3, -3);
    this.scene.add(directionalLight2);

    this.setupControls();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
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

    const cut = this.cuts[cutName] || this.cuts.brilliant;
    const geometry = cut.generateGeometry(params);

    const material = new THREE.MeshStandardMaterial({
      color: this.gemColor,
      metalness: 0.15,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });

    this.gem = new THREE.Mesh(geometry, material);
    this.scene.add(this.gem);

    if (document.querySelector('#show-wireframe')?.checked) {
      this.updateWireframe();
    }
  }

  updateWireframe() {
    if (this.wireframeGroup && this.gem) {
      this.gem.remove(this.wireframeGroup);
    }

    if (document.querySelector('#show-wireframe')?.checked && this.gem) {
      const wireframe = new THREE.Mesh(
        this.gem.geometry,
        new THREE.LineBasicMaterial({ color: 0xdfb96b, linewidth: 1 })
      );
      this.wireframeGroup = wireframe;
      this.gem.add(wireframe);
    }
  }

  updateGem(params) {
    this.currentParams = params;
    this.generateGem(this.currentCut, params);
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

  resetView() {
    if (this.gem) {
      this.gem.rotation.set(0, 0, 0);
    }
    this.camera.position.set(0, 0, 4);
  }

  updateBrightness(value) {
    const factor = value / 100;
    this.scene.children.forEach(child => {
      if (child.isLight) {
        if (child instanceof THREE.AmbientLight) {
          child.intensity = 0.5 * factor;
        } else {
          child.intensity = Math.max(0.3, child.intensity * factor);
        }
      }
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('#gem-canvas');
  const loading = document.querySelector('#loading');

  const visualizer = new GemVisualizer(canvas);
  loading.style.display = 'none';

  visualizer.generateGem('brilliant', visualizer.paramDefinitions.brilliant.reduce((acc, p) => {
    acc[p.name] = p.default;
    return acc;
  }, {}));

  document.querySelector('#cut-select').addEventListener('change', (e) => {
    visualizer.currentCut = e.target.value;
    updateParameterControls(visualizer);
    const defaults = visualizer.paramDefinitions[e.target.value].reduce((acc, p) => {
      acc[p.name] = p.default;
      return acc;
    }, {});
    visualizer.updateGem(defaults);
  });

  function updateParameterControls(visualizer) {
    const container = document.querySelector('#params-container');
    const params = visualizer.paramDefinitions[visualizer.currentCut] || [];

    container.innerHTML = params.map(p => `
      <div class="slider-group">
        <label for="param-${p.name}">
          ${p.label}: <span id="value-${p.name}">${p.default}</span>${p.unit || ''}
        </label>
        <input type="range" id="param-${p.name}" 
          min="${p.min}" max="${p.max}" step="${p.step}" 
          value="${p.default}" aria-label="${p.label}">
      </div>
    `).join('');

    params.forEach(p => {
      const slider = document.querySelector(`#param-${p.name}`);
      const valueDisplay = document.querySelector(`#value-${p.name}`);
      
      slider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        valueDisplay.textContent = value;
        
        const allParams = {};
        params.forEach(param => {
          allParams[param.name] = parseInt(document.querySelector(`#param-${param.name}`).value);
        });
        visualizer.updateGem(allParams);
      });
    });
  }

  document.querySelector('#show-wireframe').addEventListener('change', () => {
    visualizer.updateWireframe();
  });

  document.querySelector('#brightness').addEventListener('input', (e) => {
    document.querySelector('#brightness-value').textContent = e.target.value;
    visualizer.updateBrightness(e.target.value);
  });

  document.querySelector('#rotation-speed').addEventListener('input', (e) => {
    visualizer.rotationSpeed = parseInt(e.target.value);
    visualizer.autoRotate = parseInt(e.target.value) > 0;
  });

  document.querySelector('#reset-view').addEventListener('click', () => {
    visualizer.resetView();
  });

  document.querySelector('#file-upload').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      alert('GemCAD file upload: coming soon!');
    }
  });
});
