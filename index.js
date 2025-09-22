require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('node:crypto');
const { ethers } = require('ethers');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer with file size limit (10MB)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Connect to blockchain
const provider = new ethers.JsonRpcProvider('http://localhost:8545');
const contractAddress = process.env.CONTRACT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

if (!contractAddress) {
    console.error("❌ Error: CONTRACT_ADDRESS is not set in the .env file.");
    console.log("💡 Please run 'npm run deploy' first to deploy the contract.");
    process.exit(1);
}

if (!privateKey) {
    console.error("❌ Error: PRIVATE_KEY is not set in the .env file.");
    process.exit(1);
}

const contractABI = [
    "function uploadFile(bytes32) public",
    "function verifyFile(bytes32) public view returns (bool)",
    "event FileUploaded(bytes32 indexed hash)"
];

const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

console.log("🌐 Connected to blockchain at http://localhost:8545");
console.log("📝 Contract Address:", contractAddress);
console.log("👤 Wallet Address:", wallet.address);

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ 
                error: "No file uploaded",
                success: false 
            });
        }
        
        const hash = "0x" + crypto.createHash("sha256").update(file.buffer).digest("hex");
        console.log("📤 Uploading file:", file.originalname);
        console.log("🔑 File hash:", hash);
        console.log("📏 File size:", (file.size / 1024).toFixed(2), "KB");
        
        // Check if file already exists
        const exists = await contract.verifyFile(hash);
        if (exists) {
            return res.status(409).json({
                error: "File already exists on blockchain",
                hash,
                success: false
            });
        }
        
        const tx = await contract.uploadFile(hash);
        console.log("⏳ Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        
        res.json({ 
            message: "File uploaded successfully to blockchain",
            hash,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            fileName: file.originalname,
            fileSize: file.size,
            success: true
        });
    } catch (err) {
        console.error("❌ Upload error:", err.message);
        res.status(500).json({ 
            error: err.message,
            success: false 
        });
    }
});

app.post("/verify", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ 
                error: "No file uploaded",
                success: false 
            });
        }
        
        const hash = "0x" + crypto.createHash("sha256").update(file.buffer).digest("hex");
        console.log("🔍 Verifying file:", file.originalname);
        console.log("🔑 File hash:", hash);
        
        const isValid = await contract.verifyFile(hash);
        
        console.log("✅ Verification result:", isValid ? "VERIFIED" : "NOT FOUND");
        
        res.json({ 
            valid: isValid,
            hash,
            fileName: file.originalname,
            fileSize: file.size,
            message: isValid ? "File is verified and authentic" : "File not found on blockchain or has been tampered with",
            success: true
        });
    } catch (err) {
        console.error("❌ Verification error:", err.message);
        res.status(500).json({ 
            error: err.message,
            success: false 
        });
    }
});

// Health check endpoint
app.get("/health", async (req, res) => {
    try {
        // Check blockchain connection
        const network = await provider.getNetwork();
        const balance = await provider.getBalance(wallet.address);
        
        res.json({
            status: "healthy",
            blockchain: {
                connected: true,
                network: network.name,
                chainId: network.chainId.toString()
            },
            contract: {
                address: contractAddress,
                walletBalance: ethers.formatEther(balance)
            },
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }
        });
    } catch (err) {
        res.status(500).json({
            status: "unhealthy",
            error: err.message
        });
    }
});

// Get contract info
app.get("/contract-info", (req, res) => {
    res.json({
        contractAddress,
        walletAddress: wallet.address,
        networkUrl: "http://localhost:8545"
    });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("📡 Available endpoints:");
    console.log("  POST /upload  - Upload file hash to blockchain");
    console.log("  POST /verify  - Verify file against blockchain");
    console.log("  GET  /health  - Health check");
    console.log("  GET  /contract-info - Contract information");
});