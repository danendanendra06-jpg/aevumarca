/**
 * ChainCapsule - Main Web3 Frontend Script
 */

const CONTRACT_ADDRESS = "0x2B35116C58093935f35BE1f7c487C5a02cd835D8";
const BOT_CHAIN_ID_HEX = "0x3c8"; // 968 dalam desimal

const CONTRACT_ABI = [
	{
		"anonymous": false,
		"inputs": [
			{ "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
			{ "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
			{ "indexed": false, "internalType": "string", "name": "message", "type": "string" },
			{ "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
		],
		"name": "CapsuleCreated",
		"type": "event"
	},
	{
		"inputs": [{ "internalType": "string", "name": "_message", "type": "string" }],
		"name": "createCapsule",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getAllCapsules",
		"outputs": [
			{
				"components": [
					{ "internalType": "string", "name": "message", "type": "string" },
					{ "internalType": "address", "name": "creator", "type": "address" },
					{ "internalType": "uint256", "name": "timestamp", "type": "uint256" }
				],
				"internalType": "struct TimeCapsule.Capsule[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [{ "internalType": "address", "name": "_creator", "type": "address" }],
		"name": "getCapsulesByCreator",
		"outputs": [
			{
				"components": [
					{ "internalType": "string", "name": "message", "type": "string" },
					{ "internalType": "address", "name": "creator", "type": "address" },
					{ "internalType": "uint256", "name": "timestamp", "type": "uint256" }
				],
				"internalType": "struct TimeCapsule.Capsule[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getCapsulesCount",
		"outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
		"stateMutability": "view",
		"type": "function"
	}
];

let provider;
let signer;
let contract;

document.addEventListener('DOMContentLoaded', () => {
    console.log("ChainCapsule UI loaded successfully.");

    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const walletBtnText = document.getElementById('walletBtnText');
    const userAddressDisplay = document.getElementById('userAddressDisplay');
    const networkBadge = document.getElementById('networkBadge');
    const networkName = document.getElementById('networkName');
    const networkBanner = document.getElementById('networkBanner');
    const switchNetworkBtn = document.getElementById('switchNetworkBtn');
    
    const messageInput = document.getElementById('messageInput');
    const charCounter = document.getElementById('charCounter');
    const submitCapsuleBtn = document.getElementById('submitCapsuleBtn');
    const btnSpinner = document.getElementById('btnSpinner');
    const submitBtnText = document.getElementById('submitBtnText');
    
    const refreshBtn = document.getElementById('refreshBtn');
    const capsulesList = document.getElementById('capsulesList');
    const emptyState = document.getElementById('emptyState');
    const capsulesCountBadge = document.getElementById('capsulesCountBadge');

    // 1. Real-time Character Counter
    if (messageInput && charCounter) {
        messageInput.addEventListener('input', (e) => {
            const length = e.target.value.length;
            charCounter.textContent = length;
        });
    }

    // 2. Connect Wallet Handler
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', async () => {
            if (typeof window.ethereum === 'undefined') {
                alert("Silakan instal ekstensi MetaMask terlebih dahulu!");
                return;
            }
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                await initWeb3();
            } catch (err) {
                console.error("Gagal konek wallet:", err);
            }
        });
    }

    // 3. Switch Network Handler
    if (switchNetworkBtn) {
        switchNetworkBtn.addEventListener('click', async () => {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BOT_CHAIN_ID_HEX }],
                });
                location.reload();
            } catch (switchError) {
                // Jika jaringan belum ada di metamask, tambahkan otomatis
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: BOT_CHAIN_ID_HEX,
                                chainName: 'BOT Chain Testnet',
                                rpcUrls: ['https://rpc.bohr.life'],
                                nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 }
                            }]
                        });
                    } catch (addError) {
                        console.error("Gagal menambahkan jaringan:", addError);
                    }
                }
            }
        });
    }

    // Inisialisasi Web3 & Cek Jaringan
    async function initWeb3() {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            const network = await provider.getNetwork();
            
            if (network.chainId !== 968) {
                if (networkBanner) networkBanner.classList.remove('hidden');
                if (networkBadge) {
                    networkBadge.className = "network-badge disconnected";
                    if (networkName) networkName.textContent = "Wrong Network";
                }
                if (submitCapsuleBtn) submitCapsuleBtn.disabled = true;
                return;
            } else {
                if (networkBanner) networkBanner.classList.add('hidden');
                if (networkBadge) {
                    networkBadge.className = "network-badge connected";
                    if (networkName) networkName.textContent = "BOT Chain Testnet";
                }
                if (submitCapsuleBtn) submitCapsuleBtn.disabled = false;
            }

            signer = provider.getSigner();
            const address = await signer.getAddress();
            const shortAddr = address.substring(0, 6) + "..." + address.substring(address.length - 4);
            
            if (walletBtnText) walletBtnText.textContent = shortAddr;
            if (userAddressDisplay) userAddressDisplay.textContent = `Wallet: ${shortAddr}`;
            
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            
            // Muat daftar kapsul dari blockchain
            loadCapsules();
        } catch (e) {
            console.error("Inisialisasi web3 error:", e);
        }
    }

    // 4. Submit / Create Capsule Handler
    if (submitCapsuleBtn) {
        submitCapsuleBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const message = messageInput ? messageInput.value.trim() : "";
            if (!message) {
                alert("Pesan tidak boleh kosong!");
                return;
            }

            try {
                if (btnSpinner) btnSpinner.classList.remove('hidden');
                if (submitBtnText) submitBtnText.textContent = "Saving to Blockchain...";
                submitCapsuleBtn.disabled = true;

                const tx = await contract.createCapsule(message);
                console.log("Transaksi dikirim:", tx.hash);
                
                await tx.wait();
                alert("Berhasil! TimeCapsule kamu berhasil disimpan secara permanen di blockchain!");
                
                if (messageInput) messageInput.value = "";
                if (charCounter) charCounter.textContent = "0";
                
                loadCapsules(); // Refresh daftar kapsul
            } catch (error) {
                console.error("Gagal buat kapsul:", error);
                alert("Gagal mengirim transaksi: " + (error.reason || error.message));
            } finally {
                if (btnSpinner) btnSpinner.classList.add('hidden');
                if (submitBtnText) submitBtnText.textContent = "Save Capsule to Blockchain";
                submitCapsuleBtn.disabled = false;
            }
        });
    }

    // 5. Load & Display Capsules from Smart Contract
    async function loadCapsules() {
        if (!contract) return;
        try {
            const capsules = await contract.getAllCapsules();
            if (capsulesCountBadge) capsulesCountBadge.textContent = `${capsules.length} Capsules`;

            if (capsules.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }

            if (emptyState) emptyState.style.display = 'none';
            if (capsulesList) {
                // Bersihkan list lama kecuali emptyState
                const cards = capsulesList.querySelectorAll('.capsule-card');
                cards.forEach(c => c.remove());

                // Render dari yang terbaru (reverse)
                for (let i = capsules.length - 1; i >= 0; i--) {
                    const cap = capsules[i];
                    const date = new Date(cap.timestamp.toNumber() * 1000).toLocaleString();
                    const shortCreator = cap.creator.substring(0, 6) + "..." + cap.creator.substring(cap.creator.length - 4);

                    const card = document.createElement('div');
                    card.className = 'capsule-card glass-card';
                    card.innerHTML = `
                        <p class="capsule-msg">"${escapeHtml(cap.message)}"</p>
                        <div class="capsule-footer">
                            <span class="capsule-author" title="${cap.creator}">By: ${shortCreator}</span>
                            <span class="capsule-date">${date}</span>
                        </div>
                    `;
                    capsulesList.appendChild(card);
                }
            }
        } catch (err) {
            console.error("Gagal mengambil data kapsul:", err);
        }
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadCapsules();
        });
    }

    // Helper untuk keamanan teks
    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Cek koneksi awal jika window.ethereum ada
    if (window.ethereum) {
        initWeb3();
        window.ethereum.on('accountsChanged', () => location.reload());
        window.ethereum.on('networkChanged', () => location.reload());
    }
});