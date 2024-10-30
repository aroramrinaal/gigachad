// Initialize stats object
let stats = {
    facesDetected: 0,
    imagesProcessed: 0
};

// Load previous stats from storage
chrome.storage.local.get(['stats'], (result) => {
    if (result.stats) {
        stats = result.stats;
    }
});

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
        
        if (detections.length > 0) {
            stats.facesDetected += detections.length;
            stats.imagesProcessed++;
            chrome.runtime.sendMessage({
                type: 'statsUpdate',
                stats: stats
            });
        }
        
        return detections;
    } catch (error) {
        console.error('Error detecting faces:', error);
        return [];
    }
}

function createImageObserver() {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(async (entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                
                const processImage = async () => {
                    if (img.complete && img.naturalHeight !== 0 && gigachadLoaded) {
                        try {
                            const faces = await detectFaces(img);
                            if (faces.length > 0) {
                                await applyGigachadFilter(img, faces);
                            }
                        } catch (error) {
                            console.log('Could not process image:', img.src, error);
                        }
                        imageObserver.unobserve(img);
                    }
                };

                // Try processing immediately if image is already loaded
                await processImage();

                // Also add load event listener in case image isn't loaded yet
                img.addEventListener('load', processImage);
            }
        });
    });
    return imageObserver;
}

// Function to process all images on the page
async function processImages() {
    const imageObserver = createImageObserver();
    const images = document.getElementsByTagName('img');
    for (let img of images) {
        imageObserver.observe(img);
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
            const imageObserver = createImageObserver();
            mutations.forEach((mutation) => {
                if (mutation.addedNodes) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeName === 'IMG') {
                            imageObserver.observe(node);
                            node.addEventListener('load', () => {
                                imageObserver.observe(node);
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

// Load gigachad image once and ensure it's loaded
const gigachadImage = new Image();
gigachadImage.crossOrigin = "anonymous";
let gigachadLoaded = false;

gigachadImage.onload = () => {
    gigachadLoaded = true;
    console.log('Gigachad image loaded successfully');
};

gigachadImage.onerror = (error) => {
    console.error('Error loading gigachad image:', error);
};

gigachadImage.src = chrome.runtime.getURL('assets/gigachad.png');

// Function to apply gigachad filter
async function applyGigachadFilter(image, detections) {
    if (!gigachadLoaded || !gigachadImage.complete) {
        console.log('Waiting for gigachad image to load...');
        return;
    }

    // Create an overlay canvas
    const overlay = document.createElement('canvas');
    const ctx = overlay.getContext('2d', { willReadFrequently: true });
    
    // Ensure canvas dimensions are valid
    overlay.width = Math.max(1, image.width);
    overlay.height = Math.max(1, image.height);
    
    // Position the overlay
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    
    // For each detected face
    for (let detection of detections) {
        const box = detection.detection.box;
        
        // Ensure valid dimensions for drawImage
        const width = Math.max(1, box.width * 1.2);
        const height = Math.max(1, box.height * 1.2);
        const x = Math.max(0, box.x - (box.width * 0.1));
        const y = Math.max(0, box.y - (box.width * 0.1));

        try {
            ctx.drawImage(
                gigachadImage,
                x,
                y,
                width,
                height
            );
        } catch (error) {
            console.error('Error drawing gigachad:', error);
            console.log('Dimensions:', {
                x, y, width, height,
                canvasWidth: overlay.width,
                canvasHeight: overlay.height
            });
        }
    }
    
    // Create a wrapper div if not exists
    let wrapper = image.parentElement;
    if (!wrapper.classList.contains('gigachad-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.classList.add('gigachad-wrapper');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        image.parentElement.insertBefore(wrapper, image);
        wrapper.appendChild(image);
    }
    
    wrapper.appendChild(overlay);
}

// Add message listener for toggle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleGigachad') {
        if (!message.enabled) {
            // Remove all gigachad overlays
            document.querySelectorAll('.gigachad-wrapper canvas').forEach(canvas => {
                canvas.remove();
            });
        } else {
            // Reprocess images
            processImages();
        }
    }
});

init();
