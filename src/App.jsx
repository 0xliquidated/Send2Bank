import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

const CHAINS = {
  base: {
    chainId: '0x2105', // 8453
    name: 'Base Mainnet',
    contractAddress: '0x62Dc45236073151f1389d11d25576D6Ac5fEEde6',
    abi: [
      "function BankETH() external payable",
      "event SentToBank(address indexed sender, uint256 amount)"
    ],
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://basescan.org'
  },
  optimism: {
    chainId: '0xA', // 10
    name: 'Optimism Mainnet',
    contractAddress: '0x46511Bc0395aFC1312a227De9FB28F89475BB5e6',
    abi: [
      "function BankETH() external payable",
      "event SentToBank(address indexed sender, uint256 amount)"
    ],
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://optimistic.etherscan.io'
  },
  arbitrum: {
    chainId: '0xA4B1', // 42161
    name: 'Arbitrum One',
    contractAddress: '0xD8B0007797d27135A660ac45e1B854Bb363EC64A',
    abi: [
      "function BankETH() external payable",
      "event SentToBank(address indexed sender, uint256 amount)"
    ],
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://arbiscan.io'
  }
};

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [totalBanked, setTotalBanked] = useState(0);
  const [bankStreak, setBankStreak] = useState(0);
  const [selectedChain, setSelectedChain] = useState('base');

  // Load chain-specific stats from localStorage
  useEffect(() => {
    if (account && selectedChain) {
      const savedTotal = localStorage.getItem(`totalBanked_${selectedChain}_${account}`) || 0;
      const savedStreak = localStorage.getItem(`bankStreak_${selectedChain}_${account}`) || 0;
      setTotalBanked(parseFloat(savedTotal));
      setBankStreak(parseInt(savedStreak, 10));
    }
  }, [account, selectedChain]);

  // Connect wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await switchChain(selectedChain);
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);
        setWalletConnected(true);
        setStatus('Wallet connected!');
      } catch (error) {
        setStatus(`Failed to connect wallet: ${error.message}`);
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

  // Switch chain
  const switchChain = async (chainKey) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAINS[chainKey].chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902 || switchError.message.includes('Unrecognized chain')) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: CHAINS[chainKey].chainId,
              chainName: CHAINS[chainKey].name,
              rpcUrls: [CHAINS[chainKey].rpcUrl],
              nativeCurrency: CHAINS[chainKey].nativeCurrency,
              blockExplorerUrls: [CHAINS[chainKey].blockExplorer]
            }],
          });
        } catch (addError) {
          throw new Error(`Failed to add ${CHAINS[chainKey].name}: ${addError.message}`);
        }
      } else {
        throw switchError;
      }
    }
  };

  // Handle chain selection
  const handleChainChange = async (event) => {
    const newChain = event.target.value;
    setSelectedChain(newChain);
    if (walletConnected) {
      try {
        await switchChain(newChain);
        setStatus(`Switched to ${CHAINS[newChain].name}`);
        const savedTotal = localStorage.getItem(`totalBanked_${newChain}_${account}`) || 0;
        const savedStreak = localStorage.getItem(`bankStreak_${newChain}_${account}`) || 0;
        setTotalBanked(parseFloat(savedTotal));
        setBankStreak(parseInt(savedStreak, 10));
      } catch (error) {
        setStatus(`Failed to switch chain: ${error.message}`);
      }
    }
  };

  // Call the BankETH function
  const bankETH = async () => {
    if (!walletConnected) {
      setStatus('Please connect your wallet first!');
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CHAINS[selectedChain].contractAddress,
        CHAINS[selectedChain].abi,
        signer
      );

      const tx = await contract.BankETH({ value: ethers.parseEther('0.0001') });
      setStatus('Transaction sent! Waiting for confirmation...');
      setTxHash(tx.hash);

      await tx.wait();
      setStatus(`Success! 0.0001 ${CHAINS[selectedChain].nativeCurrency.symbol} sent to the bank.`);

      // Update stats
      const newTotal = totalBanked + 0.0001;
      setTotalBanked(newTotal);
      localStorage.setItem(`totalBanked_${selectedChain}_${account}`, newTotal);

      const now = new Date();
      const currentUTCDate = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
      const lastBankedUTCDate = parseInt(localStorage.getItem(`lastBanked_${selectedChain}_${account}`) || 0, 10);

      if (lastBankedUTCDate !== currentUTCDate) {
        const newStreak = lastBankedUTCDate === currentUTCDate - 1 ? bankStreak + 1 : 1;
        setBankStreak(newStreak);
        localStorage.setItem(`bankStreak_${selectedChain}_${account}`, newStreak);
        localStorage.setItem(`lastBanked_${selectedChain}_${account}`, currentUTCDate);
      }
    } catch (error) {
      console.error('BankETH error:', error);
      let errorMsg = 'Transaction failed';
      if (error.reason) errorMsg = error.reason;
      else if (error.message) errorMsg = error.message;
      setStatus(`Error: ${errorMsg}`);
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
          <select
            value={selectedChain}
            onChange={handleChainChange}
            className="chain-dropdown"
          >
            <option value="base">Base</option>
            <option value="optimism">Optimism</option>
            <option value="arbitrum">Arbitrum</option>
          </select>
          <div className="wallet-buttons">
            {!walletConnected ? (
              <button onClick={connectWallet} disabled={isLoading}>
                Connect Wallet
              </button>
            ) : (
              <>
                <span className="account">
                  {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}
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
          <>
            <button onClick={bankETH} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Bank'}
            </button>
            <div className="stats">
              <p>Total Banked: {totalBanked.toFixed(4)} {CHAINS[selectedChain].nativeCurrency.symbol}</p>
              <p>Bank Streak: {bankStreak} day{bankStreak !== 1 ? 's' : ''}</p>
            </div>
          </>
        )}

        {status && <p className={`status ${status.includes('Success') ? 'success' : status.includes('Error') ? 'error' : ''}`}>{status}</p>}
        {txHash && (
          <p className="tx-hash">
            Transaction:{' '}
            <a
              href={`${CHAINS[selectedChain].blockExplorer}/tx/${txHash}`}
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