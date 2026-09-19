/**
 * ChainCapsule - Web3 & MetaMask Integration Script (Stage 3)
 * Target Network: BOT Chain Testnet (Chain ID: 968 / 0x3c8)
 */

// ==========================================
// 1. Network & Contract Configurations
// ==========================================
const BOT_CHAIN_CONFIG = {
    chainId: '0x3c8', // 968 in decimal
    chainName: 'BOT Chain Testnet',
    nativeCurrency: {
        name: 'BOT',
        symbol: 'BOT',
        decimals: 18
    },
    rpcUrls: ['https://rpc.bohr.life'],
    blockExplorerUrls: ['https://scan.bohr.life']
};

const TARGET_CHAIN_ID_DECIMAL = 968;
const TARGET_CHAIN_ID_HEX = '0x3c8';

// Smart Contract ABI matching TimeCapsule.sol (Prepared for Stage 4)
const CONTRACT_ABI = [
    "function createCapsule(string memory _message) external",
    "function getAllCapsules() external view returns (tuple(string message, address creator, uint256 timestamp)[])",
    "function getCapsulesCount() external view returns (uint256)",
    "function getCapsulesByCreator(address _creator) external view returns (tuple(string message, address creator, uint256 timestamp)[])",
    "event CapsuleCreated(uint256 indexed id, address indexed creator, string message, uint256 timestamp)"
];

// Contract Address Placeholder (To be set after deployment in Stage 4)
let CONTRACT_ADDRESS = "";
let contractInstance = null;

// ==========================================
// 2. Application State Variables
// ==========================================
let provider = null;
let signer = null;
let userAddress = null;
let currentChainId = null;
let isConnected = false;
let isCorrectNetwork = false;

// ==========================================
// 3. Helper Functions
// ==========================================

/**
 * Formats full Ethereum address to short version (e.g. 0x1234...5678)
 */
function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Checks if MetaMask browser extension is installed
 */
function isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined';
}

// ==========================================
// 4. Web3 & Network Logic
// ==========================================

/**
 * Initializes Web3 provider and sets up event listeners
 */
async function initWeb3() {
    if (!isMetaMaskInstalled()) {
        console.warn("MetaMask is not installed.");
        updateUI();
        return;
    }

    try {
        // Initialize Ethers.js provider with window.ethereum
        provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

        // Register MetaMask Event Listeners
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        // Check if wallet is already connected
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            userAddress = accounts[0];
            signer = provider.getSigner();
            isConnected = true;
        }

        // Check current network chain ID
        await checkNetwork();

    } catch (error) {
        console.error("Error initializing Web3 provider:", error);
    } finally {
        updateUI();
    }
}

/**
 * Triggers MetaMask connection request
 */
async function connectWallet() {
    if (!isMetaMaskInstalled()) {
        alert("MetaMask extension was not detected. Please install MetaMask to use ChainCapsule dApp.");
        return;
    }

    try {
        const connectBtnText = document.getElementById('walletBtnText');
        if (connectBtnText) connectBtnText.textContent = 'Connecting...';

        // Request account access from MetaMask
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length > 0) {
            userAddress = accounts[0];
            provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            signer = provider.getSigner();
            isConnected = true;

            // Verify network after connection
            await checkNetwork();
        }
    } catch (error) {
        if (error.code === 4001) {
            console.log("User rejected connection request.");
        } else {
            console.error("Error connecting wallet:", error);
        }
    } finally {
        updateUI();
    }
}

/**
 * Checks if user is connected to BOT Chain Testnet (Chain ID 968 / 0x3c8)
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
        currentChainId = network.chainId;

        // Check against target chain ID 968 (decimal) or 0x3c8 (hex)
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
 * Programmatically switches network to BOT Chain Testnet (or adds it if not registered)
 */
async function switchToBotChain() {
    if (!isMetaMaskInstalled()) return;

    try {
        // Attempt to switch to BOT Chain Testnet
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: TARGET_CHAIN_ID_HEX }]
        });
    } catch (switchError) {
        // Error code 4902 indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [BOT_CHAIN_CONFIG]
                });
            } catch (addError) {
                console.error("Failed to add BOT Chain Testnet to MetaMask:", addError);
            }
        } else {
            console.error("Failed to switch network:", switchError);
        }
    }
}

/**
 * Handles account change events emitted by MetaMask
 */
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // MetaMask is locked or user disconnected all accounts
        userAddress = null;
        signer = null;
        isConnected = false;
        console.log("Wallet disconnected.");
    } else if (accounts[0] !== userAddress) {
        userAddress = accounts[0];
        signer = provider.getSigner();
        isConnected = true;
        console.log("Account changed to:", userAddress);
    }
    checkNetwork().then(() => updateUI());
}

/**
 * Handles network/chain change events emitted by MetaMask
 */
function handleChainChanged(_chainIdHex) {
    console.log("Network chain changed to:", _chainIdHex);
    // Reload page or re-verify network as recommended by MetaMask documentation
    window.location.reload();
}

// ==========================================
// 5. UI Updates & DOM Interaction
// ==========================================

/**
 * Updates all DOM elements based on current wallet and network state
 */
function updateUI() {
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const walletBtnText = document.getElementById('walletBtnText');
    const networkBadge = document.getElementById('networkBadge');
    const networkName = document.getElementById('networkName');
    const networkBanner = document.getElementById('networkBanner');
    const userAddressDisplay = document.getElementById('userAddressDisplay');
    const submitCapsuleBtn = document.getElementById('submitCapsuleBtn');
    const messageInput = document.getElementById('messageInput');

    // 1. Update Wallet Button & Address Display
    if (isConnected && userAddress) {
        if (walletBtnText) walletBtnText.textContent = formatAddress(userAddress);
        if (userAddressDisplay) userAddressDisplay.textContent = `Wallet: ${formatAddress(userAddress)}`;
    } else {
        if (walletBtnText) walletBtnText.textContent = 'Connect Wallet';
        if (userAddressDisplay) userAddressDisplay.textContent = 'Wallet: Disconnected';
    }

    // 2. Update Network Badge & Warning Banner
    if (!isConnected) {
        if (networkBadge) {
            networkBadge.className = 'network-badge disconnected';
        }
        if (networkName) networkName.textContent = 'Not Connected';
        if (networkBanner) networkBanner.classList.add('hidden');
    } else if (isCorrectNetwork) {
        if (networkBadge) {
            networkBadge.className = 'network-badge connected';
        }
        if (networkName) networkName.textContent = 'BOT Chain Testnet';
        if (networkBanner) networkBanner.classList.add('hidden');
    } else {
        if (networkBadge) {
            networkBadge.className = 'network-badge wrong-network';
        }
        if (networkName) networkName.textContent = 'Wrong Network';
        if (networkBanner) networkBanner.classList.remove('hidden');
    }

    // 3. Update Submit Button Disability State
    if (submitCapsuleBtn && messageInput) {
        const hasText = messageInput.value.trim().length > 0;
        const canSubmit = isConnected && isCorrectNetwork && hasText;
        submitCapsuleBtn.disabled = !canSubmit;
    }
}

// ==========================================
// 6. DOM Content Loaded Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing ChainCapsule Web3 dApp...");

    // DOM Elements
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const switchNetworkBtn = document.getElementById('switchNetworkBtn');
    const messageInput = document.getElementById('messageInput');
    const charCounter = document.getElementById('charCounter');
    const submitCapsuleBtn = document.getElementById('submitCapsuleBtn');
    const capsuleForm = document.getElementById('capsuleForm');

    // Attach Event Listeners
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }

    if (switchNetworkBtn) {
        switchNetworkBtn.addEventListener('click', switchToBotChain);
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

            // Dynamically evaluate submit button state
            updateUI();
        });
    }

    // Form Submit Handler (Placeholder for Stage 4 Smart Contract Call)
    if (capsuleForm) {
        capsuleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!isConnected || !isCorrectNetwork) {
                alert("Please connect your wallet to BOT Chain Testnet first.");
                return;
            }
            console.log("Submit button clicked. Form ready for Stage 4 smart contract transaction.");
        });
    }

    // Initialize Web3 Provider & Check Connection
    initWeb3();
});
