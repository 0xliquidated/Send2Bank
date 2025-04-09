import { useState } from 'react';
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

  // Connect wallet (MetaMask or compatible)
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        // Switch to Base mainnet (Chain ID: 8453)
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // 8453 in hex
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

  // Call the bank function
  const sendToBank = async () => {
    if (!walletConnected) {
      setStatus('Please connect your wallet first!');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, BANK_ABI, signer);

      const tx = await contract.bank({ value: ethers.parseEther('0.0001') });
      setStatus('Transaction sent! Waiting for confirmation...');
      await tx.wait();
      setStatus('Success! 0.0001 ETH sent to the bank.');
    } catch (error) {
      setStatus('Error: ' + error.message);
    }
  };

  return (
    <div className="container">
      <h1>Send2Bank</h1>
      <p>Send 0.0001 ETH to the bank with a single click.</p>
      
      {!walletConnected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {account}</p>
          <button onClick={sendToBank}>Bank</button>
        </div>
      )}
      
      <p className="status">{status}</p>
    </div>
  );
}

export default App;