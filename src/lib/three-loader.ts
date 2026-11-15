declare global {
  interface Window { THREE?: any }
}

let threePromise: Promise<any> | null = null;
let gltfPromise: Promise<void> | null = null;

export function loadThree() {
  if (typeof window === 'undefined') return Promise.reject(new Error('3D views require a browser.'));
  if (window.THREE) return Promise.resolve(window.THREE);
  if (!threePromise) {
    threePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = () => window.THREE ? resolve(window.THREE) : reject(new Error('Three.js did not initialize.'));
      script.onerror = () => reject(new Error('Three.js could not be loaded.'));
      document.head.appendChild(script);
    });
  }
  return threePromise;
}

export async function loadGltfLoader() {
  const THREE = await loadThree();
  if (THREE.GLTFLoader) return;
  if (!gltfPromise) {
    gltfPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
      script.async = true;
      script.onload = () => THREE.GLTFLoader ? resolve() : reject(new Error('The glTF loader did not initialize.'));
      script.onerror = () => reject(new Error('The glTF loader could not be loaded.'));
      document.head.appendChild(script);
    });
  }
  return gltfPromise;
}
