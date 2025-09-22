const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FileVerification", function () {
  let fileVerification;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const FileVerification = await ethers.getContractFactory("FileVerification");
    fileVerification = await FileVerification.deploy();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(fileVerification.target).to.be.properAddress;
    });
  });

  describe("File Upload", function () {
    it("Should upload a file hash successfully", async function () {
      const testHash = ethers.keccak256(ethers.toUtf8Bytes("test file content"));
      
      await expect(fileVerification.uploadFile(testHash))
        .to.emit(fileVerification, "FileUploaded")
        .withArgs(testHash);

      expect(await fileVerification.verifyFile(testHash)).to.be.true;
    });

    it("Should reject duplicate file hash", async function () {
      const testHash = ethers.keccak256(ethers.toUtf8Bytes("test file content"));
      
      await fileVerification.uploadFile(testHash);
      
      await expect(fileVerification.uploadFile(testHash))
        .to.be.revertedWith("File already uploaded");
    });

    it("Should allow different users to upload different files", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("file1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("file2"));
      
      await fileVerification.connect(owner).uploadFile(hash1);
      await fileVerification.connect(addr1).uploadFile(hash2);
      
      expect(await fileVerification.verifyFile(hash1)).to.be.true;
      expect(await fileVerification.verifyFile(hash2)).to.be.true;
    });
  });

  describe("File Verification", function () {
    it("Should return false for non-existent file", async function () {
      const testHash = ethers.keccak256(ethers.toUtf8Bytes("non-existent file"));
      
      expect(await fileVerification.verifyFile(testHash)).to.be.false;
    });

    it("Should return true for uploaded file", async function () {
      const testHash = ethers.keccak256(ethers.toUtf8Bytes("test file"));
      
      await fileVerification.uploadFile(testHash);
      
      expect(await fileVerification.verifyFile(testHash)).to.be.true;
    });

    it("Should work with multiple files", async function () {
      const hashes = [
        ethers.keccak256(ethers.toUtf8Bytes("file1")),
        ethers.keccak256(ethers.toUtf8Bytes("file2")),
        ethers.keccak256(ethers.toUtf8Bytes("file3"))
      ];
      
      // Upload first two files
      await fileVerification.uploadFile(hashes[0]);
      await fileVerification.uploadFile(hashes[1]);
      
      // Verify uploaded files return true
      expect(await fileVerification.verifyFile(hashes[0])).to.be.true;
      expect(await fileVerification.verifyFile(hashes[1])).to.be.true;
      
      // Verify non-uploaded file returns false
      expect(await fileVerification.verifyFile(hashes[2])).to.be.false;
    });
  });

  describe("Gas Usage", function () {
    it("Should have reasonable gas costs", async function () {
      const testHash = ethers.keccak256(ethers.toUtf8Bytes("gas test file"));
      
      const tx = await fileVerification.uploadFile(testHash);
      const receipt = await tx.wait();
      
      // Gas usage should be reasonable (less than 100k gas)
      expect(receipt.gasUsed).to.be.lessThan(100000);
    });
  });
});
