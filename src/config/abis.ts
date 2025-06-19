export const indexAbi = [
  {
    inputs: [
      { name: "_token", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_percents", type: "uint256[]" }
    ],
    name: "computeZapInfo",
    outputs: [
      { name: "trades", type: "tuple[]", components: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOut", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "adapters", type: "address[]" }
      ]},
      { name: "expectedOutputs", type: "uint256[]" },
      { name: "slippagePercentages", type: "uint256[]" },
      { name: "totalETHValue", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "_token", type: "address" }],
    name: "computeZapOutInfo",
    outputs: [
      { name: "trades", type: "tuple[]", components: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOut", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "adapters", type: "address[]" }
      ]},
      { name: "expectedOutputs", type: "uint256[]" },
      { name: "slippagePercentages", type: "uint256[]" },
      { name: "totalOutputAmount", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "_token", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_percents", type: "uint256[]" },
      { name: "_trades", type: "tuple[]", components: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOut", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "adapters", type: "address[]" }
      ]},
      { name: "_minTotalValueOut", type: "uint256" },
      { name: "_slippage", type: "uint256" }
    ],
    name: "zapIn",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { name: "_token", type: "address" },
      { name: "_trades", type: "tuple[]", components: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOut", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "adapters", type: "address[]" }
      ]},
      { name: "_minTotalOut", type: "uint256" },
      { name: "_slippage", type: "uint256" }
    ],
    name: "zapOut",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "NUM_TOKENS",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;
