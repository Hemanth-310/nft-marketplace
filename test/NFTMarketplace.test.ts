const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Marketplace", function () {
  let nft: any, marketplace: any;
  let owner: any, alice: any, bob: any;

  const TOKEN_URI = "ipfs://QmExampleHash/metadata.json";
  const PRICE = ethers.utils.parseEther("0.1");
  const FEE_BPS = 250; // 2.5%

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const ArtNFT = await ethers.getContractFactory("ArtNFT");
    nft = await ArtNFT.deploy(owner.address);
    await nft.deployed();

    const Marketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await Marketplace.deploy(owner.address, FEE_BPS);
    await marketplace.deployed();

    // Link marketplace to NFT so auto-approval works
    await nft.connect(owner).setMarketplace(marketplace.address);
  });

  /* ─── Test 1: Minting ─── */
  it("should let a user mint an NFT and become the owner", async function () {
    const tx = await nft.connect(alice).mint(TOKEN_URI);
    const receipt = await tx.wait();

    const event = receipt.events.find((e: any) => e.event === "NFTMinted");
    const tokenId = event.args.tokenId;

    expect(await nft.ownerOf(tokenId)).to.equal(alice.address);
    expect(await nft.tokenURI(tokenId)).to.equal(TOKEN_URI);
  });

  /* ─── Test 2: Listing ─── */
  it("should let the owner list an NFT for sale", async function () {
    const tx = await nft.connect(alice).mint(TOKEN_URI);
    const receipt = await tx.wait();
    const event = receipt.events.find((e: any) => e.event === "NFTMinted");
    const tokenId = event.args.tokenId;

    await marketplace.connect(alice).listItem(nft.address, tokenId, PRICE);

    const listing = await marketplace.getListing(nft.address, tokenId);
    expect(listing.seller).to.equal(alice.address);
    expect(listing.price).to.equal(PRICE);
    expect(listing.active).to.be.true;
  });

  /* ─── Test 3: Buying ─── */
  it("should transfer NFT to buyer and credit seller proceeds", async function () {
    const tx = await nft.connect(alice).mint(TOKEN_URI);
    const receipt = await tx.wait();
    const event = receipt.events.find((e: any) => e.event === "NFTMinted");
    const tokenId = event.args.tokenId;

    await marketplace.connect(alice).listItem(nft.address, tokenId, PRICE);
    await marketplace.connect(bob).buyItem(nft.address, tokenId, { value: PRICE });

    // Bob now owns the NFT
    expect(await nft.ownerOf(tokenId)).to.equal(bob.address);

    // Alice got proceeds minus fee
    const fee = PRICE.mul(FEE_BPS).div(10000);
    const expected = PRICE.sub(fee);
    expect(await marketplace.proceeds(alice.address)).to.equal(expected);
  });

  /* ─── Test 4: Wrong ETH amount ─── */
  it("should revert if buyer sends wrong ETH amount", async function () {
    const tx = await nft.connect(alice).mint(TOKEN_URI);
    const receipt = await tx.wait();
    const event = receipt.events.find((e: any) => e.event === "NFTMinted");
    const tokenId = event.args.tokenId;

    await marketplace.connect(alice).listItem(nft.address, tokenId, PRICE);

    await expect(
      marketplace.connect(bob).buyItem(nft.address, tokenId, {
        value: PRICE.sub(1),
      })
    ).to.be.revertedWith("Wrong ETH amount");
  });

  /* ─── Test 5: Withdraw proceeds ─── */
  it("should let seller withdraw their proceeds", async function () {
    const tx = await nft.connect(alice).mint(TOKEN_URI);
    const receipt = await tx.wait();
    const event = receipt.events.find((e: any) => e.event === "NFTMinted");
    const tokenId = event.args.tokenId;

    await marketplace.connect(alice).listItem(nft.address, tokenId, PRICE);
    await marketplace.connect(bob).buyItem(nft.address, tokenId, { value: PRICE });

    const proceeds = await marketplace.proceeds(alice.address);
    expect(proceeds).to.be.gt(0);

    const balBefore = await ethers.provider.getBalance(alice.address);
    const wtx = await marketplace.connect(alice).withdrawProceeds();
    const wreceipt = await wtx.wait();
    const gasUsed = wreceipt.gasUsed.mul(wreceipt.effectiveGasPrice);
    const balAfter = await ethers.provider.getBalance(alice.address);

    expect(balAfter.sub(balBefore).add(gasUsed)).to.equal(proceeds);
  });
});