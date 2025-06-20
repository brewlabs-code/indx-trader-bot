export const dataAbi = [
  {
    inputs: [
      { name: "_aggregator", type: "address" },
      { name: "_token", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_tokens", type: "address[]" },
      { name: "_percents", type: "uint256[]" }
    ],
    name: "precomputeZapIn",
    outputs: [
      {
        name: "queries",
        type: "tuple[]",
        components: [
          { name: "amounts", type: "uint256[]" },
          { name: "adapters", type: "address[]" },
          { name: "path", type: "address[]" },
          { name: "gasEstimate", type: "uint256" }
        ]
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "_aggregator", type: "address" },
      { name: "_token", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_tokens", type: "address[]" },
      { name: "_percents", type: "uint256[]" }
    ],
    name: "estimateSlippageForZapIn",
    outputs: [
      { name: "expectedOutputs", type: "uint256[]" },
      { name: "slippagePercentages", type: "uint256[]" },
      { name: "totalETHValue", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "_aggregator", type: "address" },
      { name: "_tokens", type: "address[]" },
      { name: "_amounts", type: "uint256[]" },
      { name: "_token", type: "address" }
    ],
    name: "precomputeZapOut",
    outputs: [
      {
        name: "queries",
        type: "tuple[]",
        components: [
          { name: "amounts", type: "uint256[]" },
          { name: "adapters", type: "address[]" },
          { name: "path", type: "address[]" },
          { name: "gasEstimate", type: "uint256" }
        ]
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "_aggregator", type: "address" },
      { name: "_tokens", type: "address[]" },
      { name: "_amounts", type: "uint256[]" },
      { name: "_token", type: "address" }
    ],
    name: "estimateSlippageForZapOut",
    outputs: [
      { name: "expectedOutputs", type: "uint256[]" },
      { name: "slippagePercentages", type: "uint256[]" },
      { name: "totalOutputAmount", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;
