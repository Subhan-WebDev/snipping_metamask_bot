import React, { useState } from "react";
import Web3 from "web3";

// Goerli Testnet provider URL from Infura or Alchemy
const web3 = new Web3(Web3.givenProvider || 'https://sepolia.infura.io/v3/ed5ebd392fb644ab84e91c13aaaf062e');

// ERC-20 ABI (simplified)
const ERC20_ABI = [
  // Simplified ERC20 ABI
  { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
  { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "type": "function" },
];

// Uniswap Router ABI
const UNISWAP_ROUTER_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "amountOutMin", "type": "uint256" },
      { "name": "path", "type": "address[]" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactETHForTokens",
    "outputs": [{ "name": "amounts", "type": "uint256[]" }],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "amountOutMin", "type": "uint256" },
      { "name": "path", "type": "address[]" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForETH",
    "outputs": [{ "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Testnet Uniswap Router Address (Goerli)
const UNISWAP_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

function SnipingBot() {
  const [account, setAccount] = useState(null);
  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('0.1');  // Default amount in ETH
  const [slippage, setSlippage] = useState(0.5);
  const [transactionPriority, setTransactionPriority] = useState(1);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Error connecting to MetaMask:", error.message);
      }
    } else {
      console.log('MetaMask is not installed');
    }
  };

  const handleBuy = async () => {
    if (!tokenAddress || !amount) {
      alert("Please provide a token address and amount.");
      return;
    }

    const uniswapRouter = new web3.eth.Contract(UNISWAP_ROUTER_ABI, UNISWAP_ROUTER_ADDRESS);
    const path = ['0x7b79995e5f793a07bc00c21412e50ecae098e7f9', tokenAddress];
    const amountIn = web3.utils.toWei(amount, 'ether');
    const slippageMultiplier = (100 + slippage) / 100;
    const amountOutMin = 0; // Ideally, calculate based on current price and slippage
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;  // 20 minutes from the current time

    try {
      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: UNISWAP_ROUTER_ADDRESS,
          value: amountIn,
          data: uniswapRouter.methods.swapExactETHForTokens(
            amountOutMin,
            path,
            account,
            deadline
          ).encodeABI(),
          gas: '3000000',
          gasPrice: web3.utils.toWei(transactionPriority.toString(), 'gwei')
        }],
      });

      console.log("Buy transaction successful!");
    } catch (error) {
      console.error("Error during buy:", error.message);
    }
  };

  const handleSell = async () => {
    if (!tokenAddress) {
      alert("Please provide a token address.");
      return;
    }

    const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    const uniswapRouter = new web3.eth.Contract(UNISWAP_ROUTER_ABI, UNISWAP_ROUTER_ADDRESS);
    const path = [tokenAddress, '0x7b79995e5f793a07bc00c21412e50ecae098e7f9'];
    const amountIn = await tokenContract.methods.balanceOf(account).call();  // Full token balance
    const slippageMultiplier = (100 + slippage) / 100;
    const amountOutMin = 0; // Ideally, calculate based on current price and slippage
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;  // 20 minutes from the current time

    try {
      // Approve Uniswap Router to spend tokens
      await tokenContract.methods.approve(UNISWAP_ROUTER_ADDRESS, amountIn).send({ from: account });

      // Execute sell
      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: UNISWAP_ROUTER_ADDRESS,
          data: uniswapRouter.methods.swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            account,
            deadline
          ).encodeABI(),
          gas: '3000000',
          gasPrice: web3.utils.toWei(transactionPriority.toString(), 'gwei')
        }],
      });

      console.log("Sell transaction successful!");
    } catch (error) {
      console.error("Error during sell:", error.message);
    }
  };

  return (
    <div>
      <h2>Testnet Sniping Bot</h2>
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>Connected account: {account}</p>
      )}

      <div>
        <label>Token Address:</label>
        <input
          type="text"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
        />
      </div>

      <div>
        <label>Amount (ETH):</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div>
        <label>Slippage (%):</label>
        <input
          type="number"
          step="0.1"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
        />
      </div>

      <div>
        <label>Transaction Priority (Gwei):</label>
        <input
          type="number"
          step="1"
          value={transactionPriority}
          onChange={(e) => setTransactionPriority(e.target.value)}
        />
      </div>

      <button onClick={handleBuy}>Buy</button>
      <button onClick={handleSell}>Sell</button>
    </div>
  );
}

export default SnipingBot;
