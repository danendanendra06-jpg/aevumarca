/**
 * ChainCapsule - Web3 & MetaMask Frontend Script
 * Target Network: BOT Chain Testnet (Chain ID: 968 / 0x3c8)
 * Contract Address: 0x2B35116C58093935f35BE1f7c487C5a02cd835D8
 */

// ==========================================
// 1. Network & Contract Configurations
// ==========================================
const CONTRACT_ADDRESS = "0x2B35116C58093935f35BE1f7c487C5a02cd835D8";
const TARGET_CHAIN_ID_DECIMAL = 968;
const TARGET_CHAIN_ID_HEX = "0x3c8";
const BOT_RPC_URL = "https://rpc.bohr.life";

const BOT_CHAIN_CONFIG = {
    chainId: TARGET_CHAIN_ID_HEX,
    chainName: 'BOT Chain Testnet',
    nativeCurrency: {
        name: 'BOT',
        symbol: 'BOT',
        decimals: 18
    },
    rpcUrls: [BOT_RPC_URL],
    blockExplorerUrls: ['https://scan.botchain.ai/']
};

// Smart Contract ABI matching TimeCapsule.sol
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

// ==========================================
// 2. State Variables
// ==========================================
let provider = null;
let readOnlyProvider = null;
let signer = null;
let readOnlyContract = null;
let writeContract = null;
let userAddress = null;
let isConnected = false;
let isCorrectNetwork = false;

// ==========================================
// 3. Helper Functions
// ==========================================

function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined';
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 4. Web3 Initialization & Network Logic
// ==========================================

/**
 * Initializes read-only RPC provider so capsules load immediately
 */
function initReadOnlyProvider() {
    try {
        readOnlyProvider = new ethers.providers.JsonRpcProvider(BOT_RPC_URL);
        readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readOnlyProvider);
    } catch (e) {
        console.error("Failed to initialize read-only provider:", e);
    }
}

/**
 * Initializes MetaMask provider and verifies wallet/network connection
 */
async function initWeb3() {
    initReadOnlyProvider();

    if (!isMetaMaskInstalled()) {
        console.warn("MetaMask not detected. Running in read-only mode.");
        loadCapsules();
        updateUI();
        return;
    }

    try {
        provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            userAddress = accounts[0];
            signer = provider.getSigner();
            writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            isConnected = true;
        }

        await checkNetwork();
    } catch (error) {
        console.error("Error initializing Web3 provider:", error);
    } finally {
        loadCapsules();
        updateUI();
    }
}

/**
 * Request wallet connection via MetaMask
 */
async function connectWallet() {
    if (!isMetaMaskInstalled()) {
        alert("MetaMask extension not detected. Please install MetaMask to interact with ChainCapsule.");
        return;
    }

    try {
        const walletBtnText = document.getElementById('walletBtnText');
        if (walletBtnText) walletBtnText.textContent = 'Connecting...';

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length > 0) {
            userAddress = accounts[0];
            provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            signer = provider.getSigner();
            writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            isConnected = true;

            await checkNetwork();
        }
    } catch (error) {
        if (error.code === 4001) {
            console.log("User rejected wallet connection request.");
        } else {
            console.error("Failed to connect wallet:", error);
        }
    } finally {
        loadCapsules();
        updateUI();
    }
}

/**
 * Verifies current network chain ID
 */
async function checkNetwork() {
    if (!provider && isMetaMaskInstalled()) {
        provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    }

    if (!provider) {
        isCorrectNetwork = false;
        return;
    }

    try {
        const network = await provider.getNetwork();
        const currentChainId = network.chainId;

        if (currentChainId === TARGET_CHAIN_ID_DECIMAL || parseInt(currentChainId, 10) === TARGET_CHAIN_ID_DECIMAL) {
            isCorrectNetwork = true;
        } else {
            isCorrectNetwork = false;
        }
    } catch (error) {
        console.error("Error checking network chain ID:", error);
        isCorrectNetwork = false;
    }
}

/**
 * Switch to BOT Chain Testnet (or add network if missing)
 */
async function switchToBotChain() {
    if (!isMetaMaskInstalled()) return;

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: TARGET_CHAIN_ID_HEX }]
        });
    } catch (switchError) {
        if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [BOT_CHAIN_CONFIG]
                });
            } catch (addError) {
                console.error("Failed to add BOT Chain Testnet:", addError);
            }
        } else {
            console.error("Failed to switch network:", switchError);
        }
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        userAddress = null;
        signer = null;
        writeContract = null;
        isConnected = false;
        console.log("Wallet disconnected.");
    } else if (accounts[0] !== userAddress) {
        userAddress = accounts[0];
        signer = provider.getSigner();
        writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        isConnected = true;
        console.log("Switched account to:", userAddress);
    }
    checkNetwork().then(() => {
        loadCapsules();
        updateUI();
    });
}

function handleChainChanged(_chainIdHex) {
    console.log("Network changed:", _chainIdHex);
    window.location.reload();
}

// ==========================================
// 5. Smart Contract Read & Write Operations
// ==========================================

/**
 * Loads stored time capsules from BOT Chain smart contract and renders cards
 */
async function loadCapsules() {
    const activeContract = writeContract || readOnlyContract;
    if (!activeContract) return;

    const capsulesList = document.getElementById('capsulesList');
    const emptyState = document.getElementById('emptyState');
    const capsulesCountBadge = document.getElementById('capsulesCountBadge');

    try {
        const capsules = await activeContract.getAllCapsules();
        console.log(`Fetched ${capsules.length} capsules from BOT Chain contract.`);

        if (capsulesCountBadge) {
            capsulesCountBadge.textContent = `${capsules.length} Capsule${capsules.length === 1 ? '' : 's'}`;
        }

        if (capsules.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (capsulesList) {
                const cards = capsulesList.querySelectorAll('.capsule-card');
                cards.forEach(c => c.remove());
            }
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        if (capsulesList) {
            // Remove existing dynamic cards while preserving emptyState node
            const cards = capsulesList.querySelectorAll('.capsule-card');
            cards.forEach(c => c.remove());

            // Render capsules from newest to oldest
            for (let i = capsules.length - 1; i >= 0; i--) {
                const cap = capsules[i];
                const timestampNum = cap.timestamp.toNumber ? cap.timestamp.toNumber() : Number(cap.timestamp);
                const dateStr = new Date(timestampNum * 1000).toLocaleString();
                const shortCreator = formatAddress(cap.creator);

                const card = document.createElement('div');
                card.className = 'capsule-card glass-card';
                card.innerHTML = `
                    <p class="capsule-message">"${escapeHtml(cap.message)}"</p>
                    <div class="capsule-footer">
                        <div class="creator-info">
                            <span class="creator-label">Creator</span>
                            <span class="creator-address" title="${cap.creator}">${shortCreator}</span>
                        </div>
                        <span class="capsule-time">${dateStr}</span>
                    </div>
                `;
                capsulesList.appendChild(card);
            }
        }
    } catch (error) {
        console.error("Error fetching capsules from contract:", error);
    }
}

/**
 * Handles capsule creation submission to blockchain
 */
async function handleCreateCapsule(e) {
    if (e) e.preventDefault();

    const messageInput = document.getElementById('messageInput');
    const charCounter = document.getElementById('charCounter');
    const submitCapsuleBtn = document.getElementById('submitCapsuleBtn');
    const btnSpinner = document.getElementById('btnSpinner');
    const submitBtnText = document.getElementById('submitBtnText');

    if (!isConnected || !isCorrectNetwork) {
        alert("Please connect your wallet to BOT Chain Testnet first.");
        return;
    }

    const message = messageInput ? messageInput.value.trim() : "";
    if (!message) {
        alert("Capsule message cannot be empty!");
        return;
    }

    if (message.length > 500) {
        alert("Capsule message exceeds 500 characters limit.");
        return;
    }

    try {
        if (btnSpinner) btnSpinner.classList.remove('hidden');
        if (submitBtnText) submitBtnText.textContent = "Saving to Blockchain...";
        if (submitCapsuleBtn) submitCapsuleBtn.disabled = true;

        console.log("Sending transaction to create capsule...");
        const tx = await writeContract.createCapsule(message);
        console.log("Transaction broadcasted with hash:", tx.hash);

        await tx.wait();
        console.log("Transaction confirmed on BOT Chain Testnet!");
        alert("Success! Your time capsule has been permanently saved on BOT Chain Testnet.");

        if (messageInput) messageInput.value = "";
        if (charCounter) charCounter.textContent = "0";

        await loadCapsules();
    } catch (error) {
        console.error("Transaction failed:", error);
        if (error.code === 4001) {
            alert("Transaction was cancelled in MetaMask.");
        } else {
            alert("Failed to save capsule: " + (error.reason || error.message || "Unknown error"));
        }
    } finally {
        if (btnSpinner) btnSpinner.classList.add('hidden');
        if (submitBtnText) submitBtnText.textContent = "Save Capsule to Blockchain";
        updateUI();
    }
}

// ==========================================
// 6. UI Synchronization
// ==========================================

function updateUI() {
    const walletBtnText = document.getElementById('walletBtnText');
    const networkBadge = document.getElementById('networkBadge');
    const networkName = document.getElementById('networkName');
    const networkBanner = document.getElementById('networkBanner');
    const userAddressDisplay = document.getElementById('userAddressDisplay');
    const submitCapsuleBtn = document.getElementById('submitCapsuleBtn');
    const messageInput = document.getElementById('messageInput');

    // 1. Update Address Display
    if (isConnected && userAddress) {
        if (walletBtnText) walletBtnText.textContent = formatAddress(userAddress);
        if (userAddressDisplay) userAddressDisplay.textContent = `Wallet: ${formatAddress(userAddress)}`;
    } else {
        if (walletBtnText) walletBtnText.textContent = 'Connect Wallet';
        if (userAddressDisplay) userAddressDisplay.textContent = 'Wallet: Disconnected';
    }

    // 2. Update Network Badges
    if (!isConnected) {
        if (networkBadge) networkBadge.className = 'network-badge disconnected';
        if (networkName) networkName.textContent = 'Not Connected';
        if (networkBanner) networkBanner.classList.add('hidden');
    } else if (isCorrectNetwork) {
        if (networkBadge) networkBadge.className = 'network-badge connected';
        if (networkName) networkName.textContent = 'BOT Chain Testnet';
        if (networkBanner) networkBanner.classList.add('hidden');
    } else {
        if (networkBadge) networkBadge.className = 'network-badge wrong-network';
        if (networkName) networkName.textContent = 'Wrong Network';
        if (networkBanner) networkBanner.classList.remove('hidden');
    }

    // 3. Update Submit Button State
    if (submitCapsuleBtn && messageInput) {
        const hasText = messageInput.value.trim().length > 0;
        submitCapsuleBtn.disabled = !(isConnected && isCorrectNetwork && hasText);
    }
}

// ==========================================
// 7. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing ChainCapsule dApp...");

    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const switchNetworkBtn = document.getElementById('switchNetworkBtn');
    const messageInput = document.getElementById('messageInput');
    const charCounter = document.getElementById('charCounter');
    const capsuleForm = document.getElementById('capsuleForm');
    const refreshBtn = document.getElementById('refreshBtn');

    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }

    if (switchNetworkBtn) {
        switchNetworkBtn.addEventListener('click', switchToBotChain);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadCapsules();
        });
    }

    if (messageInput && charCounter) {
        messageInput.addEventListener('input', (e) => {
            const length = e.target.value.length;
            charCounter.textContent = length;

            if (length >= 480) {
                charCounter.style.color = 'var(--rose-accent)';
            } else if (length >= 400) {
                charCounter.style.color = 'var(--cyan-glow)';
            } else {
                charCounter.style.color = 'var(--text-secondary)';
            }

            updateUI();
        });
    }

    if (capsuleForm) {
        capsuleForm.addEventListener('submit', handleCreateCapsule);
    }

    // Initialize Web3 & Fetch Capsules
    initWeb3();
});
