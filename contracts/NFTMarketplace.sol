// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ReentrancyGuard, Ownable {

    uint96 public feeBps; // platform fee in basis points e.g. 250 = 2.5%

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    // nftContract => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // seller => accumulated ETH they can withdraw
    mapping(address => uint256) public proceeds;

    event Listed(address indexed nftContract, uint256 indexed tokenId, address indexed seller, uint256 price);
    event Cancelled(address indexed nftContract, uint256 indexed tokenId, address indexed seller);
    event Sold(address indexed nftContract, uint256 indexed tokenId, address indexed buyer, address seller, uint256 price);
    event ProceedsWithdrawn(address indexed seller, uint256 amount);

    constructor(address initialOwner, uint96 _feeBps) Ownable(initialOwner) {
        require(_feeBps <= 1000, "Fee too high");
        feeBps = _feeBps;
    }

    modifier onlySeller(address nftContract, uint256 tokenId) {
        require(listings[nftContract][tokenId].seller == msg.sender, "Not the seller");
        _;
    }

    modifier isListed(address nftContract, uint256 tokenId) {
        require(listings[nftContract][tokenId].active, "Not listed");
        _;
    }

    function listItem(address nftContract, uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be greater than 0");
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );

        listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit Listed(nftContract, tokenId, msg.sender, price);
    }

    function cancelListing(address nftContract, uint256 tokenId)
        external
        isListed(nftContract, tokenId)
        onlySeller(nftContract, tokenId)
    {
        delete listings[nftContract][tokenId];
        emit Cancelled(nftContract, tokenId, msg.sender);
    }

    function buyItem(address nftContract, uint256 tokenId)
        external
        payable
        nonReentrant
        isListed(nftContract, tokenId)
    {
        Listing memory item = listings[nftContract][tokenId];
        require(msg.value == item.price, "Wrong ETH amount");
        require(item.seller != msg.sender, "Cannot buy your own listing");

        // Remove listing before transfer to prevent reentrancy
        delete listings[nftContract][tokenId];

        uint256 fee = (item.price * feeBps) / 10_000;
        uint256 sellerProceeds = item.price - fee;

        proceeds[item.seller] += sellerProceeds;
        proceeds[owner()] += fee;

        IERC721(nftContract).safeTransferFrom(item.seller, msg.sender, tokenId);

        emit Sold(nftContract, tokenId, msg.sender, item.seller, item.price);
    }

    function withdrawProceeds() external nonReentrant {
        uint256 amount = proceeds[msg.sender];
        require(amount > 0, "No proceeds to withdraw");
        proceeds[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "ETH transfer failed");
        emit ProceedsWithdrawn(msg.sender, amount);
    }

    function getListing(address nftContract, uint256 tokenId)
        external view returns (Listing memory)
    {
        return listings[nftContract][tokenId];
    }

    receive() external payable {}
}