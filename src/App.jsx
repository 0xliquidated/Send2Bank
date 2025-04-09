import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Deployed contract address on Base mainnet
const CONTRACT_ADDRESS = "0x1298900d55bcF2a6716a3470Ac880DA226b1c0B2";
const BANK_ABI = [
  "function bank() external payable",
  "event SentToBank(address indexed sender, uint256 amount)"
];

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [totalBanked, setTotalBanked] = useState(0);
  const [bankStreak, setBankStreak] = useState(0);

  // Load saved stats from localStorage when account changes
  useEffect(() => {
    if (account) {
      const savedTotal = localStorage.getItem(`totalBanked_${account}`) || 0;
      const savedStreak = localStorage.getItem(`bankStreak_${account}`) || 0;
      setTotalBanked(parseFloat(savedTotal));
      setBankStreak(parseInt(savedStreak, 10));
    }
  }, [account]);

  // Connect wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // Base mainnet Chain ID: 8453
        });
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);
        setWalletConnected(true);
        setStatus('Wallet connected!');
      } catch (error) {
        setStatus('Failed to connect wallet: ' + error.message);
      }
    } else {
      setStatus('Please install MetaMask or a compatible wallet!');
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletConnected(false);
    setAccount(null);
    setStatus('');
    setTxHash(null);
    setTotalBanked(0);
    setBankStreak(0);
  };

  // Call the bank function
  const sendToBank = async () => {
    if (!walletConnected) {
      setStatus('Please connect your wallet first!');
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, BANK_ABI, signer);

      const tx = await contract.bank({ value: ethers.parseEther('0.0001') });
      setStatus('Transaction sent! Waiting for confirmation...');
      setTxHash(tx.hash);

      await tx.wait();
      setStatus('Success! 0.0001 ETH sent to the bank.');

      // Update total banked
      const newTotal = totalBanked + 0.0001;
      setTotalBanked(newTotal);
      localStorage.setItem(`totalBanked_${account}`, newTotal);

      // Update bank streak using UTC 24-hour period
      const now = new Date();
      const currentUTCDate = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
      const lastBankedUTCDate = parseInt(localStorage.getItem(`lastBanked_${account}`) || 0, 10);

      if (lastBankedUTCDate !== currentUTCDate) {
        const newStreak = lastBankedUTCDate === currentUTCDate - 1 ? bankStreak + 1 : 1;
        setBankStreak(newStreak);
        localStorage.setItem(`bankStreak_${account}`, newStreak);
        localStorage.setItem(`lastBanked_${account}`, currentUTCDate);
      }
    } catch (error) {
      setStatus('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <h1 className="title">Send2Bank</h1>
      <header className="header">
        <nav>
          <span className="nav-item active">Home</span>
          <div className="wallet-buttons">
            {!walletConnected ? (
              <button onClick={connectWallet} disabled={isLoading}>
                Connect Wallet
              </button>
            ) : (
              <>
                <span className="account">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
                <button onClick={disconnectWallet} disabled={isLoading}>
                  Disconnect
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="container">
        <p>A fun dapp to save small amounts of Ethereum over time</p>
        {walletConnected && (
          <button onClick={sendToBank} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Bank'}
          </button>
        )}

        {walletConnected && (
          <div className="stats">
            <p>Total Banked: {totalBanked.toFixed(4)} ETH</p>
            <p>Bank Streak: {bankStreak} day{bankStreak !== 1 ? 's' : ''}</p>
          </div>
        )}

        {status && <p className={`status ${status.includes('Success') ? 'success' : status.includes('Error') ? 'error' : ''}`}>{status}</p>}
        {txHash && (
          <p className="tx-hash">
            Transaction:{' '}
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {txHash.slice(0, 6)}...{txHash.slice(-4)}
            </a>
          </p>
        )}
      </main>
    </div>
  );
}

export default App;