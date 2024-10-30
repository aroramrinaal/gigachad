// Load face-api models
async function loadModels() {
    try {
        const modelPath = chrome.runtime.getURL('models');
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath);
        console.log('Face detection models loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading face detection models:', error);
        return false;
    }
}

// Create a new image with crossOrigin attribute
async function createCORSImage(originalImage) {
    return new Promise((resolve, reject) => {
        const corsImage = new Image();
        corsImage.crossOrigin = "anonymous";
        corsImage.onload = () => resolve(corsImage);
        corsImage.onerror = (e) => reject(e);
        corsImage.src = originalImage.src;
    });
}

// Function to detect faces in an image
async function detectFaces(image) {
    try {
        // Create a temporary canvas with willReadFrequently set to true
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = image.width;
        canvas.height = image.height;

        try {
            const corsImage = await createCORSImage(image);
            ctx.drawImage(corsImage, 0, 0);
        } catch (error) {
            console.log('CORS access denied for image:', image.src);
            return [];
        }

        const detections = await faceapi.detectAllFaces(
            canvas,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks(true);
        
        return detections;
    } catch (error) {
        console.error('Error detecting faces:', error);
        return [];
    }
}

// Function to process all images on the page
async function processImages() {
    const images = document.getElementsByTagName('img');
    for (let img of images) {
        if (img.complete && img.naturalHeight !== 0) {
            try {
                const faces = await detectFaces(img);
                if (faces.length > 0) {
                    console.log('Found faces in image:', faces);
                    await applyGigachadFilter(img, faces);
                }
            } catch (error) {
                console.log('Could not process image:', img.src);
            }
        }
    }
}

// Initialize when the page loads
async function init() {
    const modelsLoaded = await loadModels();
    if (modelsLoaded) {
        // Process existing images
        await processImages();
        
        // Watch for new images being added to the page
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeName === 'IMG') {
                            node.addEventListener('load', async () => {
                                await detectFaces(node);
                            });
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Load gigachad image once
const gigachadImage = new Image();
gigachadImage.src = chrome.runtime.getURL('assets/gigachad.png'); // You'll need to add this image

// Function to apply gigachad filter
async function applyGigachadFilter(image, detections) {
    // Create an overlay canvas
    const overlay = document.createElement('canvas');
    const ctx = overlay.getContext('2d', { willReadFrequently: true });
    overlay.width = image.width;
    overlay.height = image.height;
    
    // Position the overlay
    overlay.style.position = 'absolute';
    overlay.style.left = image.offsetLeft + 'px';
    overlay.style.top = image.offsetTop + 'px';
    overlay.style.pointerEvents = 'none';
    
    // For each detected face
    for (let detection of detections) {
        const box = detection.detection.box;
        ctx.drawImage(
            gigachadImage,
            box.x,
            box.y,
            box.width,
            box.height
        );
    }
    
    // Add overlay to DOM
    image.parentElement.style.position = 'relative';
    image.parentElement.appendChild(overlay);
}

// Start the extension
init();
