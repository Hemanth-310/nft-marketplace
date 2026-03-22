const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy ArtNFT
  const ArtNFT = await ethers.getContractFactory("ArtNFT");
  const nft = await ArtNFT.deploy(deployer.address);
  await nft.deployed();
  console.log("ArtNFT deployed to:", nft.address);

  // Deploy NFTMarketplace with 2.5% fee
  const Marketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await Marketplace.deploy(deployer.address, 250);
  await marketplace.deployed();
  console.log("NFTMarketplace deployed to:", marketplace.address);

  // Link marketplace to NFT contract
  const tx = await nft.setMarketplace(marketplace.address);
  await tx.wait();
  console.log("Marketplace linked to NFT contract");

  // Save ABIs to frontend
  const out = path.join(__dirname, "../frontend/src/abis");
  fs.mkdirSync(out, { recursive: true });

  const nftArtifact = require("../artifacts/contracts/ArtNFT.sol/ArtNFT.json");
  const mktArtifact = require("../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json");

  fs.writeFileSync(
    path.join(out, "ArtNFT.json"),
    JSON.stringify({ address: nft.address, abi: nftArtifact.abi }, null, 2)
  );

  fs.writeFileSync(
    path.join(out, "NFTMarketplace.json"),
    JSON.stringify({ address: marketplace.address, abi: mktArtifact.abi }, null, 2)
  );

  console.log("ABI files saved to frontend/src/abis/");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});