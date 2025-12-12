import { Contract, JsonRpcProvider } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import type { FhevmInstance } from "../../fhevmTypes";

type Metadata = {
  ACLAddress: `0x${string}`;
  InputVerifierAddress: `0x${string}`;
  KMSVerifierAddress: `0x${string}`;
};

export async function fhevmMockCreateInstance(parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: Metadata;
}): Promise<FhevmInstance> {
  const provider = new JsonRpcProvider(parameters.rpcUrl);

  // Get verifying contract address and gatewayChainId for InputVerifier
  const inputVerifierContract = new Contract(
    parameters.metadata.InputVerifierAddress,
    [
      "function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])",
    ],
    provider
  );
  const inputVerifierDomain = await inputVerifierContract.eip712Domain();
  const verifyingContractAddressInputVerification = inputVerifierDomain[4];
  // eip712Domain[3] is the chainId (gatewayChainId) in the EIP712 domain
  const inputVerifierGatewayChainId = Number(inputVerifierDomain[3]);

  // Get verifying contract address and gatewayChainId for KMSVerifier
  const kmsVerifierContract = new Contract(
    parameters.metadata.KMSVerifierAddress,
    [
      "function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])",
    ],
    provider
  );
  const kmsVerifierDomain = await kmsVerifierContract.eip712Domain();
  const verifyingContractAddressDecryption = kmsVerifierDomain[4];
  // eip712Domain[3] is the chainId (gatewayChainId) in the EIP712 domain
  const kmsVerifierGatewayChainId = Number(kmsVerifierDomain[3]);

  // Verify that both verifiers use the same gatewayChainId
  if (inputVerifierGatewayChainId !== kmsVerifierGatewayChainId) {
    throw new Error(
      `Gateway chainId mismatch: InputVerifier uses ${inputVerifierGatewayChainId}, but KMSVerifier uses ${kmsVerifierGatewayChainId}`
    );
  }

  const gatewayChainId = inputVerifierGatewayChainId;

  const config = {
    chainId: parameters.chainId,
    gatewayChainId: gatewayChainId,
    verifyingContractAddressInputVerification: verifyingContractAddressInputVerification,
    verifyingContractAddressDecryption: verifyingContractAddressDecryption,
    aclContractAddress: parameters.metadata.ACLAddress,
    inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
    kmsContractAddress: parameters.metadata.KMSVerifierAddress,
  };

  const instance = await MockFhevmInstance.create(
    provider,
    provider,
    config,
    {
      inputVerifierProperties: {},
      kmsVerifierProperties: {},
    }
  );

  return instance as unknown as FhevmInstance;
}


