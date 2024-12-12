const express = require('express');
const axios = require('axios');
const rembg = require('rembg');
const sharp = require('sharp');
const { exec } = require('child_process');
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Define a root route to handle GET requests to "/"
app.get('/', (req, res) => {
    res.send('Background Removal API is running');
});

// POST endpoint to remove background
app.post('/remove-bg', async (req, res) => {
    try {
        const { image_url, bounding_box } = req.body;

        // Validate input
        if (!image_url || !bounding_box) {
            return res.status(400).json({ error: "Invalid input. Provide 'image_url' and 'bounding_box'." });
        }

        const { x_min, y_min, x_max, y_max } = bounding_box;

        // Fetch the image from the URL
        const response = await axios({
            url: image_url,
            method: "GET",
            responseType: "arraybuffer"
        });

        // Convert image data to a buffer
        const imageBuffer = Buffer.from(response.data, "binary");

        // Crop the image based on bounding box coordinates
        const croppedImageBuffer = await sharp(imageBuffer)
            .extract({ left: x_min, top: y_min, width: x_max - x_min, height: y_max - y_min })
            .toBuffer();

        // Remove the background from the cropped image using rembg
        const processedImageBuffer = await rembg.removeBackground(croppedImageBuffer);

        // Create a buffer for the processed image, instead of saving it to the filesystem
        const processedImageBase64 = processedImageBuffer.toString('base64');

        // Return the URL of the processed image
        res.status(200).json({
            original_image_url: image_url,
            processed_image_base64: `data:image/png;base64,${processedImageBase64}`,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to process the image" });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
