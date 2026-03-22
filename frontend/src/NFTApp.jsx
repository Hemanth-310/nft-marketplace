import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import ArtNFTABI from "./abis/ArtNFT.json";
import MarketplaceABI from "./abis/NFTMarketplace.json";

export default function NFTApp() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [marketContract, setMarketContract] = useState(null);

  const [myNFTs, setMyNFTs] = useState([]);
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState("mint");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [proceeds, setProceeds] = useState("0");

  const [mintName, setMintName] = useState("");
  const [mintDesc, setMintDesc] = useState("");
  const [mintImage, setMintImage] = useState("");
  const [imageMode, setImageMode] = useState("url");
  const [listTokenId, setListTokenId] = useState("");
  const [listPrice, setListPrice] = useState("");

  // ── Auto reconnect on reload ──────────────────────────────────
  useEffect(() => {
    async function tryAutoConnect() {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        await setupContracts(accounts[0]);
      }
    }
    tryAutoConnect();
  }, []);

  async function setupContracts(accountAddress) {
    const _provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    const _signer = _provider.getSigner();
    const nft = new ethers.Contract(ArtNFTABI.address, ArtNFTABI.abi, _signer);
    const market = new ethers.Contract(MarketplaceABI.address, MarketplaceABI.abi, _signer);
    setProvider(_provider);
    setSigner(_signer);
    setAccount(accountAddress);
    setNftContract(nft);
    setMarketContract(market);
  }

  async function connect() {
    if (!window.ethereum) { setError("MetaMask not found"); return; }
    setError(null);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      await setupContracts(accounts[0]);
      window.ethereum.on("accountsChanged", (accs) => {
        if (accs.length === 0) disconnect();
        else setupContracts(accs[0]);
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    } catch (err) {
      setError(err.message);
    }
  }

  function disconnect() {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setNftContract(null);
    setMarketContract(null);
    setMyNFTs([]);
    setListings([]);
    setProceeds("0");
  }

  // ── Load data ─────────────────────────────────────────────────
  const loadProceeds = useCallback(async () => {
    if (!marketContract || !account) return;
    try {
      const p = await marketContract.proceeds(account);
      setProceeds(ethers.utils.formatEther(p));
    } catch {}
  }, [marketContract, account]);

  const loadMyNFTs = useCallback(async () => {
    if (!nftContract || !account) return;
    try {
      const total = await nftContract.totalMinted();
      const owned = [];
      for (let i = 0; i < total.toNumber(); i++) {
        try {
          const owner = await nftContract.ownerOf(i);
          if (owner.toLowerCase() === account.toLowerCase()) {
            const uri = await nftContract.tokenURI(i);
            const listing = await marketContract.getListing(ArtNFTABI.address, i);
            owned.push({
              tokenId: i,
              uri,
              isListed: listing.active,
              listPrice: listing.active ? ethers.utils.formatEther(listing.price) : null
            });
          }
        } catch {}
      }
      setMyNFTs(owned);
    } catch (err) {
      console.error("loadMyNFTs error:", err);
    }
  }, [nftContract, marketContract, account]);

  const loadListings = useCallback(async () => {
    if (!nftContract || !marketContract) return;
    try {
      const total = await nftContract.totalMinted();
      const active = [];
      for (let i = 0; i < total.toNumber(); i++) {
        try {
          const listing = await marketContract.getListing(ArtNFTABI.address, i);
          if (listing.active) {
            const uri = await nftContract.tokenURI(i);
            const owner = await nftContract.ownerOf(i);
            active.push({
              tokenId: i,
              seller: listing.seller,
              price: ethers.utils.formatEther(listing.price),
              priceWei: listing.price,
              uri,
              isOwner: owner.toLowerCase() === account?.toLowerCase()
            });
          }
        } catch {}
      }
      setListings(active);
    } catch (err) {
      console.error("loadListings error:", err);
    }
  }, [nftContract, marketContract, account]);

  useEffect(() => {
    if (!nftContract) return;
    loadMyNFTs();
    loadListings();
    loadProceeds();
    const id = setInterval(() => {
      loadMyNFTs();
      loadListings();
      loadProceeds();
    }, 8000);
    return () => clearInterval(id);
  }, [loadMyNFTs, loadListings, loadProceeds, nftContract]);

  // ── Image upload with compression ─────────────────────────────
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size — warn if over 1MB
    if (file.size > 1024 * 1024) {
      setError("Image too large. It will be compressed automatically.");
      setTimeout(() => setError(null), 3000);
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (ev) => {
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 400;
        let w = img.width;
        let h = img.height;

        if (w > h) {
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        } else {
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        }

        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);

        // Compress to JPEG 50% quality to keep tx size small
        const compressed = canvas.toDataURL("image/jpeg", 0.5);

        // Check if still too large
        if (compressed.length > 50000) {
          setError("Image still too large after compression. Please use a smaller image or paste a URL instead.");
          return;
        }

        setMintImage(compressed);
        setError(null);
      };
    };
    reader.readAsDataURL(file);
  }

  // ── Actions ───────────────────────────────────────────────────
  async function mint() {
    if (!mintName || !mintImage) {
      setError("Name and image are required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const metadata = JSON.stringify({
        name: mintName,
        description: mintDesc,
        image: mintImage
      });
      const uri = "data:application/json;base64," + btoa(unescape(encodeURIComponent(metadata)));
      const tx = await nftContract.mint(uri);
      setTxHash(tx.hash);
      await tx.wait();
      setMintName("");
      setMintDesc("");
      setMintImage("");
      await loadMyNFTs();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function listNFT() {
    if (!listTokenId || !listPrice) {
      setError("Token ID and price are required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const priceWei = ethers.utils.parseEther(listPrice);
      const tx = await marketContract.listItem(ArtNFTABI.address, listTokenId, priceWei);
      setTxHash(tx.hash);
      await tx.wait();
      setListTokenId("");
      setListPrice("");
      await loadMyNFTs();
      await loadListings();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function buyNFT(tokenId, priceWei) {
    setError(null);
    setLoading(true);
    try {
      const tx = await marketContract.buyItem(ArtNFTABI.address, tokenId, { value: priceWei });
      setTxHash(tx.hash);
      await tx.wait();
      await loadMyNFTs();
      await loadListings();
      await loadProceeds();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelListing(tokenId) {
    setError(null);
    setLoading(true);
    try {
      const tx = await marketContract.cancelListing(ArtNFTABI.address, tokenId);
      setTxHash(tx.hash);
      await tx.wait();
      await loadMyNFTs();
      await loadListings();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function withdraw() {
    setError(null);
    setLoading(true);
    try {
      const tx = await marketContract.withdrawProceeds();
      setTxHash(tx.hash);
      await tx.wait();
      await loadProceeds();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  function shortAddr(addr) {
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
  }

  function getImage(uri) {
    try {
      if (uri.startsWith("data:application/json;base64,")) {
        const json = JSON.parse(atob(uri.split(",")[1]));
        return json.image;
      }
      return uri;
    } catch { return null; }
  }

  function getName(uri) {
    try {
      if (uri.startsWith("data:application/json;base64,")) {
        const json = JSON.parse(atob(uri.split(",")[1]));
        return json.name;
      }
      return "NFT";
    } catch { return "NFT"; }
  }

  function getDesc(uri) {
    try {
      if (uri.startsWith("data:application/json;base64,")) {
        const json = JSON.parse(atob(uri.split(",")[1]));
        return json.description;
      }
      return "";
    } catch { return ""; }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-bold text-purple-400">◈ ArtVault NFT</div>

        {account ? (
          <div className="flex items-center gap-3">
            {parseFloat(proceeds) > 0 && (
              <button
                onClick={withdraw}
                disabled={loading}
                className="text-xs bg-green-900 border border-green-700 hover:bg-green-800 text-green-300 px-3 py-1.5 rounded-lg transition"
              >
                Withdraw {parseFloat(proceeds).toFixed(4)} ETH
              </button>
            )}
            <div className="bg-gray-800 border border-gray-700 rounded-full px-4 py-1 text-sm text-gray-300">
              {shortAddr(account)}
            </div>
            <button
              onClick={disconnect}
              className="text-xs bg-red-950 border border-red-800 hover:bg-red-900 text-red-400 px-3 py-1.5 rounded-lg transition"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold transition"
          >
            Connect Wallet
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {!account ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-6">◈</div>
            <h1 className="text-4xl font-bold text-purple-400 mb-4">Mint. List. Collect.</h1>
            <p className="text-gray-400 mb-8">Connect your wallet to mint NFTs and trade on the marketplace.</p>
            <button
              onClick={connect}
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl text-lg font-semibold transition"
            >
              Connect MetaMask
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-800 mb-8">
              {["mint", "my nfts", "marketplace"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-6 py-3 text-sm font-medium capitalize transition ${
                    activeTab === t
                      ? "text-purple-400 border-b-2 border-purple-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Mint Tab */}
            {activeTab === "mint" && (
              <div className="max-w-lg mx-auto">
                <h2 className="text-2xl font-bold mb-6">Mint New NFT</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Name *</label>
                    <input
                      type="text"
                      placeholder="My Awesome NFT"
                      value={mintName}
                      onChange={(e) => setMintName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                    <textarea
                      placeholder="Describe your NFT..."
                      value={mintDesc}
                      onChange={(e) => setMintDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Image *</label>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => { setImageMode("url"); setMintImage(""); }}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${
                          imageMode === "url"
                            ? "bg-purple-600 border-purple-500 text-white"
                            : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                        }`}
                      >
                        Paste Link
                      </button>
                      <button
                        onClick={() => { setImageMode("upload"); setMintImage(""); }}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${
                          imageMode === "upload"
                            ? "bg-purple-600 border-purple-500 text-white"
                            : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                        }`}
                      >
                        Upload File
                      </button>
                    </div>

                    {imageMode === "url" ? (
                      <input
                        type="text"
                        placeholder="https://... or ipfs://..."
                        value={mintImage}
                        onChange={(e) => setMintImage(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500"
                      />
                    ) : (
                      <div
                        className="w-full bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl px-4 py-8 text-center cursor-pointer hover:border-purple-500 transition"
                        onClick={() => document.getElementById("fileInput").click()}
                      >
                        <input
                          id="fileInput"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        {mintImage ? (
                          <div>
                            <p className="text-green-400 text-sm">✅ Image ready</p>
                            <p className="text-gray-500 text-xs mt-1">Click to change</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-400 text-sm">Click to upload image</p>
                            <p className="text-gray-600 text-xs mt-1">PNG, JPG, GIF — will be compressed automatically</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {mintImage && (
                    <div className="rounded-xl overflow-hidden border border-gray-700">
                      <img
                        src={mintImage}
                        alt="preview"
                        className="w-full h-48 object-cover"
                        onError={(e) => e.target.style.display = "none"}
                      />
                    </div>
                  )}

                  <button
                    onClick={mint}
                    disabled={loading || !mintName || !mintImage}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition"
                  >
                    {loading ? "Minting..." : "Mint NFT"}
                  </button>
                </div>
              </div>
            )}

            {/* My NFTs Tab */}
            {activeTab === "my nfts" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">My NFTs</h2>
                  <span className="text-gray-400 text-sm">{myNFTs.length} owned</span>
                </div>
                {myNFTs.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-3">◈</p>
                    <p>You don't own any NFTs yet. Mint one first.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myNFTs.map((nft) => (
                      <div key={nft.tokenId} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        <div className="h-48 bg-gray-800 overflow-hidden">
                          {getImage(nft.uri) ? (
                            <img src={getImage(nft.uri)} alt={getName(nft.uri)} className="w-full h-full object-cover" onError={(e) => e.target.style.display = "none"} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">◈</div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-white">{getName(nft.uri)}</h3>
                            <span className="text-xs text-gray-500">#{nft.tokenId}</span>
                          </div>
                          {getDesc(nft.uri) && (
                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{getDesc(nft.uri)}</p>
                          )}
                          {nft.isListed ? (
                            <div className="space-y-2">
                              <div className="text-xs text-purple-400 bg-purple-950 border border-purple-800 rounded-lg px-3 py-1 text-center">
                                Listed for {nft.listPrice} ETH
                              </div>
                              <button
                                onClick={() => cancelListing(nft.tokenId)}
                                disabled={loading}
                                className="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-300 py-2 rounded-xl text-sm font-medium transition"
                              >
                                Cancel Listing
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                type="number"
                                placeholder="ETH price"
                                value={listTokenId === String(nft.tokenId) ? listPrice : ""}
                                onChange={(e) => { setListTokenId(String(nft.tokenId)); setListPrice(e.target.value); }}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500"
                              />
                              <button
                                onClick={() => { setListTokenId(String(nft.tokenId)); listNFT(); }}
                                disabled={loading || listTokenId !== String(nft.tokenId) || !listPrice}
                                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                              >
                                List
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Marketplace Tab */}
            {activeTab === "marketplace" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Marketplace</h2>
                  <span className="text-gray-400 text-sm">{listings.length} listings</span>
                </div>
                {listings.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-3">◈</p>
                    <p>No NFTs listed for sale yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((item) => (
                      <div key={item.tokenId} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        <div className="h-48 bg-gray-800 overflow-hidden">
                          {getImage(item.uri) ? (
                            <img src={getImage(item.uri)} alt={getName(item.uri)} className="w-full h-full object-cover" onError={(e) => e.target.style.display = "none"} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">◈</div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-white">{getName(item.uri)}</h3>
                            <span className="text-xs text-gray-500">#{item.tokenId}</span>
                          </div>
                          {getDesc(item.uri) && (
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{getDesc(item.uri)}</p>
                          )}
                          <p className="text-xs text-gray-600 mb-3">Seller: {shortAddr(item.seller)}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-purple-400 font-bold">{item.price} ETH</span>
                            {item.isOwner ? (
                              <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-lg">Your listing</span>
                            ) : (
                              <button
                                onClick={() => buyNFT(item.tokenId, item.priceWei)}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                              >
                                {loading ? "Buying..." : "Buy Now"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {txHash && (
              <div className="mt-6 bg-green-950 border border-green-800 text-green-400 rounded-xl px-4 py-3 text-sm">
                ✅ Transaction confirmed: {txHash.slice(0, 30)}...
              </div>
            )}
            {error && (
              <div className="mt-6 bg-red-950 border border-red-800 text-red-400 rounded-xl px-4 py-3 text-sm">
                ⚠️ {error}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}