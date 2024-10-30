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
        // Create a temporary canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;

        // Try to create a CORS-enabled version of the image
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
                    // TODO: Apply gigachad filter here
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

// Start the extension
init();
