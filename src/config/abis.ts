export const indexAbi = [
  {
    inputs: [],
    name: "tokens",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "tokens",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "NUM_TOKENS",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "_user", type: "address" }],
    name: "userInfo",
    outputs: [
      { name: "amounts", type: "uint256[]" },
      { name: "usdAmount", type: "uint256" }
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
  }
] as const;
