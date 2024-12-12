const express = require('express');
const axios = require('axios');
const { removeBackgroundFromImageUrl } = require('rembg');
const fs = require('fs');
const path = require('path');
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

app.post('/remove-background', async (req, res) => {
    const { image_url, bounding_box } = req.body;

    if (!image_url || !bounding_box) {
        return res.status(400).json({ error: "Missing image URL or bounding box coordinates" });
    }

    const { x_min, y_min, x_max, y_max } = bounding_box;

    try {
        // Fetch the image from the URL
        const imageResponse = await axios.get(image_url, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        // Crop the image based on bounding box coordinates (using an image processing library like sharp)
        const sharp = require('sharp');
        const croppedImageBuffer = await sharp(imageBuffer)
            .extract({ left: x_min, top: y_min, width: x_max - x_min, height: y_max - y_min })
            .toBuffer();

        // Remove the background from the cropped image using rembg
        const processedImageBuffer = await removeBackgroundFromImageUrl(croppedImageBuffer);

        // Save the processed image to a file (temporary location)
        const outputPath = path.join(__dirname, 'output', 'processed_image.png');
        fs.writeFileSync(outputPath, processedImageBuffer);

        // Return the URL of the processed image (for now, you can use a local server or Vercel to serve the image)
        res.status(200).json({
            original_image_url: image_url,
            processed_image_url: `https://your-vercel-deployment-url/output/processed_image.png`,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error processing the image" });
    }
});

// Serve the processed image from the 'output' directory
app.use('/output', express.static(path.join(__dirname, 'output')));

// Start the API server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
