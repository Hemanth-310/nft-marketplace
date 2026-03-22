// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArtNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    address public marketplace;

    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor(address initialOwner) ERC721("ArtNFT", "ART") Ownable(initialOwner) {}

    function setMarketplace(address _marketplace) external onlyOwner {
        marketplace = _marketplace;
    }

    function mint(string calldata tokenURI_) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        emit NFTMinted(msg.sender, tokenId, tokenURI_);
        return tokenId;
    }

    // Auto approve marketplace so sellers don't need a separate approve step
    function isApprovedForAll(address owner_, address operator)
        public view override(ERC721, IERC721) returns (bool)
    {
        if (operator == marketplace) return true;
        return super.isApprovedForAll(owner_, operator);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}