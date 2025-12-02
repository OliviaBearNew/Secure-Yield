import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("SecureYieldCalculator", {
    from: deployer,
    log: true,
  });

  console.log(`SecureYieldCalculator contract: `, deployed.address);
};
export default func;
func.id = "deploy_secure_yield_calculator"; // prevent reexecution
func.tags = ["SecureYieldCalculator"];

