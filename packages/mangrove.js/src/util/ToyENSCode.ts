/* 

This file contains the information needed to create a Toy ENS (Ethereum Name Service) contract from mangrove.js.
The address is pre-agreed to out-of-band, and mangrove.js (see testServer.ts) will use the RPC method 'setCode' to set the code at this address. The abi allows interaction with the contract through ethers.

See ToyENS.sol in mangrove-solidity: this toy ENS contract works as a bus between the deployment (that uses foundry scripts) and the testing contracts (that need to know Mangrove addresses). $

Before deployment, mangrove.js creates a toy ENS at 0xdecaf000..0 and then the deploy script registers each newly created contract that that toy ENS.

Note: since we know which private keys we talk to anvil with, we could compute in advance the address of the first deploy of the deployer address, then store that as the address of the toy ENS. But it seems less stable over time than just deciding once for all (arbitrarily) what the address is.

TODO: a slower but maybe cleaner way would be to: 1) deploy ToyENS to any address 2) copy its code 3) setCode(ensCode) to 0xdecaf. Now the ToyENS code does not have to be stored in mangrove.js.

*/

export const address = "0xdecaf" + "0".repeat(35);

export const abi = [
  "function set(string,address) external ",
  "function set(string[],address[]) external",
  "function get(string) view external returns (address)",
  "function all() view external returns (string[], address[])",
];

export const code =
  "0x608060405234801561001057600080fd5b50600436106100575760003560e01c806310c4e8b01461005c578063693ec85e1461007b578063a815ff15146100a6578063e726da78146100bb578063eba97ad7146100ef575b600080fd5b610064610102565b6040516100729291906105bb565b60405180910390f35b61008e6100893660046106a8565b6102b4565b6040516001600160a01b039091168152602001610072565b6100b96100b4366004610706565b610332565b005b61008e6100c9366004610770565b80516020818301810180516000825292820191909301209152546001600160a01b031681565b6100b96100fd366004610866565b610454565b6060806001805480602002602001604051908101604052809291908181526020016000905b828210156101d3578382906000526020600020018054610146906108d2565b80601f0160208091040260200160405190810160405280929190818152602001828054610172906108d2565b80156101bf5780601f10610194576101008083540402835291602001916101bf565b820191906000526020600020905b8154815290600101906020018083116101a257829003601f168201915b505050505081526020019060010190610127565b505050509150815167ffffffffffffffff8111156101f3576101f361075a565b60405190808252806020026020018201604052801561021c578160200160208202803683370190505b50905060005b6001548110156102af5760008382815181106102405761024061090c565b60200260200101516040516102559190610922565b9081526040519081900360200190205482516001600160a01b03909116908390839081106102855761028561090c565b6001600160a01b0390921660209283029190910190910152806102a78161093e565b915050610222565b509091565b60008083836040516102c7929190610965565b90815260405160209181900382018120546001600160a01b03169250821515916102f5918691869101610975565b6040516020818303038152906040529061032b5760405162461bcd60e51b815260040161032291906109ae565b60405180910390fd5b5092915050565b6001600160a01b0381166103945760405162461bcd60e51b815260206004820152602360248201527f546f79454e533a2063616e6e6f74207265636f72642061206e616d652061732060448201526203078360ec1b6064820152608401610322565b60006001600160a01b0316600084846040516103b1929190610965565b908152604051908190036020019020546001600160a01b03160361040d5760018054808201825560009190915261040b907fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf60184846104c6565b505b8060008484604051610420929190610965565b90815260405190819003602001902080546001600160a01b03929092166001600160a01b0319909216919091179055505050565b60005b838110156104bf576104ad8585838181106104745761047461090c565b905060200281019061048691906109c8565b8585858181106104985761049861090c565b90506020020160208101906100b49190610a0f565b806104b78161093e565b915050610457565b5050505050565b8280546104d2906108d2565b90600052602060002090601f0160209004810192826104f4576000855561053a565b82601f1061050d5782800160ff1982351617855561053a565b8280016001018555821561053a579182015b8281111561053a57823582559160200191906001019061051f565b5061054692915061054a565b5090565b5b80821115610546576000815560010161054b565b60005b8381101561057a578181015183820152602001610562565b83811115610589576000848401525b50505050565b600081518084526105a781602086016020860161055f565b601f01601f19169290920160200192915050565b6000604082016040835280855180835260608501915060608160051b8601019250602080880160005b8381101561061257605f1988870301855261060086835161058f565b955093820193908201906001016105e4565b50508584038187015286518085528782019482019350915060005b828110156106525784516001600160a01b03168452938101939281019260010161062d565b5091979650505050505050565b60008083601f84011261067157600080fd5b50813567ffffffffffffffff81111561068957600080fd5b6020830191508360208285010111156106a157600080fd5b9250929050565b600080602083850312156106bb57600080fd5b823567ffffffffffffffff8111156106d257600080fd5b6106de8582860161065f565b90969095509350505050565b80356001600160a01b038116811461070157600080fd5b919050565b60008060006040848603121561071b57600080fd5b833567ffffffffffffffff81111561073257600080fd5b61073e8682870161065f565b90945092506107519050602085016106ea565b90509250925092565b634e487b7160e01b600052604160045260246000fd5b60006020828403121561078257600080fd5b813567ffffffffffffffff8082111561079a57600080fd5b818401915084601f8301126107ae57600080fd5b8135818111156107c0576107c061075a565b604051601f8201601f19908116603f011681019083821181831017156107e8576107e861075a565b8160405282815287602084870101111561080157600080fd5b826020860160208301376000928101602001929092525095945050505050565b60008083601f84011261083357600080fd5b50813567ffffffffffffffff81111561084b57600080fd5b6020830191508360208260051b85010111156106a157600080fd5b6000806000806040858703121561087c57600080fd5b843567ffffffffffffffff8082111561089457600080fd5b6108a088838901610821565b909650945060208701359150808211156108b957600080fd5b506108c687828801610821565b95989497509550505050565b600181811c908216806108e657607f821691505b60208210810361090657634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052603260045260246000fd5b6000825161093481846020870161055f565b9190910192915050565b60006001820161095e57634e487b7160e01b600052601160045260246000fd5b5060010190565b8183823760009101908152919050565b7f546f79454e533a2061646472657373206e6f7420666f756e6420666f7220000081528183601e83013760009101601e01908152919050565b6020815260006109c1602083018461058f565b9392505050565b6000808335601e198436030181126109df57600080fd5b83018035915067ffffffffffffffff8211156109fa57600080fd5b6020019150368190038213156106a157600080fd5b600060208284031215610a2157600080fd5b6109c1826106ea56fea2646970667358221220e300ca3cf5f1504c6b12888779c72f80217486b5fe91574e90fbba5d99ed969d64736f6c634300080e0033";
