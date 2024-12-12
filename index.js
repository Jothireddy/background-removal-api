const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// POST endpoint to remove background
app.post('/remove-background', async (req, res) => {
    const { image_url, bounding_box } = req.body;

    // Validate input
    if (!image_url || !bounding_box) {
        return res.status(400).json({ error: "Missing image URL or bounding box coordinates" });
    }

    const { x_min, y_min, x_max, y_max } = bounding_box;

    try {
        // Fetch the image from the URL
        const imageResponse = await axios.get(image_url, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        // Ensure the 'temp' directory exists
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        // Save the image temporarily as a file for processing
        const tempImagePath = path.join(tempDir, 'temp_image.png');
        fs.writeFileSync(tempImagePath, imageBuffer);

        // Generate a processed image filename
        const processedImageFilename = `processed_${Date.now()}.png`;
        const processedImagePath = path.join(__dirname, 'output', processedImageFilename);

        // Run rembg as a child process to remove background
        exec(`rembg i "${tempImagePath}" "${processedImagePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return res.status(500).json({ error: "Failed to process the image" });
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            console.log(`stdout: ${stdout}`);

            // Return the URL of the processed image
            const publicUrl = `${req.protocol}://${req.get('host')}/output/${processedImageFilename}`;
            res.status(200).json({
                original_image_url: image_url,
                processed_image_url: publicUrl
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to process the image" });
    }
});

// Serve the processed image from the 'output' directory
app.use('/output', express.static(path.join(__dirname, 'output')));

// Start the API server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
